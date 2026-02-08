import type Provider from "@/types/Provider";
import getProvider from "@/providers";
import type { Message } from "@/types/Message";
import type { ProviderResponse } from "@/types/Response";

class Agent {
  provider: Provider;

  constructor(provider: string) {
    this.provider = getProvider(provider);
  }

  generate = async (
    systemMessage: string,
    messages: Message[],
    options?: {
      model?: string;
    },
  ) => {
    const response = await this.provider.generate(
      systemMessage,
      messages,
      options?.model,
    );
    return response;
  };

  stream = async (
    systemMessage: string,
    messages: Message[],
    options?: {
      model?: string;
      returnRawStream?: boolean;
      onChunk?: (chunk: string) => void;
    },
  ) => {
    const stream = await this.provider.stream(
      systemMessage,
      messages,
      options?.model,
    );
    // console.log(stream);

    if (options?.returnRawStream) return stream;
    if (!stream) throw new Error("No stream");

    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let fullText = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      // console.log("---");
      // console.log(chunk);

      const lines = chunk.split("\n");
      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const jsonStr = line.replace("data: ", "");
          try {
            const data = JSON.parse(jsonStr) as ProviderResponse;
            // console.log(JSON.stringify(data, null, 2));

            const textChunk =
              data.candidates?.[0]?.content?.parts?.[0]?.text || "";

            fullText += textChunk;
            console.log("Chunk:", textChunk); // Update your UI here!
          } catch (e) {
            // Partial JSON or empty line; ignore
          }
        }
      }
    }

    return fullText;
  };
}

export default Agent;
