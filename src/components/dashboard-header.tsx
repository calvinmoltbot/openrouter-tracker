import { Button } from '@/components/ui/button'
import { Download, RefreshCw, Sun, Moon, Settings } from 'lucide-react'
import { useTheme } from '@/lib/theme'

interface DashboardHeaderProps {
  dateRange: string
  totalCalls: number
  source: string
  onExport: () => void
  onReset: () => void
  onSettingsClick?: () => void
}

export function DashboardHeader({ dateRange, totalCalls, source, onExport, onReset, onSettingsClick }: DashboardHeaderProps) {
  const { darkMode, toggleTheme } = useTheme()

  return (
    <div className="bg-gray-900 text-gray-50 px-7 py-5 rounded-xl mb-4 flex justify-between items-center flex-wrap gap-3">
      <div>
        <h1 className="text-[22px] font-bold">OpenRouter Cost Tracker</h1>
        <div className="text-[13px] text-gray-400">{dateRange} &middot; {totalCalls.toLocaleString()} calls &middot; Source: {source}</div>
      </div>
      <div className="flex gap-2 items-center flex-wrap">
        <Button variant="outline" size="sm" onClick={onExport} className="border-white/15 bg-white/8 text-gray-50 hover:bg-white/18 hover:text-gray-50">
          <Download className="size-3.5" />
          Export Report
        </Button>
        <Button variant="outline" size="sm" onClick={onReset} className="border-white/15 bg-white/8 text-gray-50 hover:bg-white/18 hover:text-gray-50">
          <RefreshCw className="size-3.5" />
          Change Data Source
        </Button>
        {onSettingsClick && (
          <Button variant="outline" size="icon" onClick={onSettingsClick} className="border-white/15 bg-white/8 text-gray-50 hover:bg-white/18 hover:text-gray-50 size-8">
            <Settings className="size-3.5" />
          </Button>
        )}
        <Button variant="outline" size="icon" onClick={toggleTheme} className="border-white/15 bg-white/8 text-gray-50 hover:bg-white/18 hover:text-gray-50 size-8">
          {darkMode ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}
        </Button>
      </div>
    </div>
  )
}
