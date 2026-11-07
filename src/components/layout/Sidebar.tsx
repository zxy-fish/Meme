import { NavLink, Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  BarChart3,
  Bookmark,
  BookOpen,
  Cloud,
  LibraryBig,
  Moon,
  Settings2,
  StickyNote,
  Sun,
} from 'lucide-react'
import { db } from '@/lib/db'
import { cn } from '@/lib/utils'
import { useSettings } from '@/store/settings'

const secondary = [
  { to: '/stats', label: '统计', icon: BarChart3 },
  { to: '/settings', label: '设置', icon: Settings2 },
]

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-3">
      <span className="relative flex h-10 w-10 items-center justify-center rounded-[13px] bg-accent text-accent-ink shadow-[0_10px_30px_-12px_var(--accent)]">
        <span className="font-display text-[26px] font-bold leading-none">m</span>
        <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-accent-ink" />
      </span>
      {!compact ? (
        <span className="leading-tight">
          <span className="block font-display text-[21px] font-semibold tracking-wide text-ink">
            Meme
          </span>
          <span className="block text-[10px] uppercase tracking-[0.22em] text-faint">
            media memo
          </span>
        </span>
      ) : null}
    </Link>
  )
}

export function Sidebar() {
  const theme = useSettings((state) => state.theme)
  const setTheme = useSettings((state) => state.setTheme)
  const sync = useSettings((state) => state.sync)
  const counts = useLiveQuery(async () => {
    const [media, bookmarks, books, notes] = await Promise.all([
      db.media.toArray(),
      db.bookmarks.toArray(),
      db.books.toArray(),
      db.notes.toArray(),
    ])
    return {
      media: media.filter((item) => !item.deletedAt).length,
      bookmarks: bookmarks.filter((item) => !item.deletedAt).length,
      books: books.filter((item) => !item.deletedAt).length,
      notes: notes.filter((item) => !item.deletedAt).length,
      doing: media.filter((item) => !item.deletedAt && item.status === 'doing').length,
    }
  }, [])

  const lastSync = Number(localStorage.getItem('meme:lastSync') ?? 0)

  const primary = [
    { to: '/notes', label: '备忘录', icon: StickyNote, count: counts?.notes },
    { to: '/', label: '媒体库', icon: LibraryBig, count: counts?.media },
    { to: '/bookmarks', label: '书签', icon: Bookmark, count: counts?.bookmarks },
    { to: '/books', label: '阅读', icon: BookOpen, count: counts?.books },
  ]

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[248px] flex-col border-r border-line bg-surface/55 px-4 py-6 lg:flex">
      <div className="px-2">
        <Logo />
      </div>

      <nav className="mt-9 space-y-1">
        <p className="px-3 pb-2 text-[10px] font-medium uppercase tracking-[0.2em] text-faint">
          资料库
        </p>
        {primary.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              cn(
                'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] transition-colors',
                isActive
                  ? 'bg-accent-soft text-ink'
                  : 'text-muted hover:bg-surface-2 hover:text-ink',
              )
            }
          >
            {({ isActive }) => (
              <>
                <item.icon
                  size={17}
                  className={cn('shrink-0', isActive ? 'text-accent' : 'text-faint group-hover:text-ink-soft')}
                />
                <span className="flex-1">{item.label}</span>
                {item.count ? (
                  <span
                    className={cn(
                      'rounded-full px-1.5 py-0.5 text-[10px] tabular-nums',
                      isActive ? 'bg-accent/15 text-accent' : 'bg-surface-2 text-faint',
                    )}
                  >
                    {item.count}
                  </span>
                ) : null}
              </>
            )}
          </NavLink>
        ))}

        <p className="px-3 pb-2 pt-6 text-[10px] font-medium uppercase tracking-[0.2em] text-faint">
          系统
        </p>
        {secondary.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] transition-colors',
                isActive ? 'bg-accent-soft text-ink' : 'text-muted hover:bg-surface-2 hover:text-ink',
              )
            }
          >
            {({ isActive }) => (
              <>
                <item.icon
                  size={17}
                  className={cn('shrink-0', isActive ? 'text-accent' : 'text-faint group-hover:text-ink-soft')}
                />
                <span>{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto space-y-3">
        {counts?.doing ? (
          <div className="rounded-2xl border border-line bg-surface-2/50 px-3.5 py-3">
            <p className="text-[10px] uppercase tracking-[0.18em] text-faint">正在追</p>
            <p className="mt-1 font-display text-2xl font-semibold text-ink">
              {counts.doing}
              <span className="ml-1 text-xs font-normal text-muted">部</span>
            </p>
          </div>
        ) : null}

        <Link
          to="/settings"
          className="flex items-start gap-2.5 rounded-2xl border border-line px-3.5 py-3 transition-colors hover:bg-surface-2"
        >
          <Cloud size={15} className={cn('mt-0.5 shrink-0', sync.enabled && sync.token ? 'text-teal' : 'text-faint')} />
          <span className="min-w-0">
            <span className="block text-[12px] font-medium text-ink-soft">GitHub 同步</span>
            <span className="mt-0.5 block truncate text-[10.5px] text-faint">
              {sync.enabled && sync.token
                ? lastSync
                  ? `上次同步 ${new Date(lastSync).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`
                  : '等待首次同步'
                : '未开启 · 点击配置'}
            </span>
          </span>
        </Link>

        <div className="flex items-center justify-between px-1">
          <button
            type="button"
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[11px] text-muted transition-colors hover:bg-surface-2 hover:text-ink"
          >
            {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
            {theme === 'light' ? '夜间' : '日间'}
          </button>
          <span className="text-[10px] text-faint">v0.1.0</span>
        </div>
      </div>
    </aside>
  )
}
