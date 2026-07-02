import { createClient } from '../../../utils/supabase/server'
import AssignmentWorkspace from './assignment-workspace'
import Link from 'next/link'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function AssignmentPage({ params }: PageProps) {
  const { id } = await params

  let assignment = null
  let fetchError = null

  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('assignments')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      fetchError = error.message
    } else {
      assignment = data
    }
  } catch (err: any) {
    fetchError = err?.message || 'Failed to initialize database client'
  }

  // Handle case where assignment is not found or error occurred
  if (!assignment || fetchError) {
    return (
      <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-slate-950 px-4 py-12 text-slate-100 select-none">
        {/* Background radial glow */}
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-rose-500/5 blur-[130px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-slate-500/5 blur-[130px] pointer-events-none" />

        {/* Decorative Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none opacity-30" />

        <div className="z-10 w-full max-w-md text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3 shadow-lg mb-6 animate-[fade-in_0.5s_ease-out]">
            <svg
              className="h-full w-full"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>

          <h1 className="text-2xl font-extrabold tracking-tight text-slate-100 mb-3 animate-[fade-in_0.5s_ease-out]">
            Assignment Not Found
          </h1>
          <p className="text-sm text-slate-400 leading-relaxed mb-8 max-w-sm mx-auto animate-[fade-in_0.6s_ease-out]">
            {fetchError 
              ? `An error occurred while fetching the assignment: ${fetchError}` 
              : "We couldn't retrieve the assignment details. The assignment ID might be invalid or it may have been removed."}
          </p>

          <div className="animate-[fade-in_0.7s_ease-out]">
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 px-5 py-2.5 text-sm font-semibold text-slate-200 transition-all duration-200 active:scale-[0.98] cursor-pointer"
            >
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
              Return to Dashboard
            </Link>
          </div>
        </div>
      </main>
    )
  }

  return <AssignmentWorkspace assignment={assignment} />
}
