export const environment = {
  production: false,
  supabaseUrl: (import.meta as unknown as { env: Record<string, string> }).env['NG_APP_SUPABASE_URL'] ?? '',
  supabaseAnonKey: (import.meta as unknown as { env: Record<string, string> }).env['NG_APP_SUPABASE_ANON_KEY'] ?? '',
};
