import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-sign-in',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './sign-in.component.html',
  styleUrl: './sign-in.component.scss',
})
export class SignInComponent {
  private readonly auth   = inject(AuthService);
  private readonly router = inject(Router);

  readonly mode     = signal<'signin' | 'signup'>('signin');
  readonly email    = signal('');
  readonly password = signal('');
  readonly loading  = signal(false);
  readonly err      = signal('');
  readonly confirm  = signal(false);

  toggleMode(): void {
    this.mode.update((m) => (m === 'signin' ? 'signup' : 'signin'));
    this.err.set('');
    this.confirm.set(false);
  }

  async onEmailSubmit(): Promise<void> {
    this.err.set('');
    this.loading.set(true);
    try {
      if (this.mode() === 'signup') {
        await this.auth.signUpWithEmail(this.email(), this.password());
        this.confirm.set(true);
      } else {
        await this.auth.signInWithEmail(this.email(), this.password());
        await this.router.navigate(['/']);
      }
    } catch (e: unknown) {
      this.err.set(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      this.loading.set(false);
    }
  }

  async onGoogle(): Promise<void> {
    this.err.set('');
    this.loading.set(true);
    try {
      await this.auth.signInWithGoogle();
      await this.router.navigate(['/']);
    } catch (e: unknown) {
      this.err.set(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      this.loading.set(false);
    }
  }

  async onGuest(): Promise<void> {
    this.err.set('');
    this.loading.set(true);
    try {
      await this.auth.signInAsGuest();
      await this.router.navigate(['/']);
    } catch (e: unknown) {
      this.err.set(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      this.loading.set(false);
    }
  }
}
