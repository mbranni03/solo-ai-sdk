# Solo AI SDK

A simple and flexible AI SDK for building agents and using generative AI tools.

## Features

- **Gemini Provider**: Support for Google's Gemini models.
- **Media Tools**: Integrated Image, Video, and Text-to-Speech generation.

## Media Generation

The SDK includes built-in tools for media generation using the provider's capabilities.

### Usage

```typescript
import { Agent, GeminiProvider } from "solo-ai-sdk";

// Initialize Provider
const provider = new GeminiProvider();

// Get configured media tools
const mediaTools = provider.getMediaTools();

// Use with Agent
const agent = new Agent("gemini");
const response = await agent.generate(
  "You are a creative assistant.",
  [{ role: "user", content: "Generate an image of a futuristic city." }],
  { tools: { ...mediaTools } },
);

// Standalone Usage
await mediaTools.generate_image.execute({ prompt: "A sunset on Mars" });
```
