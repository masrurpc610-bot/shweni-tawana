import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://rgggjdizzyklgblnmgvt.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_R69U888pYo1efvY-AewK4w_LzkRZAQS';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);