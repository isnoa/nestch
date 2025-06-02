import * as fs from "fs/promises";
import * as path from "path";
import prompts from "prompts";

function capitalizeFirstLetter(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function pluralize(word: string): string {
  if (/[^aeiou]y$/i.test(word)) {
    return word.replace(/y$/i, "ies");
  } else if (/(?:f|fe)$/i.test(word)) {
    return word.replace(/(?:f|fe)$/i, "ves");
  } else if (/(s|x|z|ch|sh)$/i.test(word)) {
    return word + "es";
  } else {
    return word + "s";
  }
}

function singularize(word: string): string {
  if (/ies$/i.test(word)) {
    return word.replace(/ies$/i, "y");
  } else if (/ves$/i.test(word)) {
    return word.replace(/ves$/i, (m) => {
      if (/[^aeiou]ves$/i.test(word)) return "f";
      return "fe";
    });
  } else if (/(s|x|z|ch|sh)es$/i.test(word)) {
    return word.replace(/es$/i, "");
  } else if (/s$/i.test(word) && !/ss$/i.test(word)) {
    return word.replace(/s$/i, "");
  } else {
    return word;
  }
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

    // 복수/단수 처리 (규칙적 변환)
    const oldNameSingular = singularize(oldName);
    const oldNamePlural = pluralize(oldNameSingular);
    const newNameSingular = singularize(newName);
    const newNamePlural = pluralize(newNameSingular);

    const packageJsonPath = path.join(process.cwd(), "package.json");
    try {
      await fs.access(packageJsonPath);
    } catch {
      console.error("package.json not found.");
      process.exit(1);
    }

    try {
      const pkg = JSON.parse(await fs.readFile(packageJsonPath, "utf8"));
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      if (!deps["@nestjs/core"] && !deps["@nestjs/common"]) {
        console.error("This is not a NestJS project.");
        process.exit(1);
      }
    } catch (error) {
      console.error("Error reading package.json:", error);
      process.exit(1);
    }

    try {
      await fs.access(this.srcPath);
    } catch {
      console.error("src directory not found.");
      process.exit(1);
    }

    const oldNameLower = oldNamePlural.toLowerCase();
    const oldNameCapital = capitalizeFirstLetter(oldNamePlural);
    const oldNameSingularLower = oldNameSingular.toLowerCase();
    const oldNameSingularCapital = capitalizeFirstLetter(oldNameSingular);
    const newNameLower = newNamePlural.toLowerCase();
    const newNameCapital = capitalizeFirstLetter(newNamePlural);
    const newNameSingularLower = newNameSingular.toLowerCase();
    const newNameSingularCapital = capitalizeFirstLetter(newNameSingular);
    await this.checkOldNameExists(this.srcPath, oldNameLower, oldNameCapital);

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

    await this.renameInProject(
      oldNameLower,
      oldNameCapital,
      oldNameSingularLower,
      oldNameSingularCapital,
      newNameLower,
      newNameCapital,
      newNameSingularLower,
      newNameSingularCapital,
    );

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

  private async checkOldNameExists(
    dir: string,
    oldNameLower: string,
    oldNameCapital: string,
  ): Promise<void> {
    if (this.found) return;

    let entries: any[] = [];
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch (e) {
      return;
    }

    for (const entry of entries) {
      if (this.found) break;

      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        await this.checkOldNameExists(fullPath, oldNameLower, oldNameCapital);
      } else if (entry.isFile() && entry.name.endsWith(".ts")) {
        if (entry.name.toLowerCase().includes(oldNameLower)) {
          this.found = true;
          break;
        }
        try {
          const content = await fs.readFile(fullPath, "utf8");
          if (
            content.includes(oldNameLower) ||
            content.includes(oldNameCapital)
          ) {
            this.found = true;
            break;
          }
        } catch (error) {
          console.error(`Error reading file: ${fullPath}`, error);
        }
      }
    }
  }

  private async renameInProject(
    oldNameLower: string,
    oldNameCapital: string,
    oldNameSingularLower: string,
    oldNameSingularCapital: string,
    newNameLower: string,
    newNameCapital: string,
    newNameSingularLower: string,
    newNameSingularCapital: string,
  ): Promise<void> {
    await this.renameFilesAndDirs(
      this.srcPath,
      oldNameLower,
      newNameLower,
      oldNameSingularLower,
      newNameSingularLower,
    );
    await this.updateFileContents(
      this.srcPath,
      oldNameLower,
      newNameLower,
      oldNameCapital,
      newNameCapital,
      oldNameSingularLower,
      newNameSingularLower,
      oldNameSingularCapital,
      newNameSingularCapital,
    );
  }

  private async renameFilesAndDirs(
    dir: string,
    oldName: string,
    newName: string,
    oldNameSingular: string,
    newNameSingular: string,
  ): Promise<void> {
    let entries: any[] = [];
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch (e) {
      return;
    }

    // 폴더 우선 정렬
    entries.sort((a, b) => {
      if (a.isDirectory() && !b.isDirectory()) return -1;
      if (!a.isDirectory() && b.isDirectory()) return 1;
      return 0;
    });

    for (const entry of entries) {
      const oldPath = path.join(dir, entry.name);
      let newFileName = entry.name;
      // 복수형 치환
      if (entry.name.toLowerCase().includes(oldName)) {
        const index = entry.name.toLowerCase().indexOf(oldName);
        const prefix = entry.name.substring(0, index);
        const suffix = entry.name.substring(index + oldName.length);
        newFileName = prefix + newName + suffix;
      }
      // 단수형 치환
      if (newFileName.toLowerCase().includes(oldNameSingular)) {
        const index = newFileName.toLowerCase().indexOf(oldNameSingular);
        const prefix = newFileName.substring(0, index);
        const suffix = newFileName.substring(index + oldNameSingular.length);
        newFileName = prefix + newNameSingular + suffix;
      }
      const newPath = path.join(dir, newFileName);

      if (entry.isDirectory()) {
        let nextDir = oldPath;
        if (oldPath !== newPath) {
          try {
            await fs.rename(oldPath, newPath);
            this.renamedFiles.push(
              path.relative(process.cwd(), oldPath) +
                " -> " +
                path.relative(process.cwd(), newPath),
            );
            nextDir = newPath;
          } catch (error) {
            const msg =
              typeof error === "object" && error && "message" in error
                ? (error as any).message
                : String(error);
            console.error(
              `[Error] Failed to rename: ${oldPath} -> ${newPath}\n  Reason:`,
              msg,
            );
            nextDir = oldPath;
          }
        }
        await this.renameFilesAndDirs(
          nextDir,
          oldName,
          newName,
          oldNameSingular,
          newNameSingular,
        );
      } else {
        if (oldPath !== newPath) {
          try {
            await fs.rename(oldPath, newPath);
            this.renamedFiles.push(
              path.relative(process.cwd(), oldPath) +
                " -> " +
                path.relative(process.cwd(), newPath),
            );
          } catch (error) {
            const msg =
              typeof error === "object" && error && "message" in error
                ? (error as any).message
                : String(error);
            console.error(
              `[Error] Failed to rename: ${oldPath} -> ${newPath}\n  Reason:`,
              msg,
            );
          }
        }
      }
    }
  }

  private async updateFileContents(
    dir: string,
    oldNameLower: string,
    newNameLower: string,
    oldNameCapital: string,
    newNameCapital: string,
    oldNameSingularLower: string,
    newNameSingularLower: string,
    oldNameSingularCapital: string,
    newNameSingularCapital: string,
  ): Promise<void> {
    let entries: any[] = [];
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch (e) {
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        await this.updateFileContents(
          fullPath,
          oldNameLower,
          newNameLower,
          oldNameCapital,
          newNameCapital,
          oldNameSingularLower,
          newNameSingularLower,
          oldNameSingularCapital,
          newNameSingularCapital,
        );
      } else if (entry.isFile() && entry.name.endsWith(".ts")) {
        try {
          let content = await fs.readFile(fullPath, "utf8");

          // 복수/단수, 대소문자 모두 치환
          const regexes: [RegExp, string][] = [
            [new RegExp(oldNameLower, "g"), newNameLower],
            [new RegExp(oldNameCapital, "g"), newNameCapital],
            [new RegExp(oldNameSingularLower, "g"), newNameSingularLower],
            [new RegExp(oldNameSingularCapital, "g"), newNameSingularCapital],
          ];
          let updated = false;
          for (const [regex, replacement] of regexes) {
            if (regex.test(content)) {
              content = content.replace(regex, replacement);
              updated = true;
            }
          }

          if (updated) {
            await fs.writeFile(fullPath, content, "utf8");
            this.updatedFiles.push(path.relative(process.cwd(), fullPath));
          }
        } catch (error) {
          const msg =
            typeof error === "object" && error && "message" in error
              ? (error as any).message
              : String(error);
          console.error(
            `[Error] Failed to update file: ${fullPath}\n  Reason:`,
            msg,
          );
        }
      }
    }
  }
}
