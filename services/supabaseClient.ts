import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dnsdnbcnjqpwafxtfidl.supabase.co';
const supabaseKey = 'sb_publishable_jr0S8xat41YUJJKilV487Q_3P-W0imf';

export const supabase = createClient(supabaseUrl, supabaseKey);