import type { Message } from "@/types/Message";
import type Provider from "@/types/Provider";
import type { MediaProvider } from "@/types/MediaProvider";
import type { ProviderResponse } from "@/types/Response";
import type {
  ImageResponse,
  VideoResponse,
  AudioResponse,
} from "@/types/ProviderResponse";
import type { Request } from "@/types/Request";

import { getConfig } from "@/config";

class GeminiProvider implements Provider, MediaProvider {
  name = "gemini";
  version = "v1beta";

  generate = async (
    query: Request,
    model: string = "gemini-2.5-flash",
  ): Promise<Message> => {
    const contents = processMessages(query.messages);

    const bodyObj: any = {
      contents: contents,
      tools: query.tools
        ? [
            {
              function_declarations: query.tools,
            },
          ]
        : undefined,
      system_instruction: query.systemMessage
        ? { parts: [{ text: query.systemMessage }] }
        : undefined,
    };

    if (query.providerOptions?.gemini?.contextCacheName) {
      bodyObj.cached_content = query.providerOptions.gemini.contextCacheName;
    }

    const body = JSON.stringify(bodyObj);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/${this.version}/models/${model}:generateContent?key=${getConfig().gemini?.apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body,
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API Error ${response.status}: ${errorText}`);
    }

    const data = (await response.json()) as ProviderResponse;

    if (!data.candidates || data.candidates.length === 0) {
      console.error("Gemini API Response:", JSON.stringify(data, null, 2));
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
      usage: data.usageMetadata
        ? {
            input_tokens: data.usageMetadata.promptTokenCount,
            output_tokens: data.usageMetadata.candidatesTokenCount,
          }
        : undefined,
    };
  };

  stream = async (
    query: Request,
    model: string = "gemini-2.5-flash",
  ): Promise<ReadableStream<Uint8Array> | null> => {
    const contents = processMessages(query.messages);

    const bodyObj: any = {
      contents,
      tools: query.tools
        ? [
            {
              function_declarations: query.tools,
            },
          ]
        : undefined,
      system_instruction: query.systemMessage
        ? { parts: [{ text: query.systemMessage }] }
        : undefined,
    };

    if (query.providerOptions?.gemini?.contextCacheName) {
      bodyObj.cached_content = query.providerOptions.gemini.contextCacheName;
    }

    const body = JSON.stringify(bodyObj);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/${this.version}/models/${model}:streamGenerateContent?alt=sse&key=${getConfig().gemini?.apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      },
    );

    if (!response.body) throw new Error("No response body");

    return response.body;
  };

  // ... (generateImage, generateVideo, generateSpeech implementation omitted/unchanged for brevity if matches) ...
  generateImage = async (
    prompt: string,
    model: string = "gemini-2.5-flash-image",
    options: Record<string, any> = {},
  ): Promise<ImageResponse> => {
    const BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
    const parts: any[] = [{ text: prompt }];

    if (options.aspect_ratio) {
      parts[0].text += ` (Aspect Ratio: ${options.aspect_ratio})`;
    }

    if (options.input_image) {
      const base64Data = options.input_image.replace(
        /^data:image\/\w+;base64,/,
        "",
      );
      parts.push({
        inline_data: {
          mime_type: "image/jpeg",
          data: base64Data,
        },
      });
    }

    const response = await fetch(
      `${BASE_URL}/models/${model}:generateContent?key=${getConfig().gemini?.apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{ parts }],
        }),
      },
    );

    if (!response.ok) {
      throw new Error(
        `Failed to generate image: ${response.status} ${response.statusText}`,
      );
    }

    const data: any = await response.json();
    const candidate = data.candidates?.[0];

    if (candidate) {
      const responseParts = candidate.content?.parts || [];
      const images = responseParts
        .filter((p: any) => p.inline_data)
        .map(
          (p: any) =>
            `data:${p.inline_data.mime_type};base64,${p.inline_data.data}`,
        );

      const text = responseParts
        .filter((p: any) => p.text)
        .map((p: any) => p.text)
        .join("\n");

      return {
        images,
        revised_prompt: text || undefined,
        original_response: data,
      };
    }

    throw new Error("No candidates returned from Gemini.");
  };

  generateVideo = async (
    prompt: string,
    model: string = "veo-3.1-generate-preview",
    options: Record<string, any> = {},
  ): Promise<VideoResponse> => {
    const BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

    const initResponse = await fetch(
      `${BASE_URL}/models/${model}:predictLongRunning`,
      {
        method: "POST",
        headers: {
          "x-goog-api-key": getConfig().gemini?.apiKey || "",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          instances: [{ prompt }],
          parameters: {
            aspectRatio: options.aspect_ratio || "16:9",
          },
        }),
      },
    );

    if (!initResponse.ok) {
      throw new Error(
        `Failed to initiate video generation: ${initResponse.statusText}`,
      );
    }

    const initData: any = await initResponse.json();
    const operationName = initData.name;

    if (!operationName) {
      throw new Error(
        "No operation name returned from video generation request",
      );
    }

    // Poll for completion
    while (true) {
      const statusResponse = await fetch(`${BASE_URL}/${operationName}`, {
        headers: { "x-goog-api-key": getConfig().gemini?.apiKey || "" },
      });

      if (!statusResponse.ok) {
        throw new Error(`Failed to check status: ${statusResponse.statusText}`);
      }

      const statusData: any = await statusResponse.json();

      if (statusData.done) {
        const videoUri =
          statusData.response?.generateVideoResponse?.generatedSamples?.[0]
            ?.video?.uri;

        if (!videoUri) {
          if (statusData.error) {
            throw new Error(
              `Video generation failed: ${JSON.stringify(statusData.error)}`,
            );
          }
          throw new Error("Video generation completed but no video URI found.");
        }

        return {
          url: videoUri,
          message: "Video generation successful",
        };
      }

      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  };

  generateSpeech = async (
    text: string,
    model: string = "gemini-2.5-flash-preview-tts",
    options: Record<string, any> = {},
  ): Promise<AudioResponse> => {
    const BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
    let speechConfig: any = {};

    if (options.speakers && Object.keys(options.speakers).length > 0) {
      speechConfig = {
        multiSpeakerVoiceConfig: {
          speakerVoiceConfigs: Object.entries(options.speakers).map(
            ([speaker, voiceName]) => ({
              speaker,
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName,
                },
              },
            }),
          ),
        },
      };
    } else {
      speechConfig = {
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName: options.voice || "Kore",
          },
        },
      };
    }

    const response = await fetch(
      `${BASE_URL}/models/${model}:generateContent?key=${getConfig().gemini?.apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text }],
            },
          ],
          generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig,
          },
        }),
      },
    );

    if (!response.ok) {
      throw new Error(
        `Failed to generate speech: ${response.status} ${response.statusText}`,
      );
    }

    const data: any = await response.json();
    const candidate = data.candidates?.[0];

    if (candidate) {
      const audioPart = candidate.content?.parts?.find(
        (p: any) => p.inlineData || p.inline_data,
      );

      if (audioPart) {
        const inlineData = audioPart.inlineData || audioPart.inline_data;
        return {
          data: inlineData.data,
          mimeType: inlineData.mime_type || "audio/mp3", // Gemini commonly returns audio/mp3 but relying on response is better if available, or default
        };
      }
    }

    throw new Error("No audio content returned from Gemini.");
  };
}

const processMessages = (messages: Message[]) => {
  return messages.map((m) => {
    const role =
      m.role === "assistant"
        ? "model"
        : m.role === "tool"
          ? "function"
          : "user";
    const parts: any[] = [];

    if (m.content) {
      if (typeof m.content === "string") {
        parts.push({ text: m.content });
      } else if (Array.isArray(m.content)) {
        m.content.forEach((part) => {
          if (part.type === "text") {
            parts.push({ text: part.text });
          } else if (part.type === "image_url") {
            const match = part.imageUrl.url.match(/^data:(.*);base64,(.*)$/);
            if (match) {
              parts.push({
                inline_data: {
                  mime_type: match[1],
                  data: match[2],
                },
              });
            } else {
              // Should handle remote URLs properly, but for now fallback to ignoring or TODO
              // console.warn("Remote URLs not efficiently supported in this simple implementation yet, use data URI");
            }
          } else if (part.type === "audio_url" || part.type === "video_url") {
            // Similar logic for other media types could be added
            const url =
              part.type === "audio_url" ? part.audioUrl.url : part.videoUrl.url;
            const match = url.match(/^data:(.*);base64,(.*)$/);
            if (match) {
              parts.push({
                inline_data: {
                  mime_type: match[1],
                  data: match[2],
                },
              });
            }
          }
        });
      }
    }

    if (m.functionCall) parts.push({ functionCall: m.functionCall });
    if (m.functionResponse)
      parts.push({ functionResponse: m.functionResponse });
    return { role, parts };
  });
};

export default GeminiProvider;
