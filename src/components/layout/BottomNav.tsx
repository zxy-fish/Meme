import { NavLink } from 'react-router-dom'
import { BarChart3, Bookmark, BookOpen, LibraryBig, Settings2, StickyNote } from 'lucide-react'
import { cn } from '@/lib/utils'

const items = [
  { to: '/notes', label: '备忘录', icon: StickyNote },
  { to: '/', label: '媒体库', icon: LibraryBig },
  { to: '/bookmarks', label: '书签', icon: Bookmark },
  { to: '/books', label: '阅读', icon: BookOpen },
  { to: '/stats', label: '统计', icon: BarChart3 },
  { to: '/settings', label: '设置', icon: Settings2 },
]

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/85 backdrop-blur-2xl lg:hidden safe-bottom">
      <div className="mx-auto flex max-w-lg items-stretch justify-between px-2 pt-1.5">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              cn(
                'flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl py-1.5 text-[10px] transition-colors',
                isActive ? 'text-accent' : 'text-faint',
              )
            }
          >
            {({ isActive }) => (
              <>
                <item.icon size={20} strokeWidth={isActive ? 2.2 : 1.8} />
                <span className="truncate">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
