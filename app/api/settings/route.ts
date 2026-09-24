export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const creds = await prisma.platformCredential.findMany({
    where: { userId: session.user.id },
    select: { platform: true, key: true, value: true },
  })

  // Group by platform
  const grouped: Record<string, Record<string, string>> = {}
  for (const c of creds ?? []) {
    if (!grouped[c.platform]) grouped[c.platform] = {}
    // Mask sensitive values
    grouped[c.platform][c.key] = c.value ? `${c.value.slice(0, 4)}${'•'.repeat(Math.max(0, (c.value?.length ?? 4) - 4))}` : ''
  }

  return NextResponse.json({ credentials: grouped })
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { platform, credentials } = await request.json()
    if (!platform || !credentials) {
      return NextResponse.json({ error: 'Platform and credentials required' }, { status: 400 })
    }

    const ops = Object.entries(credentials ?? {}).map(([key, value]) =>
      prisma.platformCredential.upsert({
        where: { userId_platform_key: { userId: session.user.id, platform, key } },
        update: { value: value as string },
        create: { userId: session.user.id, platform, key, value: value as string },
      })
    )

    await Promise.all(ops)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Save failed' }, { status: 500 })
  }
}
