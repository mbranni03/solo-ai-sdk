import GeminiProvider from "@/providers/gemini";
import OpenAIProvider from "@/providers/openAI";
import AnthropicProvider from "@/providers/anthropic";
import xAIProvider from "@/providers/xAI";

const getProvider = (provider: string) => {
  switch (provider.toLowerCase()) {
    case "gemini":
      return new GeminiProvider();
    case "openai":
      return new OpenAIProvider();
    case "anthropic":
      return new AnthropicProvider();
    case "xai":
      return new xAIProvider();
    default:
      throw new Error(`Provider ${provider} not found`);
  }
};

export { GeminiProvider, OpenAIProvider, AnthropicProvider, xAIProvider };
export default getProvider;
