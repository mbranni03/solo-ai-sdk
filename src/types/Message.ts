import type { FunctionCall, FunctionResponse } from "./Tool";

export type ContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; imageUrl: { url: string } }
  | { type: "audio_url"; audioUrl: { url: string } }
  | { type: "video_url"; videoUrl: { url: string } };

export interface Message {
  role: "system" | "user" | "assistant" | "tool";
  content?: string | ContentPart[];
  functionCall?: FunctionCall;
  functionResponse?: FunctionResponse;
}
