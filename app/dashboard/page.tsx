import { createClient } from '../../utils/supabase/server'
import { signout } from '../auth/actions'
import Link from 'next/link'

interface Assignment {
  id: string
  title: string
  description: string
  starter_code: string
  created_at: string
}

// Strip markdown for a clean description preview snippet
function getSnippet(markdownText: string) {
  if (!markdownText) return ''
  const clean = markdownText
    .replace(/[#*`_\-]/g, ' ') // Replace markdown characters with space
    .replace(/\s+/g, ' ')      // Collapse multiple spaces
    .trim()
  return clean.length > 120 ? clean.substring(0, 117) + '...' : clean
}

export default async function DashboardPage() {
  let assignments: Assignment[] = []
  let fetchError = null

  try {
    const supabase = await createClient()
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
    fetchError = err?.message || 'Failed to initialize database client'
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100 relative overflow-hidden select-none">
      {/* Background radial glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-violet-600/5 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-cyan-600/5 blur-[130px] pointer-events-none" />

      {/* Decorative Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none opacity-25" />

      {/* Header bar */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4 bg-slate-900/80 border-b border-slate-800/80 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 p-2 shadow-md shadow-indigo-500/10 ring-1 ring-white/10 hover:scale-105 transition-transform duration-300">
            <svg
              className="h-full w-full text-white"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="16 18 22 12 16 6" />
              <polyline points="8 6 2 12 8 18" />
            </svg>
          </div>
          <div>
            <h1 className="text-base font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-100 to-slate-300">
              Beyond Code
            </h1>
            <p className="text-[10px] text-slate-500 font-medium tracking-wide">
              Engineering Workspace
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/50 border border-slate-800/80 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Student Panel
          </div>

          <form action={signout}>
            <button
              type="submit"
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-450 hover:text-slate-200 bg-slate-900 border border-slate-800 hover:border-slate-700/80 rounded-xl transition-all active:scale-95 cursor-pointer"
            >
              <svg
                className="h-3.5 w-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Sign Out
            </button>
          </form>
        </div>
      </header>

      {/* Main Dashboard Panel */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-6 py-10 overflow-y-auto">
        <div className="mb-8">
          <h2 className="text-2xl font-extrabold text-slate-100 tracking-tight">
            Active Assignments
          </h2>
          <p className="text-sm text-slate-455 mt-1">
            Access, solve, and submit algorithm and system challenges to evaluate your progress.
          </p>
        </div>

        {fetchError && (
          <div className="mb-8 flex items-start gap-3 rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-xs text-rose-300 animate-[slide-in_0.3s_ease-out]">
            <svg
              className="h-4.5 w-4.5 shrink-0 text-rose-450 mt-0.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <div>
              <p className="font-bold text-rose-200 mb-0.5">Database Query Exception</p>
              <p className="leading-relaxed">{fetchError}</p>
            </div>
          </div>
        )}

        {assignments.length === 0 ? (
          /* Empty State Display */
          <div className="backdrop-blur-md bg-slate-900/30 border border-slate-900 shadow-2xl rounded-2xl p-12 text-center max-w-xl mx-auto my-12 transition-all hover:border-slate-800/80">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/10 border border-violet-500/20 text-violet-400 p-3.5 mb-6">
              <svg
                className="h-full w-full"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                <path d="M12 11v6" />
                <path d="M9 14h6" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-slate-200 mb-2">
              No Challenges Released Yet
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto mb-6">
              Your instructors haven&apos;t released coding assignments. Please wait for the challenges to be initialized and released.
            </p>
            <div className="text-[10px] text-slate-600 font-mono">
              Status: Checked and Ready
            </div>
          </div>
        ) : (
          /* Assignment CSS Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-[fade-in_0.5s_ease-out]">
            {assignments.map((assignment) => (
              <div
                key={assignment.id}
                className="backdrop-blur-md bg-slate-900/40 border border-slate-850 hover:border-slate-700/50 shadow-xl rounded-2xl p-6 transition-all duration-300 hover:scale-[1.01] hover:bg-slate-900/60 flex flex-col justify-between"
              >
                <div>
                  {/* Badge */}
                  <div className="flex items-center justify-between gap-4 mb-4">
                    <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-violet-500/10 border border-violet-500/20 text-violet-400">
                      Python Core
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {new Date(assignment.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="text-base font-bold text-slate-200 mb-2 line-clamp-1 group-hover:text-violet-450">
                    {assignment.title}
                  </h3>

                  {/* Snippet Description */}
                  <p className="text-xs text-slate-400 leading-relaxed mb-6 line-clamp-3">
                    {getSnippet(assignment.description) || 'No details provided for this challenge.'}
                  </p>
                </div>

                {/* Workspace CTA Button */}
                <Link
                  href={`/assignments/${assignment.id}`}
                  className="inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 rounded-xl transition-all duration-200 active:scale-[0.98] shadow-md shadow-indigo-500/10 hover:shadow-indigo-500/25 cursor-pointer"
                >
                  Start Challenge
                  <svg
                    className="h-3.5 w-3.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </Link>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
