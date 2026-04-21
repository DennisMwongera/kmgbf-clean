import { redirect } from 'next/navigation'
import { getSupabase } from '@/lib/supabase/server'
import AdminShell from '@/components/admin/AdminShell'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = getSupabase()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) redirect('/auth')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', session.user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/dashboard')

  return <AdminShell>{children}</AdminShell>
}