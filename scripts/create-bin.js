const fs = require("fs");
const path = require("path");

const binDir = path.join(__dirname, "../dist/bin");
const binFile = path.join(binDir, "cli.js");
const content = `#!/usr/bin/env node\nrequire('../lib/index');`;

fs.mkdirSync(binDir, { recursive: true });
fs.writeFileSync(binFile, content, { encoding: "utf8" });

console.log(`Created ${binFile}`);
