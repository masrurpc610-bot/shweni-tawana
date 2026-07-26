import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://rgggjdizzykglblnmgvt.supabase.co'
const supabaseKey = 'sb_publishable_R69U888pYo1efvY-AewK4w_LzkRZAQS'

export const supabase = createClient(supabaseUrl, supabaseKey)