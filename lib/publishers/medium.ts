export async function publishToMedium(token: string, title: string, content: string): Promise<{ url: string }> {
  // First get the user ID
  const meRes = await fetch('https://api.medium.com/v1/me', {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json' },
  })
  if (!meRes.ok) {
    const err = await meRes.text().catch(() => 'Unknown error')
    throw new Error(`Medium auth failed: ${err}`)
  }
  const me = await meRes.json()
  const userId = me?.data?.id
  if (!userId) throw new Error('Could not get Medium user ID')

  const postRes = await fetch(`https://api.medium.com/v1/users/${userId}/posts`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      title,
      contentFormat: 'markdown',
      content,
      publishStatus: 'draft',
    }),
  })
  if (!postRes.ok) {
    const err = await postRes.text().catch(() => 'Unknown error')
    throw new Error(`Medium publish failed: ${err}`)
  }
  const post = await postRes.json()
  return { url: post?.data?.url ?? '' }
}
