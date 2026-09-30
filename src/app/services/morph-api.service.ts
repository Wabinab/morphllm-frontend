import { Injectable } from '@angular/core';
import { StorageService } from './storage.service';
import { 
  Attachment, 
  ChatMessage, 
  ModelItemConfig, 
  MorphConfig, 
  MorphMessagesPayload, 
  MorphMessagesResponse, 
  MorphWireMessage 
} from '../models/chat.model';

@Injectable({
  providedIn: 'root'
})
export class MorphApiService {
  private readonly STORAGE_KEY = 'morph_api_config';

  private defaultModels: ModelItemConfig[] = [
    { id: '1', display: 'GLM 5.3', model: 'morph-glm53-744b', temperature: 0 },
    { id: '2', display: 'GLM 5.3 Flash', model: 'morph-glm53flash', temperature: 0 },
    { id: '3', display: 'Kimi K3', model: 'morph-kimik3', temperature: 0.2 },
    { id: '4', display: 'DeepSeek V4.1 Flash', model: 'morph-dsv41flash', temperature: 0 },
    { id: '5', display: 'DeepSeek V4 Flash', model: 'morph-dsv4flash', temperature: 0 }
  ];

  // Default configuration
  private config: MorphConfig = {
    apiKey: '',
    baseUrl: '/api/morph/v1',
    model: 'morph-glm53-744b',
    modelsList: [...this.defaultModels],
    maxTokens: 50000,
    temperature: 0,
    systemPrompt: 'You are a senior TypeScript engineer. Reply with code only.',
    stream: true
  };

  private isLoadedPromise: Promise<void>;

  constructor(private storageService: StorageService) {
    this.isLoadedPromise = this.loadConfig();
  }

  async waitForLoad(): Promise<void> {
    return this.isLoadedPromise;
  }

  getConfig(): MorphConfig {
    return { 
      ...this.config,
      modelsList: [...this.config.modelsList]
    };
  }

  async saveConfig(newConfig: Partial<MorphConfig>): Promise<void> {
    this.config = { ...this.config, ...newConfig };
    await this.storageService.setSetting(this.STORAGE_KEY, this.config);
  }

  async setApiKey(apiKey: string): Promise<void> {
    this.config.apiKey = apiKey.trim();
    await this.storageService.setSetting(this.STORAGE_KEY, this.config);
  }

  private async loadConfig(): Promise<void> {
    try {
      const saved = await this.storageService.getSetting<MorphConfig>(this.STORAGE_KEY);
      if (saved) {
        this.config = { 
          ...this.config, 
          ...saved,
          modelsList: saved.modelsList && saved.modelsList.length > 0 ? saved.modelsList : [...this.defaultModels],
          maxTokens: saved.maxTokens || 50000
        };
      }
    } catch (e) {
      console.warn('Could not read Morph config from IndexedDB', e);
    }
  }

  /**
   * Build payload conforming to:
   * messages.content is a single string formatted as:
   * "PASTED 1 BEGIN: ... PASTED 1 END; PASTED 2 BEGIN: ... PASTED 2 END; (then main text here)"
   */
  buildPayload(history: ChatMessage[], currentText: string, currentAttachments: Attachment[]): MorphMessagesPayload {
    const wireMessages: MorphWireMessage[] = [];

    // Prior history messages
    for (const msg of history) {
      wireMessages.push({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: this.formatContentString(msg.content, msg.attachments || [])
      });
    }

    // Current message
    wireMessages.push({
      role: 'user',
      content: this.formatContentString(currentText, currentAttachments)
    });

    // Lookup temperature from model config if model is configured in modelsList
    const selectedModelConfig = this.config.modelsList.find((m) => m.model === this.config.model);
    const effectiveTemp = selectedModelConfig !== undefined 
      ? Number(selectedModelConfig.temperature) 
      : Number(this.config.temperature);

    const payload: MorphMessagesPayload = {
      model: this.config.model,
      max_tokens: Number(this.config.maxTokens) || 50000,
      messages: wireMessages,
      system: this.config.systemPrompt ? this.config.systemPrompt.trim() : undefined,
      stream: this.config.stream ?? true,
      temperature: isNaN(effectiveTemp) ? 0 : effectiveTemp
    };

    return payload;
  }

  /**
   * Format content into:
   * "PASTED 1 BEGIN: ... PASTED 1 END; PASTED 2 BEGIN: ... PASTED 2 END; (then main text)"
   */
  private formatContentString(text: string, attachments: Attachment[]): string {
    const segments: string[] = [];

    if (attachments && attachments.length > 0) {
      attachments.forEach((att, idx) => {
        const itemNumber = idx + 1;
        let body = '';

        if (att.type === 'text') {
          body = att.textContent || '';
        } else if (att.type === 'image') {
          // Provide image name and base64 data url
          body = `[Image: ${att.name}] ${att.dataUrl || ''}`;
        } else {
          // Video
          body = `[Video: ${att.name}] ${att.dataUrl || ''}`;
        }

        segments.push(`PASTED ${itemNumber} BEGIN: ${body} PASTED ${itemNumber} END;`);
      });
    }

    if (text && text.trim()) {
      segments.push(text.trim());
    }

    return segments.join(' ');
  }

  /**
   * Send with streaming support (Server-Sent Events / SSE reader)
   * onChunk is called with incremental full accumulated text
   */
  async sendMessageStream(
    payload: MorphMessagesPayload, 
    onChunk: (accumulatedText: string) => void
  ): Promise<string> {
    const url = `${this.config.baseUrl.replace(/\/+$/, '')}/messages`;
    const token = this.config.apiKey.trim();

    if (!token) {
      throw new Error('Morph API Key is missing. Please set your API token in settings or sidebar (IndexedDB).');
    }

    // Force stream to true
    payload.stream = true;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      let errDetail = '';
      try {
        const errJson = await response.json();
        errDetail = errJson.error?.message || errJson.message || JSON.stringify(errJson);
      } catch {
        errDetail = await response.text();
      }
      throw new Error(`Morph API Error (${response.status} ${response.statusText}): ${errDetail}`);
    }

    if (!response.body) {
      throw new Error('Response body is null, cannot stream.');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let accumulatedText = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep partial line in buffer

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith(':')) continue;

        if (trimmed.startsWith('data: ')) {
          const dataStr = trimmed.slice(6).trim();
          if (dataStr === '[DONE]') continue;

          try {
            const dataObj = JSON.parse(dataStr);

            // Anthropic Messages SSE event handling:
            // 1. content_block_delta with delta.text
            if (dataObj.type === 'content_block_delta' && dataObj.delta?.text) {
              accumulatedText += dataObj.delta.text;
              onChunk(accumulatedText);
            } 
            // 2. OpenAI-compatible format fallback choices[0].delta.content
            else if (dataObj.choices?.[0]?.delta?.content) {
              accumulatedText += dataObj.choices[0].delta.content;
              onChunk(accumulatedText);
            }
          } catch {
            // Ignore partial non-JSON line
          }
        }
      }
    }

    // If streaming yielded nothing (e.g. non-stream response received), return fallback
    return accumulatedText;
  }
}
