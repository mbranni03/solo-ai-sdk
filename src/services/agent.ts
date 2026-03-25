import type Provider from "@/types/Provider";
import getProvider from "@/providers";
import type { Message } from "@/types/Message";
import type { ProviderResponse } from "@/types/Response";
import type { Tool } from "@/types/Tool";
import { FoundationalModels } from "@/config/models";

class Agent {
  provider: Provider;

  constructor(provider: string) {
    // For now, hardcode using aws_bedrock as requested
    this.provider = getProvider("aws_bedrock");
  }

  private resolveModel(model?: string): string {
    if (!model) return "zai.glm-5"; // Default if no model provided
    
    const fm = FoundationalModels as any;
    if (fm[model]?.aws_bedrock?.modelId) {
      const resolved = fm[model].aws_bedrock.modelId;
      console.log(`[Agent] Resolved ${model} to Bedrock modelId: ${resolved}`);
      return resolved;
    }
    
    return model;
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
    const resolvedModel = this.resolveModel(options?.model);
    const response = await this.provider.generate(
      { systemMessage, messages, tools },
      resolvedModel,
    );
// ... existing OpenAI format code

    // Return in OpenAI ChatCompletion format
    return {
      id: `chatcmpl-${Date.now()}`,
      object: "chat.completion" as const,
      created: Math.floor(Date.now() / 1000),
      model: options?.model || "unknown",
      choices: [
        {
          index: 0,
          message: {
            role: "assistant" as const,
            content: response.content as string | null,
            tool_calls: response.functionCall
              ? [
                  {
                    id: `call_${Date.now()}`,
                    type: "function" as const,
                    function: {
                      name: response.functionCall.name,
                      arguments: JSON.stringify(response.functionCall.args),
                    },
                  },
                ]
              : undefined,
          },
          finish_reason: response.functionCall ? "tool_calls" : "stop",
        },
      ],
      usage: response.usage
        ? {
            prompt_tokens: response.usage.input_tokens,
            completion_tokens: response.usage.output_tokens,
            total_tokens:
              response.usage.input_tokens + response.usage.output_tokens,
          }
        : undefined,
    };
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
    const resolvedModel = this.resolveModel(options?.model);
    const stream = await this.provider.stream(
      { systemMessage, messages, tools },
      resolvedModel,
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
   * Stream a response and produce a normalized ReadableStream of SSE events
   * following the OpenAI `chat.completions` streaming format.
   *
   * Emits OpenAI-compatible chunks:
   * - `data: {"id":"...","object":"chat.completion.chunk","choices":[{"index":0,"delta":{"content":"..."}}]}\n\n`
   * - Final chunk with `usage` field when available
   * - `data: [DONE]\n\n` to signal end of stream
   */
  streamSSE = (
    systemMessage: string,
    messages: Message[],
    options?: {
      model?: string;
      tools?: Record<string, Tool>;
      stream_options?: {
        include_usage?: boolean;
      };
    },
  ): ReadableStream<Uint8Array> => {
    const encoder = new TextEncoder();
    const agent = this;
    const chatId = `chatcmpl-${Date.now()}`;
    const created = Math.floor(Date.now() / 1000);
    const modelName = options?.model || "unknown";
    const includeUsage = options?.stream_options?.include_usage === true;

    return new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          console.log(`[Agent] Starting streamSSE for model: ${modelName}, includeUsage: ${includeUsage}`);
          const tools = Object.values(options?.tools || {}).map((tool: Tool) =>
            tool.getFunctionDeclaration(),
          );

          const resolvedModel = agent.resolveModel(options?.model);
          const rawStream = await agent.provider.stream(
            { systemMessage, messages, tools },
            resolvedModel,
          );

          if (!rawStream) {
            console.error("[Agent] No stream returned from provider");
            const errorChunk = {
              id: chatId,
              object: "chat.completion.chunk",
              created,
              model: modelName,
              choices: [],
              error: { message: "No stream returned from provider" },
            };
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(errorChunk)}\n\n`),
            );
            controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
            controller.close();
            return;
          }

          const reader = rawStream.getReader();
          const decoder = new TextDecoder();
          let fullText = "";
          let inputChars = 0;
          let sseBuffer = "";
          let chunkIndex = 0;
          let realUsage: { input_tokens: number; output_tokens: number } | null =
            null;

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
            if (done) {
              console.log(`[Agent] SDK reader done. Received ${chunkIndex} chunks.`);
              break;
            }

            chunkIndex++;
            const chunk = decoder.decode(value, { stream: true });
            sseBuffer += chunk;

            const lines = sseBuffer.split("\n");
            // Important: keep the last (potentially incomplete) line in the buffer
            sseBuffer = lines.pop() || "";

            for (const line of lines) {
              if (!line.startsWith("data: ")) continue;
              const jsonStr = line.slice(6).trim();
              if (!jsonStr || jsonStr === "[DONE]") {
                if (jsonStr === "[DONE]") console.log("[Agent] Received [DONE]");
                continue;
              }

              try {
                const data = JSON.parse(jsonStr);

                // Helper to emit an OAI chunk
                const emitChunk = (content: string | null, finishReason: string | null = null, usage: any = null) => {
                  const oaiChunk: any = {
                    id: chatId,
                    object: "chat.completion.chunk",
                    created,
                    model: modelName,
                    choices: [
                      {
                        index: 0,
                        delta: content !== null ? { content } : {},
                        finish_reason: finishReason,
                      },
                    ],
                  };
                  if (includeUsage) {
                    oaiChunk.usage = usage; // null for intermediate chunks
                  }
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify(oaiChunk)}\n\n`),
                  );
                };

                // --- Gemini format ---
                const geminiText = data.candidates?.[0]?.content?.parts?.[0]?.text;
                const geminiFinishReason = data.candidates?.[0]?.finishReason;
                if (geminiText) {
                  fullText += geminiText;
                  emitChunk(geminiText, geminiFinishReason === "STOP" ? "stop" : null);
                } else if (geminiFinishReason) {
                   emitChunk(null, geminiFinishReason === "STOP" ? "stop" : "length");
                }

                if (data.usageMetadata) {
                  realUsage = {
                    input_tokens: data.usageMetadata.promptTokenCount,
                    output_tokens: data.usageMetadata.candidatesTokenCount,
                  };
                }

                // --- OpenAI format (used by OpenAI, Mistral, Nvidia, etc.) ---
                const oaiDelta = data.choices?.[0]?.delta?.content;
                const oaiFinishReason = data.choices?.[0]?.finish_reason;
                if (oaiDelta || oaiFinishReason) {
                  if (oaiDelta) fullText += oaiDelta;
                  emitChunk(oaiDelta || null, oaiFinishReason || null);
                }

                if (data.usage) {
                  realUsage = {
                    input_tokens: data.usage.prompt_tokens || data.usage.input_tokens,
                    output_tokens: data.usage.completion_tokens || data.usage.output_tokens,
                  };
                }

                // --- Anthropic format ---
                if (data.type === "content_block_delta" && data.delta?.text) {
                  fullText += data.delta.text;
                  emitChunk(data.delta.text);
                } else if (data.type === "message_delta" && data.delta?.stop_reason) {
                  emitChunk(null, data.delta.stop_reason === "end_turn" ? "stop" : data.delta.stop_reason);
                }

                // Anthropic message_stop / message_delta with usage
                if (
                  (data.type === "message_delta" || data.type === "message_start") &&
                  data.message?.usage
                ) {
                  realUsage = {
                    input_tokens: data.message.usage.input_tokens,
                    output_tokens: data.message.usage.output_tokens,
                  };
                } else if (data.type === "message_delta" && data.usage) {
                  if (!realUsage) realUsage = { input_tokens: 0, output_tokens: 0 };
                  if (data.usage.output_tokens) realUsage.output_tokens = data.usage.output_tokens;
                }
              } catch (e) {
                console.warn("[Agent] Failed to parse SSE JSON chunk:", jsonStr, e);
              }
            }
          }

          // Decide usage: real if available, else estimated
          const usageResult = realUsage || {
            input_tokens: Math.ceil(inputChars / 4),
            output_tokens: Math.ceil(fullText.length / 4),
          };

          console.log(`[Agent] Stream complete. Total text length: ${fullText.length}. Usage:`, usageResult);

          // Emit final chunk with usage if requested
          if (includeUsage) {
            const usageChunk = {
              id: chatId,
              object: "chat.completion.chunk",
              created,
              model: modelName,
              choices: [],
              usage: {
                prompt_tokens: usageResult.input_tokens,
                completion_tokens: usageResult.output_tokens,
                total_tokens: usageResult.input_tokens + usageResult.output_tokens,
              },
            };
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(usageChunk)}\n\n`),
            );
          }

          // Signal end of stream
          controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
          controller.close();
        } catch (err: any) {
          console.error("[Agent] Stream error:", err);
          const errorChunk = {
            id: `chatcmpl-${Date.now()}`,
            object: "chat.completion.chunk",
            created: Math.floor(Date.now() / 1000),
            model: modelName,
            choices: [],
            error: { message: err.message || "Stream error" },
          };
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(errorChunk)}\n\n`),
          );
          controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
          controller.close();
        }
      },
    });
  };
}

export default Agent;
