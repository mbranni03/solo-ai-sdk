import type { FunctionCall } from "./Tool";

export interface Part {
  text?: string;
  functionCall?: FunctionCall;
}

export interface Content {
  parts: Part[];
  role: string;
}

export interface Candidate {
  content: Content;
  finishReason?: string;
  index: number;
}

export interface PromptTokenDetails {
  modality: string;
  tokenCount: number;
}

export interface UsageMetadata {
  promptTokenCount: number;
  candidatesTokenCount: number;
  totalTokenCount: number;
  promptTokensDetails?: PromptTokenDetails[];
  thoughtsTokenCount?: number;
}

export interface ProviderResponse {
  candidates: Candidate[];
  usageMetadata?: UsageMetadata;
  modelVersion?: string;
  responseId?: string;
}
