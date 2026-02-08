import type { Message } from "./Message";
import type { FunctionDeclaration } from "./Tool";

export interface Request {
  systemMessage: string;
  messages: Message[];
  tools?: FunctionDeclaration[];
}
