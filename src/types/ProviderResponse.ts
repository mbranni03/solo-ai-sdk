export interface ImageResponse {
  images: string[]; // Base64 or URL
  revised_prompt?: string;
  original_response?: any;
}

export interface VideoResponse {
  url?: string;
  jobId?: string; // For polling
  message?: string;
}

export interface AudioResponse {
  data: string; // Base64
  mimeType: string;
}
