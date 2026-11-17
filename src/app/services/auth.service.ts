import { Injectable, signal, computed, inject, DestroyRef } from '@angular/core';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../core/supabase';
import {
  signInWithGoogle,
  signInWithEmail,
  signUpWithEmail,
  signInAsGuest,
  signOut,
} from '../core/auth';

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly session = signal<Session | null>(null);
  readonly isAuthenticated = computed(() => this.session() !== null);
  readonly userId = computed(() => this.session()?.user.id ?? null);

  private readonly destroyRef = inject(DestroyRef);

  readonly initialized = signal(false);

  constructor() {
    // INITIAL_SESSION fires once after Supabase resolves the auth state,
    // including PKCE code exchange on OAuth callback. This is the only
    // reliable signal that initialization is complete.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      this.session.set(session);
      if (event === 'INITIAL_SESSION') {
        this.initialized.set(true);
      }
    });
    this.destroyRef.onDestroy(() => subscription.unsubscribe());
  }

  signInWithGoogle = signInWithGoogle;
  signInWithEmail = signInWithEmail;
  signUpWithEmail = signUpWithEmail;
  signInAsGuest = signInAsGuest;
  signOut = signOut;
}
