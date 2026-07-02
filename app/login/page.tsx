import type { Metadata } from 'next'
import LoginForm from './login-form'

export const metadata: Metadata = {
  title: 'Sign In',
}

interface PageProps {
  searchParams: Promise<{
    error?: string
    message?: string
  }>
}

export default async function LoginPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams
  return (
    <LoginForm
      error={resolvedSearchParams.error}
      message={resolvedSearchParams.message}
    />
  )
}
