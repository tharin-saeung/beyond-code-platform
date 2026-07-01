import { createClient } from '../utils/supabase/server'
import { redirect } from 'next/navigation'

// Async for handling server-side database checks
export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // If the user has no session cookie, force them to the login screen
  if (!user) {
    return redirect('/login')
  }

  // Fetch the custom role from our database profile table
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  // Dynamic traffic control based on role attributes
  if (profile?.role === 'INSTRUCTOR') {
    return redirect('/admin')
  }

  return redirect('/dashboard')
}