import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, map, take } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

export const authGuard = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.initialized()) {
    return auth.isAuthenticated() ? true : router.createUrlTree(['/signin']);
  }

  return toObservable(auth.initialized).pipe(
    filter(Boolean),
    take(1),
    map(() => auth.isAuthenticated() ? true : router.createUrlTree(['/signin'])),
  );
};
