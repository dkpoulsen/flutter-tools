# Flutter Tools MCP Server

## Overview

The `flutter-tools` MCP server provides tools for interacting with the Flutter SDK. It offers two main tools: `get_diagnostics` and `apply_fixes`. These tools help in analyzing and fixing Dart/Flutter files.

## Tools

### get_diagnostics

**Description:** Get Flutter/Dart diagnostics for a file.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "file": {
      "type": "string",
      "description": "Path to the Dart/Flutter file"
    }
  },
  "required": ["file"]
}
```

**Example Usage:**
```json
{
  "name": "get_diagnostics",
  "arguments": {
    "file": "/path/to/your/file.dart"
  }
}
```

### apply_fixes

**Description:** Apply Dart fix suggestions to a file.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "file": {
      "type": "string",
      "description": "Path to the Dart/Flutter file"
    }
  },
  "required": ["file"]
}
```

**Example Usage:**
```json
{
  "name": "apply_fixes",
  "arguments": {
    "file": "/path/to/your/file.dart"
  }
}
```

## Dependencies

- `@modelcontextprotocol/sdk`: ^1.0.0
- `node-pty`: ^1.0.0
- `which`: ^4.0.0

## Dev Dependencies

- `@types/node`: ^18.19.0
- `@types/which`: ^3.0.3
- `typescript`: ^5.3.3

## Scripts

- `build`: Compiles the TypeScript code and sets the executable permissions on the compiled JavaScript file.
- `prepare`: Runs the `build` script.
- `watch`: Compiles the TypeScript code and watches for changes, recompiling automatically.

## Installation

To install the MCP server, add the following configuration to your MCP settings file:

```json
{
  "mcpServers": {
    "flutter-tools": {
      "command": "node",
      "args": ["/path/to/flutter-tools/build/index.js"],
      "env": {}
    }
  }
}
```

Replace `/path/to/flutter-tools/build/index.js` with the actual path to the compiled JavaScript file.

## Usage

1. Ensure the Flutter SDK is installed and available in your PATH.
2. Start the MCP server using the configured command.
3. Use the `get_diagnostics` and `apply_fixes` tools as needed.

## Example

```bash
node /path/to/flutter-tools/build/index.js
