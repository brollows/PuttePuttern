import { createClient } from '@supabase/supabase-js';

let client: any = null;

export function getSupabaseClient() {
  if (!client) {
    client = createClient(
      'https://uyzwhuykmihdvqsyxdlq.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5endodXlrbWloZHZxc3l4ZGxxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2OTk2NDksImV4cCI6MjA5MTI3NTY0OX0.y-vUDMOvcSDqoetlIUfwfEBDsc5SLbANVpdacpQXBNk',
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      },
    );
  }

  return client;
}
