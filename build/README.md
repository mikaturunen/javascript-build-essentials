# Example use

Using `shared-gulpfile.js` as the common build source:

```js
"use strict";

const gulp = require("gulp");
const sequence = require("run-sequence").use(gulp);
const buildSteps = require("./shared-gulpfile");

const outputDirectory = "./release/components/";

gulp.task("typescript", () => buildSteps.createTypeScriptTask([ "./types/**/*.d.ts", "./library/**/*.ts" ], outputDirectory));
gulp.task("jade", () => buildSteps.createJadeTask([ "./**/*.jade" ], outputDirectory));
gulp.task("less", () => buildSteps.createLessTask([ "./**/*.less" ], outputDirectory));

gulp.task("default", () => {
    buildSteps.globalEmitOn();
    return sequence([ "typescript", "jade", "less" ]);
});

```
Above example compiles Typescript files, Jade files and LESS files into given output directories.
