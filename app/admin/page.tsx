import type { Metadata } from 'next'
import { createClient } from '../../utils/supabase/server'

export const metadata: Metadata = {
  title: 'Instructor Control Plane',
}
import { redirect } from 'next/navigation'
import AdminDashboardClient from './admin-dashboard'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return redirect('/login')
  }

  // Fetch role validation from profile table
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'INSTRUCTOR') {
    return redirect('/dashboard')
  }

  let submissions: any[] = []
  let fetchError = null

  try {
    // Relational query joining profiles (student email) and assignments (title)
    const { data, error } = await supabase
      .from('submissions')
      .select(`
        id,
        student_id,
        assignment_id,
        code_submitted,
        score,
        feedback,
        created_at,
        profiles (email),
        assignments (title)
      `)
      .order('created_at', { ascending: false })

    if (error) {
      fetchError = error.message
    } else {
      submissions = data || []
    }
  } catch (err: any) {
    fetchError = err?.message || 'Database connection error during submissions fetch'
  }

  return (
    <AdminDashboardClient
      submissions={submissions}
      error={fetchError}
    />
  )
}
