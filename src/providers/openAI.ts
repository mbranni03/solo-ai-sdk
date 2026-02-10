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

class OpenAIProvider implements Provider, MediaProvider {
  name = "openai";

  generate = async (
    query: Request,
    model: string = "gpt-4o",
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
              return p; // text parts match
            })
          : m.content,
      })),
    ];

    const body: any = {
      messages,
      model,
      tools: query.tools?.map((tool) => ({
        type: "function",
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.parametersJsonSchema,
        },
      })),
    };

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getConfig().openai?.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    const data: any = await response.json();

    if (!data.choices || data.choices.length === 0) {
      throw new Error("No choices returned from OpenAI API");
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
    model: string = "gpt-4o",
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

    const body: any = {
      messages,
      model,
      tools: query.tools?.map((tool) => ({
        type: "function",
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.parametersJsonSchema,
        },
      })),
      stream: true,
    };

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getConfig().openai?.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.body) throw new Error("No response body");

    if (!response.body) throw new Error("No response body");

    return response.body;
  };

  generateImage = async (
    prompt: string,
    model: string = "dall-e-3",
    options: Record<string, any> = {},
  ): Promise<ImageResponse> => {
    const response = await fetch(
      "https://api.openai.com/v1/images/generations",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getConfig().openai?.apiKey}`,
        },
        body: JSON.stringify({
          prompt,
          model,
          n: 1, // DALL-E 3 only supports n=1
          size: options.size || "1024x1024",
          response_format: options.response_format || "b64_json",
          ...options,
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `OpenAI Image API Error ${response.status}: ${errorText}`,
      );
    }

    const data: any = await response.json();
    const image = data.data[0];

    // Return base64 data URI if requested/available, otherwise URL
    if (image.b64_json) {
      return {
        images: [`data:image/png;base64,${image.b64_json}`],
        revised_prompt: image.revised_prompt,
        original_response: data,
      };
    }

    return {
      images: [image.url],
      revised_prompt: image.revised_prompt,
      original_response: data,
    };
  };

  generateSpeech = async (
    text: string,
    model: string = "tts-1",
    options: Record<string, any> = {},
  ): Promise<AudioResponse> => {
    const response = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getConfig().openai?.apiKey}`,
      },
      body: JSON.stringify({
        model,
        input: text,
        voice: options.voice || "alloy",
        response_format: options.response_format || "mp3",
        ...options,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI TTS API Error ${response.status}: ${errorText}`);
    }

    // Convert arrayBuffer to base64 for unified handling
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Audio = buffer.toString("base64");

    const mimeType =
      options.response_format === "opus"
        ? "audio/opus"
        : options.response_format === "aac"
          ? "audio/aac"
          : options.response_format === "flac"
            ? "audio/flac"
            : "audio/mpeg"; // default mp3

    return {
      data: base64Audio,
      mimeType,
    };
  };

  generateVideo = async (
    prompt: string,
    model: string = "sora-2", // Preview placeholder
    options: Record<string, any> = {},
  ): Promise<VideoResponse> => {
    // Note: Sora API is in preview. This implementation assumes standard v1/videos structure based on common patterns and limited public docs.
    // It may need adjustment as the API stabilizes or becomes widely public.
    const response = await fetch("https://api.openai.com/v1/videos", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getConfig().openai?.apiKey}`,
      },
      body: JSON.stringify({
        prompt,
        model,
        ...options,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `OpenAI Video API Error ${response.status}: ${errorText}`,
      );
    }

    const data: any = await response.json();

    // Assuming standard async job pattern if not immediate
    return {
      url: data.url, // if available
      jobId: data.id, // if async
      message: "Video generation request sent (Sora)",
    };
  };
}

export default OpenAIProvider;
