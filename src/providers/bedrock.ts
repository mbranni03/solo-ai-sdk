import {
  BedrockRuntimeClient,
  ConverseCommand,
  ConverseStreamCommand,
} from "@aws-sdk/client-bedrock-runtime";
import type { Message } from "@/types/Message";
import type Provider from "@/types/Provider";
import type { Request } from "@/types/Request";

class BedrockProvider implements Provider {
  name = "bedrock";
  client: BedrockRuntimeClient;

  constructor(region: string = "us-east-1") {
    this.client = new BedrockRuntimeClient({ region });
  }

  generate = async (
    query: Request,
    model: string = "zai.glm-5",
  ): Promise<Message> => {
    const command = new ConverseCommand({
      modelId: model,
      messages: query.messages.map((m) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: typeof m.content === "string" 
          ? [{ text: m.content }] 
          : m.content?.map(p => {
              if (p.type === "text") return { text: p.text };
              // Bedrock content blocks mapping can be complex, simplifying for text.
              return { text: "" };
            }),
      })) as any,
      system: query.systemMessage ? [{ text: query.systemMessage }] : undefined,
    });

    const response = await this.client.send(command);

    if (!response.output?.message) {
      throw new Error("No output message from Bedrock");
    }

    const message = response.output.message;
    const text = message.content?.[0]?.text || "";

    return {
      role: "assistant",
      content: text,
      usage: response.usage
        ? {
            input_tokens: response.usage.inputTokens || 0,
            output_tokens: response.usage.outputTokens || 0,
          }
        : undefined,
    };
  };

  stream = async (
    query: Request,
    model: string = "zai.glm-5",
  ): Promise<ReadableStream<Uint8Array> | null> => {
    const command = new ConverseStreamCommand({
      modelId: model,
      messages: query.messages.map((m) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: typeof m.content === "string" 
          ? [{ text: m.content }] 
          : m.content?.map(p => {
              if (p.type === "text") return { text: p.text };
              return { text: "" };
            }),
      })) as any,
      system: query.systemMessage ? [{ text: query.systemMessage }] : undefined,
    });

    const response = await this.client.send(command);

    if (!response.stream) throw new Error("No stream from Bedrock");

    // Convert Bedrock stream to SSE-like ReadableStream for Agent.streamSSE
    const encoder = new TextEncoder();
    
    return new ReadableStream({
      async start(controller) {
        try {
          for await (const event of response.stream!) {
            if (event.contentBlockDelta?.delta?.text) {
              const chunk = {
                choices: [{
                  delta: { content: event.contentBlockDelta.delta.text }
                }]
              };
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
            }
            if (event.metadata?.usage) {
              const usage = {
                usage: {
                  input_tokens: event.metadata.usage.inputTokens,
                  output_tokens: event.metadata.usage.outputTokens
                }
              };
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(usage)}\n\n`));
            }
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (e) {
          controller.error(e);
        }
      }
    });
  };
}

export default BedrockProvider;
