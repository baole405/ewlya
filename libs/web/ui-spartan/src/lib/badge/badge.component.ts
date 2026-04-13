import { Component, Input } from '@angular/core';

@Component({
  selector: 'spartan-badge',
  standalone: true,
  template: `
    <span class="spartan-badge" [class]="'variant-' + variant">
      <ng-content></ng-content>
    </span>
  `,
  styles: [
    `
      .spartan-badge {
        display: inline-flex;
        align-items: center;
        border-radius: 9999px;
        padding: 0.15rem 0.6rem;
        font-size: 0.75rem;
        font-weight: 600;
        line-height: 1;
      }
      .variant-default {
        background: hsl(var(--primary));
        color: hsl(var(--primary-foreground));
      }
      .variant-secondary {
        background: hsl(var(--secondary));
        color: hsl(var(--secondary-foreground));
      }
      .variant-outline {
        background: transparent;
        border: 1px solid hsl(var(--border));
        color: hsl(var(--foreground));
      }
    `,
  ],
})
export class BadgeComponent {
  @Input() variant: 'default' | 'secondary' | 'outline' = 'default';
}

@Component({
  selector: 'spartan-separator',
  standalone: true,
  template: `<div class="spartan-separator" [class.vertical]="orientation === 'vertical'"></div>`,
  styles: [
    `
      .spartan-separator {
        background: hsl(var(--border));
        flex-shrink: 0;
        height: 1px;
        width: 100%;
      }
      .vertical {
        height: 100%;
        width: 1px;
      }
    `,
  ],
})
export class SeparatorComponent {
  @Input() orientation: 'horizontal' | 'vertical' = 'horizontal';
}
