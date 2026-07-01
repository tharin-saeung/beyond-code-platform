import RegisterForm from './register-form'

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
