import { z } from "zod";
import { Tool } from "@/types/Tool";
import type { MediaProvider } from "@/types/MediaProvider";

export const createVideoGenerationTool = (
  provider: MediaProvider,
  model?: string,
) => {
  return new Tool({
    name: "generate_video",
    description: "Generate a video based on a prompt.",
    schema: z.object({
      prompt: z.string().describe("The prompt to generate a video for"),
      aspect_ratio: z
        .string()
        .optional()
        .describe("Aspect ratio of the video (e.g., '16:9', '9:16')"),
    }),
    execute: async ({ prompt, aspect_ratio }) => {
      return provider.generateVideo(prompt, model, { aspect_ratio });
    },
  });
};
