import type { Message } from "./Message";
import type { FunctionDeclaration } from "./Tool";

export interface Request {
  systemMessage: string;
  messages: Message[];
  tools?: FunctionDeclaration[];
  providerOptions?: {
    gemini?: {
      contextCacheName?: string;
      [key: string]: any;
    };
    anthropic?: {
      enableCaching?: boolean;
      cacheBreakpoints?: ("system" | "tools" | number)[];
    };
    [key: string]: any;
  };
}
