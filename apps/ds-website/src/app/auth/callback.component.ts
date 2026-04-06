import { Component, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService, User } from '@ds/web/data-access';

@Component({
  selector: 'ds-auth-callback',
  standalone: true,
  template: `
    <div class="h-screen flex items-center justify-center bg-base-100">
      <div class="flex flex-col items-center gap-4">
        <span class="loading loading-spinner loading-lg text-primary"></span>
        <p class="font-heading text-xl tracking-widest animate-pulse text-primary">
          AUTHENTICATING...
        </p>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthCallbackComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authService = inject(AuthService);

  ngOnInit() {
    this.route.queryParams.subscribe((params) => {
      const token = params['token'];
      const userStr = params['user'];

      if (token && userStr) {
        try {
          const user: User = JSON.parse(userStr);
          this.authService.setSession(token, user);

          // Chuyển hướng về trang Admin mặc định
          this.router.navigate(['/admin']);
        } catch (e) {
          console.error('Failed to parse user data', e);
          this.router.navigate(['/']);
        }
      } else {
        this.router.navigate(['/']);
      }
    });
  }
}
