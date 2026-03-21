import type { Message } from "@/types/Message";
import type Provider from "@/types/Provider";
import type { Request } from "@/types/Request";

import { getConfig } from "@/config";

class MoonshotProvider implements Provider {
  name = "moonshot";

  generate = async (
    query: Request,
    model: string = "moonshotai/kimi-k2.5",
  ): Promise<Message> => {
    const messages = [
      { role: "system", content: query.systemMessage },
      ...query.messages.map((m) => ({
        ...m,
        content: Array.isArray(m.content)
          ? m.content.map((p) => {
              if (p.type === "image_url") {
                return {
                  type: "image_url",
                  image_url: { url: p.imageUrl.url },
                };
              }
              return p;
            })
          : m.content,
      })),
    ];

    const body: any = {
      messages,
      model: model.includes("/") ? model : `moonshotai/${model}`,
      max_tokens: 16384,
      temperature: 1.0,
      top_p: 1.0,
      chat_template_kwargs: { thinking: true },
      tools: query.tools?.map((tool) => ({
        type: "function",
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.parametersJsonSchema,
        },
      })),
    };

    const url = "https://integrate.api.nvidia.com/v1/chat/completions";
    const apiKey = getConfig().nvidia?.apiKey;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Moonshot (via Nvidia) API Error ${response.status}: ${errorText}`);
    }

    const data: any = await response.json();
    if (!data.choices || data.choices.length === 0) {
      throw new Error("No choices returned from Moonshot API");
    }

    const message = data.choices[0].message;

    return {
      role: "assistant",
      content: message.content,
      functionCall: message.tool_calls?.[0]?.function
        ? {
            name: message.tool_calls[0].function.name,
            args: JSON.parse(message.tool_calls[0].function.arguments),
          }
        : undefined,
      usage: data.usage
        ? {
            input_tokens: data.usage.prompt_tokens,
            output_tokens: data.usage.completion_tokens,
          }
        : undefined,
    };
  };

  stream = async (
    query: Request,
    model: string = "moonshotai/kimi-k2.5",
  ): Promise<ReadableStream<Uint8Array> | null> => {
    const messages = [
      { role: "system", content: query.systemMessage },
      ...query.messages.map((m) => ({
        ...m,
        content: Array.isArray(m.content)
          ? m.content.map((p) => {
              if (p.type === "image_url") {
                return {
                  type: "image_url",
                  image_url: { url: p.imageUrl.url },
                };
              }
              return p;
            })
          : m.content,
      })),
    ];

    const body = {
      messages,
      model: model.includes("/") ? model : `moonshotai/${model}`,
      max_tokens: 16384,
      temperature: 1.0,
      top_p: 1.0,
      chat_template_kwargs: { thinking: true },
      stream: true,
      tools: query.tools?.map((tool) => ({
        type: "function",
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.parametersJsonSchema,
        },
      })),
    };

    const url = "https://integrate.api.nvidia.com/v1/chat/completions";
    const apiKey = getConfig().nvidia?.apiKey;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        Accept: "text/event-stream",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Moonshot (via Nvidia) API Error ${response.status}: ${errorText}`);
    }

    if (!response.body) throw new Error("No response body");

    return response.body;
  };
}

export default MoonshotProvider;
