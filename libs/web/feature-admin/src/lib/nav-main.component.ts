import { Component, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { lucideChevronRight } from '@ng-icons/lucide';
import { HlmSidebarImports } from '@spartan-ng/helm/sidebar';
import { HlmCollapsibleImports } from '@spartan-ng/helm/collapsible';
import { BrnCollapsibleImports } from '@spartan-ng/brain/collapsible';

export interface NavItem {
  title: string;
  url: string;
  icon?: string;
  isActive?: boolean;
  items?: { title: string; url: string }[];
}

@Component({
  selector: 'ds-nav-main',
  standalone: true,
  imports: [
    RouterLink,
    RouterLinkActive,
    NgIconComponent,
    ...HlmSidebarImports,
    ...HlmCollapsibleImports,
    ...BrnCollapsibleImports,
  ],
  providers: [provideIcons({ lucideChevronRight })],
  template: `
    <div hlmSidebarGroup>
      <span hlmSidebarGroupLabel>Platform</span>
      <ul hlmSidebarMenu>
        @for (item of items(); track item.title) {
          @if (item.items?.length) {
            <brn-collapsible [expanded]="item.isActive ?? false" class="group/collapsible">
              <li hlmSidebarMenuItem>
                <button hlmSidebarMenuButton [tooltip]="item.title" brnCollapsibleTrigger>
                  @if (item.icon) {
                    <ng-icon [name]="item.icon" />
                  }
                  <span>{{ item.title }}</span>
                  <ng-icon
                    name="lucideChevronRight"
                    class="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90"
                  />
                </button>
                <brn-collapsible-content>
                  <ul hlmSidebarMenuSub>
                    @for (sub of item.items; track sub.title) {
                      <li hlmSidebarMenuSubItem>
                        <a
                          hlmSidebarMenuSubButton
                          [routerLink]="sub.url"
                          routerLinkActive="text-sidebar-accent-foreground font-medium"
                        >
                          {{ sub.title }}
                        </a>
                      </li>
                    }
                  </ul>
                </brn-collapsible-content>
              </li>
            </brn-collapsible>
          } @else {
            <li hlmSidebarMenuItem>
              <a
                hlmSidebarMenuButton
                [tooltip]="item.title"
                [routerLink]="item.url"
                routerLinkActive="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
              >
                @if (item.icon) {
                  <ng-icon [name]="item.icon" />
                }
                <span>{{ item.title }}</span>
              </a>
            </li>
          }
        }
      </ul>
    </div>
  `,
})
export class NavMainComponent {
  items = input.required<NavItem[]>();
}
