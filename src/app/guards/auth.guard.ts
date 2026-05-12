import { isPlatformBrowser } from '@angular/common';
import { inject, PLATFORM_ID } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const authGuard: CanActivateFn = () => {
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);

  if (!isPlatformBrowser(platformId)) {
    return router.createUrlTree(['/login']);
  }

  const user = localStorage.getItem('putteputtern_logged_in_user');

  if (user) {
    return true;
  }

  return router.createUrlTree(['/login']);
};
