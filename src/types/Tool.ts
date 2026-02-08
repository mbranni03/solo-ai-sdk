import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

export class Tool<T = any> {
  name: string;
  description: string;
  schema: T;
  execute?: (
    args: T extends z.ZodTypeAny ? z.infer<T> : any,
  ) => Promise<string>;

  constructor(tool: {
    name: string;
    description: string;
    schema: T;
    execute?: (
      args: T extends z.ZodTypeAny ? z.infer<T> : any,
    ) => Promise<string>;
  }) {
    this.name = tool.name;
    this.description = tool.description;
    this.schema = tool.schema;
    this.execute = tool.execute;
  }

  getFunctionDeclaration = (): FunctionDeclaration => {
    let parameters: Record<string, any>;
    if (this.schema instanceof z.ZodType) {
      parameters = zodToJsonSchema(this.schema as any) as Record<string, any>;
      delete parameters["$schema"];
      delete parameters["additionalProperties"];
    } else {
      parameters = this.schema as Record<string, any>;
    }

    return {
      name: this.name,
      description: this.description,
      parameters,
    };
  };
}

export interface FunctionDeclaration {
  name: string;
  description: string;
  parameters?: Record<string, any>;
}

export interface FunctionCall {
  name: string;
  args: Record<string, any>;
}

export interface FunctionResponse {
  name: string;
  response: Record<string, any>;
}
