/**
 * Used BEFORE send — holds a raw File reference and a cheap ObjectURL for thumbnail previews.
 * The full base64 data URL is NEVER held in memory; it is only generated at send time.
 */
export interface PendingAttachment {
  id: string;
  type: 'image' | 'video' | 'text';
  name: string;
  size?: number;
  /** Cheap blob URL pointer — only used for preview card <img>/<video> src. Revoked after send. */
  previewUrl?: string;
  /** The raw File object — base64 produced on-demand at send time only. */
  file?: File;
  /** For text-type attachments — content is small enough to hold directly. */
  textContent?: string;
  characterCount?: number;
  mimeType?: string;
}

/**
 * Used AFTER send — stored in IndexedDB and displayed in message history.
 * For images/video, dataUrl holds base64 (generated once at send, never re-held in input component).
 */
export interface Attachment {
  id: string;
  type: 'image' | 'video' | 'text';
  name: string;
  size?: number;
  dataUrl?: string; // Base64 data URL stored in IndexedDB for history display
  textContent?: string;
  mimeType?: string;
  characterCount?: number;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  content: string;
  attachments?: Attachment[];
  timestamp: number;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  previewSnippet?: string;
}

export interface ModelItemConfig {
  id: string;
  display: string;
  model: string;
  temperature: number;
}

export interface MorphConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  modelsList: ModelItemConfig[];
  maxTokens: number;
  temperature: number;
  systemPrompt: string;
  stream: boolean;
}

export interface MorphWireMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface MorphMessagesPayload {
  model: string;
  max_tokens: number;
  messages: MorphWireMessage[];
  system?: string;
  stream?: boolean;
  temperature?: number;
}

export interface MorphMessagesResponse {
  id?: string;
  type?: string;
  role?: string;
  content: Array<{
    type: 'text' | 'thinking';
    text?: string;
  }>;
  model?: string;
  stop_reason?: string;
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
  error?: {
    type: string;
    message: string;
  };
}
