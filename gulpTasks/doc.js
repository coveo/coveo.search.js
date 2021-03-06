'use strict';
const gulp = require('gulp');
const TypeDoc = require('typedoc');
const fs = require('fs');
const shell = require('gulp-shell');
const notSupportedFeaturesConfig = require('./notSupportedFeaturesConfig');
const del = require('del');
const _ = require('underscore');
const baseTsConfig = require('../tsconfig.json');

const docgenJsonPath = './bin/docgen/docgen.json';

const copyBinToDoc = gulp.series(cleanGeneratedThemesFiles, copyThemeFiles);

const buildPlayground = shell.task(['npx webpack --config ./webpack.playground.config.js']);

const buildDoc = gulp.series(gulp.parallel(copyBinToDoc, buildPlayground), generateDocs);

function generateDocs() {
  const typedocConfig = {
    ...baseTsConfig.compilerOptions,
    mode: 'file',
    theme: 'docs/theme',
    name: 'Coveo JavaScript Search Framework - Reference Documentation',
    readme: 'README.md',
    excludePrivate: true,
    excludeProtected: true,
    ignoreCompilerErrors: true,
    notSupportedFeaturesConfig
  };

  const app = new TypeDoc.Application(typedocConfig);
  const src = app.expandInputFiles(['src']);
  const project = app.convert(src);
  app.generateDocs(project, 'docgen');
  app.generateJson(project, docgenJsonPath, 'https://coveo.github.io/search-ui/');
  return gulp.src('./readme.png').pipe(gulp.dest('./docgen'));
}

const doc = gulp.series(buildDoc, testDoc, copyDocgenToBin);

function cleanGeneratedThemesFiles() {
  return del(['./docs/theme/assets/gen/**/*']);
}

function copyThemeFiles() {
  return gulp.src('./bin/{js,image,css}/**/*').pipe(gulp.dest('./docs/theme/assets/gen'));
}

function copyDocgenToBin() {
  return gulp.src('./docgen/**/*').pipe(gulp.dest('./bin/docgen'));
}

function testDoc(cb) {
  const docgenJson = JSON.parse(fs.readFileSync(docgenJsonPath));
  if (!docgenJson || !docgenJson.length) {
    throw new Error('Invalid object');
  }

  checkAllAttributesAreDefinedCorrectly(docgenJson);
  checkSpecificKeywords(docgenJson);
  checkSpecificElements(docgenJson);
  cb();
}

function checkAllAttributesAreDefinedCorrectly(docgenJson) {
  const attributes = [
    { name: 'name', types: ['string'] },
    { name: 'notSupportedIn', types: ['string', 'object'] },
    { name: 'comment', types: ['string'] },
    { name: 'type', types: ['string'] },
    { name: 'constrainedValues', types: ['object'] },
    { name: 'miscAttributes', types: ['object'] }
  ];

  _.each(docgenJson, element =>
    _.each(attributes, ({ name, types }) => {
      const propertyMissing = !_.has(element, name);
      const valueTypeIsInvalid = !_.contains(types, typeof element[name]);

      if (propertyMissing || valueTypeIsInvalid) {
        throw new Error(`Invalid or missing attribute "${name}" for doc element "${JSON.stringify(element)}"`);
      }
    })
  );
}

function checkSpecificKeywords(docgenJson) {
  const keywords = ['Analytics', 'QueryBuilder', 'Recommendation'];
  _.each(keywords, keyword => {
    if (!_.find(docgenJson, doc => doc.name.includes(keyword))) {
      throw new Error(`Can't find keyword "${keyword}" in name`);
    }
  });
}

function checkSpecificElements(docgenJson) {
  const notSupportedInElement = _.findWhere(docgenJson, { name: 'Thumbnail' }).notSupportedIn.length;
  const constrainedValuesElement = _.findWhere(docgenJson, { name: 'Facet.options.availableSorts' }).constrainedValues.length;
  const miscAttributesElement = _.findWhere(docgenJson, { name: 'Querybox.options.searchAsYouTypeDelay' }).miscAttributes.defaultValue;

  if (!notSupportedInElement || !constrainedValuesElement || !miscAttributesElement) {
    throw new Error(`Can't validate specific elements`);
  }
}

module.exports = { doc };
