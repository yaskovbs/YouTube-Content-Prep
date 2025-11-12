import { Component, signal, input, output, effect } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-api-key-input',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="md:col-span-2">
      <label for="api-key" class="block text-sm font-medium text-gray-300 mb-1">YouTube API Key</label>
      <input id="api-key" type="password"
             [class]="'w-full bg-gray-700 border rounded-md px-4 py-2 text-white placeholder-gray-400 focus:ring-2 focus:ring-brand-red focus:border-transparent transition ' + (isApiKeyInvalid() ? 'border-red-500' : 'border-gray-600')"
             placeholder="Enter your YouTube API Key"
             [value]="apiKey()"
             (input)="apiKey.set($any($event.target).value)">
      @if(isApiKeyInvalid()) {
        <p class="text-xs text-red-400 mt-1">Invalid format. Key should be 39 chars, starting with "AIza".</p>
      } @else {
        <p class="text-xs text-gray-500 mt-1">An API key is required to fetch data. Your key is stored locally.</p>
      }
    </div>
  `,
})
export class ApiKeyInputComponent {
  apiKey = signal('');
  apiKeyChange = output<string>();

  isApiKeyInvalid = input(false);

  constructor() {
    // Emit changes when apiKey signal changes
    effect(() => {
      this.apiKeyChange.emit(this.apiKey());
    });
  }
}
