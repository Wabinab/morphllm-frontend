import { Component, EventEmitter, Input, OnChanges, Output, SecurityContext, SimpleChanges, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Attachment, ChatMessage } from '../models/chat.model';
import { PastedCardComponent } from './pasted-card.component';
import { marked, Renderer } from 'marked';
import hljs from 'highlight.js';

// ── Configure marked once at module level ────────────────────────────────────
const _renderer = new Renderer();

_renderer.code = ({ text, lang }: { text: string; lang?: string }): string => {
  const language = lang && hljs.getLanguage(lang) ? lang : 'plaintext';
  const highlighted = hljs.highlight(text, { language, ignoreIllegals: true }).value;
  const badge = language === 'plaintext' ? '' : language;
  return [
    `<div class="code-block-wrapper">`,
    `  <div class="code-block-header">`,
    `    <span class="code-lang-badge">${badge}</span>`,
    `    <button class="copy-code-btn" title="Copy code">Copy</button>`,
    `  </div>`,
    `  <pre data-lang="${badge}"><code class="hljs language-${language}">${highlighted}</code></pre>`,
    `</div>`,
  ].join('');
};

marked.use({ renderer: _renderer, breaks: true, gfm: true });

@Component({
  selector: 'app-chat-message',
  standalone: true,
  imports: [CommonModule, PastedCardComponent],
  template: `
    <div 
      class="flex gap-3 sm:gap-4 max-w-4xl mx-auto w-full py-4 group animate-fade-in"
      [ngClass]="{ 'flex-row-reverse': message.sender === 'user' }"
    >
      <!-- Avatar -->
      <div 
        class="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shrink-0 shadow-md text-xs font-bold"
        [ngClass]="{
          'bg-gradient-to-tr from-indigo-500 to-violet-600 text-white shadow-indigo-500/20': message.sender === 'assistant',
          'bg-slate-700 text-slate-200 border border-slate-600': message.sender === 'user'
        }"
      >
        @if (message.sender === 'assistant') {
          <svg class="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        } @else {
          <svg class="w-4 h-4 sm:w-5 sm:h-5 text-slate-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        }
      </div>

      <!-- Bubble Container -->
      <div 
        class="flex flex-col space-y-2 max-w-[85%] sm:max-w-[75%]"
        [ngClass]="{ 'items-end': message.sender === 'user', 'items-start': message.sender === 'assistant' }"
      >
        <!-- Author & Time -->
        <div class="flex items-center gap-2 text-xs text-slate-400 px-1">
          <span class="font-medium text-slate-300">
            {{ message.sender === 'assistant' ? (message.modelName ?? 'MorphLLM') : 'You' }}
          </span>
          <span>•</span>
          <span>{{ formatTime(message.timestamp) }}</span>
        </div>

        <!-- Copy whole message (assistant only, appears on group hover) -->
        @if (message.sender === 'assistant') {
          <button
            class="copy-msg-btn flex items-center gap-1 text-xs px-2 py-0.5 rounded-md
                   text-slate-400 hover:text-slate-200 hover:bg-slate-700/60
                   opacity-0 group-hover:opacity-100 transition-all duration-150"
            (click)="copyMessage()"
            title="Copy message"
          >
            @if (messageCopied()) {
              <svg class="w-3 h-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
              </svg>
              <span class="text-emerald-400">Copied!</span>
            } @else {
              <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2M8 16a2 2 0 002 2h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8z" />
              </svg>
              <span>Copy</span>
            }
          </button>
        }

        <!-- Render Pasted Boxes / Attachments if any -->
        @if (message.attachments && message.attachments.length > 0) {
          <div 
            class="flex flex-wrap gap-2.5 my-1"
            [ngClass]="{ 'justify-end': message.sender === 'user' }"
          >
            @for (att of message.attachments; track att.id) {
              <app-pasted-card 
                [attachment]="att" 
                [removable]="false" 
                (onClick)="inspectAttachment.emit($event)"
              />
            }
          </div>
        }

        <!-- Text content if present -->
        @if (message.content) {
          <!-- User message: plain text bubble -->
          @if (message.sender === 'user') {
            <div class="rounded-2xl rounded-tr-sm px-4 py-3 text-sm sm:text-base leading-relaxed break-words whitespace-pre-wrap shadow-sm bg-indigo-600 text-white">
              {{ message.content }}
            </div>
          }

          <!-- Assistant message: rendered markdown -->
          @if (message.sender === 'assistant') {
            <div
              class="prose-ai rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm bg-slate-800/90 border border-slate-700/60 min-w-0 w-full"
              [innerHTML]="renderedHtml"
              (click)="onRenderedClick($event)"
            ></div>
          }
        }
      </div>
    </div>
  `
})
export class ChatMessageComponent implements OnChanges {
  @Input({ required: true }) message!: ChatMessage;
  @Output() inspectAttachment = new EventEmitter<Attachment>();

  renderedHtml: SafeHtml = '';
  messageCopied = signal(false);

  constructor(private sanitizer: DomSanitizer) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['message'] && this.message?.sender === 'assistant') {
      this.renderedHtml = this.renderMarkdown(this.message.content);
    }
  }

  private renderMarkdown(content: string): SafeHtml {
    if (!content) return '';
    const rawHtml = marked.parse(content) as string;
    // Sanitize first to strip anything dangerous, then trust the result for Angular binding
    const safe = this.sanitizer.sanitize(SecurityContext.HTML, rawHtml) ?? '';
    return this.sanitizer.bypassSecurityTrustHtml(safe);
  }

  async copyMessage(): Promise<void> {
    await navigator.clipboard.writeText(this.message.content);
    this.messageCopied.set(true);
    setTimeout(() => this.messageCopied.set(false), 2000);
  }

  /** Event-delegation handler for code-block copy buttons inside rendered HTML. */
  onRenderedClick(event: MouseEvent): void {
    const btn = (event.target as HTMLElement).closest<HTMLElement>('.copy-code-btn');
    if (!btn) return;
    event.preventDefault();
    const wrapper = btn.closest<HTMLElement>('.code-block-wrapper');
    if (!wrapper) return;
    const code = wrapper.querySelector('code');
    const text = code?.textContent ?? '';
    navigator.clipboard.writeText(text).then(() => {
      btn.textContent = 'Copied!';
      btn.classList.add('copied');
      setTimeout(() => {
        btn.textContent = 'Copy';
        btn.classList.remove('copied');
      }, 2000);
    });
  }

  formatTime(ts: number): string {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}
