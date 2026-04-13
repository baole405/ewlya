import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'spartan-button',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button [type]="type" [class]="buttonClasses" [disabled]="disabled">
      <ng-content></ng-content>
    </button>
  `,
  styles: [
    `
      button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        white-space: nowrap;
        border-radius: calc(var(--radius) - 2px);
        font-size: 0.875rem;
        font-weight: 500;
        transition:
          background 150ms,
          color 150ms,
          box-shadow 150ms;
        border: none;
        cursor: pointer;
        outline-offset: 2px;
      }
      button:focus-visible {
        outline: 2px solid hsl(var(--ring));
      }
      button:disabled {
        pointer-events: none;
        opacity: 0.5;
      }

      .variant-default {
        background: hsl(var(--primary));
        color: hsl(var(--primary-foreground));
        padding: 0.5rem 1rem;
      }
      .variant-default:hover {
        background: hsl(var(--primary) / 0.9);
      }

      .variant-outline {
        background: transparent;
        border: 1px solid hsl(var(--border));
        color: hsl(var(--foreground));
        padding: 0.5rem 1rem;
      }
      .variant-outline:hover {
        background: hsl(var(--accent));
      }

      .variant-ghost {
        background: transparent;
        color: hsl(var(--foreground));
        padding: 0.5rem 1rem;
      }
      .variant-ghost:hover {
        background: hsl(var(--accent));
      }

      .variant-destructive {
        background: hsl(var(--destructive));
        color: hsl(var(--destructive-foreground));
        padding: 0.5rem 1rem;
      }
      .variant-destructive:hover {
        background: hsl(var(--destructive) / 0.9);
      }

      .size-sm {
        padding: 0.375rem 0.75rem;
        font-size: 0.8125rem;
      }
      .size-lg {
        padding: 0.625rem 1.5rem;
        font-size: 1rem;
      }
      .size-icon {
        padding: 0.5rem;
        width: 2.25rem;
        height: 2.25rem;
      }
    `,
  ],
})
export class ButtonComponent {
  @Input() variant: 'default' | 'outline' | 'ghost' | 'destructive' = 'default';
  @Input() size: 'default' | 'sm' | 'lg' | 'icon' = 'default';
  @Input() type: 'button' | 'submit' | 'reset' = 'button';
  @Input() disabled = false;

  get buttonClasses(): string {
    return `variant-${this.variant} size-${this.size}`;
  }
}
