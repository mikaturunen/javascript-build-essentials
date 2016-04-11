/**
 * Common build actions that can be shared between applications fairly easily.
 * Brings in TypeScript compilation, Jade compilation and LESS compilation.
 */

"use strict";

var ts = require("gulp-typescript");
var eventStream = require("event-stream");
var tslint = require("gulp-tslint");
var babel = require("gulp-babel");
var path = require("path");
var jade = require("gulp-jade");
var notify = require("gulp-notify");
var less = require("gulp-less");
var uglify = require("gulp-uglify");
var combiner = require("stream-combiner2");
var ngAnnotate = require("gulp-ng-annotate");
var concat = require("gulp-concat");
var angularTemplates = require("gulp-ng-template");
var minifyHtml = require("gulp-minify-html")

// Used to stop the 'watch' behavior from breaking on emited errors, errors should stop the process
// in all other cases but 'watch' as 'watch' is ongoing, iterating, always on process :)
var globalEmit = false;

var typeScriptOptions = {
	typescript: require("typescript"),
	target: "es6",
	sourceMap: true,
	removeComments: false,
	declaration: true,
	noImplicitAny: true,
	module: "es2015",
	failOnTypeErrors: true,
	suppressImplicitAnyIndexErrors: true
};

var minifyHtmlOptions = {
	empty: true,
	quotes: true
};

/**
 * Creates a new options Object and makes sure the existing ones are not touched.
 * @param {Object} userOptions User specified options.
 * @param {Object} default Default values for given options.
 * @returns {Object} New options object built from defaults and user provided options.
 */
var createOptions = function (userOptions, defaults) {
	// Make copy and keep the original unaltered
	var options = Object.keys(defaults).map(function(k) { return defaults[k]; });

	if (!userOptions) {
		return options;
	}

	// Update the newly created options with the user values
	Object.keys(userOptions).forEach(function(k) { options[k] = userOptions[k]; });
	return options;
};

/**
 * Creates the shared gulp build tasks with shared gulp.
 *
 * @param {Object} gulp Gulp object.
 * @returns {Object} Gulp Object with build functions.
 */
var sharedGulp = function(gulp) {
	return {
		/**
		 * Turns off emitting. Needs to be set off during watch operations. During watch operation we do not allow
		 * the build to fail on emited errors. So blocking emits.
		 */
		globalEmitOff: function() { globalEmit = false; },

		/**
		 * Turns on emitting. Needs to be set on during normal build actions so that the build fails on errors.
		 */
		globalEmitOn: function() { globalEmit = true; },

		/**
		 * Creates specific Angular ngTemplates task that combines the angular specific ui-router templateUrl html files
		 * into $templateCache so that they are actually never queried from the backend but instead instantly loaded from the front.
		 * @param {String[]} sources Array of source files
		 * @param {String} outputDirectory Location to output the JS file to.
		 * @param {Object} options Options for gulp-ng-templates options file.
		 * @returns {Object} Gulp stream.
		 */
		createAngularTemplateTask: function (sources, outputDirectory, options) {
			return gulp.src(sources)
		   		.pipe(minifyHtml(minifyHtmlOptions))
	           .pipe(angularTemplates(options))
	           .pipe(gulp.dest(outputDirectory));
		},

		/**
		 * Simplified Angular and Babel use case. Creates a angular compatible babel combilation stream.
		 * @param {String[]} sources Array of source files
		 * @param {String} outputDirectory Location to output the JS files to.
		 * @param {Object} options.
		 * @returns {Object} Gulp stream.
		 */
		createBabelTask: function (sources, outputDirectory, options) {
			var babelOptions = createOptions(options, { });
			var isAngularProject = babelOptions.angular;
			var isConcatEnabled = babelOptions.concat;
			var isUglifyEnabled = babelOptions.uglify;

			// Making sure the provided values do not interfere with any of the tools we pass the options to
			delete babelOptions.angular;
			delete babelOptions.concat;
			delete babelOptions.uglify;

			// Execute streams
		    var stream = gulp.src(sources);
			stream = stream.pipe(babel(babelOptions));

			if (isAngularProject === true) {
				stream = stream.pipe(ngAnnotate());
			}

			if (isConcatEnabled === true) {
				stream = stream.pipe(concat("app.js"));
			}

			if (isUglifyEnabled === true) {
				var ugly = uglify();
				ugly.on("error", function(message) { console.log(message); });
				stream = stream.pipe(ugly);
			}

			return stream.pipe(gulp.dest(outputDirectory));
		},

		/**
		 * Creates TypeScript compilation for given sources files and outputs them into a preferred release location.
		 * Used for frontend and backend TypeScript.
		 * @param {String[]} sources Array of source files
		 * @param {String} outputDirectory Location to output the JS files to.
		 * @param {Object} options Typescript options file. Accepts common typescript flags.
		 * @returns {Object} Gulp stream.
		 */
		createPlainTypeScriptTask: function(sources, outputDirectory, options) {
			var tsOptions = createOptions(options, typeScriptOptions);

			var isTsLintEnabled = tsOptions.tslint;
			var isAngularProject = tsOptions.angular;
			var isConcatEnabled = tsOptions.concat;
			var isUglifyEnabled = tsOptions.uglify;
			var tsLintOptions = tsOptions.tslintOptions;

			// Making sure the provided values do not interfere with any of the tools we pass the options to
			delete tsOptions.tslint;
			delete tsOptions.angular;
			delete tsOptions.concat;
			delete tsOptions.uglify;
			delete tsOptions.tslintOptions;

			// Execute streams
		    var stream = gulp.src(sources);

			if (isTsLintEnabled === true) {
				stream = stream.pipe(tslint(tsLintOptions))
		        	.pipe(tslint.report("verbose", { emitError: globalEmit }))
			}

			// Push through to compiler
			stream = stream.pipe(ts(tsOptions))
		        // Through babel (es6->es5)
		        .pipe(babel());

			if (isAngularProject === true) {
				stream = stream.pipe(ngAnnotate());
			}

			if (isConcatEnabled === true) {
				stream = stream.pipe(concat("app.js"));
			}

			if (isUglifyEnabled === true) {
				stream = stream.pipe(uglify());
			}

			console.log("output to:", outputDirectory);
			return stream.pipe(gulp.dest(outputDirectory));
		},

		/**
		 * Creates TypeScript compilation for given sources files and outputs them into a preferred release location.
		 * Used for frontend TypeScript. Specific compilation task for Angular projects, heavily leans on
		 * ngAnnotate and ngTemplates.
		 * @param {String[]} sources Array of source files
		 * @param {String} outputDirectory Location to output the JS files to.
		 * @param {Object} options Typescript options file. Accepts common typescript flags.
		 * @returns {Object} Gulp stream.
		 */
		createAngularTypeScriptTask: function(sources, outputDirectory, options) {
			options.angular = true;
			return this.createPlainTypeScriptTask(sources, outputDirectory, options);
		},

		/**
		 * Creates Jade compilation for given sources files and outputs them into a preferred release location.
		 * @param {String[]} sources Array of source files
		 * @param {String} outputDirectory Location to output the HTML files to.
		 * @param {Object} options Jade options file. Accepts common jade flags.
		 * @returns {Object} Gulp stream.
		 */
		createJadeTask: function (sources, outputDirectory, options) {
			var jadeOptions = createOptions(options, { pretty: true });
			var j = jade();

			// Depending on the global emit state we either allow the jade compiler to stop the execution on error or not,
			// when we are running in "watch" state we do not want it to stop as it stops the watch process
		    if(globalEmit === false) {
		        j.on('error', notify.onError(function (error) {
		            return 'An error occurred while compiling Jade.\nLook in the console for details.\n' + error;
		        }));
		    }

		    return gulp.src(sources)
		        .pipe(j)
		        .pipe(gulp.dest(outputDirectory));
		},

		/**
		 * Creates LESS compilation for given sources files and outputs them into a preferred release location.
		 * @param {String[]} sources Array of source files
		 * @param {String} outputDirectory Location to output the CSS files to.
		 * @param {Object} options Jade options file. Accepts common jade flags.
		 * @returns {Object} Gulp stream.
		 */
		createLessTask: function (sources, outputDirectory, options) {
			var combined = combiner.obj([
		        gulp.src(sources),
		        less(options),
		        gulp.dest(outputDirectory)
		    ]);

		    if (globalEmit === false) {
		        combined.on("error", notify.onError(function (error) {
		            return 'An error occurred while compiling Less.\nLook in the console for details.\n' + error;
		        }))
		    }

		    return combined;
		}
	}
}

module.exports = sharedGulp;
