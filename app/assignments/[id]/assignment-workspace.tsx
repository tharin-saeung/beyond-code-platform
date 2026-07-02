'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Editor from '@monaco-editor/react'
import { createClient } from '../../../utils/supabase/client'

interface Assignment {
  id: string
  title: string
  description: string
  starter_code: string
  created_at: string
}

interface AssignmentWorkspaceProps {
  assignment: Assignment
}

// Simple helper to parse basic markdown elements to HTML styled for dark mode
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


export default function AssignmentWorkspace({
  assignment,
}: AssignmentWorkspaceProps) {
  const [code, setCode] = useState(assignment.starter_code || '')
  const [terminalStatus, setTerminalStatus] = useState<
    'IDLE' | 'EXECUTING' | 'PASSED' | 'FAILED'
  >('IDLE')
  const [terminalLogs, setTerminalLogs] = useState(
    'Terminal is idle. Write your code and click Submit Code to run verification tests.'
  )
  const [timeComplexity, setTimeComplexity] = useState('-')
  const [spaceComplexity, setSpaceComplexity] = useState('-')

  // UI state for resizable panels
  const [leftWidth, setLeftWidth] = useState(33.33)
  const [terminalHeight, setTerminalHeight] = useState(280)
  const [leftTab, setLeftTab] = useState<'instruction' | 'feedback'>('instruction')
  const [aiFeedback, setAiFeedback] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState(true)

  useEffect(() => {
    setIsMobile(window.innerWidth < 768)
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    const hydrateWorkspace = async () => {
      try {
        const supabase = createClient()
        // Query the single latest submission for this assignment
        const { data: latestSubmission } = await supabase
          .from('submissions')
          .select('*')
          .eq('assignment_id', assignment.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        // 1. Monaco Editor Code Hydration Priority
        const localDraft = localStorage.getItem(`bca_draft_${assignment.id}`)
        if (localDraft) {
          setCode(localDraft)
        } else if (latestSubmission) {
          setCode(latestSubmission.code_submitted || '')
        }

        // 2. Terminal & Evaluation States Hydration
        if (latestSubmission && latestSubmission.feedback) {
          try {
            const parsedFeedback = JSON.parse(latestSubmission.feedback)
            setTerminalStatus(parsedFeedback.passed ? 'PASSED' : 'FAILED')
            setTimeComplexity(parsedFeedback.time_complexity || 'N/A')
            setSpaceComplexity(parsedFeedback.space_complexity || 'N/A')
            setAiFeedback(parsedFeedback.feedback || null)

            const formattedLogs = `$ python3 solution.py --verify\nRunning validation pipeline via Gemini AI...\n${parsedFeedback.simulated_output || ''}\nScore: ${parsedFeedback.score || 0}/100 - ${parsedFeedback.passed ? 'PASSED' : 'FAILED'}`
            setTerminalLogs(formattedLogs)
          } catch (jsonErr) {
            console.error('Failed to parse database feedback payload:', jsonErr)
          }
        }
      } catch (dbErr) {
        console.error('Failed to hydrate workspace states:', dbErr)
      }
    }

    hydrateWorkspace()
  }, [assignment.id, assignment.starter_code])

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }).format(date)
    } catch {
      return dateString
    }
  }

  const handleVerticalMouseDown = (e: React.PointerEvent) => {
    e.preventDefault()
    const startWidth = leftWidth
    const startX = e.clientX

    const onPointerMove = (moveEvent: PointerEvent) => {
      const deltaX = moveEvent.clientX - startX
      const newWidthPercentage = startWidth + (deltaX / window.innerWidth) * 100
      if (newWidthPercentage >= 20 && newWidthPercentage <= 60) {
        setLeftWidth(newWidthPercentage)
      }
    }

    const onPointerUp = () => {
      document.removeEventListener('pointermove', onPointerMove)
      document.removeEventListener('pointerup', onPointerUp)
    }

    document.addEventListener('pointermove', onPointerMove)
    document.addEventListener('pointerup', onPointerUp)
  }

  const handleHorizontalMouseDown = (e: React.PointerEvent) => {
    e.preventDefault()
    const startHeight = terminalHeight
    const startY = e.clientY

    const onPointerMove = (moveEvent: PointerEvent) => {
      const deltaY = moveEvent.clientY - startY
      const newHeight = startHeight - deltaY
      if (newHeight >= 120 && newHeight <= 550) {
        setTerminalHeight(newHeight)
      }
    }

    const onPointerUp = () => {
      document.removeEventListener('pointermove', onPointerMove)
      document.removeEventListener('pointerup', onPointerUp)
    }

    document.addEventListener('pointermove', onPointerMove)
    document.addEventListener('pointerup', onPointerUp)
  }

  const handleSubmit = async () => {
    if (terminalStatus === 'EXECUTING') return

    setTerminalStatus('EXECUTING')
    setTerminalLogs('$ python3 solution.py --verify\nRunning validation pipeline via Gemini AI...')
    setTimeComplexity('-')
    setSpaceComplexity('-')

    try {
      const response = await fetch('/api/grade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          assignmentId: assignment.id,
          codeSubmitted: code,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP error! Status: ${response.status}`)
      }

      const result = await response.json()

      setTerminalStatus(result.passed ? 'PASSED' : 'FAILED')
      setAiFeedback(result.feedback)
      setLeftTab('feedback') // Auto-focus the review feedback tab

      const formattedLogs = `$ python3 solution.py --verify\nRunning validation pipeline via Gemini AI...\n${result.simulated_output}\nScore: ${result.score}/100 - ${result.passed ? 'PASSED' : 'FAILED'}`
      
      setTerminalLogs(formattedLogs)
      setTimeComplexity(result.time_complexity || 'N/A')
      setSpaceComplexity(result.space_complexity || 'N/A')

      // Clear local storage draft cache upon successful execution and submit
      localStorage.removeItem(`bca_draft_${assignment.id}`)
    } catch (err: any) {
      setTerminalStatus('FAILED')
      setTerminalLogs(
        `$ python3 solution.py --verify\nRunning validation pipeline via Gemini AI...\n\n[Execution Failure Error]\n--------------------------------------------------\nError: ${err?.message || 'Failed to submit solution.'}`
      )
      setTimeComplexity('Error')
      setSpaceComplexity('Error')
    }
  }

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-100 overflow-hidden relative select-none">
      {/* Background radial glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-violet-600/5 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-cyan-600/5 blur-[130px] pointer-events-none" />

      {/* Decorative Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none opacity-20" />

      {/* Workspace Header */}
      <header className="flex items-center justify-between px-6 py-4 bg-slate-900/80 border-b border-slate-800/80 backdrop-blur-md z-10 shrink-0">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center justify-center p-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700/30 transition-all active:scale-95 cursor-pointer"
            title="Go to dashboard"
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
          </Link>
          <div>
            <span className="text-[10px] font-extrabold text-violet-400 uppercase tracking-widest block">
              Assignment Workspace
            </span>
            <h2 className="text-sm font-bold text-slate-200 md:text-base">
              {assignment.title}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/60 border border-slate-800/80 text-[11px] text-slate-400">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Active Session
          </div>
        </div>
      </header>

      {/* Split-screen panels */}
      <div className="flex flex-col md:flex-row flex-1 overflow-y-auto md:overflow-hidden relative z-10">
        
        {/* Left Panel: Assignment Details / Info Tabbed Container */}
        <aside 
          className="w-full md:h-full bg-slate-900/20 border-b md:border-b-0 border-slate-800/80 flex flex-col overflow-y-auto p-6 scrollbar-thin shrink-0"
          style={{ width: isMobile ? '100%' : `${leftWidth}%` }}
        >
          {/* Tab Selector */}
          <div className="flex border-b border-slate-800/80 mb-6 shrink-0">
            <button
              onClick={() => setLeftTab('instruction')}
              className={`flex-1 pb-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 cursor-pointer ${
                leftTab === 'instruction'
                  ? 'border-violet-500 text-violet-400'
                  : 'border-transparent text-slate-450 hover:text-slate-200'
              }`}
            >
              Instructions
            </button>
            <button
              onClick={() => setLeftTab('feedback')}
              className={`flex-1 pb-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 cursor-pointer relative ${
                leftTab === 'feedback'
                  ? 'border-violet-500 text-violet-400'
                  : 'border-transparent text-slate-450 hover:text-slate-200'
              }`}
            >
              AI Review
              {aiFeedback && leftTab !== 'feedback' && (
                <span className="absolute top-0.5 right-4 h-2.5 w-2.5 rounded-full bg-violet-400 animate-pulse" />
              )}
            </button>
          </div>

          {/* Tab Contents */}
          {leftTab === 'instruction' ? (
            <div className="flex-1 animate-[fade-in_0.2s_ease-out]">
              <div className="mb-4 flex items-center justify-between gap-4">
                <span className="px-2.5 py-1 text-[10px] font-bold text-violet-300 bg-violet-500/10 border border-violet-500/20 rounded-md uppercase tracking-wider">
                  Instruction
                </span>
                <span className="text-xs text-slate-500 font-mono">
                  Released: {formatDate(assignment.created_at)}
                </span>
              </div>

              <h1 className="text-xl font-extrabold text-slate-100 tracking-tight mb-4">
                {assignment.title}
              </h1>

              <div className="border-t border-slate-800/80 my-4" />

              {/* Description Markdown ready container */}
              <div
                className="markdown-content text-slate-350 leading-relaxed text-sm space-y-4"
                dangerouslySetInnerHTML={{
                  __html: renderMarkdown(assignment.description),
                }}
              />
            </div>
          ) : (
            <div className="flex-1 animate-[fade-in_0.2s_ease-out]">
              {aiFeedback ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="h-2 w-2 rounded-full bg-violet-450 animate-pulse" />
                    <h3 className="text-xs font-extrabold text-violet-400 uppercase tracking-widest">
                      AI Review analysis
                    </h3>
                  </div>

                  <div className="backdrop-blur-md bg-violet-950/10 border border-violet-500/15 shadow-xl rounded-2xl p-5">
                    {/* Feedback content rendered safely using Markdown rules */}
                    <div
                      className="markdown-content text-slate-300 leading-relaxed text-sm space-y-4"
                      dangerouslySetInnerHTML={{
                        __html: renderMarkdown(aiFeedback),
                      }}
                    />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-center h-48 border border-dashed border-slate-800/80 rounded-2xl p-6">
                  <svg
                    className="h-8 w-8 text-slate-600 mb-3"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden="true"
                  >
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                  <p className="text-xs text-slate-450 font-medium">
                    No review feedback available yet.
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1 max-w-[200px]">
                    Submit your Python solution code to trigger the AI engineering feedback.
                  </p>
                </div>
              )}
            </div>
          )}
        </aside>

        {/* Vertical Resizable Gutter Bar */}
        <div
          onPointerDown={handleVerticalMouseDown}
          className="hidden md:block w-1 hover:w-1.5 bg-slate-900 hover:bg-violet-500/60 border-x border-slate-850 hover:border-violet-500/40 cursor-col-resize transition-all duration-150 z-20 shrink-0 self-stretch"
          title="Drag to resize horizontal panels"
        />

        {/* Right Panel: Monaco Editor & Terminal */}
        <main 
          className="w-full md:h-full flex flex-col overflow-hidden bg-slate-950/40"
          style={{ width: isMobile ? '100%' : `${100 - leftWidth}%` }}
        >
          {/* Top Panel (Monaco Editor) */}
          <div className="flex-1 min-h-[350px] md:h-0 w-full flex flex-col relative">
            {/* Editor Header Controls */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900/40 border-b border-slate-800/80 shrink-0">
              <div className="flex items-center gap-2">
                <svg
                  className="h-4.5 w-4.5 text-amber-555/90"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
                <span className="text-xs font-mono font-semibold text-slate-300">
                  solution.py
                </span>
              </div>

              {/* Submit Button */}
              <button
                onClick={handleSubmit}
                disabled={terminalStatus === 'EXECUTING'}
                className="flex items-center gap-2 px-4 py-1.5 text-xs font-bold text-white rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 shadow-md shadow-indigo-500/10 hover:shadow-indigo-500/20 active:scale-[0.97] transition-all cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
              >
                {terminalStatus === 'EXECUTING' ? (
                  <>
                    <svg
                      className="h-3.5 w-3.5 animate-spin text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Running verification...
                  </>
                ) : (
                  <>
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
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                    Submit Code
                  </>
                )}
              </button>
            </div>

            {/* Editor Canvas */}
            <div className="flex-1 w-full bg-slate-950">
              <Editor
                height="100%"
                defaultLanguage="python"
                theme="vs-dark"
                value={code}
                onChange={(val) => {
                  const newVal = val || ''
                  setCode(newVal)
                  localStorage.setItem(`bca_draft_${assignment.id}`, newVal)
                }}
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  lineNumbers: 'on',
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  padding: { top: 12, bottom: 12 },
                }}
              />
            </div>
          </div>

          {/* Horizontal Resizable Gutter Bar */}
          <div
            onPointerDown={handleHorizontalMouseDown}
            className="hidden md:block h-1 hover:h-1.5 bg-slate-900 hover:bg-violet-500/60 border-y border-slate-850 hover:border-violet-500/40 cursor-row-resize transition-all duration-150 z-20 shrink-0"
            title="Drag to resize vertical panels"
          />

          {/* Bottom Panel (Simulated Console / Terminal) */}
          <div 
            className="w-full shrink-0 flex flex-col bg-slate-950 border-t border-slate-800/80 z-10"
            style={{ height: isMobile ? '280px' : `${terminalHeight}px` }}
          >
            {/* Terminal Header */}
            <div className="flex items-center justify-between px-4 py-2 bg-slate-900/60 border-b border-slate-850 shrink-0">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-slate-600" />
                <span className="text-xs font-mono font-semibold text-slate-400">
                  Runtime Terminal
                </span>
              </div>

              {/* Status and Complexity Outputs */}
              <div className="flex items-center gap-3">
                {/* Status Badge */}
                {terminalStatus === 'PASSED' && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 animate-[slide-in_0.2s_ease-out]">
                    PASSED
                  </span>
                )}
                {terminalStatus === 'FAILED' && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-rose-500/10 border border-rose-500/20 text-rose-400 animate-[slide-in_0.2s_ease-out]">
                    FAILED
                  </span>
                )}
                {terminalStatus === 'EXECUTING' && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-amber-500/10 border border-amber-500/20 text-amber-400 animate-pulse">
                    RUNNING
                  </span>
                )}
                {terminalStatus === 'IDLE' && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-slate-850 border border-slate-800 text-slate-450">
                    IDLE
                  </span>
                )}

                {/* Complexity Metric Badges */}
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400 bg-slate-900 border border-slate-850 px-2 py-0.5 rounded-md">
                  <span>
                    Time:{' '}
                    <strong className="text-slate-200">{timeComplexity}</strong>
                  </span>
                  <span className="text-slate-700">|</span>
                  <span>
                    Space:{' '}
                    <strong className="text-slate-200 font-bold">
                      {spaceComplexity}
                    </strong>
                  </span>
                </div>
              </div>
            </div>

            {/* Terminal Outputs Console */}
            <div className="flex-1 overflow-y-auto p-4 font-mono text-[11px] leading-relaxed text-slate-350 bg-slate-950 scrollbar-thin select-text">
              {terminalLogs.split('\n').map((line, idx) => {
                let colorClass = 'text-slate-455'
                if (line.startsWith('$')) {
                  colorClass = 'text-violet-400 font-bold'
                } else if (line.startsWith('Test Case') && line.includes('PASSED')) {
                  colorClass = 'text-emerald-400/90'
                } else if (line.startsWith('Success:')) {
                  colorClass = 'text-emerald-300 font-bold border-t border-slate-850 pt-2 mt-2'
                } else if (line.startsWith('Verification Results:')) {
                  colorClass = 'text-slate-200 font-semibold'
                } else if (line.includes('Running')) {
                  colorClass = 'text-cyan-400/90'
                } else if (line.startsWith('----') || line.startsWith('[Score') || line.startsWith('[Auto-Grader')) {
                  colorClass = 'text-slate-500 font-semibold'
                }
                return (
                  <pre key={idx} className={`${colorClass} whitespace-pre-wrap`}>
                    {line}
                  </pre>
                )
              })}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
