export async function publishToDevto(apiKey: string, title: string, content: string): Promise<{ url: string }> {
  const res = await fetch('https://dev.to/api/articles', {
    method: 'POST',
    headers: { 'api-key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      article: {
        title,
        body_markdown: content,
        published: false,
      },
    }),
  })
  if (!res.ok) {
    const err = await res.text().catch(() => 'Unknown error')
    throw new Error(`Dev.to publish failed: ${err}`)
  }
  const data = await res.json()
  return { url: data?.url ?? '' }
}
