import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

export class Tool<T = any> {
  name: string;
  description: string;
  schema: T;
  execute?: (args: T extends z.ZodTypeAny ? z.infer<T> : any) => Promise<any>;

  constructor(tool: {
    name: string;
    description: string;
    schema: T;
    execute?: (args: T extends z.ZodTypeAny ? z.infer<T> : any) => Promise<any>;
  }) {
    this.name = tool.name;
    this.description = tool.description;
    this.schema = tool.schema;
    this.execute = tool.execute;
  }

  getFunctionDeclaration = (): FunctionDeclaration => {
    let parameters: Record<string, any>;
    let propertyOrdering: string[] = [];

    if (this.schema instanceof z.ZodType) {
      parameters = zodToJsonSchema(this.schema as any) as Record<string, any>;
      propertyOrdering = Object.keys(parameters.properties || {});
      delete parameters["$schema"];
    } else {
      parameters = { ...(this.schema as Record<string, any>) };
      propertyOrdering = Object.keys(parameters.properties || {});
    }

    const parametersJsonSchema = {
      type: "object" as const,
      properties: parameters.properties || {},
      required: parameters.required || [],
      additionalProperties: false as const,
      propertyOrdering,
    };

    // Gemini doesn't like additionalProperties in some versions, and $schema
    delete parameters["additionalProperties"];

    return {
      name: this.name,
      description: this.description,
      parameters,
      parametersJsonSchema,
    };
  };
}

export interface FunctionDeclaration {
  name: string;
  description: string;
  parameters?: Record<string, any>;
  parametersJsonSchema?: {
    type: "object";
    properties: Record<string, any>;
    required: string[];
    additionalProperties: false;
    propertyOrdering: string[];
  };
}

export interface FunctionCall {
  name: string;
  args: Record<string, any>;
}

export interface FunctionResponse {
  name: string;
  response: Record<string, any>;
}
