'use server'

import { createClient } from '../../utils/supabase/server'
import { redirect } from 'next/navigation'

// Authenticate user and create a session cookie
export async function login(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return redirect(`/login?error=${encodeURIComponent(error.message)}`)
  }

  return redirect('/')
}

// Register a new user and save their role metadata for the database trigger
export async function signup(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const role = formData.get('role') as string // 'STUDENT' or 'INSTRUCTOR'

  const supabase = await createClient()

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { role },
    },
  })

  if (error) {
    return redirect(`/register?error=${encodeURIComponent(error.message)}`)
  }

  return redirect('/login?message=Registration successful. Please sign in.')
}

// Log out the user and clear session cookies
export async function signout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  return redirect('/login')
}