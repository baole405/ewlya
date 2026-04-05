import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '@ds/web/data-access';

/**
 * Interceptor chuẩn Angular 20 (Functional) để tự động đính kèm JWT vào mọi request.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken();

  // Chỉ đính kèm nếu có token và đang gọi API của backend
  if (token && (req.url.startsWith('/api') || req.url.startsWith('http://localhost:3000'))) {
    const authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
    return next(authReq);
  }

  return next(req);
};
