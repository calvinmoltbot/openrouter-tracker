'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, Sun, Moon } from 'lucide-react'
import { useTheme } from '@/lib/theme'

export default function LoginPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { darkMode, toggleTheme } = useTheme()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password.trim()) return setError('Please enter the password')
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Login failed' }))
        throw new Error(body.error || 'Login failed')
      }

      router.push('/')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-[400px] relative">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="absolute -top-12 right-0 size-8 text-muted-foreground hover:text-foreground"
        >
          {darkMode ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </Button>

        <div className="glass-card p-8 text-center">
          <div className="size-12 rounded-lg bg-gradient-to-br from-[#73323d] to-[#ffb2bb] flex items-center justify-center text-white text-sm font-bold mx-auto mb-5">
            OR
          </div>
          <h1 className="text-2xl font-semibold mb-1 font-heading">OpenRouter Cost Tracker</h1>
          <p className="text-sm text-muted-foreground mb-6">Enter password to continue</p>

          {error && (
            <Alert variant="destructive" className="text-left mb-4">
              <AlertCircle className="size-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-left">
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoFocus
              className="bg-[var(--muted)] border-border"
            />
            <Button className="w-full bg-[#73323d] hover:bg-[#8c4651] text-[#ffc0c7]" type="submit" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
