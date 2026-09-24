export async function publishToInstagram(
  pageAccessToken: string,
  igUserId: string,
  caption: string,
  imageUrl?: string
): Promise<{ url: string }> {
  if (!imageUrl) {
    throw new Error('Instagram requires an image URL to publish a post. Please provide an image.')
  }

  // Step 1: Create media container
  const containerRes = await fetch(
    `https://graph.facebook.com/v18.0/${igUserId}/media`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_url: imageUrl,
        caption,
        access_token: pageAccessToken,
      }),
    }
  )
  if (!containerRes.ok) {
    const err = await containerRes.text().catch(() => 'Unknown error')
    throw new Error(`Instagram media container failed: ${err}`)
  }
  const container = await containerRes.json()
  const creationId = container?.id
  if (!creationId) throw new Error('Instagram media container returned no ID')

  // Step 2: Publish
  const publishRes = await fetch(
    `https://graph.facebook.com/v18.0/${igUserId}/media_publish`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        creation_id: creationId,
        access_token: pageAccessToken,
      }),
    }
  )
  if (!publishRes.ok) {
    const err = await publishRes.text().catch(() => 'Unknown error')
    throw new Error(`Instagram publish failed: ${err}`)
  }
  const pub = await publishRes.json()
  return { url: pub?.id ? `https://www.instagram.com/p/${pub.id}` : '' }
}
