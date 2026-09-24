export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { publishToMedium } from '@/lib/publishers/medium'
import { publishToLinkedIn } from '@/lib/publishers/linkedin'
import { publishToInstagram } from '@/lib/publishers/instagram'
import { publishToDevto } from '@/lib/publishers/devto'
import { publishToWordPress } from '@/lib/publishers/wordpress'

async function getCredentials(userId: string, platform: string) {
  const creds = await prisma.platformCredential.findMany({ where: { userId, platform } })
  const map: Record<string, string> = {}
  for (const c of creds ?? []) {
    map[c.key] = c.value
  }
  return map
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { title, body, imageUrl, adaptedContent, platforms } = await request.json()
  if (!title || !platforms?.length) {
    return NextResponse.json({ error: 'Title and platforms required' }, { status: 400 })
  }

  // Create publish job
  const job = await prisma.publishJob.create({
    data: {
      userId: session.user.id,
      title,
      body: body ?? '',
      imageUrl: imageUrl ?? null,
      status: 'publishing',
      results: {
        create: (platforms as string[]).map((p: string) => ({
          platform: p,
          status: 'pending',
          adaptedContent: adaptedContent?.[p] ?? null,
        })),
      },
    },
    include: { results: true },
  })

  // Publish to each platform in parallel
  const publishPromises = (job.results ?? []).map(async (result: any) => {
    const content = result.adaptedContent ?? body ?? ''
    const creds = await getCredentials(session.user.id, result.platform)

    try {
      let publishResult: { url: string } = { url: '' }

      switch (result.platform) {
        case 'medium': {
          if (!creds.token) throw new Error('Medium not configured')
          publishResult = await publishToMedium(creds.token, title, content)
          break
        }
        case 'linkedin': {
          if (!creds.accessToken || !creds.personUrn) throw new Error('LinkedIn not configured')
          publishResult = await publishToLinkedIn(creds.accessToken, creds.personUrn, content)
          break
        }
        case 'instagram': {
          if (!creds.pageAccessToken || !creds.igUserId) throw new Error('Instagram not configured')
          publishResult = await publishToInstagram(creds.pageAccessToken, creds.igUserId, content, imageUrl ?? undefined)
          break
        }
        case 'devto': {
          if (!creds.apiKey) throw new Error('Dev.to not configured')
          publishResult = await publishToDevto(creds.apiKey, title, content)
          break
        }
        case 'wordpress': {
          if (!creds.siteUrl || !creds.username || !creds.appPassword) throw new Error('WordPress not configured')
          publishResult = await publishToWordPress(creds.siteUrl, creds.username, creds.appPassword, title, content)
          break
        }
      }

      await prisma.publishResult.update({
        where: { id: result.id },
        data: { status: 'published', publishedUrl: publishResult.url },
      })
    } catch (error: any) {
      await prisma.publishResult.update({
        where: { id: result.id },
        data: { status: 'failed', errorMessage: error?.message ?? 'Unknown error' },
      })
    }
  })

  await Promise.all(publishPromises)

  // Update job status
  const updatedResults = await prisma.publishResult.findMany({ where: { publishJobId: job.id } })
  const allDone = (updatedResults ?? []).every((r: any) => r.status !== 'pending')
  const anyFailed = (updatedResults ?? []).some((r: any) => r.status === 'failed')
  const allFailed = (updatedResults ?? []).every((r: any) => r.status === 'failed')

  await prisma.publishJob.update({
    where: { id: job.id },
    data: { status: allFailed ? 'failed' : anyFailed ? 'partial' : allDone ? 'completed' : 'publishing' },
  })

  const finalJob = await prisma.publishJob.findUnique({
    where: { id: job.id },
    include: { results: true },
  })

  return NextResponse.json({ job: finalJob })
}
