'use client'

import { useState } from 'react'
import { LayoutGrid, Table2, Settings, Sun, Moon, LogOut, Download } from 'lucide-react'
import { useTheme } from '@/lib/theme'
import { useRouter } from 'next/navigation'

export type Zone = 'dashboard' | 'breakdown'

interface SidebarProps {
  activeZone: Zone
  onZoneChange: (zone: Zone) => void
  onSettingsClick: () => void
  onExport: () => void
}

export function Sidebar({ activeZone, onZoneChange, onSettingsClick, onExport }: SidebarProps) {
  const { darkMode, toggleTheme } = useTheme()
  const router = useRouter()
  const [expanded, setExpanded] = useState(false)

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  const navItems = [
    { id: 'dashboard' as Zone, icon: LayoutGrid, label: 'Dashboard' },
    { id: 'breakdown' as Zone, icon: Table2, label: 'Breakdown' },
  ]

  return (
    <aside
      className="fixed left-0 top-0 h-full z-40 flex flex-col bg-black/60 backdrop-blur-2xl border-r border-white/[0.08] transition-[width] duration-200 ease-out"
      style={{ width: expanded ? 180 : 56 }}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-3 h-14 shrink-0">
        <div className="size-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
          OR
        </div>
        {expanded && (
          <span className="text-sm font-semibold text-foreground whitespace-nowrap overflow-hidden">
            Cost Tracker
          </span>
        )}
      </div>

      {/* Nav items */}
      <nav className="flex-1 flex flex-col gap-1 px-2 mt-2">
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => onZoneChange(item.id)}
            className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors relative ${
              activeZone === item.id
                ? 'bg-primary/10 text-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            {activeZone === item.id && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-indigo-500 rounded-r-full" />
            )}
            <item.icon className="size-[18px] shrink-0" />
            {expanded && <span className="whitespace-nowrap overflow-hidden">{item.label}</span>}
          </button>
        ))}
      </nav>

      {/* Bottom actions */}
      <div className="flex flex-col gap-1 px-2 pb-3 border-t border-border/30 pt-2 mt-auto">
        <button onClick={onExport} className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
          <Download className="size-[18px] shrink-0" />
          {expanded && <span className="whitespace-nowrap">Export</span>}
        </button>
        <button onClick={onSettingsClick} className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
          <Settings className="size-[18px] shrink-0" />
          {expanded && <span className="whitespace-nowrap">Settings</span>}
        </button>
        <button onClick={toggleTheme} className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
          {darkMode ? <Sun className="size-[18px] shrink-0" /> : <Moon className="size-[18px] shrink-0" />}
          {expanded && <span className="whitespace-nowrap">{darkMode ? 'Light Mode' : 'Dark Mode'}</span>}
        </button>
        <button onClick={handleLogout} className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
          <LogOut className="size-[18px] shrink-0" />
          {expanded && <span className="whitespace-nowrap">Logout</span>}
        </button>
      </div>
    </aside>
  )
}
