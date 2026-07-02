import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '../../../utils/supabase/server'
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai'

export async function POST(req: NextRequest) {
  try {
    // 1. Initialize Supabase and check authentication
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in to submit assignments.' },
        { status: 401 }
      )
    }

    // 2. Parse request payload
    const body = await req.json()
    const { assignmentId, codeSubmitted } = body

    if (!assignmentId || !codeSubmitted) {
      return NextResponse.json(
        { error: 'Missing required parameters: assignmentId or codeSubmitted' },
        { status: 400 }
      )
    }

    // 3. Fetch assignment details from database
    const { data: assignment, error: dbError } = await supabase
      .from('assignments')
      .select('title, expected_output_desc')
      .eq('id', assignmentId)
      .single()

    if (dbError || !assignment) {
      return NextResponse.json(
        { error: 'Assignment not found' },
        { status: 404 }
      )
    }

    // 4. Initialize Gemini AI SDK
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Gemini API Key is not configured on the server.' },
        { status: 500 }
      )
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({
      model: 'gemini-3.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            score: {
              type: SchemaType.INTEGER,
              description: 'Score from 0 to 100 based on correctness and runtime complexity.',
            },
            passed: {
              type: SchemaType.BOOLEAN,
              description: 'True if the code satisfies all rules and edge cases in expected_output_desc, false otherwise.',
            },
            time_complexity: {
              type: SchemaType.STRING,
              description: 'Time complexity representation, e.g. O(1), O(n), O(log n).',
            },
            space_complexity: {
              type: SchemaType.STRING,
              description: 'Space complexity representation, e.g. O(1), O(n).',
            },
            simulated_output: {
              type: SchemaType.STRING,
              description: 'Simulated terminal console logs, displaying stdout, print results, or stderr backtraces if it fails.',
            },
            feedback: {
              type: SchemaType.STRING,
              description: 'Detailed engineering review and improvement tips written in Thai using Markdown format.',
            },
          },

          required: [
            'score',
            'passed',
            'time_complexity',
            'space_complexity',
            'simulated_output',
            'feedback',
          ],
        },
      },
      systemInstruction: `You are an advanced Python Compiler, Code Analyzer, and Auto-Grader.
Your task is to analyze a student's Python code submission for a specific coding assignment.

Compare the student's code to the expected behavior and rules outlined in the expected output description.
Evaluate edge cases, syntax, and execution correctness. Determine Time and Space complexity.
Simulate what running the Python script in a terminal would output.
Provide detailed engineering feedback and suggestions for improvement.

CRITICAL INSTRUCTIONS:
- The 'feedback' field MUST be written in THAI.
- Use Markdown format inside the 'feedback' field.
- Your final output must strictly follow the requested JSON schema structure.
- NEVER reveal or write out the full working code solution to the student under any circumstances. Do not provide code snippets that implement the solution from start to finish. Instead, focus entirely on guided learning: point out conceptual logical bugs, explain compiler syntax restrictions, or provide tiny 1-3 line abstract templates/pseudo-code hints to push the student to write the solution themselves.`,

    })

    const prompt = `
Assignment Title: ${assignment.title}
Expected Output / Requirements:
${assignment.expected_output_desc}

Student Submitted Code:
\`\`\`python
${codeSubmitted}
\`\`\`
`

    // Generate Structured Grading Output
    const result = await model.generateContent(prompt)
    const responseText = result.response.text()

    let cleanText = responseText.trim()
    if (cleanText.startsWith('```')) {
      cleanText = cleanText
        .replace(/^```json\s*/i, '')
        .replace(/```$/, '')
        .trim()
    }

    const gradingResult = JSON.parse(cleanText)

    // Validate structured output content
    if (
      typeof gradingResult.score !== 'number' ||
      typeof gradingResult.passed !== 'boolean' ||
      typeof gradingResult.time_complexity !== 'string' ||
      typeof gradingResult.space_complexity !== 'string' ||
      typeof gradingResult.simulated_output !== 'string' ||
      typeof gradingResult.feedback !== 'string'
    ) {
      throw new Error('Gemini response did not conform to the expected schema types')
    }

    // 5. Store submission inside Supabase 'submissions' table
    const { error: insertError } = await supabase
      .from('submissions')
      .insert({
        student_id: user.id,
        assignment_id: assignmentId,
        code_submitted: codeSubmitted,
        score: gradingResult.score,
        feedback: JSON.stringify(gradingResult), // Saving full JSON grading response
      })

    if (insertError) {
      console.error('Failed to save submission metadata:', insertError.message)
      // We continue and return results to client anyway so they don't lose grading feedback
    }

    // 6. Return evaluation to the frontend client workspace
    return NextResponse.json(gradingResult)
  } catch (error: any) {
    console.error('Error during auto-grading:', error)
    return NextResponse.json(
      { error: error?.message || 'Internal Server Error during auto-grading' },
      { status: 500 }
    )
  }
}
