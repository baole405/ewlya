import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'spartan-avatar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span class="spartan-avatar" [class]="'size-' + size">
      <img
        *ngIf="src; else fallback"
        [src]="src"
        [alt]="alt"
        class="spartan-avatar-img"
        (error)="imgError = true"
      />
      <ng-template #fallback>
        <span class="spartan-avatar-fallback">{{ initials }}</span>
      </ng-template>
    </span>
  `,
  styles: [
    `
      .spartan-avatar {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        background: hsl(var(--muted));
        color: hsl(var(--muted-foreground));
        font-weight: 600;
        font-size: 0.875rem;
        overflow: hidden;
        flex-shrink: 0;
      }
      .spartan-avatar-img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .spartan-avatar-fallback {
        font-size: 0.75rem;
        font-weight: 600;
        letter-spacing: 0.05em;
      }
      .size-sm {
        width: 2rem;
        height: 2rem;
      }
      .size-default {
        width: 2.5rem;
        height: 2.5rem;
      }
      .size-lg {
        width: 3rem;
        height: 3rem;
      }
    `,
  ],
})
export class AvatarComponent {
  @Input() src: string | null = null;
  @Input() alt = '';
  @Input() size: 'sm' | 'default' | 'lg' = 'default';
  imgError = false;

  get initials(): string {
    return this.alt
      .split(' ')
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }
}
