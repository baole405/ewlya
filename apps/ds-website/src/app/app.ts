import { CommonModule } from '@angular/common';
import { Component, signal, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService, DISCORD_LOGIN_URL } from '@ds/web/data-access';

@Component({
  selector: 'app-root',
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: './app.css',
  host: {
    '(window:resize)': 'onResize()',
  },
})
export class App {
  auth = inject(AuthService);
  discordLoginUrl = inject(DISCORD_LOGIN_URL);
  title = 'ds-website';
  sidebarOpen = signal(false);

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
