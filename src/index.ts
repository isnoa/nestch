#!/usr/bin/env node
import { Command } from "commander";
import { RenameResCommand } from "./commands/rename-resource";
import * as fs from "fs";
import * as path from "path";

const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, "../package.json"), "utf8"));

const program = new Command();

program
  .name("nestch")
  .description("CLI to rename NestJS resource names")
  .version(packageJson.version, "-v, --version", "Output the current version")
  .helpOption("-h, --help", "Output usage information");

program
  .command("rename <oldName> <newName>")
  .alias("rn")
  .description("Rename a NestJS resource and update all references")
  .addHelpText(
    "after",
    `
Examples:
  $ nestch rename users members
  $ nestch rename users members --type controller
  $ nestch rename users members --type service`
  )
  .action(async (oldName, newName, options) => {
    const renameResCommand = new RenameResCommand();
    await renameResCommand.execute(oldName, newName);
  });

program
  .command("change <oldName> <newName>")
  .alias("ch")
  .description("Alias for 'rename' command")
  .addHelpText(
    "after",
    `
Examples:
  $ nestch change users members
  $ nestch change users members --type controller`
  )
  .action(async (oldName, newName, options) => {
    const renameResCommand = new RenameResCommand();
    await renameResCommand.execute(oldName, newName);
  });

program.command("help [command]").description("Output usage information for a command");

program.parse(process.argv);
