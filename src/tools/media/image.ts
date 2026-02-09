import { z } from "zod";
import { Tool } from "@/types/Tool";

export const createImageGenerationTool = (apiKey: string) => {
  return new Tool({
    name: "generate_image",
    description:
      "Generate an image based on a prompt using Google's Imagen model.",
    schema: z.object({
      prompt: z.string().describe("The prompt to generate an image for"),
      aspect_ratio: z
        .enum(["1:1", "3:4", "4:3", "9:16", "16:9"])
        .optional()
        .describe("Aspect ratio of the generated image. Default is '1:1'"),
      // number_of_images and person_generation are not standard in generateContent I believe,
      // but the prompt can instruct the model.
      // Keeping aspect_ratio as it might be relevant for the generation request or prompt instruction.
      input_image: z
        .string()
        .optional()
        .describe("Base64 encoded image data for image-to-image generation"),
    }),
    execute: async ({ prompt, aspect_ratio, input_image }) => {
      const BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

      const parts: any[] = [{ text: prompt }];

      if (aspect_ratio) {
        parts[0].text += ` (Aspect Ratio: ${aspect_ratio})`;
      }

      if (input_image) {
        // Simple heuristic to strip data URI prefix if present
        const base64Data = input_image.replace(/^data:image\/\w+;base64,/, "");
        parts.push({
          inline_data: {
            mime_type: "image/jpeg", // Assuming JPEG or detecting? User example showed JPEG.
            data: base64Data,
          },
        });
      }

      const response = await fetch(
        `${BASE_URL}/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`,
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
          `Failed to generate content: ${response.status} ${response.statusText}`,
        );
      }

      const data: any = await response.json();

      const candidate = data.candidates?.[0];
      if (candidate) {
        // Check for inline images in the response
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

        return JSON.stringify({
          images,
          text,
          message: "Generation successful",
        });
      }

      throw new Error("No candidates returned from Gemini.");
    },
  });
};
