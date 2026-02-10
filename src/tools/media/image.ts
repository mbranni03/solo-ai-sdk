import { z } from "zod";
import { Tool } from "@/types/Tool";
import type { MediaProvider } from "@/types/MediaProvider";

export const createImageGenerationTool = (
  provider: MediaProvider,
  model?: string,
) => {
  return new Tool({
    name: "generate_image",
    description: "Generate an image based on a prompt.",
    schema: z.object({
      prompt: z.string().describe("The prompt to generate an image for"),
      aspect_ratio: z
        .enum(["1:1", "3:4", "4:3", "9:16", "16:9"])
        .optional()
        .describe("Aspect ratio of the generated image. Default is '1:1'"),
      input_image: z
        .string()
        .optional()
        .describe("Base64 encoded image data for image-to-image generation"),
    }),
    execute: async ({ prompt, aspect_ratio, input_image }) => {
      return provider.generateImage(prompt, model, {
        aspect_ratio,
        input_image,
      });
    },
  });
};
