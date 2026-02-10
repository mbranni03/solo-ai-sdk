import { z } from "zod";
import { Tool } from "@/types/Tool";
import type { MediaProvider } from "@/types/MediaProvider";

export const createTextToSpeechTool = (
  provider: MediaProvider,
  model?: string,
) => {
  return new Tool({
    name: "generate_speech",
    description: "Convert text to speech/audio.",
    schema: z.object({
      text: z.string().describe("The text or dialogue to synthesize."),
      speakers: z
        .record(z.string(), z.string())
        .optional()
        .describe(
          "Map of speaker names to voice names (e.g., { 'Joe': 'Kore', 'Jane': 'Puck' }). Required for multi-speaker dialogue.",
        ),
      voice: z
        .string()
        .optional()
        .describe(
          "Voice name for single-speaker text. Ignored if 'speakers' is provided.",
        ),
    }),
    execute: async ({ text, speakers, voice }) => {
      return provider.generateSpeech(text, model, { speakers, voice });
    },
  });
};
