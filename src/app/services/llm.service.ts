import { Injectable, signal } from '@angular/core';
import { chat, isConfigured } from '../core/llm';

@Injectable({ providedIn: 'root' })
export class LlmService {
  readonly configured = signal(false);

  constructor() {
    isConfigured().then((ok) => this.configured.set(ok));
  }

  chat = chat;

  async recheckConfigured(): Promise<void> {
    this.configured.set(await isConfigured());
  }
}
