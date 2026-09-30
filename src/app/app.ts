import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StorageService } from './services/storage.service';
import { MorphApiService } from './services/morph-api.service';
import { Attachment, ChatMessage, ChatSession, MorphConfig } from './models/chat.model';
import { SidebarComponent } from './components/sidebar.component';
import { ChatInputComponent } from './components/chat-input.component';
import { ChatMessageComponent } from './components/chat-message.component';
import { PreviewModalComponent } from './components/preview-modal.component';
import { SettingsModalComponent } from './components/settings-modal.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    SidebarComponent,
    ChatInputComponent,
    ChatMessageComponent,
    PreviewModalComponent,
    SettingsModalComponent,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  @ViewChild('messagesContainer') private messagesContainer!: ElementRef<HTMLDivElement>;

  sessions: ChatSession[] = [];
  currentSessionId: string | null = null;
  messages: ChatMessage[] = [];
  
  isSidebarOpen = false;
  isAiResponding = false;
  isSettingsOpen = false;
  errorMessage: string | null = null;

  selectedAttachmentForPreview: Attachment | null = null;
  morphConfig!: MorphConfig;

  get activeModelDisplay(): string {
    if (!this.morphConfig) return '';
    const item = this.morphConfig.modelsList?.find((m) => m.model === this.morphConfig.model);
    return item ? `${item.display} (${item.model})` : this.morphConfig.model;
  }

  constructor(
    private storageService: StorageService,
    private morphApiService: MorphApiService
  ) {}

  async ngOnInit() {
    await this.morphApiService.waitForLoad();
    this.morphConfig = this.morphApiService.getConfig();
    await this.loadSessions();
    if (this.sessions.length > 0) {
      await this.selectSession(this.sessions[0].id);
    } else {
      await this.createNewChat();
    }
  }

  async loadSessions() {
    this.sessions = await this.storageService.getSessions();
  }

  toggleSidebar() {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  closeSidebar() {
    this.isSidebarOpen = false;
  }

  openSettings() {
    this.morphConfig = this.morphApiService.getConfig();
    this.isSettingsOpen = true;
  }

  closeSettings() {
    this.isSettingsOpen = false;
  }

  async saveSettings(newConfig: MorphConfig) {
    await this.morphApiService.saveConfig(newConfig);
    this.morphConfig = this.morphApiService.getConfig();
    this.errorMessage = null;
  }

  async handleSaveBearerToken(token: string) {
    await this.morphApiService.setApiKey(token);
    this.morphConfig = this.morphApiService.getConfig();
    this.errorMessage = null;
  }

  /**
   * Immediately switches the active model — no Settings modal or Save required.
   * Persists the selection to IndexedDB so it survives page refresh.
   */
  async switchModel(modelId: string) {
    await this.morphApiService.saveConfig({ model: modelId });
    this.morphConfig = this.morphApiService.getConfig();
  }

  async createNewChat() {
    const newSession: ChatSession = {
      id: 'session-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      title: 'New Conversation',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await this.storageService.saveSession(newSession);
    this.sessions.unshift(newSession);
    this.currentSessionId = newSession.id;
    this.messages = [];
    this.closeSidebar();
  }

  async selectSession(sessionId: string) {
    this.currentSessionId = sessionId;
    this.messages = await this.storageService.getMessages(sessionId);
    this.closeSidebar();
    this.scrollToBottom();
  }

  async deleteSession(sessionId: string) {
    await this.storageService.deleteSession(sessionId);
    this.sessions = this.sessions.filter((s) => s.id !== sessionId);

    if (this.currentSessionId === sessionId) {
      if (this.sessions.length > 0) {
        await this.selectSession(this.sessions[0].id);
      } else {
        await this.createNewChat();
      }
    }
  }

  async handleSendMessage(payload: { text: string; attachments: Attachment[] }) {
    if (!this.currentSessionId) {
      await this.createNewChat();
    }

    const sessionId = this.currentSessionId!;

    const userMessage: ChatMessage = {
      id: 'msg-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      sender: 'user',
      content: payload.text,
      attachments: payload.attachments,
      timestamp: Date.now(),
    };

    this.messages.push(userMessage);
    await this.storageService.saveMessage(sessionId, userMessage);

    // Update conversation title if needed
    const currentSession = this.sessions.find((s) => s.id === sessionId);
    if (currentSession && (currentSession.title === 'New Conversation' || !currentSession.title)) {
      if (payload.text) {
        currentSession.title = payload.text.substring(0, 32);
      } else if (payload.attachments.length > 0) {
        currentSession.title = `${payload.attachments[0].name}`;
      }
      currentSession.updatedAt = Date.now();
      await this.storageService.saveSession(currentSession);
    } else if (currentSession) {
      currentSession.updatedAt = Date.now();
      await this.storageService.saveSession(currentSession);
    }

    this.scrollToBottom();

    // Call Morph API
    await this.callMorphApi(payload);
  }

  private async callMorphApi(userInput: { text: string; attachments: Attachment[] }) {
    this.isAiResponding = true;
    this.errorMessage = null;
    this.scrollToBottom();

    // Create an assistant message placeholder for streaming
    const aiMessageId = 'msg-ai-' + Date.now();
    const aiMessage: ChatMessage = {
      id: aiMessageId,
      sender: 'assistant',
      content: '',
      timestamp: Date.now(),
    };

    try {
      // Build previous messages context (excluding the message just added)
      const historyExceptLast = this.messages.slice(0, -1);
      
      const payload = this.morphApiService.buildPayload(
        historyExceptLast,
        userInput.text,
        userInput.attachments
      );

      // Check if API key is supplied; if not, notify user nicely
      if (!this.morphConfig.apiKey) {
        this.openSettings();
        throw new Error('Please configure your Morph API Token in Settings or on the LHS panel to send requests to https://api.morphllm.com/v1/messages.');
      }

      // Append assistant placeholder so stream is visible in real-time
      this.messages.push(aiMessage);

      // Stream the response
      const finalContent = await this.morphApiService.sendMessageStream(payload, (chunkText) => {
        aiMessage.content = chunkText;
        this.scrollToBottom();
      });

      aiMessage.content = finalContent || aiMessage.content;
      await this.storageService.saveMessage(this.currentSessionId!, aiMessage);
    } catch (err: any) {
      console.error('Morph API Error:', err);
      this.errorMessage = err.message || 'An error occurred while connecting to the Morph API.';

      // If placeholder was added with no content, reuse or remove
      if (this.messages.includes(aiMessage) && !aiMessage.content) {
        aiMessage.content = `⚠️ ${this.errorMessage}`;
        await this.storageService.saveMessage(this.currentSessionId!, aiMessage);
      } else {
        const errorMessage: ChatMessage = {
          id: 'msg-err-' + Date.now(),
          sender: 'assistant',
          content: `⚠️ ${this.errorMessage}`,
          timestamp: Date.now(),
        };
        this.messages.push(errorMessage);
        await this.storageService.saveMessage(this.currentSessionId!, errorMessage);
      }
    } finally {
      this.isAiResponding = false;
      this.scrollToBottom();
    }
  }

  inspectAttachment(attachment: Attachment) {
    this.selectedAttachmentForPreview = attachment;
  }

  closePreview() {
    this.selectedAttachmentForPreview = null;
  }

  scrollToBottom() {
    setTimeout(() => {
      if (this.messagesContainer) {
        this.messagesContainer.nativeElement.scrollTop = this.messagesContainer.nativeElement.scrollHeight;
      }
    }, 50);
  }
}
