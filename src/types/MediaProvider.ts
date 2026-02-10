import type {
  ImageResponse,
  VideoResponse,
  AudioResponse,
} from "./ProviderResponse";

export interface MediaProvider {
  generateImage(
    prompt: string,
    model?: string,
    options?: Record<string, any>,
  ): Promise<ImageResponse>;
  generateVideo(
    prompt: string,
    model?: string,
    options?: Record<string, any>,
  ): Promise<VideoResponse>;
  generateSpeech(
    text: string,
    model?: string,
    options?: Record<string, any>,
  ): Promise<AudioResponse>;
}
