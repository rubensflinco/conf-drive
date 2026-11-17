const fs = require('node:fs');
const path = require('node:path');

const packageRoot = path.resolve(__dirname, '..');
const { version } = JSON.parse(fs.readFileSync(path.join(packageRoot, 'package.json'), 'utf8'));
const output = `// Generated from package.json by scripts/sync-version.cjs.\nexport const SDK_VERSION = ${JSON.stringify(version)};\n`;

fs.writeFileSync(path.join(packageRoot, 'src', 'version.ts'), output);
