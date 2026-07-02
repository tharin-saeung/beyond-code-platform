'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createAssignment, deleteAssignment, updateAssignment } from './actions'

interface Assignment {
  id: string
  title: string
  description: string
  starter_code: string
  expected_output_desc: string
  created_at: string
}

interface AssignmentManagerProps {
  initialAssignments: Assignment[]
}

// Strip markdown for card snippet previews
function getSnippet(markdownText: string) {
  if (!markdownText) return ''
  const clean = markdownText
    .replace(/[#*`_\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return clean.length > 90 ? clean.substring(0, 87) + '...' : clean
}

// Reusable Markdown parser supporting math dollar signs ($ token)
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
    const colorClass = isPython ? 'text-violet-300' : 'text-slate-355'
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

export default function AssignmentManager({
  initialAssignments,
}: AssignmentManagerProps) {
  const [assignments, setAssignments] = useState<Assignment[]>(initialAssignments)
  
  // Form and edit states
  const [editingId, setEditingId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [starterCode, setStarterCode] = useState('')
  const [expectedOutput, setExpectedOutput] = useState('')
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState<string | null>(null)

  // Deletion tracking state
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const handleEditClick = (assignment: Assignment) => {
    setEditingId(assignment.id)
    setTitle(assignment.title)
    setDescription(assignment.description)
    setStarterCode(assignment.starter_code)
    setExpectedOutput(assignment.expected_output_desc)

    // Clear form error/success logs
    setFormError(null)
    setFormSuccess(null)

    // Smoothly scroll and focus on the title input
    const inputElement = document.getElementById('title')
    if (inputElement) {
      inputElement.focus()
      inputElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setTitle('')
    setDescription('')
    setStarterCode('')
    setExpectedOutput('')
    setFormError(null)
    setFormSuccess(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmitting) return

    setFormError(null)
    setFormSuccess(null)
    setIsSubmitting(true)

    try {
      if (editingId) {
        // UPDATE MODE
        const updatedAssignment = await updateAssignment(
          editingId,
          title,
          description,
          starterCode,
          expectedOutput
        )

        // Update local list state
        setAssignments(
          assignments.map((a) => (a.id === editingId ? updatedAssignment : a))
        )
        setFormSuccess('Coding challenge updated successfully!')
        setEditingId(null)
      } else {
        // CREATE MODE
        const newAssignment = await createAssignment({
          title,
          description,
          starter_code: starterCode,
          expected_output_desc: expectedOutput,
        })

        // Add to local state list immediately
        setAssignments([newAssignment, ...assignments])
        setFormSuccess('Coding challenge released successfully!')
      }

      // Reset form fields
      setTitle('')
      setDescription('')
      setStarterCode('')
      setExpectedOutput('')

      // Auto clear success notice
      setTimeout(() => setFormSuccess(null), 3000)
    } catch (err: any) {
      setFormError(err?.message || 'Failed to submit challenge details')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      await deleteAssignment(id)
      setAssignments(assignments.filter((a) => a.id !== id))
      setConfirmDeleteId(null)
      
      // If we were editing the deleted challenge, cancel the edit mode
      if (editingId === id) {
        handleCancelEdit()
      }
    } catch (err: any) {
      alert(`Failed to delete challenge: ${err?.message || 'Unknown error'}`)
    } finally {
      setDeletingId(null)
    }
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
          <Link
            href="/admin"
            className="flex items-center justify-center p-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700/30 transition-all active:scale-95 cursor-pointer"
            title="Go to instructor dashboard"
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
            <h1 className="text-base font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-100 to-slate-300">
              Coding Challenge Bank
            </h1>
            <p className="text-[10px] text-slate-500 font-medium tracking-wide">
              Manage Assignments & Auto-Grading Constraints
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/50 border border-slate-800/80 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />
          Question Manager
        </div>
      </header>

      {/* Main Container splitscreen layout */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-6 py-8 overflow-y-auto flex flex-col lg:flex-row gap-8">
        
        {/* Left Column: release form */}
        <section className="w-full lg:w-5/12 shrink-0">
          <div className="backdrop-blur-md bg-slate-900/40 border border-slate-850 shadow-2xl rounded-2xl p-6 transition-all">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${editingId ? 'bg-amber-500' : 'bg-indigo-500'} animate-pulse`} />
                <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
                  {editingId ? 'Edit Challenge' : 'Release New Challenge'}
                </h2>
              </div>
              {editingId && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                >
                  Cancel Edit ✕
                </button>
              )}
            </div>

            {formError && (
              <div className="mb-5 flex items-start gap-3 rounded-lg border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-300 animate-[slide-in_0.2s_ease-out]">
                <svg className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <p className="leading-relaxed">{formError}</p>
              </div>
            )}

            {formSuccess && (
              <div className="mb-5 flex items-start gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-300 animate-[slide-in_0.2s_ease-out]">
                <svg className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <p className="leading-relaxed">{formSuccess}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Title field */}
              <div>
                <label htmlFor="title" className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Challenge Title
                </label>
                <input
                  id="title"
                  type="text"
                  required
                  placeholder="e.g. Find Medium of Two Sorted Arrays"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-800 text-slate-100 rounded-xl py-2.5 px-3.5 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500 transition-all text-xs placeholder-slate-650"
                />
              </div>

              {/* Description field */}
              <div>
                <label htmlFor="description" className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Task Description (Markdown Supported)
                </label>
                <textarea
                  id="description"
                  required
                  rows={6}
                  placeholder="Explain requirements, parameters, examples, and edge case parameters using standard Markdown..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-800 text-slate-100 rounded-xl py-2.5 px-3.5 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500 transition-all text-xs placeholder-slate-650 font-sans leading-relaxed scrollbar-thin resize-y"
                />
              </div>

              {/* Starter Code field */}
              <div>
                <label htmlFor="starter_code" className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Starter Code (Python)
                </label>
                <textarea
                  id="starter_code"
                  required
                  rows={5}
                  placeholder="def findMedianSortedArrays(nums1, nums2):&#10;    # Write your code here&#10;    pass"
                  value={starterCode}
                  onChange={(e) => setStarterCode(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-800 text-slate-100 rounded-xl py-2.5 px-3.5 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500 transition-all text-xs placeholder-slate-650 font-mono leading-relaxed scrollbar-thin resize-y"
                />
              </div>

              {/* Expected Output Desc field */}
              <div>
                <label htmlFor="expected_output_desc" className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Expected Output & AI Grading Rules
                </label>
                <textarea
                  id="expected_output_desc"
                  required
                  rows={4}
                  placeholder="Explain strict constraints (e.g. Time complexity must be O(log(min(m,n)))). This description will feed directly into the AI grading compiler."
                  value={expectedOutput}
                  onChange={(e) => setExpectedOutput(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-800 text-slate-100 rounded-xl py-2.5 px-3.5 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500 transition-all text-xs placeholder-slate-650 font-sans leading-relaxed scrollbar-thin resize-y"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 mt-2 text-xs font-bold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 rounded-xl shadow-lg shadow-indigo-500/10 hover:shadow-indigo-500/20 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <svg className="h-4.5 w-4.5 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    {editingId ? 'Saving changes...' : 'Releasing challenge...'}
                  </>
                ) : (
                  <>{editingId ? 'Save Changes 💾' : 'Rehearse & Release Challenge 🚀'}</>
                )}
              </button>
            </form>
          </div>
        </section>

        {/* Right Column: Question Bank list */}
        <section className="flex-1">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
            <span>Released Coding Challenges</span>
            <span className="bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-[10px] text-slate-450 font-mono">
              {assignments.length} total
            </span>
          </h3>

          {assignments.length === 0 ? (
            <div className="backdrop-blur-md bg-slate-900/10 border border-slate-900/80 rounded-2xl p-12 text-center my-6">
              <svg className="h-8 w-8 text-slate-700 mx-auto mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <p className="text-xs text-slate-500 font-medium">No challenges currently in the question bank.</p>
              <p className="text-[10px] text-slate-650 mt-1">Use the form on the left to release the first task.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {assignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className="backdrop-blur-md bg-slate-900/30 border border-slate-850 rounded-2xl p-5 hover:border-slate-800 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-4 mb-3">
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                        Python
                      </span>
                      <span className="text-[9px] text-slate-500 font-mono">
                        {new Date(assignment.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-slate-200 line-clamp-1 mb-1.5">
                      {assignment.title}
                    </h4>

                    <p className="text-xs text-slate-400 leading-relaxed line-clamp-3 mb-6">
                      {getSnippet(assignment.description) || 'No details provided.'}
                    </p>
                  </div>

                  <div className="border-t border-slate-850/60 pt-4 flex items-center justify-between gap-4">
                    <Link
                      href={`/assignments/${assignment.id}`}
                      className="text-[11px] font-bold text-violet-400 hover:text-violet-300 hover:underline transition-colors shrink-0"
                      target="_blank"
                    >
                      View Workspace &rarr;
                    </Link>

                    <div className="flex items-center gap-3">
                      {confirmDeleteId !== assignment.id && (
                        <button
                          onClick={() => handleEditClick(assignment)}
                          className="text-[10px] font-semibold text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                        >
                          Edit
                        </button>
                      )}

                      {confirmDeleteId === assignment.id ? (
                        <div className="flex items-center gap-2 animate-[slide-in_0.2s_ease-out]">
                          <button
                            onClick={() => handleDelete(assignment.id)}
                            disabled={deletingId === assignment.id}
                            className="px-2.5 py-1 text-[10px] font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-md transition-all cursor-pointer disabled:opacity-50"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-2.5 py-1 text-[10px] font-bold text-slate-400 hover:text-slate-200 bg-slate-800 rounded-md border border-slate-700/50 transition-all cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteId(assignment.id)}
                          className="px-2.5 py-1 text-[10px] font-semibold text-rose-450 hover:text-rose-300 bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/10 rounded-md transition-all cursor-pointer"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
