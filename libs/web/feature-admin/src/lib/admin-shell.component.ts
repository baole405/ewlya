import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideUsers,
  lucideLayoutDashboard,
  lucideSettings,
  lucideLifeBuoy,
  lucideSend,
  lucideBoxes,
  lucideCheckCircle,
} from '@ng-icons/lucide';
import { HlmSidebarImports } from '@spartan-ng/helm/sidebar';
import { HlmBreadCrumbImports } from '@spartan-ng/helm/breadcrumb';
import { NavMainComponent, type NavItem } from './nav-main.component';
import { NavUserComponent } from './nav-user.component';

@Component({
  selector: 'ds-admin-shell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterOutlet,
    TranslateModule,
    NgIconComponent,
    ...HlmSidebarImports,
    ...HlmBreadCrumbImports,
    NavMainComponent,
    NavUserComponent,
  ],
  providers: [
    provideIcons({
      lucideUsers,
      lucideLayoutDashboard,
      lucideSettings,
      lucideLifeBuoy,
      lucideSend,
      lucideBoxes,
      lucideCheckCircle,
    }),
  ],
  template: `
    <!-- Outermost wrapper using directive selector -->
    <div hlmSidebarWrapper class="has-[[data-variant=inset]]:bg-sidebar">
      <!-- ===== SIDEBAR ===== -->
      <hlm-sidebar variant="inset" collapsible="icon">
        <!-- Header: Workspace Brand -->
        <div hlmSidebarHeader>
          <ul hlmSidebarMenu>
            <li hlmSidebarMenuItem>
              <button hlmSidebarMenuButton size="lg" class="pointer-events-none">
                <div
                  class="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground"
                >
                  <ng-icon name="lucideBoxes" class="size-4" />
                </div>
                <div
                  class="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden"
                >
                  <span class="truncate font-semibold">DarkStar</span>
                  <span class="truncate text-xs text-sidebar-foreground/60">Admin Panel</span>
                </div>
              </button>
            </li>
          </ul>
        </div>

        <!-- Content: Main nav -->
        <div hlmSidebarContent>
          <ds-nav-main [items]="navMain" />

          <!-- Support / Secondary nav at bottom -->
          <div hlmSidebarGroup class="mt-auto">
            <div hlmSidebarGroupLabel>{{ 'SIDEBAR.SUPPORT' | translate }}</div>
            <ul hlmSidebarMenu>
              <li hlmSidebarMenuItem>
                <a
                  hlmSidebarMenuButton
                  tooltip="{{ 'SIDEBAR.SUPPORT' | translate }}"
                  href="mailto:support@darkstar.gg"
                >
                  <ng-icon name="lucideLifeBuoy" />
                  <span>{{ 'SIDEBAR.SUPPORT' | translate }}</span>
                </a>
              </li>
              <li hlmSidebarMenuItem>
                <a hlmSidebarMenuButton tooltip="{{ 'SIDEBAR.FEEDBACK' | translate }}" href="#">
                  <ng-icon name="lucideSend" />
                  <span>{{ 'SIDEBAR.FEEDBACK' | translate }}</span>
                </a>
              </li>
            </ul>
          </div>
        </div>

        <!-- Footer: User profile with dropdown -->
        <div hlmSidebarFooter>
          <ds-nav-user />
        </div>

        <!-- Rail for collapse toggle -->
        <div hlmSidebarRail></div>
      </hlm-sidebar>

      <!-- ===== INSET MAIN AREA ===== -->
      <main hlmSidebarInset>
        <!-- Top header with trigger + breadcrumb -->
        <header class="flex h-16 shrink-0 items-center gap-2 px-4 border-b">
          <button hlmSidebarTrigger class="-ml-1"></button>
          <div class="h-4 w-px bg-border mx-1 hidden md:block"></div>
          <nav hlmBreadcrumb class="hidden md:flex">
            <ol hlmBreadcrumbList>
              <li hlmBreadcrumbItem>
                <a hlmBreadcrumbLink href="#">DarkStar Admin</a>
              </li>
              <li hlmBreadcrumbSeparator></li>
              <li hlmBreadcrumbItem>
                <span hlmBreadcrumbPage>Overview</span>
              </li>
            </ol>
          </nav>
        </header>

        <!-- Routed page content -->
        <div class="flex flex-1 flex-col gap-4 p-4 pt-4">
          <router-outlet />
        </div>
      </main>
    </div>
  `,
})
export class AdminShellComponent {
  navMain: NavItem[] = [
    {
      title: 'SIDEBAR.DASHBOARD',
      url: '/admin',
      icon: 'lucideLayoutDashboard',
    },
    {
      title: 'SIDEBAR.MEMBERS',
      url: '/admin/members',
      icon: 'lucideUsers',
      isActive: true,
    },
    {
      title: 'SIDEBAR.PROGRESSION',
      url: '/admin/progression',
      icon: 'lucideCheckCircle',
    },
    {
      title: 'SIDEBAR.SETTINGS',
      url: '/admin/settings',
      icon: 'lucideSettings',
    },
  ];
}
