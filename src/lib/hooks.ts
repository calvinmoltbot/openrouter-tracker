'use client'

import { useState, useEffect, useRef } from 'react'

export function useCountUp(target: number, duration = 800) {
  const [value, setValue] = useState(0)
  const startTime = useRef<number | null>(null)
  const rafId = useRef<number>(0)

  useEffect(() => {
    startTime.current = null
    const t = target

    function step(timestamp: number) {
      if (startTime.current === null) startTime.current = timestamp
      const elapsed = timestamp - startTime.current
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(t * eased)
      if (progress < 1) {
        rafId.current = requestAnimationFrame(step)
      }
    }

    rafId.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(rafId.current)
  }, [target, duration])

  return value
}
