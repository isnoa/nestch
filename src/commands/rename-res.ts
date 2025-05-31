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

  constructor() {
    this.srcPath = path.join(process.cwd(), "src");
  }

  public async execute(oldName: string, newName: string): Promise<void> {
    this.oldName = oldName;
    this.newName = newName;

    // Check if this is a NestJS project
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

    // Check if src directory exists
    if (!fs.existsSync(this.srcPath)) {
      console.error("src directory not found.");
      process.exit(1);
    }

    // Check if old name exists
    const oldNameLower = this.oldName.toLowerCase();
    const oldNameCapital = capitalizeFirstLetter(this.oldName);
    this.checkOldNameExists(this.srcPath, oldNameLower, oldNameCapital);

    if (!this.found) {
      console.error(`'${this.oldName}' not found.`);
      process.exit(1);
    }

    // Confirm before renaming
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

    // Execute renaming
    this.renameInProject(oldNameLower, oldNameCapital);
    console.log("Renaming completed successfully.");
  }

  private checkOldNameExists(
    dir: string,
    oldNameLower: string,
    oldNameCapital: string,
  ): void {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        this.checkOldNameExists(fullPath, oldNameLower, oldNameCapital);
      } else if (entry.isFile() && entry.name.endsWith(".ts")) {
        // Check filename
        if (entry.name.toLowerCase().includes(oldNameLower)) {
          this.found = true;
          return;
        }

        // Check file content
        try {
          const content = fs.readFileSync(fullPath, "utf8");
          if (
            content.includes(oldNameLower) ||
            content.includes(oldNameCapital)
          ) {
            this.found = true;
            return;
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

    // Rename files and directories
    this.renameFilesAndDirs(this.srcPath, oldNameLower, newNameLower);

    // Update file contents
    this.updateFileContents(
      this.srcPath,
      oldNameLower,
      newNameLower,
      oldNameCapital,
      newNameCapital,
    );
  }

  private renameFilesAndDirs(
    dir: string,
    oldName: string,
    newName: string,
  ): void {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const oldPath = path.join(dir, entry.name);

      // Generate new filename
      let newFileName = entry.name;
      if (entry.name.toLowerCase().includes(oldName)) {
        const index = entry.name.toLowerCase().indexOf(oldName);
        const prefix = entry.name.substring(0, index);
        const suffix = entry.name.substring(index + oldName.length);
        newFileName = prefix + newName + suffix;
      }

      const newPath = path.join(dir, newFileName);

      // Rename file
      if (oldPath !== newPath) {
        try {
          fs.renameSync(oldPath, newPath);
          this.renamedFiles.push(path.relative(process.cwd(), oldPath));
          console.log(`Renamed: ${oldPath} -> ${newPath}`);
        } catch (error) {
          console.error(`Error renaming file: ${oldPath}`, error);
        }
      }

      // Process directory recursively
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
    newNameCapital: string,
  ): void {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        this.updateFileContents(
          fullPath,
          oldNameLower,
          newNameLower,
          oldNameCapital,
          newNameCapital,
        );
      } else if (entry.isFile() && entry.name.endsWith(".ts")) {
        try {
          let content = fs.readFileSync(fullPath, "utf8");
          let updated = false;

          // Replace lowercase name
          if (content.includes(oldNameLower)) {
            content = content.split(oldNameLower).join(newNameLower);
            updated = true;
          }

          // Replace capitalized name
          if (content.includes(oldNameCapital)) {
            content = content.split(oldNameCapital).join(newNameCapital);
            updated = true;
          }

          // Write changes if updated
          if (updated) {
            fs.writeFileSync(fullPath, content, "utf8");
            console.log(`Updated file: ${fullPath}`);
          }
        } catch (error) {
          console.error(`Error updating file: ${fullPath}`, error);
        }
      }
    }
  }
}
