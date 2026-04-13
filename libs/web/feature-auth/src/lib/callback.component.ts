import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService, User } from '@ds/web/data-access';

@Component({
  selector: 'ds-auth-callback',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex h-screen flex-col items-center justify-center bg-background gap-4">
      <div
        class="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"
      ></div>
      <p class="text-sm font-medium">Đang xác thực thông tin...</p>
    </div>
  `,
})
export class CallbackComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private auth = inject(AuthService);

  ngOnInit() {
    this.route.queryParams.subscribe((params) => {
      const token = params['token'];
      const userJson = params['user'];

      if (token && userJson) {
        try {
          const user: User = JSON.parse(userJson);
          this.auth.setSession(token, user);

          // Redirect to admin if they are admin, else home
          if (user.role === 'ADMIN') {
            this.router.navigate(['/admin']);
          } else {
            this.router.navigate(['/']);
          }
        } catch (e) {
          console.error('Lỗi phân tích dữ liệu user:', e);
          this.router.navigate(['/auth/login']);
        }
      } else {
        console.error('Thiếu token hoặc user trong callback');
        this.router.navigate(['/auth/login']);
      }
    });
  }
}
