import type { Message } from "@/types/Message";
import type Provider from "@/types/Provider";
import type { ProviderResponse } from "@/types/Response";
import type { Request } from "@/types/Request";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

class GeminiProvider implements Provider {
  name = "gemini";
  version = "v1beta";

  generate = async (
    query: Request,
    model: string = "gemini-2.5-flash",
  ): Promise<Message> => {
    const contents = processMessages(query.messages);

    const body = JSON.stringify({
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
    });

    const response = await fetch(
      `https://generativelanguage.googleapis.com/${this.version}/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body,
      },
    );

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
    const contents = processMessages(query.messages);
    const body = JSON.stringify({
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
    });

    const response = await fetch(
      `https://generativelanguage.googleapis.com/${this.version}/models/${model}:streamGenerateContent?alt=sse&key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      },
    );

    if (!response.body) throw new Error("No response body");

    return response.body;
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
    if (m.content) parts.push({ text: m.content });
    if (m.functionCall) parts.push({ functionCall: m.functionCall });
    if (m.functionResponse)
      parts.push({ functionResponse: m.functionResponse });
    return { role, parts };
  });
};

export default GeminiProvider;
