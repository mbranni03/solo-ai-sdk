import type { Message } from "@/types/Message";

export const extractBase64 = (
  dataUri: string,
): { mimeType: string; data: string } | null => {
  const match = dataUri.match(/^data:(.*);base64,(.*)$/);
  if (match && match[1] && match[2]) {
    return {
      mimeType: match[1],
      data: match[2],
    };
  }
  return null;
};

// Generic helper to map standard Message format to a common structure
// Note: Providers like OpenAI and xAI have very similar structures, so this can be shared.
// Gemini has a different structure, so it might use specific logic or a transform of this.
export const processCommonMessages = (messages: Message[]): any[] => {
  return messages.map((m) => ({
    role: m.role === "tool" ? "tool" : m.role, // Some providers might need 'function' but 'tool' is becoming standard
    content: Array.isArray(m.content)
      ? m.content.map((p) => {
          if (p.type === "image_url") {
            return {
              type: "image_url",
              image_url: { url: p.imageUrl.url },
            };
          }
          if (p.type === "text") {
            return {
              type: "text",
              text: p.text,
            };
          }
          return p;
        })
      : m.content,
    // Add tool_calls / function_call handling if needed here, generally handled by provider specific logic due to differences
  }));
};
