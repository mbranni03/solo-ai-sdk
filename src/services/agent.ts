import type Provider from "@/types/Provider";
import getProvider from "@/providers";
import type { Message } from "@/types/Message";
import type { ProviderResponse } from "@/types/Response";
import type { Tool } from "@/types/Tool";

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
      tools?: Record<string, Tool>;
    },
  ) => {
    const tools = Object.values(options?.tools || {}).map((tool: Tool) =>
      tool.getFunctionDeclaration(),
    );
    const response = await this.provider.generate(
      { systemMessage, messages, tools },
      options?.model,
    );
    return response;
  };

  stream = async (
    systemMessage: string,
    messages: Message[],
    options?: {
      model?: string;
      tools?: Record<string, Tool>;
      returnRawStream?: boolean;
      onChunk?: (chunk: string) => void;
    },
  ) => {
    const tools = Object.values(options?.tools || {}).map((tool: Tool) =>
      tool.getFunctionDeclaration(),
    );
    const stream = await this.provider.stream(
      { systemMessage, messages, tools },
      options?.model,
    );

    // Return the raw stream
    if (options?.returnRawStream) return stream;

    if (!stream) throw new Error("No stream");

    // Handle Stream directly
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let fullText = "";
    let functionCall: any = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });

      const lines = chunk.split("\n");
      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const jsonStr = line.replace("data: ", "");
          try {
            const data = JSON.parse(jsonStr) as ProviderResponse;

            const part = data.candidates?.[0]?.content?.parts?.[0];
            const textChunk = part?.text || "";

            if (textChunk) {
              fullText += textChunk;
              if (options?.onChunk) {
                options.onChunk(textChunk);
              } else {
                console.log("Chunk:", textChunk);
              }
            }

            if (part?.functionCall) {
              functionCall = part.functionCall;
            }
          } catch (e) {
            // Partial JSON or empty line; ignore
          }
        }
      }
    }

    return {
      role: "assistant",
      content: fullText || undefined,
      functionCall: functionCall || undefined,
    } as Message;
  };
}

export default Agent;
