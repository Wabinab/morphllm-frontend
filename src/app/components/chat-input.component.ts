import { 
  Component, 
  ElementRef, 
  EventEmitter, 
  Input, 
  OnDestroy,
  Output, 
  ViewChild 
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Attachment, PendingAttachment } from '../models/chat.model';
import { PastedCardComponent } from './pasted-card.component';

@Component({
  selector: 'app-chat-input',
  standalone: true,
  imports: [CommonModule, FormsModule, PastedCardComponent],
  template: `
    <div 
      class="relative w-full max-w-4xl mx-auto transition-all"
      (dragover)="onDragOver($event)"
      (dragleave)="onDragLeave($event)"
      (drop)="onDrop($event)"
    >
      <!-- Drag & Drop overlay highlight -->
      @if (isDraggingOver) {
        <div class="absolute -inset-2 bg-indigo-500/10 border-2 border-dashed border-indigo-500 rounded-3xl z-30 pointer-events-none flex items-center justify-center backdrop-blur-[2px] animate-pulse">
          <div class="px-4 py-2 bg-slate-900/90 rounded-xl shadow-lg border border-indigo-500/50 flex items-center gap-2 text-indigo-300 font-medium text-sm">
            <svg class="w-5 h-5 text-indigo-400 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <span>Drop image, video, or long text here</span>
          </div>
        </div>
      }

      <div class="bg-slate-900/95 border border-slate-700/80 focus-within:border-indigo-500/80 rounded-2xl p-2 sm:p-3 shadow-2xl transition-all duration-200">
        <!-- Square boxes container above chat box for attachments / pasted text -->
        @if (pendingAttachments.length > 0) {
          <div class="flex items-center gap-3 overflow-x-auto pb-3 pt-1 px-1 custom-scrollbar">
            @for (att of pendingAttachments; track att.id) {
              <app-pasted-card 
                [pendingAttachment]="att" 
                [removable]="true"
                (onRemove)="removePendingAttachment($event)"
                (onPendingClick)="onPendingCardClick($event)"
              />
            }
          </div>
        }

        <!-- Input Area Form -->
        <div class="flex items-end gap-2">
          <!-- Upload Button for files (fallback / quick access) -->
          <input 
            #fileInput 
            type="file" 
            multiple 
            accept="image/*,video/*,text/*,.md,.txt,.json,.js,.ts,.py,.html,.css" 
            class="hidden" 
            (change)="onFileInputChange($event)"
          />

          <button
            type="button"
            (click)="fileInput.click()"
            class="p-2.5 rounded-xl text-slate-400 hover:text-indigo-400 hover:bg-slate-800/80 transition-colors shrink-0"
            title="Attach image, video, or document"
          >
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          </button>

          <!-- Textarea with paste listener -->
          <div class="flex-1 relative">
            <textarea
              #inputBox
              rows="1"
              [(ngModel)]="textPrompt"
              (paste)="onPaste($event)"
              (keydown)="onKeyDown($event)"
              (input)="autoResize($event)"
              placeholder="Ask MorphLLM... (Paste images, videos, or text > 750 chars to create card)"
              class="w-full max-h-48 resize-none bg-transparent text-slate-100 placeholder-slate-500 text-sm sm:text-base focus:outline-none py-2 px-1 leading-relaxed"
            ></textarea>
          </div>

          <!-- Send Button -->
          <button
            type="button"
            (click)="sendMessage()"
            [disabled]="!canSend"
            class="p-2.5 rounded-xl font-medium transition-all duration-200 shrink-0 flex items-center justify-center"
            [ngClass]="{
              'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 scale-100 cursor-pointer active:scale-95': canSend,
              'bg-slate-800 text-slate-600 cursor-not-allowed scale-95': !canSend
            }"
            title="Send message (Enter)"
          >
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Quick Tips -->
      <div class="mt-2 flex items-center justify-between px-2 text-[11px] text-slate-500">
        <div class="flex items-center gap-1.5 truncate">
          <span class="inline-block w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
          <span>Tip: Text &gt; 750 characters auto-converts to a card</span>
        </div>
        <span class="hidden sm:inline">Press <kbd class="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400 text-[10px] font-mono">Shift+Enter</kbd> for newline</span>
      </div>
    </div>
  `,
  styles: [`
    .custom-scrollbar::-webkit-scrollbar {
      height: 6px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
      background: rgba(99, 102, 241, 0.4);
      border-radius: 9999px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
      background: rgba(15, 23, 42, 0.5);
    }
  `]
})
export class ChatInputComponent implements OnDestroy {
  @Input() disabled = false;
  @Output() onSend = new EventEmitter<{ text: string; attachments: Attachment[] }>();
  @Output() inspectAttachment = new EventEmitter<Attachment>();

  @ViewChild('inputBox') inputBoxRef!: ElementRef<HTMLTextAreaElement>;

  textPrompt = '';
  // Only holds PendingAttachment with ObjectURLs, NO base64 in memory before send
  pendingAttachments: PendingAttachment[] = [];
  isDraggingOver = false;

  get canSend(): boolean {
    return !this.disabled && (this.textPrompt.trim().length > 0 || this.pendingAttachments.length > 0);
  }

  ngOnDestroy() {
    this.revokeAllPreviews();
  }

  private revokeAllPreviews() {
    for (const att of this.pendingAttachments) {
      if (att.previewUrl) {
        URL.revokeObjectURL(att.previewUrl);
      }
    }
  }

  // Handle Drag & Drop
  onDragOver(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    this.isDraggingOver = true;
  }

  onDragLeave(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    this.isDraggingOver = false;
  }

  async onDrop(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    this.isDraggingOver = false;

    if (!e.dataTransfer) return;

    // Check files first
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      this.processFiles(e.dataTransfer.files);
      return;
    }

    // Check text drop
    const droppedText = e.dataTransfer.getData('text/plain');
    if (droppedText) {
      if (droppedText.length > 750) {
        this.addTextAttachment(droppedText);
      } else {
        this.textPrompt += (this.textPrompt ? '\n' : '') + droppedText;
        this.adjustHeight();
      }
    }
  }

  // Handle Paste — synchronous to avoid blocking the UI thread
  onPaste(e: ClipboardEvent) {
    if (!e.clipboardData) return;

    const items = e.clipboardData.items;
    let handled = false;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      // Handle image or video from clipboard — process synchronously using ObjectURL
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file) {
          this.processFileSynchronous(file);
          handled = true;
        }
      }
    }

    if (handled) {
      e.preventDefault();
      return;
    }

    // Handle text paste — check length
    const pastedText = e.clipboardData.getData('text');
    if (pastedText && pastedText.length > 750) {
      e.preventDefault();
      this.addTextAttachment(pastedText);
    }
  }

  onFileInputChange(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.processFiles(input.files);
      input.value = '';
    }
  }

  processFiles(fileList: FileList) {
    for (let i = 0; i < fileList.length; i++) {
      this.processFileSynchronous(fileList[i]);
    }
  }

  /**
   * Synchronously create a PendingAttachment.
   * For media: creates a cheap ObjectURL (pointer only, no base64 in memory).
   * For text: reads the text content.
   * Base64 is NEVER generated here — only at send time.
   */
  processFileSynchronous(file: File) {
    const id = 'att-' + Math.random().toString(36).substring(2, 9);

    if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
      // ObjectURL is a pointer — tiny and instant, no encoding needed
      const previewUrl = URL.createObjectURL(file);
      this.pendingAttachments.push({
        id,
        type: file.type.startsWith('image/') ? 'image' : 'video',
        name: file.name || (file.type.startsWith('image/') ? 'Pasted Image' : 'Pasted Video'),
        size: file.size,
        previewUrl,  // used ONLY for <img>/<video> src in the card preview
        file,        // kept for base64 generation at send time
        mimeType: file.type,
      });
    } else {
      // Text / document files — read text (small, acceptable to hold in memory)
      const reader = new FileReader();
      reader.onload = () => {
        const text = reader.result as string;
        this.pendingAttachments.push({
          id,
          type: 'text',
          name: file.name || 'Document',
          size: file.size,
          textContent: text,
          characterCount: text.length,
          mimeType: file.type || 'text/plain',
        });
      };
      reader.readAsText(file);
    }
  }

  addTextAttachment(content: string) {
    const id = 'att-' + Math.random().toString(36).substring(2, 9);
    const firstLine = content.trim().split('\n')[0].substring(0, 24).trim();
    const name = firstLine ? `Note: "${firstLine}..."` : `Pasted Text (${content.length} chars)`;

    this.pendingAttachments.push({
      id,
      type: 'text',
      name,
      textContent: content,
      characterCount: content.length,
      mimeType: 'text/plain',
      size: new Blob([content]).size,
    });
  }

  removePendingAttachment(id: string) {
    const att = this.pendingAttachments.find((a) => a.id === id);
    if (att?.previewUrl) {
      URL.revokeObjectURL(att.previewUrl);
    }
    this.pendingAttachments = this.pendingAttachments.filter((a) => a.id !== id);
  }

  onPendingCardClick(att: PendingAttachment) {
    // For images/videos: open a preview using the ObjectURL (still cheap)
    // Convert to a lightweight Attachment stub for the preview modal
    const stub: Attachment = {
      id: att.id,
      type: att.type,
      name: att.name,
      size: att.size,
      mimeType: att.mimeType,
      textContent: att.textContent,
      characterCount: att.characterCount,
      // Only pass previewUrl for modal display — still NOT full base64
      dataUrl: att.previewUrl,
    };
    this.inspectAttachment.emit(stub);
  }

  onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      this.sendMessage();
    }
  }

  /**
   * On send: convert each PendingAttachment to a full Attachment (base64 generated HERE, once).
   * Then revoke all ObjectURLs to free memory.
   */
  async sendMessage() {
    if (!this.canSend) return;

    const fullyResolvedAttachments: Attachment[] = await Promise.all(
      this.pendingAttachments.map((att) => this.resolveToStoredAttachment(att))
    );

    this.onSend.emit({
      text: this.textPrompt.trim(),
      attachments: fullyResolvedAttachments,
    });

    // Revoke ObjectURLs now that we're done
    for (const att of this.pendingAttachments) {
      if (att.previewUrl) {
        URL.revokeObjectURL(att.previewUrl);
      }
    }

    this.textPrompt = '';
    this.pendingAttachments = [];
    if (this.inputBoxRef) {
      this.inputBoxRef.nativeElement.style.height = 'auto';
    }
  }

  /**
   * Convert a PendingAttachment to a StoredAttachment.
   * For media: reads the File as base64 NOW (only at send time).
   * For text: copies directly.
   */
  private async resolveToStoredAttachment(pending: PendingAttachment): Promise<Attachment> {
    if ((pending.type === 'image' || pending.type === 'video') && pending.file) {
      const dataUrl = await this.readFileAsDataUrl(pending.file);
      return {
        id: pending.id,
        type: pending.type,
        name: pending.name,
        size: pending.size,
        dataUrl,
        mimeType: pending.mimeType,
      };
    }
    // Text attachment
    return {
      id: pending.id,
      type: pending.type,
      name: pending.name,
      size: pending.size,
      textContent: pending.textContent,
      characterCount: pending.characterCount,
      mimeType: pending.mimeType,
    };
  }

  autoResize(e: Event) {
    const textarea = e.target as HTMLTextAreaElement;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
  }

  adjustHeight() {
    setTimeout(() => {
      if (this.inputBoxRef) {
        const el = this.inputBoxRef.nativeElement;
        el.style.height = 'auto';
        el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
      }
    });
  }

  private readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }
}
