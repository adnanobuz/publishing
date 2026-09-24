'use client'

import { useState, useEffect, useCallback } from 'react'
import { Settings, BookOpen, Linkedin, Instagram, Code2, Globe, Loader2, CheckCircle2, XCircle, Save, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { FadeIn, Stagger, StaggerItem } from '@/components/ui/animate'
import { toast } from 'sonner'
import { PLATFORM_CREDENTIALS } from '@/lib/platforms'

const PLATFORM_META: Record<string, { name: string; icon: any; color: string; description: string }> = {
  medium: { name: 'Medium', icon: BookOpen, color: '#000000', description: 'Publish articles as drafts on Medium' },
  linkedin: { name: 'LinkedIn', icon: Linkedin, color: '#0A66C2', description: 'Share professional posts on LinkedIn' },
  instagram: { name: 'Instagram', icon: Instagram, color: '#E4405F', description: 'Post images with captions to Instagram' },
  devto: { name: 'Dev.to', icon: Code2, color: '#0A0A0A', description: 'Publish developer articles on Dev.to' },
  wordpress: { name: 'WordPress', icon: Globe, color: '#21759B', description: 'Create blog posts on your WordPress site' },
}

export function SettingsView() {
  const [credentials, setCredentials] = useState<Record<string, Record<string, string>>>({})
  const [savedMask, setSavedMask] = useState<Record<string, Record<string, string>>>({})
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [testing, setTesting] = useState<Record<string, boolean>>({})
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string }>>({})

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((data) => {
        setSavedMask(data?.credentials ?? {})
      })
      .catch(() => {})
  }, [])

  const handleFieldChange = (platform: string, key: string, value: string) => {
    setCredentials((prev) => ({
      ...(prev ?? {}),
      [platform]: { ...(prev?.[platform] ?? {}), [key]: value },
    }))
  }

  const handleSave = useCallback(async (platform: string) => {
    const creds = credentials?.[platform]
    if (!creds || Object.values(creds).every((v) => !v?.trim())) {
      toast.error('Please fill in at least one field')
      return
    }

    setSaving((prev) => ({ ...(prev ?? {}), [platform]: true }))
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform, credentials: creds }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error ?? 'Save failed')
      }
      toast.success(`${PLATFORM_META[platform]?.name ?? platform} credentials saved!`)
      // Update mask
      const maskCreds: Record<string, string> = {}
      for (const [k, v] of Object.entries(creds ?? {})) {
        if (v) maskCreds[k] = `${v.slice(0, 4)}${'\u2022'.repeat(Math.max(0, (v?.length ?? 4) - 4))}`
      }
      setSavedMask((prev) => ({ ...(prev ?? {}), [platform]: { ...(prev?.[platform] ?? {}), ...maskCreds } }))
      setCredentials((prev) => ({ ...(prev ?? {}), [platform]: {} }))
    } catch (error: any) {
      toast.error(error?.message ?? 'Save failed')
    } finally {
      setSaving((prev) => ({ ...(prev ?? {}), [platform]: false }))
    }
  }, [credentials])

  const handleTest = useCallback(async (platform: string) => {
    setTesting((prev) => ({ ...(prev ?? {}), [platform]: true }))
    setTestResults((prev) => {
      const next = { ...(prev ?? {}) }
      delete next[platform]
      return next
    })
    try {
      const res = await fetch(`/api/test-connection/${platform}`, { method: 'POST' })
      const data = await res.json()
      if (data?.success) {
        setTestResults((prev) => ({ ...(prev ?? {}), [platform]: { success: true, message: data?.message ?? 'Connected!' } }))
        toast.success(data?.message ?? 'Connection successful!')
      } else {
        setTestResults((prev) => ({ ...(prev ?? {}), [platform]: { success: false, message: data?.error ?? 'Connection failed' } }))
        toast.error(data?.error ?? 'Connection failed')
      }
    } catch (error: any) {
      setTestResults((prev) => ({ ...(prev ?? {}), [platform]: { success: false, message: error?.message ?? 'Test failed' } }))
    } finally {
      setTesting((prev) => ({ ...(prev ?? {}), [platform]: false }))
    }
  }, [])

  return (
    <div className="space-y-8">
      <FadeIn>
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight flex items-center gap-3">
            <Settings className="h-7 w-7 text-primary" />
            Platform Settings
          </h1>
          <p className="text-muted-foreground mt-1">Configure your API credentials for each publishing platform.</p>
        </div>
      </FadeIn>

      <Stagger className="space-y-6">
        {Object.entries(PLATFORM_CREDENTIALS).map(([platformId, config]) => {
          const meta = PLATFORM_META[platformId]
          if (!meta) return null
          const Icon = meta.icon
          const hasSaved = Object.keys(savedMask?.[platformId] ?? {}).length > 0
          const testResult = testResults?.[platformId]

          return (
            <StaggerItem key={platformId}>
              <Card style={{ boxShadow: 'var(--shadow-sm)' }}>
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-lg"
                      style={{ backgroundColor: meta.color + '15' }}
                    >
                      <Icon className="h-5 w-5" style={{ color: meta.color }} />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-lg">{meta.name}</CardTitle>
                      <CardDescription>{meta.description}</CardDescription>
                    </div>
                    {hasSaved && (
                      <div className="flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-2.5 py-1 rounded-full">
                        <CheckCircle2 className="h-3 w-3" />
                        Configured
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {config.fields.map((field) => (
                    <div key={field.key} className="space-y-1.5">
                      <Label htmlFor={`${platformId}-${field.key}`} className="text-sm font-medium">{field.label}</Label>
                      <Input
                        id={`${platformId}-${field.key}`}
                        type={field.type ?? 'text'}
                        placeholder={savedMask?.[platformId]?.[field.key] ?? `Enter ${field.label.toLowerCase()}`}
                        value={credentials?.[platformId]?.[field.key] ?? ''}
                        onChange={(e: any) => handleFieldChange(platformId, field.key, e?.target?.value ?? '')}
                      />
                      <p className="text-xs text-muted-foreground">{field.hint}</p>
                    </div>
                  ))}

                  {testResult && (
                    <div className={`flex items-center gap-2 text-sm rounded-lg p-3 ${
                      testResult.success ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400' : 'bg-destructive/10 text-destructive'
                    }`}>
                      {testResult.success ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                      {testResult.message}
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={() => handleSave(platformId)}
                      disabled={saving?.[platformId]}
                      size="sm"
                    >
                      {saving?.[platformId] ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
                      Save
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleTest(platformId)}
                      disabled={testing?.[platformId] || !hasSaved}
                      size="sm"
                    >
                      {testing?.[platformId] ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Zap className="h-3.5 w-3.5 mr-1.5" />}
                      Test Connection
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </StaggerItem>
          )
        })}
      </Stagger>
    </div>
  )
}
