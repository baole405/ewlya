import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';

@Component({
  selector: 'hlm-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      [class]="
        'glass rounded-xl shadow-2xl transition-all duration-300 hover:border-primary/30 ' + class()
      "
    >
      <ng-content />
    </div>
  `,
})
export class HlmCardComponent {
  class = input<string>('');
}

@Component({
  selector: 'hlm-card-header',
  standalone: true,
  imports: [CommonModule],
  template: `<div class="p-6 flex flex-col space-y-1.5"><ng-content /></div>`,
})
export class HlmCardHeaderComponent {}

@Component({
  selector: 'hlm-card-title',
  standalone: true,
  imports: [CommonModule],
  template: `<h3 class="text-2xl font-semibold leading-none tracking-tight text-white">
    <ng-content />
  </h3>`,
})
export class HlmCardTitleComponent {}

@Component({
  selector: 'hlm-card-content',
  standalone: true,
  imports: [CommonModule],
  template: `<div class="p-6 pt-0"><ng-content /></div>`,
})
export class HlmCardContentComponent {}
