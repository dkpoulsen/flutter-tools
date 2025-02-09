declare module '@modelcontextprotocol/sdk' {
  export class Server {
    constructor(info: { name: string; version: string }, config: { capabilities: { tools: {} } });
    onerror: (error: Error) => void;
    setRequestHandler<T>(schema: RequestSchema, handler: (request: T) => Promise<HandlerResponse>): void;
    connect(transport: StdioServerTransport): Promise<void>;
    close(): Promise<void>;
  }

  export class StdioServerTransport {
    constructor();
  }

  export interface RequestSchema {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  }

  export interface HandlerResponse {
    content: Array<{
      type: string;
      text: string;
    }>;
  }

  export const CallToolRequestSchema: RequestSchema;
  export const ListToolsRequestSchema: RequestSchema;

  export class McpError extends Error {
    constructor(code: ErrorCode, message: string);
  }

  export enum ErrorCode {
    InternalError = 'InternalError',
    InvalidParams = 'InvalidParams',
    MethodNotFound = 'MethodNotFound'
  }

  export interface CallToolRequest {
    params: {
      name: string;
      arguments?: {
        file?: string;
        [key: string]: any;
      };
    };
  }

  export interface Tool {
    name: string;
    description: string;
    inputSchema: {
      type: string;
      properties: Record<string, any>;
      required?: string[];
    };
  }

  export interface ListToolsResponse extends HandlerResponse {
    tools: Tool[];
  }
}