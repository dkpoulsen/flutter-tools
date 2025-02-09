#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { spawn } from 'node-pty';
import which from 'which';

interface FlutterToolsServer {
  flutterProcess?: any;
}

interface McpRequest {
  jsonrpc: '2.0';
  id: number;
  method: string;
  params: any;
}

interface McpResponse {
  jsonrpc: '2.0';
  id: number;
  result?: any;
  error?: {
    code: number;
    message: string;
  };
}

class FlutterTools {
  private nextId = 1;
  private state: FlutterToolsServer = {};
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'flutter-tools',
        version: '0.1.0',
      },
      {
        capabilities: {
          resources: {},
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
    this.server.onerror = (error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private async findFlutterSdk(): Promise<string> {
    try {
      return await which('flutter');
    } catch (error) {
      throw new Error('Flutter SDK not found in PATH. Please ensure Flutter is installed and in your PATH.');
    }
  }

  private async startFlutterDaemon() {
    if (!this.state.flutterProcess) {
      const flutterPath = await this.findFlutterSdk();
      this.state.flutterProcess = spawn(flutterPath, ['daemon'], {
        name: 'xterm-color',
        cols: 80,
        rows: 30,
      });
    }
  }

  private async cleanup() {
    if (this.state.flutterProcess) {
      this.state.flutterProcess.kill();
    }
    process.exit(0);
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'get_diagnostics',
          description: 'Get Flutter/Dart diagnostics for a file',
          inputSchema: {
            type: 'object',
            properties: {
              file: {
                type: 'string',
                description: 'Path to the Dart/Flutter file',
              },
            },
            required: ['file'],
          },
        },
        {
          name: 'apply_fixes',
          description: 'Apply Dart fix suggestions to a file',
          inputSchema: {
            type: 'object',
            properties: {
              file: {
                type: 'string',
                description: 'Path to the Dart/Flutter file',
              },
            },
            required: ['file'],
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      if (request.params.name !== 'get_diagnostics' && request.params.name !== 'apply_fixes') {
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown tool: ${request.params.name}`
        );
      }

      await this.startFlutterDaemon();

      switch (request.params.name) {
        case 'get_diagnostics': {
          const filePath = String(request.params.arguments?.file);
          if (!filePath) {
            throw new McpError(
              ErrorCode.InvalidParams,
              'File path is required'
            );
          }

          const diagnostics = await this.getDiagnostics(filePath);
          return {
            jsonrpc: '2.0',
            result: {
              content: [{
                type: 'text',
                text: JSON.stringify(diagnostics, null, 2),
              }],
            },
          };
        }

        case 'apply_fixes': {
          const filePath = String(request.params.arguments?.file);
          if (!filePath) {
            throw new McpError(
              ErrorCode.InvalidParams,
              'File path is required'
            );
          }

          const result = await this.applyFixes(filePath);
          return {
            jsonrpc: '2.0',
            result: {
              content: [{
                type: 'text',
                text: `Applied fixes to ${filePath}: ${result}`,
              }],
            },
          };
        }

        default:
          throw new McpError(
            ErrorCode.MethodNotFound,
            `Unknown tool: ${request.params.name}`
          );
      }
    });
  }

  private async getDiagnostics(filePath: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const flutterPath = this.findFlutterSdk();
      const process = spawn(String(flutterPath), ['analyze', filePath, '--json'], {
        name: 'xterm-color',
        cols: 80,
        rows: 30,
      });

      let output = '';
      const dataHandler = process.onData((data: string) => {
        output += data;
      });

      const cleanup = () => {
        process.kill();
        if (dataHandler) {
          dataHandler.dispose();
        }
      };

      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error('Timeout waiting for diagnostics'));
      }, 30000);

      const interval = setInterval(() => {
        try {
          const diagnostics = JSON.parse(output);
          clearTimeout(timeout);
          clearInterval(interval);
          cleanup();
          resolve(diagnostics);
        } catch {
          // Keep waiting for complete output
        }
      }, 100);
    });
  }

  private async applyFixes(filePath: string): Promise<string> {
    if (!this.state.flutterProcess) {
      throw new Error('Flutter process not initialized');
    }

    return new Promise<string>((resolve, reject) => {
      let output = '';
      const process = this.state.flutterProcess;

      if (!process) {
        reject(new Error('Flutter process not available'));
        return;
      }

      process.write(`dart fix --apply ${filePath}\r`);

      const dataHandler = process.onData((data: string) => {
        output += data;
        if (output.includes('Applied')) {
          dataHandler.dispose();
          resolve(output.trim());
        }
      });

      setTimeout(() => {
        if (dataHandler) {
          dataHandler.dispose();
        }
        reject(new Error('Timeout waiting for dart fix to complete'));
      }, 30000);
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Flutter Tools MCP server running on stdio');
  }
}

const server = new FlutterTools();
server.run().catch((error: unknown) => {
  const errorMessage = error instanceof Error ? error.message : String(error);
  console.error('Server error:', errorMessage);
  process.exit(1);
});
