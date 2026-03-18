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

  /**
   * Stream a response and produce a normalized ReadableStream of SSE events.
   *
   * Emits:
   * - `data: {"type":"chunk","text":"..."}\n\n` for each text chunk
   * - `data: {"type":"done","content":"...","usage":{"input_tokens":N,"output_tokens":N}}\n\n` on completion
   * - `data: {"type":"error","message":"..."}\n\n` on error
   */
  streamSSE = (
    systemMessage: string,
    messages: Message[],
    options?: {
      model?: string;
      tools?: Record<string, Tool>;
    },
  ): ReadableStream<Uint8Array> => {
    const encoder = new TextEncoder();
    const agent = this;

    return new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          const tools = Object.values(options?.tools || {}).map((tool: Tool) =>
            tool.getFunctionDeclaration(),
          );

          const rawStream = await agent.provider.stream(
            { systemMessage, messages, tools },
            options?.model,
          );

          if (!rawStream) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: "error", message: "No stream returned from provider" })}\n\n`),
            );
            controller.close();
            return;
          }

          const reader = rawStream.getReader();
          const decoder = new TextDecoder();
          let fullText = "";
          let inputChars = 0;

          // Count input chars for token estimation
          inputChars += systemMessage.length;
          for (const m of messages) {
            if (typeof m.content === "string") inputChars += m.content.length;
            else if (Array.isArray(m.content)) {
              for (const p of m.content) {
                if (p.type === "text") inputChars += p.text.length;
              }
            }
          }

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split("\n");

            for (const line of lines) {
              if (!line.startsWith("data: ")) continue;
              const jsonStr = line.slice(6).trim();
              if (!jsonStr || jsonStr === "[DONE]") continue;

              try {
                const data = JSON.parse(jsonStr);

                // --- Gemini format ---
                const geminiText = data.candidates?.[0]?.content?.parts?.[0]?.text;
                if (geminiText) {
                  fullText += geminiText;
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ type: "chunk", text: geminiText })}\n\n`),
                  );
                  continue;
                }

                // --- OpenAI format ---
                const oaiDelta = data.choices?.[0]?.delta?.content;
                if (oaiDelta) {
                  fullText += oaiDelta;
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ type: "chunk", text: oaiDelta })}\n\n`),
                  );
                  continue;
                }

                // --- Anthropic format ---
                if (data.type === "content_block_delta" && data.delta?.text) {
                  fullText += data.delta.text;
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ type: "chunk", text: data.delta.text })}\n\n`),
                  );
                  continue;
                }

                // Anthropic message_stop / message_delta with usage
                if (data.type === "message_delta" && data.usage) {
                  // Will be captured in done event below
                }
              } catch {
                // Partial JSON or non-JSON line, skip
              }
            }
          }

          // Estimate tokens (fallback: ~4 chars per token)
          const estimatedInputTokens = Math.ceil(inputChars / 4);
          const estimatedOutputTokens = Math.ceil(fullText.length / 4);

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "done",
                content: fullText,
                usage: {
                  input_tokens: estimatedInputTokens,
                  output_tokens: estimatedOutputTokens,
                },
              })}\n\n`,
            ),
          );
          controller.close();
        } catch (err: any) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "error", message: err.message || "Stream error" })}\n\n`),
          );
          controller.close();
        }
      },
    });
  };
}

export default Agent;
