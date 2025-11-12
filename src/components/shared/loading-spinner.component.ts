import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-loading-spinner',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex items-center justify-center gap-2 text-sm text-blue-300">
      <div class="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-current"></div>
      <span>{{ message() }}</span>
    </div>
  `,
})
export class LoadingSpinnerComponent {
  message = input('Loading...');
}
