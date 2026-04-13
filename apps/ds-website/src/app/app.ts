import { CommonModule } from '@angular/common';
import { Component, signal, inject, OnInit, DestroyRef } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet, NavigationEnd } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { AuthService, DISCORD_LOGIN_URL } from '@ds/web/data-access';

@Component({
  selector: 'ds-root',
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: './app.css',
  host: {
    '(window:resize)': 'onResize()',
  },
})
export class App implements OnInit {
  auth = inject(AuthService);
  discordLoginUrl = inject(DISCORD_LOGIN_URL);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  title = 'ds-website';
  sidebarOpen = signal(false);
  isAdminPage = signal(false);

  ngOnInit() {
    // Set initial state on load
    this.isAdminPage.set(this.router.url.startsWith('/admin'));

    // Track route changes
    this.router.events
      .pipe(
        filter((e) => e instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((e) => {
        const url = (e as NavigationEnd).urlAfterRedirects;
        this.isAdminPage.set(url.startsWith('/admin'));
        if (this.isAdminPage()) {
          this.sidebarOpen.set(false);
        }
      });
  }

  toggleSidebar() {
    this.sidebarOpen.update((v) => !v);
  }

  closeSidebar() {
    this.sidebarOpen.set(false);
  }

  onResize() {
    if (window.innerWidth >= 1024) {
      this.sidebarOpen.set(false);
    }
  }
}
