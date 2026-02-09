import type { Message } from "@/types/Message";
import type Provider from "@/types/Provider";
import type { ProviderResponse } from "@/types/Response";
import type { Request } from "@/types/Request";
import {
  createImageGenerationTool,
  createVideoGenerationTool,
  createTextToSpeechTool,
} from "@/tools/media";

const XAI_API_KEY = process.env.XAI_API_KEY;

class xAIProvider implements Provider {
  name = "xAI";
  version = "v1";

  generate = async (
    query: Request,
    model: string = "gemini-2.5-flash",
  ): Promise<Message> => {
    const contents = [
      {
        role: "system",
        content: query.systemMessage,
      },
      ...query.messages,
    ];

    const body = JSON.stringify({
      input: contents,
      model: model,
      tools: query.tools?.map((tool) => ({
        type: "function",
        name: tool.name,
        description: tool.description,
        parameters: tool.parametersJsonSchema,
      })),
    });

    const response = await fetch(`https://api.x.ai/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${XAI_API_KEY}`,
      },
      body,
    });

    const data = (await response.json()) as ProviderResponse;

    if (!data.candidates || data.candidates.length === 0) {
      throw new Error("No candidates returned from Gemini API");
    }

    const firstPart = data.candidates?.[0]?.content?.parts?.[0];

    if (!firstPart) {
      throw new Error("Invalid response structure from Gemini API");
    }

    return {
      role: "assistant",
      content: firstPart.text,
      functionCall: firstPart.functionCall,
    };
  };

  stream = async (
    query: Request,
    model: string = "gemini-2.5-flash",
  ): Promise<ReadableStream<Uint8Array> | null> => {
    const contents = [
      {
        role: "system",
        content: query.systemMessage,
      },
      ...query.messages,
    ];
    const body = JSON.stringify({
      input: contents,
      model: model,
      tools: query.tools?.map((tool) => ({
        type: "function",
        name: tool.name,
        description: tool.description,
        parameters: tool.parametersJsonSchema,
      })),
      stream: true,
    });

    const response = await fetch(`https://api.x.ai/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${XAI_API_KEY}`,
      },
      body,
    });

    if (!response.body) throw new Error("No response body");

    return response.body;
  };
}

export default xAIProvider;
