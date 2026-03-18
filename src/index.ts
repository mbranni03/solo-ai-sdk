import Agent from "@/services/agent";
import GeminiProvider from "@/providers/gemini";
import OpenAIProvider from "@/providers/openAI";
import AnthropicProvider from "@/providers/anthropic";
import xAIProvider from "@/providers/xAI";
import MistralProvider from "@/providers/mistral";
import NvidiaProvider from "@/providers/nvidia";
const MoonshotProvider = NvidiaProvider;
import { Tool } from "@/types/Tool";
import type { Message } from "@/types/Message";
import type {
  ImageResponse,
  VideoResponse,
  AudioResponse,
} from "@/types/ProviderResponse";
import { createImageGenerationTool } from "@/tools/media/image";
import { createTextToSpeechTool } from "@/tools/media/speech";
import { createVideoGenerationTool } from "@/tools/media/video";

export {
  Agent,
  GeminiProvider,
  OpenAIProvider,
  AnthropicProvider,
  xAIProvider,
  MistralProvider,
  MoonshotProvider,
  NvidiaProvider,
  Tool,
  createImageGenerationTool,
  createTextToSpeechTool,
  createVideoGenerationTool,
};

export type { Message, ImageResponse, VideoResponse, AudioResponse };

export default Agent;
