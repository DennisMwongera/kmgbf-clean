'use client'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

// Use inside 'use client' components
export const supabase = createClientComponentClient()
