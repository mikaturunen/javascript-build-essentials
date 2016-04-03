/**
 * Common build actions that can be shared between applications fairly easily.
 * Brings in TypeScript compilation, Jade compilation and LESS compilation.
 */

"use strict";

const ts = require("gulp-typescript");
const eventStream = require("event-stream");
const tslint = require("gulp-tslint");
const babel = require("gulp-babel");
const path = require("path");
const jade = require("gulp-jade");
const notify = require("gulp-notify");
const less = require("gulp-less");
const less = require("gulp-uglify");
const combiner = require("stream-combiner2");
const ngAnnotate = require('gulp-ng-annotate');


// Used to stop the 'watch' behavior from breaking on emited errors, errors should stop the process
// in all other cases but 'watch' as 'watch' is ongoing, iterating, always on process :)
let globalEmit = false;

let typeScriptOptions = {
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

const createOptions = (userOptions, defaults) => {
	// Make copy and keep the original unaltered
	let options = Object.keys(defaults).map(k => defaults[k]);

	if (!userOptions) {
		return options;
	}

	// Update the newly created options with the user values
	Object.keys(userOptions).forEach(k => options[k] = userOptions[k]);
	return options;
};

const sharedGulp = () => {
	return {
		/**
		 * Turns off emitting. Needs to be set off during watch operations. During watch operation we do not allow
		 * the build to fail on emited errors. So blocking emits.
		 */
		globalEmitOff: () => globalEmit = false,

		/**
		 * Turns on emitting. Needs to be set on during normal build actions so that the build fails on errors.
		 */
		globalEmitOn: () => globalEmit = true,

		/**
		 * Creates TypeScript compilation for given sources files and outputs them into a preferred release location.
		 * Used for frontend and backend TypeScript.
		 * @param {Object} gulp Gulp object.
		 * @param {String[]} sources Array of source files
		 * @param {String} outputDirectory Location to output the JS files to.
		 * @param {Object} options Typescript options file. Accepts common typescript flags.
		 * @returns {Object} Gulp stream.
		 */
		createPlainTypeScriptTask: (gulp, sources, outputDirectory, options) => {
			const tsOptions = createOptions(options, typeScriptOptions);

			// Execute streams
		    let stream = gulp
		        .src(sources)
		        // Pipe source to lint
		        .pipe(tslint())
		        .pipe(tslint.report("verbose", { emitError: globalEmit }))
		        // Push through to compiler
		        .pipe(ts(tsOptions))
		        // Through babel (es6->es5)
		        .pipe(babel());

			if (tsOptions.angular === true) {
				stream = stream.pipe(ngAnnotate());
			}

			if (tsOptions.concat === true) {

			}

			if (tsOptions.uglify === true) {

			}

			return stream.pipe(gulp.dest(outputDirectory));
		},

		/**
		 * Creates TypeScript compilation for given sources files and outputs them into a preferred release location.
		 * Used for frontend TypeScript. Specific compilation task for Angular projects, heavily leans on
		 * ngAnnotate and ngTemplates.
		 * @param {Object} gulp Gulp object.
		 * @param {String[]} sources Array of source files
		 * @param {String} outputDirectory Location to output the JS files to.
		 * @param {Object} options Typescript options file. Accepts common typescript flags.
		 * @returns {Object} Gulp stream.
		 */
		createAngularTypeScriptTask: (gulp, sources, outputDirectory, options) => {
			options.angular = true;
			return this.createPlainTypeScriptTask(gulp, sources, outputDirectory, options);
		},

		/**
		 * Creates Jade compilation for given sources files and outputs them into a preferred release location.
		 * @param {Object} gulp Gulp object.
		 * @param {String[]} sources Array of source files
		 * @param {String} outputDirectory Location to output the HTML files to.
		 * @param {Object} options Jade options file. Accepts common jade flags.
		 * @returns {Object} Gulp stream.
		 */
		createJadeTask: (gulp, sources, outputDirectory, options) => {
			const jadeOptions = createOptions(options, { pretty: true });
			const j = jade();

			// Depending on the global emit state we either allow the jade compiler to stop the execution on error or not,
			// when we are running in "watch" state we do not want it to stop as it stops the watch process
		    if(globalEmit === false) {
		        j.on('error', notify.onError(error => {
		            return 'An error occurred while compiling Jade.\nLook in the console for details.\n' + error;
		        }));
		    }

		    return gulp.src(sources)
		        .pipe(j)
		        .pipe(gulp.dest(outputDirectory));
		},

		/**
		 * Creates LESS compilation for given sources files and outputs them into a preferred release location.
		 * @param {Object} gulp Gulp object.
		 * @param {String[]} sources Array of source files
		 * @param {String} outputDirectory Location to output the CSS files to.
		 * @param {Object} options Jade options file. Accepts common jade flags.
		 * @returns {Object} Gulp stream.
		 */
		createLessTask: (gulp, sources, outputDirectory, options) => {
			const combined = combiner.obj([
		        gulp.src(sources),
		        less(options),
		        gulp.dest(outputDirectory)
		    ]);

		    if (globalEmit === false) {
		        combined.on("error", notify.onError(error => {
		            return 'An error occurred while compiling Less.\nLook in the console for details.\n' + error;
		        }))
		    }

		    return combined;
		}
	}
}

module.exports = sharedGulp;
