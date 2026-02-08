import type { Request } from "./Request";
import type { Message } from "./Message";

export default interface Provider {
  name: string;
  generate: (query: Request, model?: string) => Promise<Message>;

  stream: (
    query: Request,
    model?: string,
  ) => Promise<ReadableStream<Uint8Array> | null>;
}
