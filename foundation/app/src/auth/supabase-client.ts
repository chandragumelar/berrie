import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/** A single SDK client; session credentials are scoped to this browser tab. */
export function createAccessClient(url:string,publishableKey:string):SupabaseClient {
 const parsed=new URL(url);
 if(!['http:','https:'].includes(parsed.protocol) || !publishableKey.trim()) throw new Error('Konfigurasi Supabase tidak sah');
 return createClient(parsed.origin,publishableKey,{auth:{storage:sessionStorage,persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
}
