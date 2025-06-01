import * as fs from "fs";
import * as path from "path";
import prompts from "prompts";

function capitalizeFirstLetter(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export class RenameResCommand {
  private oldName: string = "";
  private newName: string = "";
  private srcPath: string;
  private found: boolean = false;
  private renamedFiles: string[] = [];
  private updatedFiles: string[] = [];

  constructor() {
    this.srcPath = path.join(process.cwd(), "src");
  }

  public async execute(oldName: string, newName: string): Promise<void> {
    this.oldName = oldName;
    this.newName = newName;

    const packageJsonPath = path.join(process.cwd(), "package.json");
    if (!fs.existsSync(packageJsonPath)) {
      console.error("package.json not found.");
      process.exit(1);
    }

    try {
      const pkg = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      if (!deps["@nestjs/core"] && !deps["@nestjs/common"]) {
        console.error("This is not a NestJS project.");
        process.exit(1);
      }
    } catch (error) {
      console.error("Error reading package.json:", error);
      process.exit(1);
    }

    if (!fs.existsSync(this.srcPath)) {
      console.error("src directory not found.");
      process.exit(1);
    }

    const oldNameLower = this.oldName.toLowerCase();
    const oldNameCapital = capitalizeFirstLetter(this.oldName);
    this.checkOldNameExists(this.srcPath, oldNameLower, oldNameCapital);

    if (!this.found) {
      console.error(`'${this.oldName}' not found.`);
      process.exit(1);
    }

    const confirm = await prompts({
      type: "confirm",
      name: "confirm",
      message: `Do you want to rename '${this.oldName}' to '${this.newName}'?`,
      initial: false,
    });

    if (!confirm.confirm) {
      console.log("Operation cancelled.");
      return;
    }

    this.renameInProject(oldNameLower, oldNameCapital);

    if (this.renamedFiles.length > 0) {
      console.log(`\n[Renamed files/directories: ${this.renamedFiles.length}]`);
      this.renamedFiles.forEach((f) => console.log(`  - ${f}`));
    } else {
      console.log("No files or directories were renamed.");
    }
    if (this.updatedFiles.length > 0) {
      console.log(`\n[Updated file contents: ${this.updatedFiles.length}]`);
      this.updatedFiles.forEach((f) => console.log(`  - ${f}`));
    } else {
      console.log("No file contents were updated.");
    }
    console.log("\nRenaming completed successfully.");
  }

  private checkOldNameExists(dir: string, oldNameLower: string, oldNameCapital: string): void {
    if (this.found) return;

    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      if (this.found) break;

      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        this.checkOldNameExists(fullPath, oldNameLower, oldNameCapital);
      } else if (entry.isFile() && entry.name.endsWith(".ts")) {
        if (entry.name.toLowerCase().includes(oldNameLower)) {
          this.found = true;
          break;
        }
        try {
          const content = fs.readFileSync(fullPath, "utf8");
          if (content.includes(oldNameLower) || content.includes(oldNameCapital)) {
            this.found = true;
            break;
          }
        } catch (error) {
          console.error(`Error reading file: ${fullPath}`, error);
        }
      }
    }
  }

  private renameInProject(oldNameLower: string, oldNameCapital: string): void {
    const newNameLower = this.newName.toLowerCase();
    const newNameCapital = capitalizeFirstLetter(this.newName);

    this.renameFilesAndDirs(this.srcPath, oldNameLower, newNameLower);
    this.updateFileContents(this.srcPath, oldNameLower, newNameLower, oldNameCapital, newNameCapital);
  }

  private renameFilesAndDirs(dir: string, oldName: string, newName: string): void {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const oldPath = path.join(dir, entry.name);

      let newFileName = entry.name;
      if (entry.name.toLowerCase().includes(oldName)) {
        const index = entry.name.toLowerCase().indexOf(oldName);
        const prefix = entry.name.substring(0, index);
        const suffix = entry.name.substring(index + oldName.length);
        newFileName = prefix + newName + suffix;
      }

      const newPath = path.join(dir, newFileName);

      if (oldPath !== newPath) {
        try {
          fs.renameSync(oldPath, newPath);
          this.renamedFiles.push(
            path.relative(process.cwd(), oldPath) + " -> " + path.relative(process.cwd(), newPath)
          );
        } catch (error) {
          const msg =
            typeof error === "object" && error && "message" in error
              ? (error as any).message
              : String(error);
          console.error(`[Error] Failed to rename: ${oldPath} -> ${newPath}\n  Reason:`, msg);
        }
      }

      if (entry.isDirectory()) {
        this.renameFilesAndDirs(newPath, oldName, newName);
      }
    }
  }

  private updateFileContents(
    dir: string,
    oldNameLower: string,
    newNameLower: string,
    oldNameCapital: string,
    newNameCapital: string
  ): void {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        this.updateFileContents(fullPath, oldNameLower, newNameLower, oldNameCapital, newNameCapital);
      } else if (entry.isFile() && entry.name.endsWith(".ts")) {
        try {
          let content = fs.readFileSync(fullPath, "utf8");

          const regexLower = new RegExp(oldNameLower, "g");
          const regexCapital = new RegExp(oldNameCapital, "g");
          let updated = false;

          if (regexLower.test(content) || regexCapital.test(content)) {
            content = content.replace(regexLower, newNameLower).replace(regexCapital, newNameCapital);
            updated = true;
          }

          if (updated) {
            fs.writeFileSync(fullPath, content, "utf8");
            this.updatedFiles.push(path.relative(process.cwd(), fullPath));
          }
        } catch (error) {
          const msg =
            typeof error === "object" && error && "message" in error
              ? (error as any).message
              : String(error);
          console.error(`[Error] Failed to update file: ${fullPath}\n  Reason:`, msg);
        }
      }
    }
  }
}
