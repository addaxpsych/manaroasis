/**
 * Service-role Supabase client. Bypasses RLS entirely.
 *
 * Only ever construct this inside a server endpoint, and only after the caller
 * has been authorised (`requireAdmin`) or for a deliberately public write that
 * we want to keep off the anon key — the enrollment-request and contact forms,
 * which insert into tables that have no public INSERT policy by design.
 */
import { createClient } from '@supabase/supabase-js';
import { requireVar } from '../env';
import type { Database } from './types';

export function createSupabaseAdminClient() {
  return createClient<Database>(
    requireVar('PUBLIC_SUPABASE_URL'),
    requireVar('SUPABASE_SERVICE_ROLE_KEY'),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
