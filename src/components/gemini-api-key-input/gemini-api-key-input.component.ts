import { Component, signal, output, effect } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-gemini-api-key-input',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="md:col-span-2">
      <label for="gemini-api-key" class="block text-sm font-medium text-gray-300 mb-1">Gemini API Key</label>
      <input id="gemini-api-key" type="password"
             [class]="'w-full bg-gray-700 border rounded-md px-4 py-2 text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition ' + (isApiKeyInvalid() ? 'border-red-500' : 'border-gray-600')"
             placeholder="Enter your Gemini API Key"
             [value]="apiKey()"
             (input)="apiKey.set($any($event.target).value)">
      @if(isApiKeyInvalid()) {
        <p class="text-xs text-red-400 mt-1">Invalid format. Gemini API keys should start with "AIza" and be around 39 characters.</p>
      } @else {
        <p class="text-xs text-gray-500 mt-1">Required for AI-powered download link generation. Your key is stored locally.</p>
      }
    </div>
  `,
})
export class GeminiApiKeyInputComponent {
  apiKey = signal('');
  apiKeyChange = output<string>();

  isApiKeyInvalid = signal(false);

  constructor() {
    // Emit changes when apiKey signal changes
    effect(() => {
      const key = this.apiKey();
      this.isApiKeyInvalid.set(key !== '' && (!key.startsWith('AIza') || key.length < 35));
      this.apiKeyChange.emit(key);
    });
  }
}
