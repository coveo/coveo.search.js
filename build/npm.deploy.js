'use strict';
const { promisify } = require('util');
const exec = promisify(require('child_process').exec);
const fs = require('fs');
const os = require('os');

async function deployTaggedVersion() {
  const suffix = 'beta';
  console.log(`Doing a NPM deployment of a ${suffix} version`);
  await publishToNpm(['--tag', suffix], `Deploy ${suffix} is done`);
}

async function publishToNpm(publishArgs = [], successMessage) {
  const args = ['publish', ...publishArgs].join(' ');
  const defaultBufferSize = 1024 * 200;

  await exec(`npm ${args}`, { maxBuffer: defaultBufferSize * 10 });
  console.log(successMessage);
}

function setNpmrcFile() {
  const fileName = `${os.homedir()}/.npmrc`;
  const npmrcString = `//registry.npmjs.org/:_authToken=${process.env.NPM_TOKEN}`;

  console.log('setting npmrc file');
  return new Promise((resolve, reject) => fs.writeFile(fileName, npmrcString, err => (err ? reject(err) : resolve())));
}

function isTagged() {
  const tag = process.env.TAG_NAME || '';
  return tag !== '';
}

async function main() {
  if (!isTagged()) {
    return console.log('Skipping NPM deployment because this is not a tagged commit');
  }

  await setNpmrcFile();
  await deployTaggedVersion();
}

main();
