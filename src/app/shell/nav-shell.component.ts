import { Component, inject, signal, computed } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { BreakpointObserver } from '@angular/cdk/layout';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

interface NavTab {
  label: string;
  short: string;
  path: string;
  exact: boolean;
}

const TABS: NavTab[] = [
  { label: 'Calendar',     short: 'Cal',     path: '/calendar',     exact: false },
  { label: 'Goals',        short: 'Goals',   path: '/goals',        exact: false },
  { label: 'Journal',      short: 'Journal', path: '/journal',      exact: false },
  { label: 'To-do',        short: 'To-do',   path: '/todo',         exact: false },
  { label: 'Insights',     short: 'Insights',path: '/insights',     exact: false },
  { label: 'Coach Carter', short: 'Carter',  path: '/coach-carter', exact: false },
];

@Component({
  selector: 'app-nav-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './nav-shell.component.html',
  styleUrl: './nav-shell.component.scss',
})
export class NavShellComponent {
  private bp = inject(BreakpointObserver);
  private router = inject(Router);
  readonly auth = inject(AuthService);

  readonly tabs = TABS;
  readonly profileOpen = signal(false);

  readonly desktop = toSignal(
    this.bp.observe('(min-width: 768px)').pipe(map((s) => s.matches)),
    { initialValue: typeof window !== 'undefined' && window.innerWidth >= 768 },
  );

  readonly userInitial = computed(() => {
    const user = this.auth.session()?.user;
    if (!user) return '?';
    const email = user.email ?? '';
    return email.charAt(0).toUpperCase() || '?';
  });

  readonly isGuest = computed(() => {
    return this.auth.session()?.user?.is_anonymous ?? false;
  });

  async signOut() {
    await this.auth.signOut();
    this.profileOpen.set(false);
    this.router.navigate(['/signin']);
  }
}
