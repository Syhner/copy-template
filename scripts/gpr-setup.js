const { writeFileSync, readFileSync } = require('fs');

const file = readFileSync('./package.json', {
  encoding: 'utf-8',
});

const json = JSON.parse(file);

json.name = '@syhner/copy-template';

writeFileSync('./package.json', JSON.stringify(json, undefined, 2));
