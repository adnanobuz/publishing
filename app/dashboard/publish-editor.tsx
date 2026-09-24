'use client'

import { useState, useCallback } from 'react'
import { BookOpen, Linkedin, Instagram, Code2, Globe, Send, Eye, Loader2, CheckCircle2, XCircle, AlertCircle, ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { FadeIn, SlideIn, Stagger, StaggerItem } from '@/components/ui/animate'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

const PLATFORM_CONFIG = [
  { id: 'medium', name: 'Medium', icon: BookOpen, color: '#000000', bg: '#F5F5F5', darkBg: '#1a1a1a' },
  { id: 'linkedin', name: 'LinkedIn', icon: Linkedin, color: '#0A66C2', bg: '#EEF3F8', darkBg: '#1B2838' },
  { id: 'instagram', name: 'Instagram', icon: Instagram, color: '#E4405F', bg: '#FDF2F4', darkBg: '#2D1520' },
  { id: 'devto', name: 'Dev.to', icon: Code2, color: '#0A0A0A', bg: '#F0F0F0', darkBg: '#1a1a1a' },
  { id: 'wordpress', name: 'WordPress', icon: Globe, color: '#21759B', bg: '#EEF6FA', darkBg: '#152530' },
] as const

type AdaptedContent = Record<string, string>
type PublishStatus = Record<string, { status: string; error?: string; url?: string }>

export function PublishEditor() {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['medium', 'linkedin', 'devto'])
  const [adaptedContent, setAdaptedContent] = useState<AdaptedContent>({})
  const [adapting, setAdapting] = useState(false)
  const [adaptProgress, setAdaptProgress] = useState(0)
  const [showPreview, setShowPreview] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [publishStatus, setPublishStatus] = useState<PublishStatus>({})

  const togglePlatform = (id: string) => {
    setSelectedPlatforms((prev) =>
      prev?.includes(id) ? prev.filter((p) => p !== id) : [...(prev ?? []), id]
    )
  }

  const handleAdapt = useCallback(async () => {
    if (!title?.trim() || !body?.trim()) {
      toast.error('Please enter a title and body first')
      return
    }
    if (!selectedPlatforms?.length) {
      toast.error('Please select at least one platform')
      return
    }

    setAdapting(true)
    setAdaptProgress(0)
    setAdaptedContent({})
    setShowPreview(true)

    try {
      const res = await fetch('/api/adapt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, body, platforms: selectedPlatforms }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Adaptation failed' }))
        throw new Error(err?.error ?? 'Adaptation failed')
      }

      const reader = res.body?.getReader()
      if (!reader) throw new Error('No response stream')

      const decoder = new TextDecoder()
      let partialRead = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        partialRead += decoder.decode(value, { stream: true })
        const lines = partialRead.split('\n')
        partialRead = lines.pop() ?? ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') break
            try {
              const parsed = JSON.parse(data)
              if (parsed?.status === 'processing') {
                setAdaptProgress((prev) => Math.min((prev ?? 0) + 2, 95))
              } else if (parsed?.status === 'completed' && parsed?.result) {
                setAdaptedContent(parsed.result ?? {})
                setAdaptProgress(100)
              } else if (parsed?.status === 'error') {
                throw new Error(parsed?.message ?? 'Adaptation failed')
              }
            } catch (e: any) {
              if (e?.message && e.message !== 'Adaptation failed') {
                // skip parse errors on individual chunks
              }
            }
          }
        }
      }
    } catch (error: any) {
      toast.error(error?.message ?? 'Failed to adapt content')
      setShowPreview(false)
    } finally {
      setAdapting(false)
    }
  }, [title, body, selectedPlatforms])

  const handlePublish = useCallback(async () => {
    if (!selectedPlatforms?.length) {
      toast.error('Select at least one platform')
      return
    }
    if (!title?.trim()) {
      toast.error('Please enter a title')
      return
    }

    // Check Instagram needs image
    if (selectedPlatforms.includes('instagram') && !imageUrl?.trim()) {
      toast.error('Instagram requires an image URL. Please provide one or deselect Instagram.')
      return
    }

    setPublishing(true)
    const initialStatus: PublishStatus = {}
    for (const p of selectedPlatforms) {
      initialStatus[p] = { status: 'publishing' }
    }
    setPublishStatus(initialStatus)

    try {
      const res = await fetch('/api/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          body,
          imageUrl: imageUrl || null,
          adaptedContent: Object.keys(adaptedContent ?? {}).length > 0 ? adaptedContent : null,
          platforms: selectedPlatforms,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        toast.error(data?.error ?? 'Publishing failed')
        return
      }

      const results = data?.job?.results ?? []
      const newStatus: PublishStatus = {}
      for (const r of results) {
        newStatus[r?.platform] = {
          status: r?.status ?? 'failed',
          error: r?.errorMessage ?? undefined,
          url: r?.publishedUrl ?? undefined,
        }
      }
      setPublishStatus(newStatus)

      const successCount = results.filter((r: any) => r?.status === 'published')?.length ?? 0
      const failCount = results.filter((r: any) => r?.status === 'failed')?.length ?? 0
      if (successCount > 0 && failCount === 0) {
        toast.success(`Published to ${successCount} platform${successCount > 1 ? 's' : ''}!`)
      } else if (successCount > 0) {
        toast.warning(`Published to ${successCount}, failed on ${failCount}`)
      } else {
        toast.error('All platforms failed')
      }
    } catch (error: any) {
      toast.error(error?.message ?? 'Publishing failed')
    } finally {
      setPublishing(false)
    }
  }, [title, body, imageUrl, adaptedContent, selectedPlatforms])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'publishing': return <Loader2 className="h-4 w-4 animate-spin text-primary" />
      case 'published': return <CheckCircle2 className="h-4 w-4 text-emerald-500" />
      case 'failed': return <XCircle className="h-4 w-4 text-destructive" />
      default: return <AlertCircle className="h-4 w-4 text-muted-foreground" />
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <FadeIn>
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Publish Content</h1>
          <p className="text-muted-foreground mt-1">Write once, publish everywhere with AI-adapted versions.</p>
        </div>
      </FadeIn>

      {/* Content Editor */}
      <SlideIn from="bottom" delay={0.1}>
        <Card style={{ boxShadow: 'var(--shadow-md)' }}>
          <CardContent className="p-6 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="title" className="text-base font-semibold">Title</Label>
              <Input
                id="title"
                placeholder="Your post title..."
                className="text-lg h-12"
                value={title}
                onChange={(e: any) => setTitle(e?.target?.value ?? '')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="body" className="text-base font-semibold">Content</Label>
              <Textarea
                id="body"
                placeholder="Write your content here... The AI will adapt this for each platform."
                className="min-h-[240px] text-base leading-relaxed resize-y"
                value={body}
                onChange={(e: any) => setBody(e?.target?.value ?? '')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="imageUrl" className="text-sm font-medium flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-muted-foreground" />
                Image URL <span className="text-muted-foreground font-normal">(required for Instagram)</span>
              </Label>
              <Input
                id="imageUrl"
                placeholder="https://storage.ghost.io/c/6d/21/6d217297-aa70-41fe-b68d-e29e411dd3ed/content/images/2025/10/instagram-image-size-stories2.jpg"
                value={imageUrl}
                onChange={(e: any) => setImageUrl(e?.target?.value ?? '')}
              />
            </div>
          </CardContent>
        </Card>
      </SlideIn>

      {/* Platform Selection */}
      <SlideIn from="bottom" delay={0.2}>
        <div className="space-y-3">
          <h2 className="font-display text-lg font-semibold tracking-tight">Select Platforms</h2>
          <Stagger className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {PLATFORM_CONFIG.map((p) => {
              const selected = selectedPlatforms?.includes(p.id)
              const Icon = p.icon
              return (
                <StaggerItem key={p.id}>
                  <button
                    onClick={() => togglePlatform(p.id)}
                    className={cn(
                      'w-full flex flex-col items-center gap-2.5 rounded-xl p-4 border-2 transition-all duration-200',
                      selected
                        ? 'border-primary bg-accent'
                        : 'border-transparent bg-card hover:border-border'
                    )}
                    style={{ boxShadow: selected ? 'var(--shadow-md)' : 'var(--shadow-sm)' }}
                  >
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-lg"
                      style={{ backgroundColor: p.color + '15' }}
                    >
                      <Icon className="h-5 w-5" style={{ color: p.color }} />
                    </div>
                    <span className="text-sm font-medium">{p.name}</span>
                    <div
                      className={cn(
                        'h-2 w-2 rounded-full transition-colors',
                        selected ? 'bg-primary' : 'bg-muted'
                      )}
                    />
                  </button>
                </StaggerItem>
              )
            })}
          </Stagger>
        </div>
      </SlideIn>

      {/* Action Buttons */}
      <SlideIn from="bottom" delay={0.3}>
        <div className="flex flex-wrap gap-3">
          <Button
            size="lg"
            variant="outline"
            onClick={handleAdapt}
            disabled={adapting || !title?.trim() || !body?.trim() || !selectedPlatforms?.length}
          >
            {adapting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
            {adapting ? `Adapting... ${adaptProgress}%` : 'Preview Adaptations'}
          </Button>
          <Button
            size="lg"
            onClick={handlePublish}
            disabled={publishing || !title?.trim() || !selectedPlatforms?.length}
          >
            {publishing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
            {publishing ? 'Publishing...' : 'Publish Now'}
          </Button>
        </div>
      </SlideIn>

      {/* Preview Tabs */}
      {showPreview && Object.keys(adaptedContent ?? {}).length > 0 && (
        <FadeIn>
          <Card style={{ boxShadow: 'var(--shadow-md)' }}>
            <CardContent className="p-6">
              <h3 className="font-display text-lg font-semibold mb-4">Adapted Content Preview</h3>
              <Tabs defaultValue={selectedPlatforms?.[0] ?? 'medium'}>
                <TabsList className="mb-4 flex-wrap h-auto gap-1">
                  {selectedPlatforms.map((pId) => {
                    const p = PLATFORM_CONFIG.find((c) => c.id === pId)
                    if (!p) return null
                    const Icon = p.icon
                    return (
                      <TabsTrigger key={pId} value={pId} className="gap-2">
                        <Icon className="h-3.5 w-3.5" />
                        {p.name}
                      </TabsTrigger>
                    )
                  })}
                </TabsList>
                {selectedPlatforms.map((pId) => (
                  <TabsContent key={pId} value={pId}>
                    <div className="rounded-lg bg-muted/50 p-4 max-h-96 overflow-y-auto">
                      <pre className="whitespace-pre-wrap text-sm font-mono leading-relaxed">
                        {adaptedContent?.[pId] ?? 'No adaptation available'}
                      </pre>
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>
        </FadeIn>
      )}

      {/* Publish Status */}
      {Object.keys(publishStatus ?? {}).length > 0 && (
        <FadeIn>
          <Card style={{ boxShadow: 'var(--shadow-md)' }}>
            <CardContent className="p-6">
              <h3 className="font-display text-lg font-semibold mb-4">Publishing Status</h3>
              <div className="space-y-3">
                {Object.entries(publishStatus ?? {}).map(([pId, status]) => {
                  const p = PLATFORM_CONFIG.find((c) => c.id === pId)
                  if (!p) return null
                  const Icon = p.icon
                  return (
                    <div
                      key={pId}
                      className="flex items-center gap-3 rounded-lg bg-muted/50 p-3"
                    >
                      <div
                        className="flex h-8 w-8 items-center justify-center rounded-lg"
                        style={{ backgroundColor: p.color + '15' }}
                      >
                        <Icon className="h-4 w-4" style={{ color: p.color }} />
                      </div>
                      <span className="font-medium flex-1">{p.name}</span>
                      {getStatusIcon(status?.status)}
                      <span className={cn(
                        'text-sm capitalize',
                        status?.status === 'published' && 'text-emerald-600',
                        status?.status === 'failed' && 'text-destructive',
                        status?.status === 'publishing' && 'text-primary'
                      )}>
                        {status?.status ?? 'unknown'}
                      </span>
                      {status?.error && (
                        <span className="text-xs text-destructive max-w-xs truncate" title={status.error}>
                          {status.error}
                        </span>
                      )}
                      {status?.url && (
                        <a href={status.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
                          View
                        </a>
                      )}
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </FadeIn>
      )}
    </div>
  )
}
