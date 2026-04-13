import { Component, Input, Output, EventEmitter, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

// ============================================================
// SIDEBAR ROOT — wraps entire layout (sidebar + content)
// ============================================================
@Component({
  selector: 'spartan-sidebar-provider',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="spartan-sidebar-provider"
      [style.--sidebar-width]="sidebarWidth"
      [style.--sidebar-width-icon]="sidebarWidthIcon"
      [attr.data-sidebar-state]="open() ? 'expanded' : 'collapsed'"
    >
      <ng-content></ng-content>
    </div>
  `,
  styles: [
    `
      .spartan-sidebar-provider {
        --sidebar-width: 16rem;
        --sidebar-width-icon: 3.5rem;
        display: flex;
        min-height: 100svh;
        width: 100%;
      }
    `,
  ],
})
export class SidebarProviderComponent {
  @Input() defaultOpen = true;
  @Input() sidebarWidth = '16rem';
  @Input() sidebarWidthIcon = '3.5rem';

  open = signal(true);
  toggle() {
    this.open.update((v) => !v);
  }
}

// ============================================================
// SHADCN SIDEBAR — sidebar-14 style
// ============================================================
@Component({
  selector: 'spartan-sidebar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <aside
      [attr.data-state]="state()"
      [attr.data-collapsible]="collapsible"
      [attr.data-side]="side"
      class="spartan-sidebar"
      [class.spartan-sidebar--collapsed]="!open()"
    >
      <div class="spartan-sidebar-inner">
        <ng-content></ng-content>
      </div>
    </aside>
  `,
  styles: [
    `
      :host {
        display: contents;
      }
      .spartan-sidebar {
        --sidebar-bg: hsl(var(--sidebar-background));
        --sidebar-fg: hsl(var(--sidebar-foreground));
        --sidebar-bd: hsl(var(--sidebar-border));
        width: var(--sidebar-width);
        min-height: 100svh;
        background: var(--sidebar-bg);
        color: var(--sidebar-fg);
        border-right: 1px solid var(--sidebar-bd);
        transition: width 200ms ease;
        flex-shrink: 0;
        position: sticky;
        top: 0;
        height: 100svh;
      }
      .spartan-sidebar--collapsed {
        width: var(--sidebar-width-icon);
      }
      .spartan-sidebar-inner {
        display: flex;
        flex-direction: column;
        height: 100%;
        overflow: hidden;
      }
    `,
  ],
})
export class SidebarComponent {
  @Input() side: 'left' | 'right' = 'left';
  @Input() collapsible: 'offcanvas' | 'icon' | 'none' = 'icon';
  open = signal(true);
  state = computed(() => (this.open() ? 'expanded' : 'collapsed'));
  toggle() {
    this.open.update((v) => !v);
  }
}

// ============================================================
// SIDEBAR HEADER
// ============================================================
@Component({
  selector: 'spartan-sidebar-header',
  standalone: true,
  template: `
    <div class="spartan-sidebar-header">
      <ng-content></ng-content>
    </div>
  `,
  styles: [
    `
      .spartan-sidebar-header {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        padding: 0.5rem;
        border-bottom: 1px solid hsl(var(--sidebar-border));
      }
    `,
  ],
})
export class SidebarHeaderComponent {}

// ============================================================
// SIDEBAR CONTENT
// ============================================================
@Component({
  selector: 'spartan-sidebar-content',
  standalone: true,
  template: `
    <div class="spartan-sidebar-content">
      <ng-content></ng-content>
    </div>
  `,
  styles: [
    `
      .spartan-sidebar-content {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        padding: 0.5rem;
        flex: 1;
        overflow-y: auto;
        overflow-x: hidden;
      }
    `,
  ],
})
export class SidebarContentComponent {}

// ============================================================
// SIDEBAR FOOTER
// ============================================================
@Component({
  selector: 'spartan-sidebar-footer',
  standalone: true,
  template: `
    <div class="spartan-sidebar-footer">
      <ng-content></ng-content>
    </div>
  `,
  styles: [
    `
      .spartan-sidebar-footer {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        padding: 0.5rem;
        border-top: 1px solid hsl(var(--sidebar-border));
        margin-top: auto;
      }
    `,
  ],
})
export class SidebarFooterComponent {}

// ============================================================
// SIDEBAR GROUP
// ============================================================
@Component({
  selector: 'spartan-sidebar-group',
  standalone: true,
  template: `
    <div class="spartan-sidebar-group">
      <ng-content></ng-content>
    </div>
  `,
  styles: [
    `
      .spartan-sidebar-group {
        position: relative;
        display: flex;
        flex-direction: column;
        width: 100%;
        min-width: 0;
        padding: 0.5rem 0;
      }
    `,
  ],
})
export class SidebarGroupComponent {}

// ============================================================
// SIDEBAR GROUP LABEL
// ============================================================
@Component({
  selector: 'spartan-sidebar-group-label',
  standalone: true,
  template: `
    <div class="spartan-sidebar-group-label">
      <ng-content></ng-content>
    </div>
  `,
  styles: [
    `
      .spartan-sidebar-group-label {
        display: flex;
        height: 2rem;
        align-items: center;
        font-size: 0.75rem;
        font-weight: 500;
        letter-spacing: 0.05em;
        color: hsl(var(--sidebar-foreground) / 0.5);
        padding: 0 0.5rem;
        overflow: hidden;
        white-space: nowrap;
      }
    `,
  ],
})
export class SidebarGroupLabelComponent {}

// ============================================================
// SIDEBAR MENU
// ============================================================
@Component({
  selector: 'spartan-sidebar-menu',
  standalone: true,
  template: `
    <ul class="spartan-sidebar-menu">
      <ng-content></ng-content>
    </ul>
  `,
  styles: [
    `
      .spartan-sidebar-menu {
        display: flex;
        flex-direction: column;
        gap: 0.125rem;
        width: 100%;
        min-width: 0;
        list-style: none;
        margin: 0;
        padding: 0;
      }
    `,
  ],
})
export class SidebarMenuComponent {}

// ============================================================
// SIDEBAR MENU ITEM
// ============================================================
@Component({
  selector: 'spartan-sidebar-menu-item',
  standalone: true,
  template: `
    <li class="spartan-sidebar-menu-item">
      <ng-content></ng-content>
    </li>
  `,
  styles: [
    `
      .spartan-sidebar-menu-item {
        position: relative;
        display: flex;
        flex-direction: column;
        width: 100%;
        min-width: 0;
      }
    `,
  ],
})
export class SidebarMenuItemComponent {}

// ============================================================
// SIDEBAR MENU BUTTON
// Uses routerLink when provided, otherwise renders a <button>
// ============================================================
@Component({
  selector: 'spartan-sidebar-menu-button',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    @if (routerLink) {
      <a
        [routerLink]="routerLink"
        routerLinkActive="spartan-sidebar-menu-button--active"
        [routerLinkActiveOptions]="{ exact: exact }"
        class="spartan-sidebar-menu-button"
        [class]="'spartan-sidebar-menu-button--' + size"
        [attr.title]="tooltip"
      >
        <ng-content></ng-content>
      </a>
    } @else {
      <button
        type="button"
        class="spartan-sidebar-menu-button"
        [class]="'spartan-sidebar-menu-button--' + size"
        [attr.title]="tooltip"
        (click)="clicked.emit()"
      >
        <ng-content></ng-content>
      </button>
    }
  `,
  styles: [
    `
      :host {
        display: contents;
      }
      .spartan-sidebar-menu-button {
        display: flex;
        width: 100%;
        align-items: center;
        gap: 0.5rem;
        overflow: hidden;
        border-radius: calc(var(--radius) - 2px);
        padding: 0.5rem;
        text-align: left;
        font-size: 0.875rem;
        line-height: 1.25rem;
        color: hsl(var(--sidebar-foreground));
        text-decoration: none;
        background: transparent;
        border: none;
        cursor: pointer;
        transition:
          background 150ms ease,
          color 150ms ease;
        white-space: nowrap;
        outline: none;
        font-family: inherit;
      }
      .spartan-sidebar-menu-button:hover {
        background: hsl(var(--sidebar-accent));
        color: hsl(var(--sidebar-accent-foreground));
      }
      .spartan-sidebar-menu-button--active {
        background: hsl(var(--sidebar-accent));
        color: hsl(var(--sidebar-accent-foreground));
        font-weight: 600;
      }
      .spartan-sidebar-menu-button--lg {
        padding: 0.625rem 0.5rem;
        font-size: 0.9375rem;
      }
      .spartan-sidebar-menu-button--sm {
        padding: 0.375rem 0.5rem;
        font-size: 0.8125rem;
      }
    `,
  ],
})
export class SidebarMenuButtonComponent {
  @Input() routerLink: string | null = null;
  @Input() exact = false;
  @Input() size: 'default' | 'sm' | 'lg' = 'default';
  @Input() tooltip: string | null = null;
  @Output() clicked = new EventEmitter<void>();
}

// ============================================================
// SIDEBAR TRIGGER — toggle button
// ============================================================
@Component({
  selector: 'spartan-sidebar-trigger',
  standalone: true,
  template: `
    <button
      type="button"
      class="spartan-sidebar-trigger"
      (click)="toggle()"
      [attr.aria-label]="open() ? 'Collapse sidebar' : 'Expand sidebar'"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <line x1="3" y1="6" x2="21" y2="6" />
        <line x1="3" y1="12" x2="21" y2="12" />
        <line x1="3" y1="18" x2="21" y2="18" />
      </svg>
      <span class="sr-only">Toggle Sidebar</span>
    </button>
  `,
  styles: [
    `
      .spartan-sidebar-trigger {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 2rem;
        height: 2rem;
        border: none;
        background: transparent;
        cursor: pointer;
        border-radius: calc(var(--radius) - 2px);
        color: hsl(var(--foreground));
        transition: background 150ms ease;
        flex-shrink: 0;
      }
      .spartan-sidebar-trigger:hover {
        background: hsl(var(--accent));
      }
      .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border-width: 0;
      }
    `,
  ],
})
export class SidebarTriggerComponent {
  open = signal(true);
  toggle() {
    this.open.update((v) => !v);
  }
}
