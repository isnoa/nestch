const fs = require("fs");
const path = require("path");

function main() {
  const sourcePath = path.join(__dirname, "../package.json");
  const destPath = path.join(__dirname, "../dist/package.json");

  const source = fs.readFileSync(sourcePath).toString("utf-8");
  const sourceObj = JSON.parse(source);

  // Remove scripts and devDependencies for published package
  delete sourceObj.scripts;
  delete sourceObj.devDependencies;

  // Copy files field from original package.json
  if (sourceObj.files === undefined) {
    const originalSource = fs.readFileSync(sourcePath).toString("utf-8");
    const originalSourceObj = JSON.parse(originalSource);
    if (originalSourceObj.files !== undefined) {
      sourceObj.files = originalSourceObj.files;
    }
  }

  // Remove dist from main, bin, and files
  const removeDist = (value) => {
    if (typeof value === "string") {
      return value.replace(/\\?dist[\\/]/g, "");
    }
    return value;
  };

  if (sourceObj.main) {
    sourceObj.main = removeDist(sourceObj.main);
  }
  if (sourceObj.bin) {
    Object.keys(sourceObj.bin).forEach((key) => {
      sourceObj.bin[key] = removeDist(sourceObj.bin[key]);
    });
  }
  if (Array.isArray(sourceObj.files)) {
    sourceObj.files = sourceObj.files.map(removeDist);
  }

  const distDir = path.join(__dirname, "../dist");
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }

  fs.writeFileSync(destPath, Buffer.from(JSON.stringify(sourceObj, null, 2), "utf-8"));
  console.log(`Created ${destPath}`);
}

main();
