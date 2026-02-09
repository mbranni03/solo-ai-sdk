import { z } from "zod";
import { Tool } from "@/types/Tool";

export const createTextToSpeechTool = (apiKey: string) => {
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
      const BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

      let speechConfig: any = {};

      if (speakers && Object.keys(speakers).length > 0) {
        speechConfig = {
          multiSpeakerVoiceConfig: {
            speakerVoiceConfigs: Object.entries(speakers).map(
              ([speaker, voiceName]) => ({
                speaker,
                voiceConfig: {
                  prebuiltVoiceConfig: {
                    voiceName,
                  },
                },
              }),
            ),
          },
        };
      } else {
        // Default to single speaker
        speechConfig = {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: voice || "Kore", // Default voice
            },
          },
        };
      }

      const response = await fetch(
        `${BASE_URL}/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [{ text }],
              },
            ],
            generationConfig: {
              responseModalities: ["AUDIO"],
              speechConfig,
            },
          }),
        },
      );

      if (!response.ok) {
        throw new Error(
          `Failed to generate speech: ${response.status} ${response.statusText}`,
        );
      }

      const data: any = await response.json();

      const candidate = data.candidates?.[0];
      if (candidate) {
        // Check for inlineData (camelCase) as returned by API, or inline_data just in case
        const audioPart = candidate.content?.parts?.find(
          (p: any) => p.inlineData || p.inline_data,
        );

        if (audioPart) {
          const inlineData = audioPart.inlineData || audioPart.inline_data;
          return JSON.stringify({
            audio_base64: inlineData.data,
            message: "Speech generation successful",
          });
        }
      }

      throw new Error("No audio content returned from Gemini.");
    },
  });
};
