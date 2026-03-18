import type { Message } from "@/types/Message";
import type Provider from "@/types/Provider";
import type { Request } from "@/types/Request";

import { getConfig } from "@/config";

class NvidiaProvider implements Provider {
  name = "nvidia";

  private getModelPayload = (model: string, messages: any[], tools?: any[]) => {
    const isMoonshot = model.includes("moonshot") || model.includes("kimi");
    const isNemotron = model.includes("nemotron");

    let normalizedModel = model;

    if (isMoonshot && !normalizedModel.includes("/")) {
      normalizedModel = `moonshotai/${normalizedModel}`;
    } else if (isNemotron && !normalizedModel.includes("/")) {
      normalizedModel = `nvidia/${normalizedModel}`;
    }

    const body: any = {
      messages,
      model: normalizedModel,
      max_tokens: 16384,
      temperature: 1.0,
      top_p: isNemotron ? 0.95 : 1.0,
      tools: tools?.map((tool) => ({
        type: "function",
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.parametersJsonSchema,
        },
      })),
    };

    if (isMoonshot) {
      body.chat_template_kwargs = { thinking: true };
    }

    if (isNemotron) {
      body.reasoning_budget = 16384;
      body.chat_template_kwargs = { enable_thinking: true };
    }

    return body;
  };

  generate = async (
    query: Request,
    model: string = "nvidia/nemotron-3-super-120b-a12b",
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

    const body = this.getModelPayload(model, messages, query.tools);
    const url = "https://integrate.api.nvidia.com/v1/chat/completions";
    const apiKey = getConfig().nvidia?.apiKey;

    console.log(`[NvidiaProvider] POST ${url}`);
    console.log(`[NvidiaProvider] Model: ${body.model}`);
    console.log(`[NvidiaProvider] API Key present: ${!!apiKey}`);

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
      throw new Error(`Nvidia API Error ${response.status}: ${errorText}`);
    }

    const data: any = await response.json();

    if (!data.choices || data.choices.length === 0) {
      throw new Error("No choices returned from Nvidia API");
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
    };
  };

  stream = async (
    query: Request,
    model: string = "nvidia/nemotron-3-super-120b-a12b",
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
      ...this.getModelPayload(model, messages, query.tools),
      stream: true,
    };
    const url = "https://integrate.api.nvidia.com/v1/chat/completions";
    const apiKey = getConfig().nvidia?.apiKey;

    console.log(`[NvidiaProvider] POST (stream) ${url}`);
    console.log(`[NvidiaProvider] Model: ${body.model}`);
    console.log(`[NvidiaProvider] API Key present: ${!!apiKey}`);

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
      throw new Error(`Nvidia API Error ${response.status}: ${errorText}`);
    }

    if (!response.body) throw new Error("No response body");

    return response.body;
  };
}

export default NvidiaProvider;
