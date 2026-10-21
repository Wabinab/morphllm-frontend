import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatSession } from '../models/chat.model';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Backdrop overlay for mobile / offcanvas -->
    @if (isOpen) {
      <div 
        class="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-sm lg:hidden transition-opacity duration-300"
        (click)="closeSidebar.emit()"
      ></div>
    }

    <!-- Offcanvas LHS Panel -->
    <aside 
      class="fixed inset-y-0 left-0 z-50 w-72 sm:w-80 bg-slate-900 border-r border-slate-800/80 flex flex-col transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 shadow-2xl lg:shadow-none"
      [class.-translate-x-full]="!isOpen"
      [class.translate-x-0]="isOpen"
    >
      <!-- Top Branding & New Chat -->
      <div class="p-4 border-b border-slate-800 flex items-center justify-between gap-2">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-md shadow-indigo-500/20 text-white font-bold">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span class="font-semibold text-slate-100 text-base tracking-wide">MorphLLM</span>
        </div>

        <button 
          (click)="closeSidebar.emit()"
          class="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          title="Close sidebar"
        >
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div class="p-3">
        <button
          type="button"
          (click)="newChat.emit()"
          class="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-all shadow-lg shadow-indigo-600/25 active:scale-[0.98]"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          <span>New Chat</span>
        </button>
      </div>

      <!-- Chat History List -->
      <div class="flex-1 overflow-y-auto px-3 py-2 space-y-1.5 custom-scrollbar">
        <div class="px-2 py-1 text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Conversations
        </div>

        @if (sessions.length === 0) {
          <div class="p-4 text-center text-sm text-slate-500">
            No previous chats. Start a new one!
          </div>
        }

        @for (session of sessions; track session.id) {
          <div 
            class="group relative flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all duration-150"
            [ngClass]="{
              'bg-indigo-600/15 text-indigo-200 border border-indigo-500/30': currentSessionId === session.id,
              'hover:bg-slate-800/60 text-slate-300 hover:text-white border border-transparent': currentSessionId !== session.id
            }"
            (click)="selectSession.emit(session.id)"
          >
            <div class="flex items-center gap-2.5 min-w-0 flex-1">
              <svg class="w-4 h-4 shrink-0 text-slate-400 group-hover:text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <div class="truncate text-xs font-medium">
                {{ session.title || 'Untitled Conversation' }}
              </div>
            </div>

            <!-- Delete Chat button -->
            <button
              type="button"
              (click)="onDeleteSession($event, session.id)"
              title="Delete conversation"
              class="opacity-0 group-hover:opacity-100 p-1 rounded-md text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-all ml-1 shrink-0"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        }
      </div>


      <!-- Footer Info -->
      <div class="p-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
        <div class="flex items-center gap-2">
          <div class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          <span>IndexedDB Active</span>
        </div>
        <span class="text-slate-400">{{ sessions.length }} chats</span>
      </div>
    </aside>
  `,
  styles: [`
    .custom-scrollbar::-webkit-scrollbar {
      width: 4px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
      background: rgba(148, 163, 184, 0.2);
      border-radius: 9999px;
    }
  `]
})
export class SidebarComponent {
  @Input() isOpen = false;
  @Input() sessions: ChatSession[] = [];
  @Input() currentSessionId: string | null = null;

  @Output() closeSidebar = new EventEmitter<void>();
  @Output() selectSession = new EventEmitter<string>();
  @Output() newChat = new EventEmitter<void>();
  @Output() deleteSession = new EventEmitter<string>();

  onDeleteSession(event: MouseEvent, id: string) {
    event.stopPropagation();
    if (confirm('Are you sure you want to delete this conversation?')) {
      this.deleteSession.emit(id);
    }
  }
}
