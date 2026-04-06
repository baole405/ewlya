import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from './auth.service';

export const adminGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated() && authService.isAdmin()) {
    return true;
  }

  console.warn('❌ Giao diện Quản trị: Truy cập bị từ chối. Điều hướng về Trang chủ.');
  return router.createUrlTree(['/']);
};
