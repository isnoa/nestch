const fs = require("fs");
const path = require("path");

function main() {
  const sourcePath = path.join(__dirname, "../package.json");
  const destPath = path.join(__dirname, "../dist/package.json");
  const npmignoreSourcePath = path.join(__dirname, "../.npmignore");
  const npmignoreDestPath = path.join(__dirname, "../dist/.npmignore");

  const source = fs.readFileSync(sourcePath).toString("utf-8");
  const sourceObj = JSON.parse(source);

  // Remove scripts and devDependencies for published package
  delete sourceObj.scripts;
  delete sourceObj.devDependencies;

  // Adjust main path if necessary
  if (sourceObj.main && sourceObj.main.startsWith("dist/")) {
    sourceObj.main = sourceObj.main.slice(5);
  }

  // Ensure dist directory exists
  const distDir = path.join(__dirname, "../dist");
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }

  // Write modified package.json to dist
  fs.writeFileSync(destPath, Buffer.from(JSON.stringify(sourceObj, null, 2), "utf-8"));
  console.log(`Created ${destPath}`);

  // Copy .npmignore to dist
  if (fs.existsSync(npmignoreSourcePath)) {
    fs.copyFileSync(npmignoreSourcePath, npmignoreDestPath);
    console.log(`Copied ${npmignoreSourcePath} to ${npmignoreDestPath}`);
  }
}

main();
