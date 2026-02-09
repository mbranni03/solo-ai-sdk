# Media Generation Tools Walkthrough

This guide details the integration of image, video, and speech generation capabilities into the `solo-ai-sdk`. These tools are built directly into the `GeminiProvider`, making it easy to add them to any AI agent.

## Core Capabilities

The SDK now supports three primary media generation tools:

1.  **Image Generation**: Powered by `gemini-2.5-flash-image`, supporting text-to-image and image-to-image (multimodal) prompts.
2.  **Video Generation**: Powered by `veo-3.1-generate-preview`, using an asynchronous operation/polling pattern for high-quality video.
3.  **Speech (TTS)**: Powered by `gemini-2.5-flash-preview-tts`, featuring advanced multi-speaker support for dialogue.

---

## Getting Started

First, ensure you have your `GEMINI_API_KEY` set as an environment variable or passed to the provider.

```typescript
import { GeminiProvider, Agent } from "solo-ai-sdk";

const provider = new GeminiProvider();
// Media tools are pre-configured and accessible from the provider
const mediaTools = provider.getMediaTools();
```

---

## Tool 1: Image Generation (`generate_image`)

Generates images from text or optional base64 input images.

### Usage

```typescript
const imageTool = mediaTools.generate_image;

const result = await imageTool.execute({
  prompt: "A futuristic cyberpunk city in the rain",
  aspect_ratio: "16:9",
});

const { images, text } = JSON.parse(result);
// 'images' is an array of base64 strings
```

### Parameters

- `prompt` (string): Description of the image.
- `aspect_ratio` (enum): "1:1", "3:4", "4:3", "9:16", "16:9".
- `input_image` (string, optional): Base64 encoded image for image-to-image tasks.

---

## Tool 2: Video Generation (`generate_video`)

Generates video content based on text prompts. This tool automatically handles the Long Running Operation (LRO) polling for you.

### Usage

```typescript
const videoTool = mediaTools.generate_video;

const result = await videoTool.execute({
  prompt: "A cinematic shot of a sunset over Mars",
  aspect_ratio: "16:9",
});

const { url } = JSON.parse(result);
// 'url' is the URI to the generated video
```

### Parameters

- `prompt` (string): Description of the video.
- `aspect_ratio` (string, optional): Default is "16:9".

---

## Tool 3: Text-to-Speech (`generate_speech`)

Converts text into audio. Supports both single-voice and complex multi-speaker dialogues.

### Multi-Speaker Example

```typescript
const ttsTool = mediaTools.generate_speech;

const result = await ttsTool.execute({
  text: "Joe: Hey Jane, have you seen the new SDK? \nJane: Yes, it is amazing!",
  speakers: {
    Joe: "Kore",
    Jane: "Puck",
  },
});

const { audio_base64 } = JSON.parse(result);
```

### Parameters

- `text` (string): The dialogue or text to speak.
- `speakers` (object, optional): Map of speaker names to voice IDs (e.g., `Kore`, `Puck`).
- `voice` (string, optional): Default voice for single-speaker tasks.

---

## Integrating with an Agent

To give an `Agent` media powers, simply pass the media tools to the `generate` or `stream` method.

```typescript
const agent = new Agent("gemini");

const response = await agent.generate(
  "You are a helpful creative assistant.",
  [{ role: "user", content: "Make a picture of a cat playing piano." }],
  {
    tools: {
      ...mediaTools, // Adds image, video, and speech capabilities
    },
  },
);
```

## Running the Examples

You can find a functional verification script at `examples/media-tools.ts`. Run it with:

```bash
bun run examples/media-tools.ts
```
