// The dashboard route is the single entry point for the whole app.
// AppShell renders the correct page based on Zustand activePage state.
// No routing happens via Next.js URLs inside the app — only /auth and /dashboard exist.
import AppShell from '@/components/AppShell'

export default function DashboardPage() {
  return <AppShell />
}
