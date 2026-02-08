import type { Message } from "@/types/Message";
import type Provider from "@/types/Provider";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

class GeminiProvider implements Provider {
  name = "gemini";
  version = "v1beta";

  generate = async (
    systemMessage: string,
    messages: Message[],
    model: string = "gemini-2.5-flash",
  ): Promise<string> => {
    const contents = messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const response = await fetch(
      `https://generativelanguage.googleapis.com/${this.version}/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: contents,
          system_instruction: systemMessage
            ? { parts: [{ text: systemMessage }] }
            : undefined,
        }),
      },
    );

    const data = (await response.json()) as any;
    return data.candidates[0].content.parts[0].text;
  };

  stream = async (
    systemMessage: string,
    messages: Message[],
    model: string = "gemini-2.5-flash",
  ): Promise<ReadableStream<Uint8Array> | null> => {
    const contents = messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const response = await fetch(
      `https://generativelanguage.googleapis.com/${this.version}/models/${model}:streamGenerateContent?alt=sse&key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents,
          system_instruction: systemMessage
            ? { parts: [{ text: systemMessage }] }
            : undefined,
        }),
      },
    );

    if (!response.body) throw new Error("No response body");

    return response.body;
  };
}

export default GeminiProvider;
