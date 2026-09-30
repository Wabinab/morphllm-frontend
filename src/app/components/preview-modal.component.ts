import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Attachment } from '../models/chat.model';

@Component({
  selector: 'app-preview-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (attachment) {
      <div 
        class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-fade-in"
        (click)="closeModal()"
      >
        <div 
          class="relative w-full max-w-3xl max-h-[85vh] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100"
          (click)="$event.stopPropagation()"
        >
          <!-- Modal Header -->
          <div class="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-900/90">
            <div class="flex items-center gap-2.5 truncate">
              <span 
                class="px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wider"
                [ngClass]="{
                  'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30': attachment.type === 'text',
                  'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30': attachment.type === 'image',
                  'bg-purple-500/20 text-purple-400 border border-purple-500/30': attachment.type === 'video'
                }"
              >
                {{ attachment.type }}
              </span>
              <h3 class="font-medium text-slate-200 truncate text-sm sm:text-base">{{ attachment.name }}</h3>
              @if (attachment.characterCount) {
                <span class="text-xs text-slate-400">({{ attachment.characterCount.toLocaleString() }} characters)</span>
              }
            </div>

            <button 
              type="button" 
              (click)="closeModal()" 
              class="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Close"
            >
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Modal Body -->
          <div class="flex-1 overflow-auto p-4 sm:p-6 bg-slate-950/60">
            @if (attachment.type === 'image' && attachment.dataUrl) {
              <div class="flex items-center justify-center min-h-[300px]">
                <img [src]="attachment.dataUrl" [alt]="attachment.name" class="max-h-[70vh] rounded-lg object-contain shadow-md" />
              </div>
            } @else if (attachment.type === 'video' && attachment.dataUrl) {
              <div class="flex items-center justify-center min-h-[300px]">
                <video [src]="attachment.dataUrl" controls class="max-h-[70vh] w-full rounded-lg shadow-md"></video>
              </div>
            } @else if (attachment.type === 'text') {
              <div class="space-y-4">
                <div class="flex items-center justify-end gap-2 pb-2 border-b border-slate-800">
                  <button 
                    (click)="copyText()" 
                    class="px-3 py-1 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md transition-colors flex items-center gap-1.5"
                  >
                    @if (copied) {
                      <svg class="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                      </svg>
                      <span class="text-emerald-400">Copied!</span>
                    } @else {
                      <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      <span>Copy content</span>
                    }
                  </button>
                </div>
                <pre class="font-mono text-xs sm:text-sm text-slate-200 bg-slate-900/90 p-4 rounded-xl border border-slate-800 overflow-x-auto whitespace-pre-wrap leading-relaxed select-text">{{ attachment.textContent }}</pre>
              </div>
            }
          </div>
        </div>
      </div>
    }
  `
})
export class PreviewModalComponent {
  @Input() attachment: Attachment | null = null;
  @Output() onClose = new EventEmitter<void>();

  copied = false;

  closeModal() {
    this.copied = false;
    this.onClose.emit();
  }

  async copyText() {
    if (this.attachment?.textContent) {
      await navigator.clipboard.writeText(this.attachment.textContent);
      this.copied = true;
      setTimeout(() => (this.copied = false), 2000);
    }
  }
}
