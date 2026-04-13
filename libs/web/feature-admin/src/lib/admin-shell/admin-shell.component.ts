import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '@ds/web/data-access';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import {
  SidebarProviderComponent,
  SidebarComponent,
  SidebarHeaderComponent,
  SidebarContentComponent,
  SidebarFooterComponent,
  SidebarGroupComponent,
  SidebarGroupLabelComponent,
  SidebarMenuComponent,
  SidebarMenuItemComponent,
  SidebarMenuButtonComponent,
  SidebarTriggerComponent,
  AvatarComponent,
  BadgeComponent,
  SeparatorComponent,
} from '@ds/web/ui-spartan';

interface NavItem {
  titleKey: string;
  url: string;
  exact?: boolean;
  icon: string; // SVG path d attribute
  badgeKey?: string;
}

@Component({
  selector: 'ds-admin-shell',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    TranslateModule,
    SidebarProviderComponent,
    SidebarComponent,
    SidebarHeaderComponent,
    SidebarContentComponent,
    SidebarFooterComponent,
    SidebarGroupComponent,
    SidebarGroupLabelComponent,
    SidebarMenuComponent,
    SidebarMenuItemComponent,
    SidebarMenuButtonComponent,
    SidebarTriggerComponent,
    AvatarComponent,
    BadgeComponent,
    SeparatorComponent,
  ],
  template: `
    <!-- Wrap entire page in sidebar provider -->
    <spartan-sidebar-provider [defaultOpen]="sidebarOpen">
      <!-- ======== SIDEBAR ======== -->
      <spartan-sidebar collapsible="icon">
        <!-- Header: Logo + App Name -->
        <spartan-sidebar-header>
          <spartan-sidebar-menu>
            <spartan-sidebar-menu-item>
              <spartan-sidebar-menu-button size="lg" routerLink="/admin" [exact]="true">
                <!-- Logo icon -->
                <div class="ds-logo-icon">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    class="ds-logo-svg"
                  >
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                  </svg>
                </div>
                <div class="sidebar-label ds-logo-text">
                  <span class="ds-app-name">{{ 'COMMON.APP_NAME' | translate }}</span>
                  <span class="ds-app-role">
                    <spartan-badge variant="secondary">{{
                      'COMMON.ADMIN' | translate
                    }}</spartan-badge>
                  </span>
                </div>
              </spartan-sidebar-menu-button>
            </spartan-sidebar-menu-item>
          </spartan-sidebar-menu>
        </spartan-sidebar-header>

        <!-- Main Navigation -->
        <spartan-sidebar-content>
          <spartan-sidebar-group>
            <spartan-sidebar-group-label class="sidebar-label">
              {{ 'SIDEBAR.NAVIGATION' | translate }}
            </spartan-sidebar-group-label>
            <spartan-sidebar-menu>
              @for (item of navItems; track item.url) {
                <spartan-sidebar-menu-item>
                  <spartan-sidebar-menu-button
                    [routerLink]="item.url"
                    [exact]="item.exact ?? false"
                    [tooltip]="item.titleKey | translate"
                  >
                    <!-- Icon -->
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
                      <path [attr.d]="item.icon" />
                    </svg>
                    <span class="sidebar-label">{{ item.titleKey | translate }}</span>
                    @if (item.badgeKey) {
                      <spartan-badge variant="secondary" class="sidebar-label ds-nav-badge">
                        {{ item.badgeKey | translate }}
                      </spartan-badge>
                    }
                  </spartan-sidebar-menu-button>
                </spartan-sidebar-menu-item>
              }
            </spartan-sidebar-menu>
          </spartan-sidebar-group>

          <!-- Quick Settings Group -->
          <spartan-sidebar-group>
            <spartan-sidebar-group-label class="sidebar-label">
              {{ 'SIDEBAR.SYSTEM' | translate }}
            </spartan-sidebar-group-label>
            <spartan-sidebar-menu>
              <spartan-sidebar-menu-item>
                <spartan-sidebar-menu-button
                  routerLink="/admin/settings"
                  [tooltip]="'COMMON.SETTINGS' | translate"
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
                    <path
                      d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"
                    />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                  <span class="sidebar-label">{{ 'COMMON.SETTINGS' | translate }}</span>
                </spartan-sidebar-menu-button>
              </spartan-sidebar-menu-item>
            </spartan-sidebar-menu>
          </spartan-sidebar-group>
        </spartan-sidebar-content>

        <!-- Footer: User Profile (Sidebar-14 style) -->
        <spartan-sidebar-footer>
          <spartan-sidebar-menu>
            <spartan-sidebar-menu-item>
              <spartan-sidebar-menu-button size="lg" [tooltip]="'SIDEBAR.ACCOUNT' | translate">
                <spartan-avatar
                  [src]="
                    auth.user()?.username ? 'https://cdn.discordapp.com/embed/avatars/0.png' : null
                  "
                  [alt]="auth.user()?.username ?? 'Admin'"
                  size="sm"
                ></spartan-avatar>
                <div class="sidebar-label ds-user-info">
                  <span class="ds-user-name">{{ auth.user()?.username ?? 'Admin' }}</span>
                  <span class="ds-user-role">{{ 'COMMON.ADMIN' | translate }}</span>
                </div>
              </spartan-sidebar-menu-button>

              <!-- Logout button -->
              <spartan-sidebar-menu-button
                (clicked)="logout()"
                [tooltip]="'COMMON.LOGOUT' | translate"
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
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                <span class="sidebar-label ds-logout-label">{{ 'COMMON.LOGOUT' | translate }}</span>
              </spartan-sidebar-menu-button>
            </spartan-sidebar-menu-item>
          </spartan-sidebar-menu>
        </spartan-sidebar-footer>
      </spartan-sidebar>

      <!-- ======== MAIN CONTENT ======== -->
      <div class="ds-admin-main">
        <!-- Topbar -->
        <header class="ds-admin-topbar">
          <spartan-sidebar-trigger></spartan-sidebar-trigger>
          <spartan-separator orientation="vertical"></spartan-separator>

          <!-- Breadcrumb -->
          <nav class="ds-breadcrumb" aria-label="breadcrumb">
            <ol class="ds-breadcrumb-list">
              <li>
                <span class="ds-breadcrumb-item ds-breadcrumb-item--faded">
                  {{ 'DASHBOARD.BREADCRUMB_ROOT' | translate }}
                </span>
              </li>
              <li aria-hidden="true">/</li>
              <li>
                <span class="ds-breadcrumb-item">
                  {{ 'DASHBOARD.BREADCRUMB_ADMIN' | translate }}
                </span>
              </li>
            </ol>
          </nav>

          <!-- Right actions -->
          <div class="ds-topbar-actions">
            <!-- Language Switcher -->
            <div class="ds-lang-switcher">
              <button
                class="ds-lang-btn"
                [class.active]="currentLang === 'vi'"
                (click)="switchLang('vi')"
              >
                VI
              </button>
              <span class="ds-lang-sep">|</span>
              <button
                class="ds-lang-btn"
                [class.active]="currentLang === 'en'"
                (click)="switchLang('en')"
              >
                EN
              </button>
            </div>

            <spartan-separator orientation="vertical" class="ds-topbar-sep"></spartan-separator>

            <a routerLink="/" class="ds-topbar-btn" [title]="'SIDEBAR.BACK_TO_HOME' | translate">
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
                <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </a>
          </div>
        </header>

        <!-- Page content injected here -->
        <main class="ds-admin-content">
          <router-outlet></router-outlet>
        </main>
      </div>
    </spartan-sidebar-provider>
  `,
  styles: [
    `
      :host {
        display: block;
        min-height: 100svh;
      }

      /* ---- Sidebar Logo ---- */
      .ds-logo-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 2rem;
        height: 2rem;
        border-radius: calc(var(--radius) - 2px);
        background: hsl(var(--sidebar-primary));
        color: hsl(var(--sidebar-primary-foreground));
        flex-shrink: 0;
      }
      .ds-logo-svg {
        width: 1rem;
        height: 1rem;
      }
      .ds-logo-text {
        display: flex;
        flex-direction: column;
        gap: 0;
        line-height: 1.2;
      }
      .ds-app-name {
        font-weight: 700;
        font-size: 0.9375rem;
        letter-spacing: -0.01em;
      }
      .ds-app-role {
        display: flex;
      }

      /* ---- Nav Badge ---- */
      .ds-nav-badge {
        margin-left: auto;
        font-size: 0.625rem;
        padding: 0.1rem 0.4rem;
      }

      /* ---- User Profile ---- */
      .ds-user-info {
        display: flex;
        flex-direction: column;
        line-height: 1.3;
      }
      .ds-user-name {
        font-size: 0.875rem;
        font-weight: 600;
      }
      .ds-user-role {
        font-size: 0.75rem;
        color: hsl(var(--sidebar-foreground) / 0.6);
      }
      .ds-logout-label {
        color: hsl(var(--destructive));
      }

      /* ---- Language Switcher ---- */
      .ds-lang-switcher {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.75rem;
        font-weight: 600;
      }
      .ds-lang-btn {
        background: transparent;
        border: none;
        color: hsl(var(--muted-foreground));
        cursor: pointer;
        padding: 0.25rem;
        transition: color 150ms;
      }
      .ds-lang-btn:hover {
        color: hsl(var(--foreground));
      }
      .ds-lang-btn.active {
        color: hsl(var(--primary));
      }
      .ds-lang-sep {
        color: hsl(var(--border));
      }
      .ds-topbar-sep {
        height: 1rem !important;
        margin: 0 0.5rem;
      }

      /* ---- Main layout ---- */
      .ds-admin-main {
        display: flex;
        flex: 1;
        flex-direction: column;
        overflow: hidden;
        background: hsl(var(--background));
        color: hsl(var(--foreground));
        min-height: 100svh;
      }

      /* ---- Topbar ---- */
      .ds-admin-topbar {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        height: 3.5rem;
        padding: 0 1rem;
        border-bottom: 1px solid hsl(var(--border));
        background: hsl(var(--card));
        flex-shrink: 0;
      }

      /* ---- Breadcrumb ---- */
      .ds-breadcrumb {
        margin-left: 0.25rem;
      }
      .ds-breadcrumb-list {
        display: flex;
        align-items: center;
        gap: 0.375rem;
        list-style: none;
        margin: 0;
        padding: 0;
        font-size: 0.875rem;
        color: hsl(var(--foreground));
      }
      .ds-breadcrumb-list li {
        display: flex;
        align-items: center;
        gap: 0.375rem;
        color: hsl(var(--muted-foreground));
        font-size: 0.75rem;
      }
      .ds-breadcrumb-item {
        font-weight: 500;
        color: hsl(var(--foreground));
      }
      .ds-breadcrumb-item--faded {
        color: hsl(var(--muted-foreground));
        font-weight: 400;
      }

      /* ---- Topbar right actions ---- */
      .ds-topbar-actions {
        margin-left: auto;
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
      .ds-topbar-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 2rem;
        height: 2rem;
        border-radius: calc(var(--radius) - 2px);
        color: hsl(var(--muted-foreground));
        text-decoration: none;
        transition:
          background 150ms,
          color 150ms;
      }
      .ds-topbar-btn:hover {
        background: hsl(var(--accent));
        color: hsl(var(--accent-foreground));
      }

      /* ---- Page Content ---- */
      .ds-admin-content {
        flex: 1;
        overflow-y: auto;
        padding: 1.5rem;
      }
    `,
  ],
})
export class AdminShellNewComponent implements OnInit {
  public auth = inject(AuthService);
  private router = inject(Router);
  private translate = inject(TranslateService);

  readonly sidebarOpen = true;

  get currentLang() {
    return this.translate.currentLang;
  }

  navItems: NavItem[] = [
    {
      titleKey: 'SIDEBAR.DASHBOARD',
      url: '/admin',
      exact: true,
      icon: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10',
    },
    {
      titleKey: 'SIDEBAR.MEMBERS',
      url: '/admin/members',
      icon: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 7a4 4 0 0 1 4 4 M22 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75',
    },
    {
      titleKey: 'SIDEBAR.SEASONS',
      url: '/admin/seasons',
      icon: 'M6 9H4.5a2.5 2.5 0 0 1 0-5H6 M18 9h1.5a2.5 2.5 0 0 0 0-5H18 M4 22h16 M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22 M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22 M18 2H6v7a6 6 0 0 0 12 0V2z',
    },
  ];

  ngOnInit() {
    // Restore language preference or use default
    const savedLang = localStorage.getItem('ds-lang') || 'vi';
    this.translate.use(savedLang);
  }

  switchLang(lang: string) {
    this.translate.use(lang);
    localStorage.setItem('ds-lang', lang);
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/']);
  }
}
