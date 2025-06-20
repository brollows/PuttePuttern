import { createClient } from '@supabase/supabase-js';

let client: any = null;

export function getSupabaseClient() {
    if (!client) {
        client = createClient(
            'https://zemgyaubopngyguaeocf.supabase.co',
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InplbWd5YXVib3BuZ3lndWFlb2NmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA0MjE1MjEsImV4cCI6MjA2NTk5NzUyMX0.temQBg9Z7TdfX30untFo0uQKNf_I0y_36JqlGnsVnwg',
            {
                auth: {
                    persistSession: false,
                    autoRefreshToken: false,
                    detectSessionInUrl: false,
                }
            }
        );
    }

    return client;
}
