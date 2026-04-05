import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '@ds/web/data-access';

/**
 * Guard bảo vệ trang Admin. Chỉ cho phép user có Role.ADMIN truy cập.
 */
export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated() && auth.isAdmin()) {
    return true;
  }

  // Chuyển hướng về trang chủ nếu không đủ quyền
  router.navigate(['/']);
  return false;
};
