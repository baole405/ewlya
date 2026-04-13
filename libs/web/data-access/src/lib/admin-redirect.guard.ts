import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/**
 * Redirect admin users from Landing Page to Admin Dashboard.
 * Applied on the `''` (home) route.
 */
export const adminRedirectGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated() && auth.isAdmin()) {
    router.navigate(['/admin']);
    return false;
  }

  return true;
};
