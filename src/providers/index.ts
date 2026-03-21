import GeminiProvider from "@/providers/gemini";
import OpenAIProvider from "@/providers/openAI";
import AnthropicProvider from "@/providers/anthropic";
import xAIProvider from "@/providers/xAI";
import MistralProvider from "@/providers/mistral";
import MoonshotProvider from "@/providers/moonshot";
import NvidiaProvider from "@/providers/nvidia";

import BedrockProvider from "@/providers/bedrock";

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
    case "mistral":
      return new MistralProvider();
    case "moonshot":
    case "kimi":
    case "moonshotai":
      return new MoonshotProvider();
    case "nemotron":
    case "nvidia":
      return new NvidiaProvider();
    case "bedrock":
    case "aws":
    case "aws_bedrock":
      return new BedrockProvider();
    default:
      throw new Error(`Provider ${provider} not found`);
  }
};

export {
  GeminiProvider,
  OpenAIProvider,
  AnthropicProvider,
  xAIProvider,
  MistralProvider,
  NvidiaProvider,
  MoonshotProvider,
};
export default getProvider;
