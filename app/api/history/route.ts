export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const jobs = await prisma.publishJob.findMany({
    where: { userId: session.user.id },
    include: { results: true },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  return NextResponse.json({ jobs: jobs ?? [] })
}
