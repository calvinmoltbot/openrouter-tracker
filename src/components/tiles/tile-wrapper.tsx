import { cn } from '@/lib/utils'

interface TileWrapperProps {
  children: React.ReactNode
  className?: string
  prominent?: boolean
}

export function TileWrapper({ children, className, prominent }: TileWrapperProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-xl p-5 transition-all duration-250 ease-out',
        'hover:border-white/[0.15] hover:bg-white/[0.06] hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(0,0,0,0.4)]',
        'dark:bg-white/[0.04] dark:border-white/[0.08]',
        prominent && 'ring-1 ring-purple-500/30 border-purple-500/20 bg-purple-500/[0.03] hover:ring-purple-500/40',
        className
      )}
    >
      {children}
    </div>
  )
}
