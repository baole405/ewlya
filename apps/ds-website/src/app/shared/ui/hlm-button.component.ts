import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';

@Component({
  selector: 'hlm-button',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button
      [class]="
        'inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-95 ' +
        variantClasses[variant()] +
        ' ' +
        sizeClasses[size()] +
        ' ' +
        class()
      "
    >
      <ng-content />
    </button>
  `,
})
export class HlmButtonComponent {
  variant = input<'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link' | 'glow'>(
    'default',
  );
  size = input<'default' | 'sm' | 'lg' | 'icon'>('default');
  class = input<string>('');

  variantClasses = {
    default: 'bg-primary text-primary-foreground hover:bg-primary/90',
    destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
    outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
    ghost: 'hover:bg-accent hover:text-accent-foreground',
    link: 'text-primary underline-offset-4 hover:underline',
    glow: 'bg-primary text-primary-foreground hover:bg-primary/90 glow-primary border border-primary/20',
  };

  sizeClasses = {
    default: 'h-10 px-4 py-2',
    sm: 'h-9 rounded-md px-3',
    lg: 'h-11 rounded-md px-8',
    icon: 'h-10 w-10',
  };
}
