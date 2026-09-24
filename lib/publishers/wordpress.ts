export async function publishToWordPress(
  siteUrl: string,
  username: string,
  appPassword: string,
  title: string,
  content: string
): Promise<{ url: string }> {
  const base = siteUrl.replace(/\/+$/, '')
  const auth = Buffer.from(`${username}:${appPassword}`).toString('base64')
  const res = await fetch(`${base}/wp-json/wp/v2/posts`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title,
      content,
      status: 'draft',
    }),
  })
  if (!res.ok) {
    const err = await res.text().catch(() => 'Unknown error')
    throw new Error(`WordPress publish failed: ${err}`)
  }
  const data = await res.json()
  return { url: data?.link ?? '' }
}
