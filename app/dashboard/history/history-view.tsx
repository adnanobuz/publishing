'use client'

import { useState, useEffect, useCallback } from 'react'
import { History, BookOpen, Linkedin, Instagram, Code2, Globe, CheckCircle2, XCircle, SkipForward, Loader2, ChevronRight, ArrowLeft } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FadeIn, Stagger, StaggerItem } from '@/components/ui/animate'
import { SafeDate } from '@/components/safe-format'
import { cn } from '@/lib/utils'

const PLATFORM_ICONS: Record<string, any> = {
  medium: BookOpen,
  linkedin: Linkedin,
  instagram: Instagram,
  devto: Code2,
  wordpress: Globe,
}

const PLATFORM_COLORS: Record<string, string> = {
  medium: '#000000',
  linkedin: '#0A66C2',
  instagram: '#E4405F',
  devto: '#0A0A0A',
  wordpress: '#21759B',
}

interface PublishResult {
  id: string
  platform: string
  status: string
  adaptedContent: string | null
  errorMessage: string | null
  publishedUrl: string | null
}

interface PublishJob {
  id: string
  title: string
  body: string
  imageUrl: string | null
  status: string
  createdAt: string
  results: PublishResult[]
}

export function HistoryView() {
  const [jobs, setJobs] = useState<PublishJob[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedJob, setSelectedJob] = useState<PublishJob | null>(null)

  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch('/api/history')
      const data = await res.json()
      setJobs(data?.jobs ?? [])
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchJobs()
  }, [fetchJobs])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'published': return <CheckCircle2 className="h-4 w-4 text-emerald-500" />
      case 'failed': return <XCircle className="h-4 w-4 text-destructive" />
      default: return <SkipForward className="h-4 w-4 text-muted-foreground" />
    }
  }

  if (selectedJob) {
    return (
      <div className="space-y-6">
        <FadeIn>
          <Button variant="ghost" onClick={() => setSelectedJob(null)} className="gap-2 mb-2">
            <ArrowLeft className="h-4 w-4" /> Back to History
          </Button>
          <Card style={{ boxShadow: 'var(--shadow-md)' }}>
            <CardContent className="p-6 space-y-4">
              <div>
                <h2 className="font-display text-xl font-bold">{selectedJob.title}</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  <SafeDate date={selectedJob.createdAt} options={{ dateStyle: 'long', timeStyle: 'short' }} />
                </p>
              </div>
              <div className="space-y-4">
                {(selectedJob.results ?? []).map((r) => {
                  const Icon = PLATFORM_ICONS[r.platform] ?? Globe
                  const color = PLATFORM_COLORS[r.platform] ?? '#666'
                  return (
                    <div key={r.id} className="rounded-lg border p-4 space-y-2">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: color + '15' }}>
                          <Icon className="h-4 w-4" style={{ color }} />
                        </div>
                        <span className="font-medium capitalize">{r.platform === 'devto' ? 'Dev.to' : r.platform}</span>
                        {getStatusIcon(r.status)}
                        <span className={cn(
                          'text-sm capitalize ml-auto',
                          r.status === 'published' && 'text-emerald-600',
                          r.status === 'failed' && 'text-destructive'
                        )}>
                          {r.status}
                        </span>
                      </div>
                      {r.errorMessage && (
                        <p className="text-sm text-destructive bg-destructive/10 rounded p-2">{r.errorMessage}</p>
                      )}
                      {r.publishedUrl && (
                        <a href={r.publishedUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
                          View published post →
                        </a>
                      )}
                      {r.adaptedContent && (
                        <details className="mt-2">
                          <summary className="text-sm text-muted-foreground cursor-pointer hover:text-foreground">View adapted content</summary>
                          <pre className="mt-2 whitespace-pre-wrap text-xs font-mono bg-muted/50 rounded p-3 max-h-60 overflow-y-auto">
                            {r.adaptedContent}
                          </pre>
                        </details>
                      )}
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </FadeIn>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <FadeIn>
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight flex items-center gap-3">
            <History className="h-7 w-7 text-primary" />
            Publish History
          </h1>
          <p className="text-muted-foreground mt-1">Track all your past publishing activity.</p>
        </div>
      </FadeIn>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (jobs?.length ?? 0) === 0 ? (
        <FadeIn>
          <Card className="text-center py-16" style={{ boxShadow: 'var(--shadow-sm)' }}>
            <CardContent>
              <History className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
              <p className="text-lg font-medium text-muted-foreground">No publish history yet</p>
              <p className="text-sm text-muted-foreground/70 mt-1">Your published content will appear here.</p>
            </CardContent>
          </Card>
        </FadeIn>
      ) : (
        <Stagger className="space-y-3">
          {jobs.map((job) => (
            <StaggerItem key={job.id}>
              <Card
                className="cursor-pointer hover:border-primary/30 transition-colors"
                style={{ boxShadow: 'var(--shadow-sm)' }}
                onClick={() => setSelectedJob(job)}
              >
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">{job.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      <SafeDate date={job.createdAt} options={{ dateStyle: 'medium', timeStyle: 'short' }} />
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {(job.results ?? []).map((r) => {
                      const Icon = PLATFORM_ICONS[r.platform] ?? Globe
                      const color = PLATFORM_COLORS[r.platform] ?? '#666'
                      return (
                        <div key={r.id} className="flex items-center gap-1" title={`${r.platform}: ${r.status}`}>
                          <Icon className="h-3.5 w-3.5" style={{ color }} />
                          {getStatusIcon(r.status)}
                        </div>
                      )
                    })}
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </CardContent>
              </Card>
            </StaggerItem>
          ))}
        </Stagger>
      )}
    </div>
  )
}
