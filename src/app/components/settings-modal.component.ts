import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModelItemConfig, MorphConfig } from '../models/chat.model';

@Component({
  selector: 'app-settings-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (isOpen) {
      <div 
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in"
      >
        <div 
          class="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[90vh]"
          (click)="$event.stopPropagation()"
        >
          <!-- Header -->
          <div class="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/90 shrink-0">
            <div class="flex items-center gap-2">
              <div class="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400">
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 class="font-semibold text-slate-100 text-base">Morph LLM Settings</h3>
            </div>

          </div>

          <!-- Body -->
          <div class="p-5 space-y-5 text-sm overflow-y-auto custom-scrollbar flex-1">
            <!-- Bearer Token -->
            <div>
              <label class="block text-xs font-semibold text-slate-300 mb-1.5">
                Morph API Bearer Token <span class="text-rose-400">*</span>
              </label>
              <input
                type="password"
                [(ngModel)]="tempConfig.apiKey"
                placeholder="Bearer token or sk-..."
                class="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 focus:border-indigo-500 focus:outline-none text-slate-100 placeholder-slate-500 text-sm font-mono"
              />
              <p class="text-[11px] text-slate-400 mt-1">Saved securely in IndexedDB.</p>
            </div>

            <!-- Active Model Selection -->
            <div>
              <label class="block text-xs font-semibold text-slate-300 mb-1.5">
                Active Model (Select from custom models list)
              </label>
              <select
                [(ngModel)]="tempConfig.model"
                class="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 focus:border-indigo-500 focus:outline-none text-slate-100 text-sm font-mono"
              >
                @for (m of tempConfig.modelsList; track m.id) {
                  <option [value]="m.model">
                    {{ m.display }} ({{ m.model }}) — Temp: {{ m.temperature }}
                  </option>
                }
              </select>
            </div>

            <!-- Custom Models List (display, model, temperature) -->
            <div class="space-y-2 p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
              <div class="flex items-center justify-between">
                <div>
                  <h4 class="text-xs font-bold text-slate-200">Custom Models List</h4>
                  <p class="text-[11px] text-slate-400">Configure your models with Display Name, Model ID, and Temperature.</p>
                </div>
                <button
                  type="button"
                  (click)="addModelRow()"
                  class="px-2.5 py-1 text-xs font-medium bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/40 rounded-lg flex items-center gap-1 transition-all"
                >
                  <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Add Model</span>
                </button>
              </div>

              <div class="space-y-2 pt-2">
                @for (item of tempConfig.modelsList; track item.id; let i = $index) {
                  <div class="flex items-center gap-2 p-2 rounded-lg bg-slate-900 border border-slate-800">
                    <!-- Display Name -->
                    <div class="flex-1">
                      <label class="block text-[10px] text-slate-400 mb-0.5">Display Name</label>
                      <input
                        type="text"
                        [(ngModel)]="item.display"
                        placeholder="e.g. GLM 5.3"
                        class="w-full px-2 py-1 rounded bg-slate-950 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-medium"
                      />
                    </div>

                    <!-- Model Identifier -->
                    <div class="flex-1">
                      <label class="block text-[10px] text-slate-400 mb-0.5">Model ID</label>
                      <input
                        type="text"
                        [(ngModel)]="item.model"
                        placeholder="e.g. morph-glm53-744b"
                        class="w-full px-2 py-1 rounded bg-slate-950 border border-slate-700 text-xs font-mono text-indigo-300 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <!-- Temperature -->
                    <div class="w-24">
                      <label class="block text-[10px] text-slate-400 mb-0.5">Temperature</label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="2"
                        [(ngModel)]="item.temperature"
                        class="w-full px-2 py-1 rounded bg-slate-950 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <!-- Delete button -->
                    <button
                      type="button"
                      (click)="removeModelRow(item.id)"
                      [disabled]="tempConfig.modelsList.length <= 1"
                      class="mt-3.5 p-1 text-slate-500 hover:text-rose-400 disabled:opacity-30 disabled:hover:text-slate-500"
                      title="Remove model"
                    >
                      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                }
              </div>
            </div>

            <!-- System Text & Max Tokens -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <!-- Max Tokens (Default 50000) -->
              <div>
                <label class="block text-xs font-semibold text-slate-300 mb-1.5">
                  Max Tokens
                </label>
                <input
                  type="number"
                  [(ngModel)]="tempConfig.maxTokens"
                  min="256"
                  max="200000"
                  class="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 focus:border-indigo-500 focus:outline-none text-slate-100 text-sm font-mono"
                />
                <p class="text-[11px] text-slate-400 mt-1">Default: 50,000</p>
              </div>

              <!-- Base URL -->
              <div class="sm:col-span-2">
                <label class="block text-xs font-semibold text-slate-300 mb-1.5">
                  Endpoint URL
                </label>
                <input
                  type="text"
                  [(ngModel)]="tempConfig.baseUrl"
                  placeholder="https://api.morphllm.com/v1"
                  class="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 focus:border-indigo-500 focus:outline-none text-slate-100 font-mono text-xs"
                />
                <p class="text-[11px] text-slate-400 mt-1">Sends POST to {{ tempConfig.baseUrl }}/messages</p>
              </div>
            </div>

            <!-- System Prompt Text -->
            <div>
              <label class="block text-xs font-semibold text-slate-300 mb-1.5">
                "system" Text (System Prompt)
              </label>
              <textarea
                rows="4"
                [(ngModel)]="tempConfig.systemPrompt"
                placeholder="You are a senior TypeScript engineer. Reply with code only."
                class="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 focus:border-indigo-500 focus:outline-none text-slate-100 text-xs font-mono leading-relaxed"
              ></textarea>
              <p class="text-[11px] text-slate-400 mt-1">Transmitted directly as the top-level <code class="text-indigo-400">"system"</code> field.</p>
            </div>
          </div>

          <!-- Footer -->
          <div class="flex items-center justify-end gap-3 px-5 py-3 border-t border-slate-800 bg-slate-900/90 shrink-0">
            <button
              type="button"
              (click)="closeModal()"
              class="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              (click)="save()"
              class="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition-all active:scale-95"
            >
              Save Configuration (IndexedDB)
            </button>
          </div>
        </div>
      </div>
    }
  `
})
export class SettingsModalComponent implements OnInit {
  @Input() isOpen = false;
  @Input() config!: MorphConfig;
  @Output() onClose = new EventEmitter<void>();
  @Output() onSave = new EventEmitter<MorphConfig>();

  tempConfig: MorphConfig = {
    apiKey: '',
    baseUrl: 'https://api.morphllm.com/v1',
    model: 'morph-glm53-744b',
    modelsList: [
      { id: '1', display: 'GLM 5.3', model: 'morph-glm53-744b', temperature: 0 }
    ],
    maxTokens: 50000,
    temperature: 0,
    systemPrompt: 'You are a senior TypeScript engineer. Reply with code only.',
    stream: true
  };

  ngOnInit() {
    this.syncConfig();
  }

  ngOnChanges() {
    this.syncConfig();
  }

  private syncConfig() {
    if (this.config) {
      this.tempConfig = {
        ...this.config,
        modelsList: this.config.modelsList ? this.config.modelsList.map((m) => ({ ...m })) : [],
        maxTokens: this.config.maxTokens || 50000
      };
    }
  }

  addModelRow() {
    const newId = 'm-' + Date.now();
    this.tempConfig.modelsList.push({
      id: newId,
      display: 'New Model',
      model: 'morph-model-name',
      temperature: 0
    });
  }

  removeModelRow(id: string) {
    if (this.tempConfig.modelsList.length > 1) {
      this.tempConfig.modelsList = this.tempConfig.modelsList.filter((m) => m.id !== id);
      // If deleted active model, default to first
      if (this.tempConfig.modelsList.every((m) => m.model !== this.tempConfig.model)) {
        this.tempConfig.model = this.tempConfig.modelsList[0].model;
      }
    }
  }

  closeModal() {
    this.onClose.emit();
  }

  save() {
    this.onSave.emit(this.tempConfig);
    this.closeModal();
  }
}
