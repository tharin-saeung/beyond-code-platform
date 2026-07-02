import type { Metadata } from 'next'
import RegisterForm from './register-form'

export const metadata: Metadata = {
  title: 'Create Account',
}

interface PageProps {
  searchParams: Promise<{
    error?: string
    message?: string
  }>
}

export default async function RegisterPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams
  return (
    <RegisterForm
      error={resolvedSearchParams.error}
      message={resolvedSearchParams.message}
    />
  )
}
