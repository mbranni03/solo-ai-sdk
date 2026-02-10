# Usage Guide

## Providers

Solo AI SDK supports multiple AI providers with a unified interface for text and media generation.

### Initialization

```typescript
import { GeminiProvider, OpenAIProvider, xAIProvider } from "solo-ai-sdk";

// Initialize with default settings (uses env vars)
const gemini = new GeminiProvider();
const openai = new OpenAIProvider();
const xai = new xAIProvider();
```

## Text Generation

All providers support the standard `generate` and `stream` methods.

```typescript
const response = await gemini.generate({
  systemMessage: "You are a helpful assistant.",
  messages: [{ role: "user", content: "Hello!" }],
});

console.log(response.content);
```

## Media Generation

Providers implementing `MediaProvider` support Image, Video, and Speech generation.
Responses are now **strictly typed** objects, making them easy to use in your application API.

### Image Generation

Returns `Promise<ImageResponse>`:

```typescript
interface ImageResponse {
  images: string[]; // Base64 data URIs or URLs
  revised_prompt?: string;
  original_response?: any;
}
```

**Example:**

```typescript
const imageParams = {
  prompt: "A cybernetic cat in neon lights",
  model: "dall-e-3", // or gemini-2.5-flash-image, grok-2-image-1212
  response_format: "b64_json",
};

const result = await openai.generateImage(
  imageParams.prompt,
  imageParams.model,
  { response_format: imageParams.response_format },
);

// Use directly in your API response
// res.json(result);

console.log(result.images[0]); // data:image/png;base64,...
```

### Video Generation

Returns `Promise<VideoResponse>`:

```typescript
interface VideoResponse {
  url?: string;
  jobId?: string; // For polling if async
  message?: string;
}
```

**Example:**

```typescript
const videoResult = await gemini.generateVideo(
  "A cinematic drone shot of a mountain range",
  "veo-3.1-generate-preview",
);

if (videoResult.url) {
  console.log("Video URL:", videoResult.url);
} else if (videoResult.jobId) {
  console.log("Video processing, Job ID:", videoResult.jobId);
}
```

### Speech Generation

Returns `Promise<AudioResponse>`:

```typescript
interface AudioResponse {
  data: string; // Base64 audio data
  mimeType: string; // e.g. "audio/mp3"
}
```

**Example:**

```typescript
const audioResult = await openai.generateSpeech(
  "Hello world! This is a test.",
  "tts-1",
  { voice: "alloy" },
);

// Play in browser
// <audio src={`data:${audioResult.mimeType};base64,${audioResult.data}`} />
```

## Using Tools

Tools can be defined and passed to providers. The `Tool` class now supports returning structured data.

```typescript
import { Tool } from "solo-ai-sdk";
import { z } from "zod";

const weatherTool = new Tool({
  name: "get_weather",
  description: "Get current weather",
  schema: z.object({ location: z.string() }),
  execute: async ({ location }) => {
    return {
      temperature: 72,
      condition: "Sunny",
      location,
    }; // Returns object, not string
  },
});

// Pass to agent or provider...
```
