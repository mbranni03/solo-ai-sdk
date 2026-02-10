import type { Message } from "@/types/Message";
import type Provider from "@/types/Provider";
import type { Request } from "@/types/Request";

import { getConfig } from "@/config";

class AnthropicProvider implements Provider {
  name = "anthropic";
  version = "2023-06-01";

  generate = async (
    query: Request,
    model: string = "claude-3-5-sonnet-20240620",
  ): Promise<Message> => {
    const messages = query.messages.map((m) => ({
      role: m.role === "tool" ? "user" : m.role, // Anthropic doesn't have 'tool' role exactly same as OpenAI, but uses tool_result content block essentially.
      // Simplification for now, might need robust conversion for tool results.
      // For basic message:
      content: Array.isArray(m.content)
        ? m.content.map((p) => {
            if (p.type === "image_url") {
              const match = p.imageUrl.url.match(
                /^data:(image\/[a-z]+);base64,(.+)$/,
              );
              if (match) {
                return {
                  type: "image",
                  source: {
                    type: "base64",
                    media_type: match[1],
                    data: match[2],
                  },
                };
              }
              // Fallback or ignore remote URLs for now as Anthropic requires base64
              return { type: "text", text: "[Image URL not supported]" };
            }
            return p;
          })
        : m.content,
    }));

    // System message is separate in Anthropic
    const enableCaching = query.providerOptions?.anthropic?.enableCaching;
    const cacheBreakpoints = query.providerOptions?.anthropic?.cacheBreakpoints;

    // System message is separate in Anthropic
    let system: any = query.systemMessage;
    if (enableCaching || cacheBreakpoints?.includes("system")) {
      system = [
        {
          type: "text",
          text: query.systemMessage,
          cache_control: { type: "ephemeral" },
        },
      ];
    }

    const tools = query.tools?.map((tool, index, arr) => {
      const isLast = index === arr.length - 1;
      const shouldCache =
        (enableCaching && isLast) || cacheBreakpoints?.includes("tools");
      return {
        name: tool.name,
        description: tool.description,
        input_schema: tool.parametersJsonSchema,
        cache_control: shouldCache ? { type: "ephemeral" } : undefined,
      };
    });

    const body: any = {
      model,
      messages, // Anthropic messages are strictly user/assistant alternating
      system,
      max_tokens: 1024,
      tools,
    };

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": getConfig().anthropic?.apiKey || "",
        "anthropic-version": this.version,
        "anthropic-beta": "prompt-caching-2024-07-31",
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data: any = await response.json();

    if (data.type === "error") {
      throw new Error(`Anthropic Error: ${data.error.message}`);
    }

    const contentBlock = data.content?.[0]; // Usually text or tool_use

    // Handle tool use
    const toolUse = data.content?.find((c: any) => c.type === "tool_use");

    return {
      role: "assistant",
      content: contentBlock?.text || "",
      functionCall: toolUse
        ? {
            name: toolUse.name,
            args: toolUse.input,
          }
        : undefined,
    };
  };

  stream = async (
    query: Request,
    model: string = "claude-3-5-sonnet-20240620",
  ): Promise<ReadableStream<Uint8Array> | null> => {
    const messages = query.messages.map((m) => ({
      role: m.role === "tool" ? "user" : m.role,
      content: Array.isArray(m.content)
        ? m.content.map((p) => {
            if (p.type === "image_url") {
              const match = p.imageUrl.url.match(
                /^data:(image\/[a-z]+);base64,(.+)$/,
              );
              if (match) {
                return {
                  type: "image",
                  source: {
                    type: "base64",
                    media_type: match[1],
                    data: match[2],
                  },
                };
              }
              return { type: "text", text: "[Image URL not supported]" };
            }
            return p;
          })
        : m.content,
    }));

    const enableCaching = query.providerOptions?.anthropic?.enableCaching;
    const cacheBreakpoints = query.providerOptions?.anthropic?.cacheBreakpoints;

    let system: any = query.systemMessage;
    if (enableCaching || cacheBreakpoints?.includes("system")) {
      system = [
        {
          type: "text",
          text: query.systemMessage,
          cache_control: { type: "ephemeral" },
        },
      ];
    }

    const tools = query.tools?.map((tool, index, arr) => {
      const isLast = index === arr.length - 1;
      const shouldCache =
        (enableCaching && isLast) || cacheBreakpoints?.includes("tools");
      return {
        name: tool.name,
        description: tool.description,
        input_schema: tool.parametersJsonSchema,
        cache_control: shouldCache ? { type: "ephemeral" } : undefined,
      };
    });

    const body: any = {
      model,
      messages,
      system,
      max_tokens: 1024,
      tools,
      stream: true,
    };

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": getConfig().anthropic?.apiKey || "",
        "anthropic-version": this.version,
        "anthropic-beta": "prompt-caching-2024-07-31",
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.body) throw new Error("No response body");

    return response.body;
  };
}

export default AnthropicProvider;
