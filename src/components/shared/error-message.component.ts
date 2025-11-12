import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-error-message',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-red-900/50 border-2 border-red-700 text-red-200 px-4 py-3 rounded-lg my-4" role="alert">
      <strong class="font-bold">Error: </strong>
      <span>{{ message() }}</span>
    </div>
  `,
})
export class ErrorMessageComponent {
  message = input<string>();
}
