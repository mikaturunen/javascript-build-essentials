# Example use

Using `shared-gulpfile.js` as the common build source from your own `gulpfile.js`. Please note that the example assumes you've installed this repository as a sub-repo to your own. You can install it with NPM or just copy everything over. Whatever works for your workflow.

Gulpfile content:

```js
// ES6 specific example.
// Just think of all the 'const' definitions as 'var' and the '() => ' as 'function() {}'

"use strict";

const gulp = require("gulp");
const sequence = require("run-sequence").use(gulp);
const buildSteps = require("./javascript-build-essentials/build/shared-gulpfile");

const outputDirectory = "./foo/to/the/bar/";

gulp.task("typescript", () => buildSteps.createTypeScriptTask([ "./**/*.ts" ], outputDirectory));
gulp.task("jade", () => buildSteps.createJadeTask([ "./**/*.jade" ], outputDirectory));
gulp.task("less", () => buildSteps.createLessTask([ "./**/*.less" ], outputDirectory));

gulp.task("default", () => {
    buildSteps.globalEmitOn();
    return sequence([ "typescript", "jade", "less" ]);
});

```
Above example compiles Typescript files, Jade files and LESS files into given output directories.


Commands to run:

```
npm istall gulp run-sequence gulp-cli --save-dev
cd javascript-build-essentials && npm install && cd ..
gulp
```

Obviously if you install this repository with `npm install <repo>`, you do not need to manually do the npm install for `javascript-build-essentials` and can directly just run gulp.
