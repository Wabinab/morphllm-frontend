import { Component, ElementRef, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
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
  // Services first: field initializers below depend on them.
  private storageService = inject(StorageService);
  private morphApiService = inject(MorphApiService);

  @ViewChild('messagesContainer') private messagesContainer!: ElementRef<HTMLDivElement>;

  // All state the template reads is a signal, so any change schedules a render
  // (required in zoneless apps, where plain property mutation renders nothing).
  sessions = signal<ChatSession[]>([]);
  currentSessionId = signal<string | null>(null);
  messages = signal<ChatMessage[]>([]);

  isSidebarOpen = signal(false);
  isAiResponding = signal(false);
  isSettingsOpen = signal(false);
  errorMessage = signal<string | null>(null);
  selectedAttachmentForPreview = signal<Attachment | null>(null);

  // getConfig() is synchronous and returns defaults until IndexedDB finishes loading,
  // so the signal always holds a real value (no null, no `!`). ngOnInit swaps in the saved config.
  morphConfig = signal<MorphConfig>(this.morphApiService.getConfig());

  activeModelDisplay = computed(() => {
    const cfg = this.morphConfig();
    const item = cfg.modelsList?.find((m) => m.model === cfg.model);
    return item ? `${item.display} (${item.model})` : cfg.model;
  });

  async ngOnInit() {
    await this.morphApiService.waitForLoad();
    this.refreshConfig();
    await this.loadSessions();
    const sessions = this.sessions();
    if (sessions.length > 0) {
      await this.selectSession(sessions[0].id);
    } else {
      await this.createNewChat();
    }
  }

  private refreshConfig() {
    this.morphConfig.set(this.morphApiService.getConfig());
  }

  async loadSessions() {
    this.sessions.set(await this.storageService.getSessions());
  }

  toggleSidebar() {
    this.isSidebarOpen.update((open) => !open);
  }

  closeSidebar() {
    this.isSidebarOpen.set(false);
  }

  openSettings() {
    this.refreshConfig();
    this.isSettingsOpen.set(true);
  }

  closeSettings() {
    this.isSettingsOpen.set(false);
  }

  async saveSettings(newConfig: MorphConfig) {
    await this.morphApiService.saveConfig(newConfig);
    this.refreshConfig();
    this.errorMessage.set(null);
  }

  async handleSaveBearerToken(token: string) {
    await this.morphApiService.setApiKey(token);
    this.refreshConfig();
    this.errorMessage.set(null);
  }

  /**
   * Immediately switches the active model, no Settings modal or Save required.
   * Persists the selection to IndexedDB so it survives page refresh.
   */
  async switchModel(modelId: string) {
    await this.morphApiService.saveConfig({ model: modelId });
    this.refreshConfig();
  }

  async createNewChat() {
    const newSession: ChatSession = {
      id: 'session-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      title: 'New Conversation',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await this.storageService.saveSession(newSession);
    this.sessions.update((list) => [newSession, ...list]);
    this.currentSessionId.set(newSession.id);
    this.messages.set([]);
    this.closeSidebar();
  }

  async selectSession(sessionId: string) {
    this.currentSessionId.set(sessionId);
    this.messages.set(await this.storageService.getMessages(sessionId));
    this.closeSidebar();
    this.scrollToBottom();
  }

  async deleteSession(sessionId: string) {
    await this.storageService.deleteSession(sessionId);
    this.sessions.update((list) => list.filter((s) => s.id !== sessionId));

    if (this.currentSessionId() === sessionId) {
      const remaining = this.sessions();
      if (remaining.length > 0) {
        await this.selectSession(remaining[0].id);
      } else {
        await this.createNewChat();
      }
    }
  }

  async handleSendMessage(payload: { text: string; attachments: Attachment[] }) {
    if (!this.currentSessionId()) {
      await this.createNewChat();
    }

    const sessionId = this.currentSessionId()!;

    const userMessage: ChatMessage = {
      id: 'msg-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      sender: 'user',
      content: payload.text,
      attachments: payload.attachments,
      timestamp: Date.now(),
    };

    this.messages.update((list) => [...list, userMessage]);
    await this.storageService.saveMessage(sessionId, userMessage);

    // Update conversation title / timestamp. Replace the object (don't mutate) so the sidebar re-renders.
    const current = this.sessions().find((s) => s.id === sessionId);
    if (current) {
      let title = current.title;
      if (current.title === 'New Conversation' || !current.title) {
        if (payload.text) {
          title = payload.text.substring(0, 32);
        } else if (payload.attachments.length > 0) {
          title = `${payload.attachments[0].name}`;
        }
      }
      const updated: ChatSession = { ...current, title, updatedAt: Date.now() };
      this.sessions.update((list) => list.map((s) => (s.id === sessionId ? updated : s)));
      await this.storageService.saveSession(updated);
    }

    this.scrollToBottom();

    // sessionId is passed explicitly so a reply is saved to the session it was sent from,
    // even if the user switches sessions while it streams.
    await this.callMorphApi(sessionId, payload);
  }

  private async callMorphApi(
    sessionId: string,
    userInput: { text: string; attachments: Attachment[] }
  ) {
    this.isAiResponding.set(true);
    this.errorMessage.set(null);
    this.scrollToBottom();

    const aiMessageId = 'msg-ai-' + Date.now();
    let aiMessage: ChatMessage = {
      id: aiMessageId,
      sender: 'assistant',
      content: '',
      timestamp: Date.now(),
    };

    // Replace the message in the list with a new object on every update.
    const setAiMessage = (next: ChatMessage) => {
      aiMessage = next;
      this.messages.update((list) => list.map((m) => (m.id === aiMessageId ? next : m)));
    };

    try {
      // Context = everything except the user message just added
      const historyExceptLast = this.messages().slice(0, -1);

      const payload = this.morphApiService.buildPayload(
        historyExceptLast,
        userInput.text,
        userInput.attachments
      );

      if (!this.morphConfig().apiKey) {
        this.openSettings();
        throw new Error(
          'Please configure your Morph API Token in Settings or on the LHS panel to send requests to https://api.morphllm.com/v1/messages.'
        );
      }

      // Add the placeholder so the stream is visible in real time
      this.messages.update((list) => [...list, aiMessage]);

      const finalContent = await this.morphApiService.sendMessageStream(payload, (chunkText) => {
        setAiMessage({ ...aiMessage, content: chunkText });
        this.scrollToBottom();
      });

      if (!finalContent) {
        console.warn('Stream finished but no text was parsed from it (check the EventStream tab).');
      }

      setAiMessage({ ...aiMessage, content: finalContent || aiMessage.content });
      await this.storageService.saveMessage(sessionId, aiMessage);
    } catch (err: any) {
      console.error('Morph API Error:', err);
      const text: string = err?.message || 'An error occurred while connecting to the Morph API.';
      this.errorMessage.set(text);

      const placeholderInList = this.messages().some((m) => m.id === aiMessageId);

      if (placeholderInList && !aiMessage.content) {
        // Reuse the empty placeholder as the error bubble
        setAiMessage({ ...aiMessage, content: `⚠️ ${text}` });
        await this.storageService.saveMessage(sessionId, aiMessage);
      } else {
        // Keep any partial reply that streamed before the failure
        if (placeholderInList && aiMessage.content) {
          await this.storageService.saveMessage(sessionId, aiMessage);
        }
        const errorMsg: ChatMessage = {
          id: 'msg-err-' + Date.now(),
          sender: 'assistant',
          content: `⚠️ ${text}`,
          timestamp: Date.now(),
        };
        this.messages.update((list) => [...list, errorMsg]);
        await this.storageService.saveMessage(sessionId, errorMsg);
      }
    } finally {
      this.isAiResponding.set(false);
      this.scrollToBottom();
    }
  }

  inspectAttachment(attachment: Attachment) {
    this.selectedAttachmentForPreview.set(attachment);
  }

  closePreview() {
    this.selectedAttachmentForPreview.set(null);
  }

  scrollToBottom() {
    setTimeout(() => {
      if (this.messagesContainer) {
        this.messagesContainer.nativeElement.scrollTop = this.messagesContainer.nativeElement.scrollHeight;
      }
    }, 50);
  }
}