import { createClient } from '@supabase/supabase-js';

// Cliente único do Supabase. Só os serviços (src/services) devem importá-lo.
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_KEY
);
