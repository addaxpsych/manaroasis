/// <reference types="astro/client" />

type SupabaseServerClient = import('@supabase/supabase-js').SupabaseClient<
  import('./lib/supabase/types').Database
>;

declare namespace App {
  interface Locals {
    supabase: SupabaseServerClient;
    user: import('@supabase/supabase-js').User | null;
    profile: import('./lib/supabase/types').Profile | null;
    /** Provided by @astrojs/cloudflare v14. */
    cfContext: ExecutionContext;
  }
}
