import { z } from "zod";
import { Tool } from "@/types/Tool";

export const createVideoGenerationTool = (apiKey: string) => {
  return new Tool({
    name: "generate_video",
    description:
      "Generate a video based on a prompt using Google's Video generation model.",
    schema: z.object({
      prompt: z.string().describe("The prompt to generate a video for"),
      aspect_ratio: z
        .string()
        .optional()
        .describe("Aspect ratio of the video (e.g., '16:9', '9:16')"),
    }),
    execute: async ({ prompt, aspect_ratio }) => {
      const BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

      // 1. Initiate the generation (Long Running Operation)
      const initResponse = await fetch(
        `${BASE_URL}/models/veo-3.1-generate-preview:predictLongRunning`,
        {
          method: "POST",
          headers: {
            "x-goog-api-key": apiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            instances: [{ prompt }],
            parameters: {
              aspectRatio: aspect_ratio || "16:9",
            },
          }),
        },
      );

      if (!initResponse.ok) {
        throw new Error(
          `Failed to initiate video generation: ${initResponse.statusText}`,
        );
      }

      const initData: any = await initResponse.json();
      const operationName = initData.name;

      if (!operationName) {
        throw new Error(
          "No operation name returned from video generation request",
        );
      }

      console.log(`Video generation started. Operation: ${operationName}`);

      // 2. Poll for completion
      while (true) {
        const statusResponse = await fetch(`${BASE_URL}/${operationName}`, {
          headers: { "x-goog-api-key": apiKey },
        });

        if (!statusResponse.ok) {
          throw new Error(
            `Failed to check status: ${statusResponse.statusText}`,
          );
        }

        const statusData: any = await statusResponse.json();

        if (statusData.done) {
          // 3. Extract result
          const videoUri =
            statusData.response?.generateVideoResponse?.generatedSamples?.[0]
              ?.video?.uri;

          if (!videoUri) {
            // If done but no URI, check for error
            if (statusData.error) {
              throw new Error(
                `Video generation failed: ${JSON.stringify(statusData.error)}`,
              );
            }
            throw new Error(
              "Video generation completed but no video URI found.",
            );
          }

          return JSON.stringify({
            url: videoUri,
            prompt,
            message: "Video generation successful",
          });
        }

        // Wait before next poll
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    },
  });
};
