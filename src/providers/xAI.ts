import type { Message } from "@/types/Message";
import type Provider from "@/types/Provider";
import type { MediaProvider } from "@/types/MediaProvider";
import type {
  ImageResponse,
  VideoResponse,
  AudioResponse,
} from "@/types/ProviderResponse";
import type { Request } from "@/types/Request";

import { getConfig } from "@/config";

class xAIProvider implements Provider, MediaProvider {
  name = "xAI";
  version = "v1";

  generate = async (
    query: Request,
    model: string = "grok-4-1-fast-reasoning",
  ): Promise<Message> => {
    const contents = [
      {
        role: "system",
        content: query.systemMessage,
      },
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

    const body = JSON.stringify({
      messages: contents,
      model: model,
      tools: query.tools?.map((tool) => ({
        type: "function",
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.parametersJsonSchema,
        },
      })),
    });

    const response = await fetch(`https://api.x.ai/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getConfig().xai?.apiKey}`,
      },
      body,
    });

    const data: any = await response.json();

    if (!data.choices || data.choices.length === 0) {
      throw new Error("No candidates returned from xAI API");
    }

    const firstChoice = data.choices[0];

    return {
      role: "assistant",
      content: firstChoice.message.content,
      functionCall: firstChoice.message.tool_calls?.[0]?.function
        ? {
            name: firstChoice.message.tool_calls[0].function.name,
            args: JSON.parse(
              firstChoice.message.tool_calls[0].function.arguments,
            ),
          }
        : undefined,
    };
  };

  stream = async (
    query: Request,
    model: string = "grok-4-1-fast-reasoning",
  ): Promise<ReadableStream<Uint8Array> | null> => {
    const contents = [
      {
        role: "system",
        content: query.systemMessage,
      },
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
    const body = JSON.stringify({
      messages: contents,
      model: model,
      tools: query.tools?.map((tool) => ({
        type: "function",
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.parametersJsonSchema,
        },
      })),
      stream: true,
    });

    const response = await fetch(`https://api.x.ai/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getConfig().xai?.apiKey}`,
      },
      body,
    });

    if (!response.body) throw new Error("No response body");

    return response.body;
  };

  generateImage = async (
    prompt: string,
    model: string = "grok-2-image-1212",
    options: Record<string, any> = {},
  ): Promise<ImageResponse> => {
    const response = await fetch(`https://api.x.ai/v1/images/generations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getConfig().xai?.apiKey}`,
      },
      body: JSON.stringify({
        prompt,
        model,
        response_format: options.response_format || "b64_json", // Request base64 by default for easier frontend display
        ...options,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`xAI Image API Error ${response.status}: ${errorText}`);
    }

    const data: any = await response.json();

    // Check for b64_json or url
    const images = data.data.map((img: any) => {
      if (img.b64_json) {
        return `data:image/png;base64,${img.b64_json}`;
      }
      return img.url;
    });

    return {
      images,
      revised_prompt: data.data[0]?.revised_prompt || prompt,
      original_response: data,
    };
  };

  generateVideo = async (
    prompt: string,
    model: string = "grok-2-vision-1212",
    options: Record<string, any> = {},
  ): Promise<VideoResponse> => {
    // ... comments omitted ...

    const body: any = {
      prompt,
      model: model,
      ...options,
    };

    const response = await fetch(`https://api.x.ai/v1/videos/generations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getConfig().xai?.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`xAI Video API Error ${response.status}: ${errorText}`);
    }

    const data: any = await response.json();

    // Assuming standard async operational pattern or direct return.
    // If it returns a URL directly:
    if (data.data && data.data[0] && data.data[0].url) {
      return {
        url: data.data[0].url,
        message: "Video generation successful",
      };
    }

    // If it returns an ID for polling (likely for video), we might need polling logic similar to Gemini.
    // However, for this initial implementation, we'll assume the API might handle it or return the job ID.
    // If data contains 'id' but no url, return the ID.
    if (data.id) {
      return {
        jobId: data.id,
        message:
          "Video generation started. Polling required (not yet implemented fully in this snippet).",
      };
    }

    return {
      message: "Video generation response received (unknown format)",
      original_response: data,
    } as any; // Type assertion or proper handling needed if strictly typed
  };

  generateSpeech = async (
    text: string,
    model: string = "grok-voice-beta",
    options: Record<string, any> = {},
  ): Promise<AudioResponse> => {
    throw new Error("xAI Speech generation is not yet supported in this SDK.");
  };
}

export default xAIProvider;
