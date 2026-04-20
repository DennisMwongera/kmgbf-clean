import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

// Use inside Server Components and Route Handlers
export function getSupabase() {
  return createServerComponentClient({ cookies })
}
