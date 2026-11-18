import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export const AUTH_STORAGE_KEY='berrie-auth-session';
export function clearLocalAuthSession():void { sessionStorage.removeItem(AUTH_STORAGE_KEY); sessionStorage.removeItem(`${AUTH_STORAGE_KEY}-code-verifier`); }

/** A single SDK client; session credentials are scoped to this browser tab. */
export function createAccessClient(url:string,publishableKey:string):SupabaseClient {
 const parsed=new URL(url);
 if(!['http:','https:'].includes(parsed.protocol) || !publishableKey.trim()) throw new Error('Konfigurasi Supabase tidak sah');
 return createClient(parsed.origin,publishableKey,{auth:{storage:sessionStorage,storageKey:AUTH_STORAGE_KEY,persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
}
