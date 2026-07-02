'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Editor from '@monaco-editor/react'
import { signout } from '../auth/actions'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell
} from 'recharts'

interface Submission {
  id: string
  student_id: string
  assignment_id: string
  code_submitted: string
  score: number
  feedback: string
  created_at: string
  profiles?: any
  assignments?: any
}

interface AdminDashboardClientProps {
  submissions: Submission[]
  error: string | null
}

// Reusable custom markdown parser for rendering AI review
function renderMarkdown(md: string) {
  if (!md) return ''

  // Escape HTML to prevent basic XSS
  let html = md
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/&lt;br\s*\/?&gt;/gi, '<br />')
    .replace(/\$(.*?)\$/g, '<code class="bg-violet-950/40 text-violet-300 px-1.5 py-0.5 rounded font-mono text-xs border border-violet-500/20 font-medium">$1</code>')

  // 1. Extract Multiline Code Blocks
  const codeBlocks: string[] = []
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, codeBlock) => {
    const placeholder = `__CODE_BLOCK_PLACEHOLDER_${codeBlocks.length}__`
    const isPython = lang === 'python' || !lang
    const colorClass = isPython ? 'text-violet-300' : 'text-slate-350'
    const codeBlockHtml = `<pre class="bg-slate-950/80 border border-slate-800/80 p-4 rounded-xl ${colorClass} font-mono text-xs overflow-x-auto my-3 leading-relaxed whitespace-pre">${codeBlock.trim()}</pre>`
    codeBlocks.push(codeBlockHtml)
    return placeholder
  })

  // 2. Bold / Italic
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>')

  // 3. Inline Code
  html = html.replace(
    /`(.*?)`/g,
    '<code class="bg-slate-950 px-1.5 py-0.5 rounded text-violet-300 font-mono text-xs border border-slate-800/80">$1</code>'
  )

  // 4. Headings
  html = html.replace(
    /^#### (.*?)$/gm,
    '<h5 class="text-xs font-bold text-slate-355 mt-3.5 mb-1.5">$1</h5>'
  )
  html = html.replace(
    /^### (.*?)$/gm,
    '<h4 class="text-sm font-semibold text-slate-200 mt-4 mb-2">$1</h4>'
  )
  html = html.replace(
    /^## (.*?)$/gm,
    '<h3 class="text-base font-bold text-slate-100 mt-5 mb-2.5 border-b border-slate-800/50 pb-1">$1</h3>'
  )
  html = html.replace(
    /^# (.*?)$/gm,
    '<h2 class="text-lg font-extrabold text-white mt-6 mb-3">$1</h2>'
  )

  // 5. Unordered list items
  html = html.replace(
    /^- (.*?)$/gm,
    '<li class="ml-4 list-disc text-slate-300 my-1">$1</li>'
  )

  // 6. Paragraphs
  const blocks = html.split(/\n\n+/)
  const formattedBlocks = blocks.map((block) => {
    const trimmed = block.trim()
    if (
      trimmed.startsWith('<h') ||
      trimmed.startsWith('<li') ||
      trimmed.startsWith('<ul') ||
      trimmed.startsWith('__CODE_BLOCK_PLACEHOLDER_')
    ) {
      return trimmed
    }
    if (trimmed.startsWith('<li')) {
      return `<ul class="my-3 space-y-1">${trimmed}</ul>`
    }
    return `<p class="my-3 text-slate-300 leading-relaxed text-sm">${trimmed.replace(/\n/g, '<br />')}</p>`
  })

  let finalHtml = formattedBlocks.join('\n')

  // 7. Inject Multiline Code Blocks back
  codeBlocks.forEach((codeBlockHtml, idx) => {
    finalHtml = finalHtml.replace(`__CODE_BLOCK_PLACEHOLDER_${idx}__`, codeBlockHtml)
  })

  return finalHtml
}

export default function AdminDashboardClient({
  submissions,
  error,
}: AdminDashboardClientProps) {
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'date' | 'score'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleSort = (field: 'date' | 'score') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('desc')
    }
  }

  const getStudentEmail = (sub: Submission) => {
    if (!sub.profiles) return 'Unknown Student'
    return Array.isArray(sub.profiles)
      ? sub.profiles[0]?.email || 'Unknown Student'
      : sub.profiles.email || 'Unknown Student'
  }

  const getAssignmentTitle = (sub: Submission) => {
    if (!sub.assignments) return 'Unknown Assignment'
    return Array.isArray(sub.assignments)
      ? sub.assignments[0]?.title || 'Unknown Assignment'
      : sub.assignments.title || 'Unknown Assignment'
  }

  const getAiFeedbackText = (sub: Submission) => {
    if (!sub.feedback) return 'No feedback generated'
    try {
      const parsed = JSON.parse(sub.feedback)
      return parsed.feedback || sub.feedback
    } catch {
      return sub.feedback
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
    if (score >= 40) return 'text-amber-400 bg-amber-500/10 border-amber-500/20'
    return 'text-rose-400 bg-rose-500/10 border-rose-500/20'
  }

  const getScoreIndicator = (score: number) => {
    if (score >= 80) return 'bg-emerald-500 shadow-emerald-500/50'
    if (score >= 40) return 'bg-amber-500 shadow-amber-500/50'
    return 'bg-rose-500 shadow-rose-500/50'
  }

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(date)
    } catch {
      return dateString
    }
  }

  // Filter submissions by student email or assignment title
  const filteredSubmissions = submissions.filter((sub) => {
    const email = getStudentEmail(sub).toLowerCase()
    const title = getAssignmentTitle(sub).toLowerCase()
    const query = searchQuery.toLowerCase()
    return email.includes(query) || title.includes(query)
  })

  // Sort submissions based on selected field and order
  const sortedSubmissions = [...filteredSubmissions].sort((a, b) => {
    if (sortBy === 'date') {
      const timeA = new Date(a.created_at).getTime()
      const timeB = new Date(b.created_at).getTime()
      return sortOrder === 'asc' ? timeA - timeB : timeB - timeA
    } else {
      return sortOrder === 'asc' ? a.score - b.score : b.score - a.score
    }
  })

  const excellentCount = submissions.filter((s) => s.score >= 80).length
  const averageCount = submissions.filter((s) => s.score >= 40 && s.score < 80).length
  const needsReviewCount = submissions.filter((s) => s.score < 40).length

  const chartData = [
    { name: 'Needs Review (0-39)', value: needsReviewCount, fill: 'url(#needsReviewGrad)' },
    { name: 'Average (40-79)', value: averageCount, fill: 'url(#averageGrad)' },
    { name: 'Excellent (80-100)', value: excellentCount, fill: 'url(#excellentGrad)' },
  ]

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100 relative overflow-hidden select-none">
      {/* Background radial glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-violet-600/5 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-cyan-600/5 blur-[130px] pointer-events-none" />

      {/* Decorative Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none opacity-25" />

      {/* Header Panel */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4 bg-slate-900/80 border-b border-slate-800/80 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 p-2 shadow-md shadow-indigo-500/10 ring-1 ring-white/10">
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
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <line x1="9" y1="3" x2="9" y2="21" />
            </svg>
          </div>
          <div>
            <h1 className="text-base font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-100 to-slate-300">
              Instructor Control Plane
            </h1>
            <p className="text-[10px] text-slate-500 font-medium tracking-wide">
              Submissions Ledger & Grading Overview
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Link
            href="/admin/assignments"
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 rounded-xl transition-all shadow-md shadow-indigo-500/10 active:scale-95 cursor-pointer"
          >
            Manage Question Bank ➕
          </Link>

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

      {/* Main Console */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-6 py-8 overflow-y-auto">
        
        {/* Error Alert if Database Fetch Fails */}
        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-xs text-rose-300">
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
              <p className="font-bold text-rose-200">Ledger Error</p>
              <p className="leading-relaxed">{error}</p>
            </div>
          </div>
        )}

        {/* Dashboard Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="backdrop-blur-md bg-slate-900/40 border border-slate-850 p-5 rounded-2xl">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">
              Total Student Submissions
            </span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-extrabold text-slate-100">
                {submissions.length}
              </span>
              <span className="text-xs text-slate-450">runs compiled</span>
            </div>
          </div>

          <div className="backdrop-blur-md bg-slate-900/40 border border-slate-850 p-5 rounded-2xl">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">
              Passing Solutions (80+)
            </span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-extrabold text-emerald-400">
                {submissions.filter((s) => s.score >= 80).length}
              </span>
              <span className="text-xs text-slate-450">
                ({submissions.length ? Math.round((submissions.filter((s) => s.score >= 80).length / submissions.length) * 100) : 0}%)
              </span>
            </div>
          </div>

          <div className="backdrop-blur-md bg-slate-900/40 border border-slate-850 p-5 rounded-2xl">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">
              Average Evaluation Score
            </span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-extrabold text-violet-400">
                {submissions.length
                  ? Math.round(submissions.reduce((acc, s) => acc + s.score, 0) / submissions.length)
                  : 0}
              </span>
              <span className="text-xs text-slate-450">/ 100 max</span>
            </div>
          </div>
        </div>

        {/* Recharts Performance Distribution Chart */}
        <div className="w-full backdrop-blur-md bg-slate-900/40 border border-slate-850 p-6 rounded-2xl min-h-[300px] mb-8">
          <div className="flex items-center gap-2 mb-6">
            <span className="h-2 w-2 rounded-full bg-violet-500 animate-pulse" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Performance Distribution
            </h3>
          </div>

          <div className="w-full mt-2">
            {mounted ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="needsReviewGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="#9f1239" stopOpacity={0.3} />
                    </linearGradient>
                    <linearGradient id="averageGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#fbbf24" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="#b45309" stopOpacity={0.3} />
                    </linearGradient>
                    <linearGradient id="excellentGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="#4f46e5" stopOpacity={0.3} />
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="name" 
                    stroke="#475569" 
                    fontSize={10} 
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    stroke="#475569" 
                    fontSize={10} 
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(148, 163, 184, 0.05)', radius: 8 }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload
                        const indicatorColor = 
                          data.name.startsWith('Excellent') ? 'bg-violet-500' :
                          data.name.startsWith('Average') ? 'bg-amber-500' : 'bg-rose-500'
                        return (
                          <div className="bg-slate-900/90 border border-slate-800 backdrop-blur-md px-3.5 py-2.5 rounded-xl shadow-2xl text-xs font-mono">
                            <div className="flex items-center gap-2 font-bold text-slate-200">
                              <span className={`h-1.5 w-1.5 rounded-full ${indicatorColor}`} />
                              {data.name}
                            </div>
                            <p className="text-slate-450 mt-1.5">
                              Submissions: <span className="text-white font-extrabold">{data.value}</span>
                            </p>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.fill} 
                        className="hover:opacity-100 cursor-pointer transition-all duration-200"
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] w-full flex items-center justify-center text-xs text-slate-500 font-mono">
                Initializing charting layout...
              </div>
            )}
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-500">
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Search by student email or assignment title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900/60 border border-slate-800 text-slate-100 rounded-xl py-2.5 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500 transition-all duration-200 placeholder-slate-600 text-xs"
            />
          </div>
          <div className="text-xs text-slate-500 font-mono">
            Showing {filteredSubmissions.length} of {submissions.length} records
          </div>
        </div>

        {/* Data Table */}
        <div className="backdrop-blur-md bg-slate-900/40 border border-slate-850 shadow-2xl rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/60 text-[10px] font-bold uppercase tracking-wider text-slate-450">
                  <th className="px-6 py-4 select-none">Student Email</th>
                  <th className="px-6 py-4 select-none">Assignment Title</th>
                  <th 
                    onClick={() => handleSort('score')}
                    className="px-6 py-4 text-center cursor-pointer hover:text-slate-200 transition-colors select-none group"
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      Score
                      <span className="text-[9px] text-slate-550 group-hover:text-slate-350 transition-colors">
                        {sortBy === 'score' ? (sortOrder === 'asc' ? '▲' : '▼') : '↕'}
                      </span>
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('date')}
                    className="px-6 py-4 text-right cursor-pointer hover:text-slate-200 transition-colors select-none group"
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      Submitted At
                      <span className="text-[9px] text-slate-550 group-hover:text-slate-350 transition-colors">
                        {sortBy === 'date' ? (sortOrder === 'asc' ? '▲' : '▼') : '↕'}
                      </span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850 text-xs">
                {sortedSubmissions.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                      No submissions found matching criteria.
                    </td>
                  </tr>
                ) : (
                  sortedSubmissions.map((sub) => (
                    <tr
                      key={sub.id}
                      onClick={() => setSelectedSubmission(sub)}
                      className="hover:bg-slate-900/60 active:bg-slate-900 transition-colors duration-150 cursor-pointer"
                    >
                      <td className="px-6 py-4 font-mono font-medium text-slate-200">
                        {getStudentEmail(sub)}
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-300">
                        {getAssignmentTitle(sub)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center">
                          <span
                            className={`flex items-center gap-2 px-2.5 py-0.5 rounded-full border text-[11px] font-bold ${getScoreColor(
                              sub.score
                            )}`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full shadow-sm ${getScoreIndicator(
                                sub.score
                              )}`}
                            />
                            {sub.score}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-slate-500">
                        {formatDate(sub.created_at)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Stateful Modal Side Drawer/Overlay */}
      {selectedSubmission && (
        <div 
          onClick={() => setSelectedSubmission(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-[fade-in_0.2s_ease-out] cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-900 border border-slate-800 shadow-2xl rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden relative cursor-default"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-slate-850/60 border-b border-slate-800 shrink-0">
              <div>
                <span className="text-[10px] font-extrabold text-violet-400 uppercase tracking-widest block">
                  Submission Detail Viewer
                </span>
                <h3 className="text-base font-bold text-slate-100 mt-0.5">
                  {getAssignmentTitle(selectedSubmission)}
                </h3>
                <p className="text-xs text-slate-450 mt-0.5 font-mono">
                  Student: {getStudentEmail(selectedSubmission)} &bull; Submitted: {formatDate(selectedSubmission.created_at)}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span
                  className={`flex items-center gap-2 px-3 py-1 rounded-full border text-[12px] font-extrabold ${getScoreColor(
                    selectedSubmission.score
                  )}`}
                >
                  <span className={`h-2 w-2 rounded-full ${getScoreIndicator(selectedSubmission.score)}`} />
                  Score: {selectedSubmission.score}/100
                </span>

                <button
                  onClick={() => setSelectedSubmission(null)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-slate-200 border border-slate-700/30 transition-all cursor-pointer"
                  title="Close viewer"
                >
                  <svg
                    className="h-5 w-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden="true"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Body: Relational Splitscreen Panel */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col lg:flex-row gap-6">
              
              {/* Left Column: Monaco Code Viewer (Read Only) */}
              <div className="flex-1 flex flex-col min-h-[300px] lg:min-h-0">
                <div className="flex items-center justify-between px-4 py-2 bg-slate-950 border-t border-x border-slate-800 rounded-t-xl shrink-0">
                  <span className="text-xs font-mono font-semibold text-slate-400">
                    student_solution.py
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    Read-Only Mode
                  </span>
                </div>
                <div className="flex-1 border border-slate-800 bg-slate-950 rounded-b-xl overflow-hidden min-h-[350px]">
                  <Editor
                    height="100%"
                    defaultLanguage="python"
                    theme="vs-dark"
                    value={selectedSubmission.code_submitted}
                    options={{
                      readOnly: true,
                      minimap: { enabled: false },
                      fontSize: 13,
                      lineNumbers: 'on',
                      scrollBeyondLastLine: false,
                      automaticLayout: true,
                      padding: { top: 12, bottom: 12 },
                    }}
                  />
                </div>
              </div>

              {/* Right Column: AI Auto-Grader Review */}
              <div className="w-full lg:w-5/12 flex flex-col shrink-0 overflow-y-auto max-h-[60vh] lg:max-h-none scrollbar-thin">
                <div className="flex items-center gap-2 mb-3">
                  <span className="h-2 w-2 rounded-full bg-violet-500 animate-pulse" />
                  <h4 className="text-xs font-extrabold text-violet-400 uppercase tracking-widest">
                    AI Auto-Grader Feedback (Thai)
                  </h4>
                </div>

                <div className="backdrop-blur-md bg-violet-950/10 border border-violet-500/15 shadow-xl rounded-2xl p-5 overflow-y-auto">
                  <div
                    className="markdown-content text-slate-300 leading-relaxed text-sm space-y-4"
                    dangerouslySetInnerHTML={{
                      __html: renderMarkdown(getAiFeedbackText(selectedSubmission)),
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
