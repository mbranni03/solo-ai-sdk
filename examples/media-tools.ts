import { Agent, GeminiProvider } from "../src/index";

const run = async () => {
  const provider = new GeminiProvider();

  if (!provider.getMediaTools) {
    console.error("Error: getMediaTools is not defined on the provider.");
    return;
  }

  const mediaTools = provider.getMediaTools();
  console.log("Media Tools available:", Object.keys(mediaTools));

  // 1. Standalone Usage
  console.log("\n--- Standalone Usage ---");
  const imageTool = mediaTools.generate_image;
  if (imageTool && imageTool.execute) {
    console.log("Testing Image Generation...");
    try {
      const result = await imageTool.execute({
        prompt: "A futuristic city on Mars",
        aspect_ratio: "16:9",
      });
      console.log("Image Generation Result:", result.substring(0, 200) + "...");
    } catch (e: any) {
      console.log("Image Generation failed:", e.message);
    }
  }

  const videoTool = mediaTools.generate_video;
  if (videoTool && videoTool.execute) {
    console.log(
      "Testing Video Generation (Dry Run - may fail without valid API key/permissions)",
    );
    // Note: This might take a while or fail if the API key doesn't have access to Veo
    try {
      const result = await videoTool.execute({
        prompt: "A montage of pizza making",
        aspect_ratio: "9:16",
      });
      console.log("Video Generation Result:", result);
    } catch (e: any) {
      console.log(
        "Video Generation skipped or failed (expected if no access):",
        e.message,
      );
    }
  }

  const ttsTool = mediaTools.generate_speech;
  if (ttsTool && ttsTool.execute) {
    console.log("Testing Multi-Speaker TTS...");
    try {
      const result = await ttsTool.execute({
        text: "Joe: How's it going today Jane?\nJane: Not too bad, how about you?",
        speakers: {
          Joe: "Kore",
          Jane: "Puck",
        },
      });
      console.log("TTS Result:", result.substring(0, 200) + "...");
    } catch (e: any) {
      console.log("TTS failed:", e.message);
    }
  }

  // 2. Agent Usage
  console.log("\n--- Agent Usage ---");
  const agent = new Agent("gemini");

  try {
    const result = await agent.generate(
      "You are a helpful assistant with media capabilities.",
      [
        {
          role: "user",
          content: "Generate an image of a cat playing piano.",
        },
      ],
      {
        tools: {
          ...mediaTools,
        },
      },
    );
    console.log("Agent Response:", JSON.stringify(result, null, 2));
  } catch (error) {
    console.error("Agent execution failed:", error);
  }
};

run();
