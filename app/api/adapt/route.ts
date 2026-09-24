export const dynamic = 'force-dynamic'
import { auth } from '@/auth'

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  const { title, body, platforms } = await request.json()
  if (!title || !body || !platforms?.length) {
    return new Response(JSON.stringify({ error: 'Title, body and platforms required' }), { status: 400 })
  }

  const systemPrompt = `You are a content adaptation assistant. You take a blog post and create platform-specific versions.
You MUST respond with valid JSON only (no markdown fences). The JSON must have exactly the keys requested.
For each platform, adapt the tone, length, and format appropriately:
- medium: Full article in clean markdown. Keep the depth and detail.
- linkedin: Professional tone, ~1000-1300 chars, formatted with line breaks. No markdown headers.
- instagram: Short engaging caption under 2200 chars with relevant hashtags at the end.
- devto: Developer-focused article in markdown with frontmatter-style tags suggestion at the end.
- wordpress: Full blog post in clean HTML (use <h2>, <p>, <ul> etc). No <html>/<body> wrapper.

Respond with raw JSON only. Do not include code blocks, markdown, or any other formatting.`

  const userPrompt = `Adapt this content for these platforms: ${platforms.join(', ')}

Title: ${title}

Body:
${body}

Respond with a JSON object where each key is a platform name and the value is the adapted content string. Example:
{
  "medium": "# Title\\n\\nContent...",
  "linkedin": "Content...",
  "instagram": "Caption... #hashtags"
}`

  // Portable, provider-agnostic LLM config. Works with any OpenAI-compatible API
  // (OpenAI, Azure OpenAI, OpenRouter, Together, Groq, a local Ollama/LM Studio server, Abacus, etc.).
  // Set these in your .env when self-hosting. Defaults keep the app working on Abacus.
  const LLM_BASE_URL = (process.env.LLM_BASE_URL || 'https://apps.abacus.ai/v1').replace(/\/$/, '')
  const LLM_API_KEY = process.env.LLM_API_KEY || process.env.ABACUSAI_API_KEY
  const LLM_MODEL = process.env.LLM_MODEL || 'gpt-5.4-mini'

  try {
    const response = await fetch(`${LLM_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${LLM_API_KEY}`,
      },
      body: JSON.stringify({
        model: LLM_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        stream: true,
        max_tokens: 4000,
        response_format: { type: 'json_object' },
      }),
    })

    if (!response.ok) {
      const errText = await response.text().catch(() => 'LLM API error')
      return new Response(JSON.stringify({ error: `LLM API error: ${errText}` }), { status: 502 })
    }

    const reader = response.body?.getReader()
    const decoder = new TextDecoder()
    const encoder = new TextEncoder()

    let buffer = ''
    let partialRead = ''

    const stream = new ReadableStream({
      async start(controller) {
        try {
          while (true) {
            const { done, value } = await reader!.read()
            if (done) break
            partialRead += decoder.decode(value, { stream: true })
            const lines = partialRead.split('\n')
            partialRead = lines.pop() ?? ''
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6)
                if (data === '[DONE]') {
                  try {
                    const finalResult = JSON.parse(buffer)
                    const finalData = JSON.stringify({ status: 'completed', result: finalResult })
                    controller.enqueue(encoder.encode(`data: ${finalData}\n\n`))
                  } catch {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ status: 'error', message: 'Failed to parse LLM response' })}\n\n`))
                  }
                  return
                }
                try {
                  const parsed = JSON.parse(data)
                  buffer += parsed?.choices?.[0]?.delta?.content ?? ''
                  const progressData = JSON.stringify({ status: 'processing', message: 'Adapting content...' })
                  controller.enqueue(encoder.encode(`data: ${progressData}\n\n`))
                } catch {
                  // skip invalid JSON
                }
              }
            }
          }
          // If we exit loop without [DONE], try parsing buffer
          if (buffer) {
            try {
              const finalResult = JSON.parse(buffer)
              const finalData = JSON.stringify({ status: 'completed', result: finalResult })
              controller.enqueue(encoder.encode(`data: ${finalData}\n\n`))
            } catch {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ status: 'error', message: 'Failed to parse LLM response' })}\n\n`))
            }
          }
        } catch (error: any) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ status: 'error', message: error?.message ?? 'Stream error' })}\n\n`))
        } finally {
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error?.message ?? 'Adaptation failed' }), { status: 500 })
  }
}
