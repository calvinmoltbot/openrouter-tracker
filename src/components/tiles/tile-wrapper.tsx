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
        'glass-card p-5 transition-all duration-250 ease-out',
        'hover:-translate-y-0.5',
        prominent && 'ring-1 ring-primary/20 border-primary/15 hover:ring-primary/30',
        className
      )}
    >
      {children}
    </div>
  )
}
