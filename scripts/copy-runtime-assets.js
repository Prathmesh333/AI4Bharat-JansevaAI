const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');

const copies = [
  ['server/public', 'dist/server/public'],
  ['dataset', 'dist/dataset'],
];

for (const [sourceRelative, destinationRelative] of copies) {
  const source = path.join(projectRoot, sourceRelative);
  const destination = path.join(projectRoot, destinationRelative);

  if (!fs.existsSync(source)) {
    continue;
  }

  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.cpSync(source, destination, { recursive: true, force: true });
  console.log(`Copied ${sourceRelative} -> ${destinationRelative}`);
}
