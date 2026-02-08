import type { Message } from "./Message";

export default interface Provider {
  name: string;
  generate: (
    systemMessage: string,
    messages: Message[],
    model?: string,
  ) => Promise<string>;
  stream: (
    systemMessage: string,
    messages: Message[],
    model?: string,
  ) => Promise<ReadableStream<Uint8Array> | null>;
}
