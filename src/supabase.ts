import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rgggjdizzykglblnmgvt.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJnZ2dqZGl6enlrZ2xibG5tZ3Z0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUwMTY1MDEsImV4cCI6MjEwMDU5MjUwMX0.7xov1eVXKizLULFIE2ptsFqh7SUIKzyoLCUZsW_RLNs';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);