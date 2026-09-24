'use client'

import { AppShell } from '@/components/layouts/app-shell'
import { SidebarNav } from '@/components/sidebar-nav'

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <AppShell
      sidebar={<SidebarNav />}
      className="max-w-5xl mx-auto"
    >
      {children}
    </AppShell>
  )
}
