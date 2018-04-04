const gulp = require('gulp');
const concat = require('gulp-concat');
const replace = require('gulp-replace');
const fs = require('fs');
const runsequence = require('run-sequence');
const footer = require('gulp-footer');
const shell = require('gulp-shell');
const tvm = require('tvm');

gulp.task('definitions', function(done) {
  runsequence('externalDefs', 'internalDefs', 'cleanDefs', 'validateDefs', done);
});

gulp.task('cleanDefs', function() {
  return (gulp
      .src('bin/ts/CoveoJsSearch.d.ts')
      .pipe(footer('declare module Coveo {\n\t class ResultLayout extends ResultLayoutSelector { }\n}\n'))
      .pipe(replace(/import.*$/gm, ''))
      .pipe(replace(/(declare module )(.*)( {$)/gm, '$1Coveo$3'))
      .pipe(replace(/export =.+;$/gm, ''))
      .pipe(replace(/export .+ from .+$/gm, ''))
      .pipe(replace(/export (?:default )?(.*)$/gm, '$1'))
      .pipe(replace(/private .+;$/gm, ''))
      .pipe(replace(/\t[A-Za-z]+;$/gm, ''))
      .pipe(replace(/\n\t\s*(\n\t\s*)/g, '$1'))
      .pipe(footer('declare module "coveo-search-ui" {\n\texport = Coveo;\n}'))
      .pipe(replace(/never/gm, 'void'))
      .pipe(replace(/ensureDom: Function;\n\s*options\?: any;/gm, 'ensureDom: Function;\n\t\toptions: any;'))
      .pipe(replace(/^(\s*const\s\w+\s)(=\s\w+);$/gm, '$1: any;'))
      .pipe(replace(/:\s?.*ModuleDefinition\./gm, ': ')) // Assume that types that end with ModuleDefinition were imported using the import type only syntax
      // and stripping ModuleDefinition will refer to the correct type.
      .pipe(replace(/\n\t(?:const|let|var)\s.*;/gm, ''))
      .pipe(replace(/readonly/gm, ''))
      .pipe(replace(/undefined/g, 'any'))
      .pipe(replace(/ Record<.*>/g, ' any'))
      .pipe(replace(/(enum [a-zA-Z_$]+\s{$)((?:\n^\s*[a-zA-Z_$]+ = "[a-zA-Z_$\s]+",$)*)/gm, clearEnumVariableDeclaration))
      .pipe(replace(/extends agGridModule\.[a-zA-Z]+/g, 'extends Object'))
      .pipe(replace(/implements agGridModule\.[a-zA-Z]+/g, 'implements Object'))
      .pipe(replace(/agGridModule\.[a-zA-Z]+/g, 'any'))
      .pipe(gulp.dest('bin/ts/')) );
});

function clearEnumVariableDeclaration(match, p1, p2) {
  let lines = p2.split('\n');
  lines = lines.map(line => line.replace(/ = ["|'][a-zA-Z_$\s]*["|']/, ''));
  return p1 + lines.join('\n');
}

gulp.task('externalDefs', function() {
  return gulp
    .src([
      './node_modules/@types/underscore/index.d.ts',
      './lib/es6-promise/index.d.ts',
      './lib/modal-box/index.d.ts',
      './lib/magic-box/index.d.ts',
      './node_modules/@types/d3/index.d.ts',
      './lib/globalize/index.d.ts',
      './lib/jstimezonedetect/index.d.ts',
      './lib/coveoanalytics/index.d.ts'
    ])
    .pipe(concat('Externals.d.ts'))
    .pipe(replace(/import.*$/gm, ''))
    .pipe(replace(/(declare module )(.*)( {$)/gm, '$1$2$3'))
    .pipe(replace(/export as namespace .*;$/gm, ''))
    .pipe(replace(/export =.+;$/gm, ''))
    .pipe(replace(/export .+ from .+$/gm, ''))
    .pipe(replace(/export (?:default )?(.*)$/gm, '$1'))
    .pipe(replace(/private .+;$/gm, ''))
    .pipe(replace(/\t[A-Za-z]+;$/gm, ''))
    .pipe(replace(/\n\t\s*(\n\t\s*)/g, '$1'))
    .pipe(replace(/never/gm, 'void'))
    .pipe(replace(/undefined/g, 'any'))
    .pipe(gulp.dest('./bin/ts'));
});

gulp.task('internalDefs', function() {
  return require('dts-generator').default({
    name: 'Coveo',
    project: './',
    out: 'bin/ts/CoveoJsSearch.d.ts',
    externs: ['Externals.d.ts'],
    verbose: true,
    exclude: [
      'lib/**/*.d.ts',
      'node_modules/**/*.d.ts',
      'typings/**/*.d.ts',
      'src/*.ts',
      'bin/**/*.d.ts',
      'test/lib/**/*.d.ts',
      'test/Test.ts'
    ]
  });
});

gulp.task('validateDefs', ['validateTSV1', 'validateTSV2']);

gulp.task('installTSV1', done => {
  const version = '1.8.10';
  new Promise(() => tvm.install(version, () => tvm.use(version, done)));
});

gulp.task('validateTSV1', ['installTSV1'], shell.task('node node_modules/tvm/current/bin/tsc --noEmit ./bin/ts/CoveoJsSearch.d.ts'));

gulp.task('validateTSV2', shell.task(['node node_modules/typescript/bin/tsc --noEmit ./bin/ts/CoveoJsSearch.d.ts']));
