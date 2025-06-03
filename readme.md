# Nestch CLI Tool

Nestch is a command-line interface (CLI) tool designed to simplify the process of renaming resources in a NestJS application. This tool allows developers to quickly and efficiently change the names of resources, ensuring consistency and reducing the potential for errors.

## Features

- Easily rename NestJS resources with a simple command.

- Built with TypeScript for type safety and better development experience.

- Modular design with separate files for commands and utility functions.

## Warning

| :warning: WARNING                                                                                                 |
| :---------------------------------------------------------------------------------------------------------------- |
| This package supports full functionality starting from version ^1.2.0. Versions below this may not work properly. |

## Installation

```bash

# Install globally

npm install -g nestch

```

## Usage

```

nestch rename <oldName> <newName> [options]

```

### Aliases

- `nestch rename` can be shortened to `nestch rn`

- `nestch change` can be used as an alias for `nestch rename`

### Options

- `--type, -t`: Specify the resource type to rename (e.g., module, controller, service)

- `--help, -h`: Show help

### Examples

1. **Rename a resource and all its references**

   ```bash

   # Rename 'users' to 'members' in the current project

   nestch rename users members

   ```

2. **Rename a specific resource type**

   ```bash

   # Rename only the users controller

   nestch rename users members --type controller



   # Shorthand for the above

   nestch rn users members -t controller

   ```

3. **Using the change alias**

   ```bash

   nestch change users members

   ```

## Requirements

- Must be run from the root of a NestJS project

- Project must have a `src` directory

- Project must have `@nestjs/*` dependencies in `package.json`

## How It Works

1. The tool verifies it's being run in a NestJS project

2. It searches for files matching the old resource name in the `src` directory

3. It identifies the type of each file based on its name and content

4. It renames the files and updates all references in:

   - Import/export statements

   - Decorators (e.g., `@Module`, `@Controller`)

   - Class names

   - Variable names

   - File paths

   - Dependency injection tokens

## Supported Resource Types

- Module

- Controller

- Service

- Entity

- DTO

- Guard

- Interceptor

- Pipe

- Filter

- Resolver

- Repository

- Gateway

- Subscriber

- Middleware

## Notes

- The tool will only modify files in the `src` directory

- It will automatically skip `node_modules`, `.git`, and other common directories

- Always commit your changes before running the tool, just in case

## Contributing

Contributions are welcome! If you have suggestions for improvements or new features, feel free to open an issue or submit a pull request.

## License

This project is licensed under the MIT License. See the LICENSE file for more details.
