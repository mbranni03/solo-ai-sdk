# Solo AI SDK

A simple and flexible AI SDK for building agents and using generative AI tools.

## Installation

```bash
bun add solo-ai-sdk
# or
npm install solo-ai-sdk
```

## Features

- **Gemini Provider**: Support for Google's Gemini models.
- **Media Tools**: Integrated Image, Video, and Text-to-Speech generation.

## Documentation

For detailed examples and API reference, please see [USAGE.md](./USAGE.md).

## Quick Start

### Media Generation

The SDK includes built-in tools for media generation using the provider's capabilities.

```typescript
import { GeminiProvider } from "solo-ai-sdk";

const provider = new GeminiProvider();

// Generate an image (returns strongly typed ImageResponse)
const result = await provider.generateImage("A sunset on Mars");
console.log(result.images[0]);
```
