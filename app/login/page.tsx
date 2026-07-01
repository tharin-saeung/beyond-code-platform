import LoginForm from './login-form'

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
