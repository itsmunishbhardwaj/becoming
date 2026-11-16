import { Injectable, signal, computed, inject, DestroyRef } from '@angular/core';
import type { Session } from '@supabase/supabase-js';
import {
  signInWithGoogle,
  signInWithEmail,
  signUpWithEmail,
  signInAsGuest,
  signOut,
  getSession,
  onAuthStateChange,
} from '../core/auth';

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly session = signal<Session | null>(null);
  readonly isAuthenticated = computed(() => this.session() !== null);
  readonly userId = computed(() => this.session()?.user.id ?? null);

  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    getSession().then((s) => this.session.set(s));

    const sub = onAuthStateChange((s) => this.session.set(s));
    this.destroyRef.onDestroy(() => sub.data.subscription.unsubscribe());
  }

  signInWithGoogle = signInWithGoogle;
  signInWithEmail = signInWithEmail;
  signUpWithEmail = signUpWithEmail;
  signInAsGuest = signInAsGuest;
  signOut = signOut;
}
