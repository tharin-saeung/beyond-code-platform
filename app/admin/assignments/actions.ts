'use server'

import { createClient } from '../../../utils/supabase/server'
import { revalidatePath } from 'next/cache'

interface CreateAssignmentData {
  title: string
  description: string
  starter_code: string
  expected_output_desc: string
}

// Next.js Server Action to insert a new assignment challenge
export async function createAssignment(formData: CreateAssignmentData) {
  const supabase = await createClient()

  // 1. Authenticate user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    throw new Error('Unauthorized. User session not found.')
  }

  // 2. Authorize role is INSTRUCTOR
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profileError || !profile || profile.role !== 'INSTRUCTOR') {
    throw new Error('Unauthorized. Only instructors can manage assignments.')
  }

  // 3. Validate form parameters
  if (!formData.title.trim() || !formData.description.trim() || !formData.starter_code.trim() || !formData.expected_output_desc.trim()) {
    throw new Error('All fields are required and cannot be empty.')
  }

  // 4. Perform database insert
  const { data, error } = await supabase
    .from('assignments')
    .insert({
      title: formData.title.trim(),
      description: formData.description.trim(),
      starter_code: formData.starter_code.trim(),
      expected_output_desc: formData.expected_output_desc.trim(),
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Database error: ${error.message}`)
  }

  // 5. Revalidate target pages cache
  revalidatePath('/admin/assignments')
  revalidatePath('/dashboard')

  return data
}

// Next.js Server Action to delete an assignment challenge row (triggers database cascade)
export async function deleteAssignment(id: string) {
  const supabase = await createClient()

  // 1. Authenticate user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    throw new Error('Unauthorized. User session not found.')
  }

  // 2. Authorize role is INSTRUCTOR
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profileError || !profile || profile.role !== 'INSTRUCTOR') {
    throw new Error('Unauthorized. Only instructors can delete assignments.')
  }

  // 3. Perform database delete
  const { error } = await supabase
    .from('assignments')
    .delete()
    .eq('id', id)

  if (error) {
    throw new Error(`Database error: ${error.message}`)
  }

  // 4. Revalidate target pages cache
  revalidatePath('/admin/assignments')
  revalidatePath('/dashboard')
}

// Next.js Server Action to update an existing assignment challenge row
export async function updateAssignment(
  id: string,
  title: string,
  description: string,
  starterCode: string,
  expectedOutputDesc: string
) {
  const supabase = await createClient()

  // 1. Authenticate user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    throw new Error('Unauthorized. User session not found.')
  }

  // 2. Authorize role is INSTRUCTOR
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profileError || !profile || profile.role !== 'INSTRUCTOR') {
    throw new Error('Unauthorized. Only instructors can manage assignments.')
  }

  // 3. Validate input parameters
  if (!id.trim() || !title.trim() || !description.trim() || !starterCode.trim() || !expectedOutputDesc.trim()) {
    throw new Error('All fields are required and cannot be empty.')
  }

  // 4. Perform database update
  const { data, error } = await supabase
    .from('assignments')
    .update({
      title: title.trim(),
      description: description.trim(),
      starter_code: starterCode.trim(),
      expected_output_desc: expectedOutputDesc.trim(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(`Database error: ${error.message}`)
  }

  // 5. Revalidate cache on target routes
  revalidatePath('/admin/assignments')
  revalidatePath('/dashboard')
  revalidatePath(`/assignments/${id}`)

  return data
}

