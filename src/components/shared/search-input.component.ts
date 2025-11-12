import { Component, signal, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-search-input',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="md:col-span-3">
      <label for="search-query" class="block text-sm font-medium text-gray-300 mb-1">Video, Playlist, Channel URL, or Search</label>
      <div class="flex items-center gap-2">
        <input id="search-query" type="text"
               class="flex-grow bg-gray-700 border border-gray-600 rounded-md px-4 py-2 text-white placeholder-gray-400 focus:ring-2 focus:ring-brand-red focus:border-transparent transition"
               placeholder="Enter URL or search query..."
               [value]="query()"
               (input)="query.set($any($event.target).value)"
               (keyup.enter)="search.emit(query())">
        <button (click)="search.emit(query())"
                [disabled]="!query() || disabled()"
                class="bg-brand-red hover:bg-red-700 disabled:bg-gray-500 disabled:cursor-not-allowed text-white font-bold py-2 px-6 rounded-md transition duration-300 ease-in-out transform hover:scale-105">
          Fetch
        </button>
      </div>
    </div>
  `,
})
export class SearchInputComponent {
  query = signal('');
  disabled = input(false);
  search = output<string>();
}
