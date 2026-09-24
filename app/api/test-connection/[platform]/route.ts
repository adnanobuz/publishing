export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'

async function getCredentials(userId: string, platform: string) {
  const creds = await prisma.platformCredential.findMany({
    where: { userId, platform },
  })
  const map: Record<string, string> = {}
  for (const c of creds ?? []) {
    map[c.key] = c.value
  }
  return map
}

export async function POST(_req: Request, { params }: { params: Promise<{ platform: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { platform } = await params
  const creds = await getCredentials(session.user.id, platform)

  try {
    switch (platform) {
      case 'medium': {
        if (!creds.token) throw new Error('No token configured')
        const res = await fetch('https://api.medium.com/v1/me', {
          headers: { Authorization: `Bearer ${creds.token}`, Accept: 'application/json' },
        })
        if (!res.ok) throw new Error(`Medium returned ${res.status}`)
        const data = await res.json()
        return NextResponse.json({ success: true, message: `Connected as ${data?.data?.name ?? 'Unknown'}` })
      }
      case 'linkedin': {
        if (!creds.accessToken) throw new Error('No access token configured')
        const res = await fetch('https://api.linkedin.com/v2/me', {
          headers: { Authorization: `Bearer ${creds.accessToken}` },
        })
        if (!res.ok) throw new Error(`LinkedIn returned ${res.status}`)
        const data = await res.json()
        return NextResponse.json({ success: true, message: `Connected as ${data?.localizedFirstName ?? ''} ${data?.localizedLastName ?? ''}` })
      }
      case 'instagram': {
        if (!creds.pageAccessToken || !creds.igUserId) throw new Error('Missing credentials')
        const res = await fetch(
          `https://graph.facebook.com/v18.0/${creds.igUserId}?fields=name,username&access_token=${creds.pageAccessToken}`
        )
        if (!res.ok) throw new Error(`Instagram returned ${res.status}`)
        const data = await res.json()
        return NextResponse.json({ success: true, message: `Connected as @${data?.username ?? 'Unknown'}` })
      }
      case 'devto': {
        if (!creds.apiKey) throw new Error('No API key configured')
        const res = await fetch('https://dev.to/api/users/me', {
          headers: { 'api-key': creds.apiKey },
        })
        if (!res.ok) throw new Error(`Dev.to returned ${res.status}`)
        const data = await res.json()
        return NextResponse.json({ success: true, message: `Connected as @${data?.username ?? 'Unknown'}` })
      }
      case 'wordpress': {
        if (!creds.siteUrl || !creds.username || !creds.appPassword) throw new Error('Missing credentials')
        const base = creds.siteUrl.replace(/\/+$/, '')
        const authStr = Buffer.from(`${creds.username}:${creds.appPassword}`).toString('base64')
        const res = await fetch(`${base}/wp-json/wp/v2/users/me`, {
          headers: { Authorization: `Basic ${authStr}` },
        })
        if (!res.ok) throw new Error(`WordPress returned ${res.status}`)
        const data = await res.json()
        return NextResponse.json({ success: true, message: `Connected as ${data?.name ?? 'Unknown'}` })
      }
      default:
        return NextResponse.json({ error: 'Unknown platform' }, { status: 400 })
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message ?? 'Connection failed' }, { status: 200 })
  }
}
