import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideBadgeCheck,
  lucideCreditCard,
  lucideBell,
  lucideLogOut,
  lucideChevronsUpDown,
  lucideSparkles,
} from '@ng-icons/lucide';
import { HlmAvatarImports } from '@spartan-ng/helm/avatar';
import { HlmDropdownMenuImports } from '@spartan-ng/helm/dropdown-menu';
import { HlmSidebarImports } from '@spartan-ng/helm/sidebar';

export interface UserInfo {
  username: string;
  role: string;
  avatar?: string;
}

@Component({
  selector: 'ds-nav-user',
  standalone: true,
  imports: [NgIconComponent, ...HlmAvatarImports, ...HlmDropdownMenuImports, ...HlmSidebarImports],
  providers: [
    provideIcons({
      lucideBadgeCheck,
      lucideCreditCard,
      lucideBell,
      lucideLogOut,
      lucideChevronsUpDown,
      lucideSparkles,
    }),
  ],
  template: `
    <ul hlmSidebarMenu>
      <li hlmSidebarMenuItem>
        <!-- Trigger button -->
        <button
          [hlmDropdownMenuTrigger]="profileMenu"
          hlmSidebarMenuButton
          size="lg"
          data-state="closed"
          class="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
        >
          <hlm-avatar class="size-8 rounded-lg shrink-0">
            @if (user.avatar) {
              <img hlmAvatarImage [src]="user.avatar" [alt]="user.username" />
            }
            <span
              hlmAvatarFallback
              class="rounded-lg text-xs bg-sidebar-primary text-sidebar-primary-foreground"
            >
              {{ initials() }}
            </span>
          </hlm-avatar>
          <div class="grid flex-1 text-left text-sm leading-tight">
            <span class="truncate font-semibold">{{ user.username }}</span>
            <span class="truncate text-xs text-muted-foreground">{{ user.role }}</span>
          </div>
          <ng-icon name="lucideChevronsUpDown" class="ml-auto size-4" />
        </button>

        <!-- Dropdown menu -->
        <ng-template #profileMenu>
          <div hlmDropdownMenu align="end" side="top" [sideOffset]="4" class="w-56">
            <div hlmDropdownMenuLabel class="p-0 font-normal">
              <div class="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <hlm-avatar class="size-8 rounded-lg shrink-0">
                  @if (user.avatar) {
                    <img hlmAvatarImage [src]="user.avatar" [alt]="user.username" />
                  }
                  <span hlmAvatarFallback class="rounded-lg text-xs">{{ initials() }}</span>
                </hlm-avatar>
                <div class="grid flex-1 text-left text-sm leading-tight">
                  <span class="truncate font-semibold">{{ user.username }}</span>
                  <span class="truncate text-xs text-muted-foreground">{{ user.role }}</span>
                </div>
              </div>
            </div>

            <div hlmDropdownMenuSeparator></div>

            <div hlmDropdownMenuGroup>
              <button hlmDropdownMenuItem class="w-full text-left">
                <ng-icon name="lucideSparkles" class="mr-2 size-4 text-yellow-500" />
                Upgrade to Pro
              </button>
            </div>

            <div hlmDropdownMenuSeparator></div>

            <div hlmDropdownMenuGroup>
              <button hlmDropdownMenuItem class="w-full text-left">
                <ng-icon name="lucideBadgeCheck" class="mr-2 size-4" />
                Account
              </button>
              <button hlmDropdownMenuItem class="w-full text-left">
                <ng-icon name="lucideCreditCard" class="mr-2 size-4" />
                Billing
              </button>
              <button hlmDropdownMenuItem class="w-full text-left">
                <ng-icon name="lucideBell" class="mr-2 size-4" />
                Notifications
              </button>
            </div>

            <div hlmDropdownMenuSeparator></div>

            <button hlmDropdownMenuItem (click)="logout()" class="w-full text-left">
              <ng-icon name="lucideLogOut" class="mr-2 size-4" />
              Log out
            </button>
          </div>
        </ng-template>
      </li>
    </ul>
  `,
})
export class NavUserComponent {
  private router = inject(Router);

  get user(): UserInfo {
    try {
      const raw = localStorage.getItem('ds_user');
      return raw ? JSON.parse(raw) : { username: 'Admin', role: 'ADMIN' };
    } catch {
      return { username: 'Admin', role: 'ADMIN' };
    }
  }

  initials(): string {
    return (this.user.username ?? 'A')
      .split(/[\s_-]/)
      .map((w: string) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  logout() {
    localStorage.removeItem('ds_token');
    localStorage.removeItem('ds_user');
    this.router.navigate(['/auth/login']);
  }
}
