import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const authGuard: CanActivateFn = () => {
  const router = inject(Router);

  const user = localStorage.getItem('putteputtern_logged_in_user');

  if (user) {
    return true;
  }

  router.navigate(['/login']);
  return false;
};
