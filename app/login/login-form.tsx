'use client'

import { useState } from 'react'
import Link from 'next/link'
import { login } from '../auth/actions'
import { useFormStatus } from 'react-dom'

interface LoginFormProps {
  error?: string
  message?: string
}

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className="relative flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition-all duration-200 hover:from-violet-500 hover:to-indigo-500 hover:shadow-indigo-500/30 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 cursor-pointer"
    >
      {pending ? (
        <span className="flex items-center justify-center gap-2">
          <svg
            className="h-4 w-4 animate-spin text-white"
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
          Signing in...
        </span>
      ) : (
        'Sign In'
      )}
    </button>
  )
}

export default function LoginForm({ error, message }: LoginFormProps) {
  const [showPassword, setShowPassword] = useState(false)

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-slate-950 px-4 py-12 text-slate-100 select-none">
      {/* Background radial glow */}
      <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-violet-600/10 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-cyan-600/10 blur-[130px] pointer-events-none" />

      {/* Decorative Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none opacity-40" />

      <div className="z-10 w-full max-w-md">
        {/* Logo / Header */}
        <div className="flex flex-col items-center mb-8 text-center animate-[fade-in_0.5s_ease-out]">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 p-2.5 shadow-xl shadow-indigo-500/20 ring-1 ring-white/10 mb-4 hover:scale-105 transition-transform duration-300">
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
          <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-100 via-slate-200 to-slate-400">
            Beyond Code
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Sign in to continue your developer journey
          </p>
        </div>

        {/* Card */}
        <div className="backdrop-blur-md bg-slate-900/60 border border-slate-800/80 shadow-2xl rounded-2xl p-8 transition-all duration-300 hover:border-slate-800 animate-[fade-in_0.6s_ease-out]">
          
          {/* Alerts */}
          {error && (
            <div className="mb-6 flex items-start gap-3 rounded-lg border border-rose-500/20 bg-rose-500/10 p-3.5 text-xs text-rose-300 animate-[slide-in_0.3s_ease-out]">
              <svg
                className="h-4 w-4 shrink-0 text-rose-400 mt-0.5"
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
                <p className="font-semibold text-rose-200 mb-0.5">Error</p>
                <p className="leading-relaxed">{error}</p>
              </div>
            </div>
          )}

          {message && (
            <div className="mb-6 flex items-start gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3.5 text-xs text-emerald-300 animate-[slide-in_0.3s_ease-out]">
              <svg
                className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              <div>
                <p className="font-semibold text-emerald-200 mb-0.5">Success</p>
                <p className="leading-relaxed">{message}</p>
              </div>
            </div>
          )}

          {/* Form */}
          <form action={login} className="space-y-5">
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Email Address
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-500">
                  <svg
                    className="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden="true"
                  >
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                </span>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  placeholder="name@example.com"
                  className="w-full bg-slate-950/80 border border-slate-800 text-slate-100 rounded-xl py-3 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500 transition-all duration-200 placeholder-slate-600 text-sm"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-500">
                  <svg
                    className="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden="true"
                  >
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </span>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  className="w-full bg-slate-950/80 border border-slate-800 text-slate-100 rounded-xl py-3 pl-11 pr-11 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500 transition-all duration-200 placeholder-slate-600 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-500 hover:text-slate-300 transition-colors focus:outline-none cursor-pointer"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      aria-hidden="true"
                    >
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      aria-hidden="true"
                    >
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <SubmitButton />
          </form>

          {/* Card Footer */}
          <div className="mt-8 text-center">
            <p className="text-sm text-slate-400">
              Don&apos;t have an account?{' '}
              <Link
                href="/register"
                className="text-violet-400 hover:text-violet-300 font-semibold transition-colors duration-200"
              >
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
