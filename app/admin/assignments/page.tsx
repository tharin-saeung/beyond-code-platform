import { createClient } from '../../../utils/supabase/server'
import { redirect } from 'next/navigation'
import AssignmentManager from './assignment-manager'

export default async function AdminAssignmentsPage() {
  const supabase = await createClient()

  // 1. Authenticate user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return redirect('/login')
  }

  // 2. Authorize user is INSTRUCTOR
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'INSTRUCTOR') {
    return redirect('/dashboard')
  }

  let assignments: any[] = []
  let fetchError = null

  try {
    // 3. Fetch all coding challenges ordered by created_at descending
    const { data, error } = await supabase
      .from('assignments')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      fetchError = error.message
    } else {
      assignments = data || []
    }
  } catch (err: any) {
    fetchError = err?.message || 'Database query error during assignments list fetch'
  }

  if (fetchError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100 p-6 text-center font-sans">
        <div className="backdrop-blur-md bg-slate-900/40 border border-slate-800 rounded-2xl p-8 max-w-md shadow-2xl">
          <h2 className="text-xl font-bold text-rose-400 mb-2">Ledger Error</h2>
          <p className="text-xs text-slate-400 leading-relaxed mb-6">{fetchError}</p>
          <a
            href="/admin"
            className="inline-block px-4 py-2 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-all"
          >
            Return to Dashboard
          </a>
        </div>
      </div>
    )
  }

  // 4. Render client manager component
  return <AssignmentManager initialAssignments={assignments} />
}
