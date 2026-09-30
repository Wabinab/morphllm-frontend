import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Attachment, PendingAttachment } from '../models/chat.model';

@Component({
  selector: 'app-pasted-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div 
      role="button"
      tabindex="0"
      class="group relative flex flex-col w-36 h-36 bg-slate-900/90 hover:bg-slate-800/95 border border-slate-700/80 hover:border-indigo-500/80 rounded-xl overflow-hidden shadow-lg transition-all duration-200 shrink-0 select-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500"
      (click)="handleClick()"
      (keydown.enter)="handleClick()"
      (keydown.space)="handleClick(); $event.preventDefault()"
      [title]="'Click to view ' + displayName"
    >
      <!-- Top Action: Remove button -->
      @if (removable) {
        <button
          type="button"
          (click)="onRemoveClick($event)"
          title="Remove"
          class="absolute top-1.5 right-1.5 z-20 w-6 h-6 rounded-full bg-slate-950/80 hover:bg-rose-600 text-slate-300 hover:text-white flex items-center justify-center backdrop-blur-sm opacity-80 group-hover:opacity-100 transition-all shadow"
        >
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      }

      <!-- Badge for Type / Character Count -->
      <div class="absolute top-1.5 left-1.5 z-10 flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-wide backdrop-blur-md shadow-sm"
        [ngClass]="{
          'bg-indigo-500/80 text-white': displayType === 'text',
          'bg-emerald-500/80 text-white': displayType === 'image',
          'bg-purple-500/80 text-white': displayType === 'video'
        }"
      >
        @if (displayType === 'text') {
          <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span>{{ displayCharCount }} chars</span>
        } @else if (displayType === 'image') {
          <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span>Image</span>
        } @else {
          <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <span>Video</span>
        }
      </div>

      <!-- Preview Body -->
      <div class="flex-1 w-full h-full relative overflow-hidden flex items-center justify-center bg-slate-950/40">
        @if (displayType === 'image' && previewSrc) {
          <img 
            [src]="previewSrc" 
            [alt]="displayName" 
            class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        } @else if (displayType === 'video' && previewSrc) {
          <video 
            [src]="previewSrc" 
            class="w-full h-full object-cover"
            preload="metadata"
            muted
          ></video>
          <div class="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/10 transition-colors">
            <div class="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center">
              <svg class="w-4 h-4 text-white ml-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z"/>
              </svg>
            </div>
          </div>
        } @else if (displayType === 'text') {
          <!-- Document style view with snippet -->
          <div class="p-3 pt-7 w-full h-full flex flex-col justify-between font-mono text-[11px] leading-relaxed text-slate-300 bg-slate-950/70 select-none overflow-hidden">
            <div class="line-clamp-4 text-slate-400 font-sans break-words whitespace-pre-wrap">
              {{ displayText }}
            </div>
            <div class="pt-1 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500">
              <span class="truncate font-semibold text-slate-400">Pasted Text</span>
              <span class="text-indigo-400 font-medium">Click to read</span>
            </div>
          </div>
        } @else {
          <!-- Pending image/video without previewSrc (shouldn't happen) -->
          <div class="text-slate-500 text-[11px] flex items-center justify-center">
            <span>{{ displayType }}</span>
          </div>
        }
      </div>

      <!-- Footer Info -->
      <div class="px-2 py-1.5 bg-slate-900/90 border-t border-slate-800 text-[11px] truncate flex items-center justify-between">
        <span class="truncate text-slate-300 font-medium text-[11px]">{{ displayName }}</span>
        @if (displaySize) {
          <span class="text-[9px] text-slate-500 shrink-0 ml-1">{{ formatSize(displaySize) }}</span>
        }
      </div>
    </div>
  `
})
export class PastedCardComponent {
  // For the input box (pre-send): PendingAttachment with ObjectURL
  @Input() pendingAttachment: PendingAttachment | null = null;
  // For message history (post-send): Attachment with base64 dataUrl
  @Input() attachment: Attachment | null = null;
  @Input() removable = true;

  @Output() onRemove = new EventEmitter<string>();
  // Emitted when clicking on a pending card (input box cards)
  @Output() onPendingClick = new EventEmitter<PendingAttachment>();
  // Emitted when clicking on a stored card (history cards)
  @Output() onClick = new EventEmitter<Attachment>();

  get displayType(): 'image' | 'video' | 'text' {
    return (this.pendingAttachment?.type ?? this.attachment?.type) || 'text';
  }

  get displayName(): string {
    return this.pendingAttachment?.name ?? this.attachment?.name ?? '';
  }

  get displaySize(): number | undefined {
    return this.pendingAttachment?.size ?? this.attachment?.size;
  }

  get displayCharCount(): number {
    if (this.pendingAttachment) {
      return this.pendingAttachment.characterCount ?? this.pendingAttachment.textContent?.length ?? 0;
    }
    return this.attachment?.characterCount ?? this.attachment?.textContent?.length ?? 0;
  }

  get displayText(): string {
    return this.pendingAttachment?.textContent ?? this.attachment?.textContent ?? '';
  }

  /** 
   * Preview src: for pending attachments use ObjectURL (cheap pointer).
   * For stored attachments (history) use base64 dataUrl.
   */
  get previewSrc(): string | undefined {
    if (this.pendingAttachment) {
      return this.pendingAttachment.previewUrl;
    }
    return this.attachment?.dataUrl;
  }

  handleClick() {
    if (this.pendingAttachment) {
      this.onPendingClick.emit(this.pendingAttachment);
    } else if (this.attachment) {
      this.onClick.emit(this.attachment);
    }
  }

  onRemoveClick(e: MouseEvent) {
    e.stopPropagation();
    const id = this.pendingAttachment?.id ?? this.attachment?.id;
    if (id) this.onRemove.emit(id);
  }

  formatSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }
}
