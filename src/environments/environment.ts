const _env = (import.meta as unknown as { env: Record<string, string> }).env;

export const environment = {
  production: false,
  supabaseUrl: _env['NG_APP_SUPABASE_URL'] || 'https://ekuuprybtnsazourhvak.supabase.co',
  supabaseAnonKey: _env['NG_APP_SUPABASE_ANON_KEY'] || 'sb_publishable_Rg5ysXyuPx_kxeRO2TRnvA_wXJ9qvog',
};
