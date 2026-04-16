import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  HlmCardDirective,
  HlmCardContentDirective,
  HlmCardDescriptionDirective,
  HlmCardFooterDirective,
  HlmCardHeaderDirective,
  HlmCardTitleDirective,
} from '@ds/web/ui-spartan';
import { HlmBtnDirective } from '@ds/web/ui-spartan';
import { HlmInputDirective, HlmLabelDirective } from '@ds/web/ui-spartan';
import { AuthService } from '@ds/web/data-access';

@Component({
  selector: 'ds-login',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    HlmCardDirective,
    HlmCardHeaderDirective,
    HlmCardTitleDirective,
    HlmCardDescriptionDirective,
    HlmCardContentDirective,
    HlmCardFooterDirective,
    HlmBtnDirective,
    HlmInputDirective,
    HlmLabelDirective,
  ],
  template: `
    <div class="flex h-screen items-center justify-center bg-background p-4">
      <div hlmCard class="w-full max-w-sm">
        <div hlmCardHeader>
          <h3 hlmCardTitle>Đăng nhập</h3>
          <p hlmCardDescription>Chào mừng bạn quay lại với DarkStar Clan.</p>
        </div>

        <div hlmCardContent class="grid gap-4">
          <div class="grid gap-2">
            <label hlmLabel for="username">Username</label>
            <input
              hlmInput
              id="username"
              type="text"
              placeholder="elonmusk"
              [(ngModel)]="username"
            />
          </div>
          <div class="grid gap-2">
            <label hlmLabel for="password">Mật khẩu</label>
            <input hlmInput id="password" type="password" [(ngModel)]="password" />
          </div>
        </div>

        <div hlmCardFooter class="flex flex-col gap-3">
          <button hlmBtn class="w-full" (click)="login()">Đăng nhập</button>

          <div class="relative w-full py-2">
            <div class="absolute inset-0 flex items-center">
              <span class="w-full border-t"></span>
            </div>
            <div class="relative flex justify-center text-xs uppercase">
              <span class="bg-background px-2 text-muted-foreground">Hoặc tiếp tục với</span>
            </div>
          </div>

          <button hlmBtn variant="outline" class="w-full gap-2" (click)="loginWithDiscord()">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              fill="currentColor"
              viewBox="0 0 16 16"
            >
              <path
                d="M13.545 2.907a13.227 13.227 0 0 0-3.257-1.011.05.05 0 0 0-.052.025c-.141.25-.297.577-.406.833a12.19 12.19 0 0 0-3.658 0 8.258 8.258 0 0 0-.412-.833.051.051 0 0 0-.052-.025c-1.125.194-2.22.534-3.257 1.011a.041.041 0 0 0-.021.018C.356 6.024-.213 9.047.066 12.032c.001.014.01.028.021.037a13.276 13.276 0 0 0 3.995 2.02.05.05 0 0 0 .056-.019c.308-.42.582-.863.818-1.329a.05.05 0 0 0-.01-.059.051.051 0 0 0-.018-.011 8.875 8.875 0 0 1-1.248-.595.05.05 0 0 1-.02-.066.051.051 0 0 1 .015-.019c.084-.063.168-.129.248-.195a.05.05 0 0 1 .051-.007c2.619 1.196 5.454 1.196 8.041 0a.052.052 0 0 1 .053.007c.08.066.164.132.248.195a.051.051 0 0 1-.004.085 8.254 8.254 0 0 1-1.248.595.05.05 0 0 0-.02.066c.235.466.509.909.817 1.329a.05.05 0 0 0 .056.019 13.235 13.235 0 0 0 4.001-2.02.049.049 0 0 0 .021-.037c.334-3.451-.559-6.449-2.366-9.106a.034.034 0 0 0-.02-.019Zm-8.198 7.307c-.789 0-1.438-.724-1.438-1.612 0-.889.637-1.613 1.438-1.613.807 0 1.45.73 1.438 1.613 0 .888-.631 1.612-1.438 1.612Zm5.316 0c-.788 0-1.438-.724-1.438-1.612 0-.889.637-1.613 1.438-1.613.807 0 1.451.73 1.438 1.613 0 .888-.631 1.612-1.438 1.612Z"
              />
            </svg>
            Discord
          </button>
        </div>
      </div>
    </div>
  `,
})
export class LoginPage {
  private auth = inject(AuthService);
  private router = inject(Router);

  username = '';
  password = '';

  login() {
    if (!this.username || !this.password) return;

    this.auth.login(this.username, this.password).subscribe({
      next: () => {
        this.router.navigate(['/admin/members']);
      },
      error: (err) => {
        console.error('Login error:', err);
        alert('Tài khoản hoặc mật khẩu không đúng');
      },
    });
  }

  loginWithDiscord() {
    this.auth.loginWithDiscord();
  }
}
