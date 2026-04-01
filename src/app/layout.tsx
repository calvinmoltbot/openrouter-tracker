import type { Metadata } from 'next'
import '@fontsource-variable/inter'
import '@/app/globals.css'
import { ThemeProvider } from '@/lib/theme'

export const metadata: Metadata = {
  title: 'OpenRouter Cost Tracker',
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>📊</text></svg>",
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              const t = localStorage.getItem('or_theme');
              const dark = t === 'dark' || (!t && window.matchMedia('(prefers-color-scheme: dark)').matches) || !t;
              if (dark) document.documentElement.classList.add('dark');
            `,
          }}
        />
      </head>
      <body>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
