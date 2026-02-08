import type { FunctionCall, FunctionResponse } from "./Tool";

export interface Message {
  role: "system" | "user" | "assistant" | "tool";
  content?: string;
  functionCall?: FunctionCall;
  functionResponse?: FunctionResponse;
}
