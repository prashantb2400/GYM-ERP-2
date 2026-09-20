import { SupabaseClient } from '@supabase/supabase-js';
export declare function getDb(): SupabaseClient;
export declare function resolveGymId(suppliedGymId?: string): string;
