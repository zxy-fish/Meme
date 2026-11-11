import { Link, Outlet } from 'react-router-dom'
import { Moon, Sun } from 'lucide-react'
import { Sidebar, Logo } from './Sidebar'
import { BottomNav } from './BottomNav'
import { Toaster } from '@/components/ui/Toaster'
import { useSettings } from '@/store/settings'

export function AppShell() {
  const theme = useSettings((state) => state.theme)
  const setTheme = useSettings((state) => state.setTheme)

  return (
    <div className="min-h-dvh">
      <Sidebar />

      <div className="lg:pl-[248px]">
        <header className="safe-top sticky top-0 z-30 flex min-h-14 items-center justify-between border-b border-line bg-app/80 px-4 backdrop-blur-xl lg:hidden">
          <Logo />
          <div className="flex items-center gap-1">
            <Link
              to="/settings"
              className="rounded-lg px-2 py-1.5 text-[11px] text-muted transition-colors hover:bg-surface-2 hover:text-ink"
            >
              同步
            </Link>
            <button
              type="button"
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-ink"
              aria-label="切换主题"
            >
              {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
            </button>
          </div>
        </header>

        <main className="pb-nav mx-auto w-full max-w-[1440px] px-4 pt-6 sm:px-6 lg:px-10 lg:pt-10">
          <Outlet />
        </main>
      </div>

      <BottomNav />
      <Toaster />
    </div>
  )
}
