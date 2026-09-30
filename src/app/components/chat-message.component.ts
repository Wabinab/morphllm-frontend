import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Attachment, ChatMessage } from '../models/chat.model';
import { PastedCardComponent } from './pasted-card.component';

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
            {{ message.sender === 'assistant' ? 'MorphLLM' : 'You' }}
          </span>
          <span>•</span>
          <span>{{ formatTime(message.timestamp) }}</span>
        </div>

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
          <div 
            class="rounded-2xl px-4 py-3 text-sm sm:text-base leading-relaxed break-words whitespace-pre-wrap shadow-sm"
            [ngClass]="{
              'bg-indigo-600 text-white rounded-tr-sm': message.sender === 'user',
              'bg-slate-800/90 text-slate-100 rounded-tl-sm border border-slate-700/60': message.sender === 'assistant'
            }"
          >{{ message.content }}</div>
        }
      </div>
    </div>
  `
})
export class ChatMessageComponent {
  @Input({ required: true }) message!: ChatMessage;
  @Output() inspectAttachment = new EventEmitter<Attachment>();

  formatTime(ts: number): string {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}
