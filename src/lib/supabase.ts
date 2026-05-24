
import { createClient } from '@supabase/supabase-js';

// Konfigurasi Supabase untuk KOIN KU - Solo User Edition
const supabaseUrl = 'https://skbbpfhxsyxpthrohdif.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNrYmJwZmh4c3l4cHRocm9oZGlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0ODc5MjcsImV4cCI6MjA5NTA2MzkyN30.xYfGDECiixn6FhqJR45e5JKxAu56vkT_ff7nLM7_Vcg';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});
