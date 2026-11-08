import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  Cloud,
  Database,
  Download,
  ExternalLink,
  HardDrive,
  Image as ImageIcon,
  Code2,
  KeyRound,
  Loader2,
  Monitor,
  Moon,
  RefreshCw,
  Sun,
  Trash2,
  Upload,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Field, Input } from '@/components/ui/Input'
import { UpdatePanel } from '@/components/settings/UpdatePanel'
import { db, exportBackup, importBackup } from '@/lib/db'
import { clearCoverCache, purgeDeletedContent, resetLibrary } from '@/lib/repo'
import { syncNow, testConnection } from '@/lib/sync/github'
import { cn, relativeTime } from '@/lib/utils'
import { useSettings, type Theme } from '@/store/settings'
import { toast } from '@/store/toast'

type Message = { tone: 'ok' | 'error' | 'info'; text: string }

function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return '—'
  const units = ['B', 'KB', 'MB', 'GB']
  let value = bytes
  let index = 0
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024
    index += 1
  }
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[index]}`
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative h-6 w-11 shrink-0 rounded-full transition-colors',
        checked ? 'bg-accent' : 'bg-surface-3',
      )}
    >
      <span
        className={cn(
          'absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
          checked ? 'translate-x-5' : 'translate-x-0',
        )}
      />
    </button>
  )
}

const THEMES: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: 'dark', label: '深色', icon: Moon },
  { value: 'light', label: '浅色', icon: Sun },
  { value: 'system', label: '跟随系统', icon: Monitor },
]

export function SettingsPage() {
  const theme = useSettings((state) => state.theme)
  const setTheme = useSettings((state) => state.setTheme)
  const reader = useSettings((state) => state.reader)
  const tmdbKey = useSettings((state) => state.tmdbKey)
  const setTmdbKey = useSettings((state) => state.setTmdbKey)
  const sync = useSettings((state) => state.sync)
  const setSync = useSettings((state) => state.setSync)

  const [testing, setTesting] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [message, setMessage] = useState<Message>()
  const [lastSync, setLastSync] = useState(() => Number(localStorage.getItem('meme:lastSync') ?? 0))
  const [resetConfirm, setResetConfirm] = useState(false)
  const importRef = useRef<HTMLInputElement>(null)
  const [storage, setStorage] = useState<{ usage: number; quota: number }>()
  const counts = useLiveQuery(async () => {
    const [media, bookmarks, books, notes, pages, covers, contents] = await Promise.all([
      db.media.toArray(),
      db.bookmarks.toArray(),
      db.books.toArray(),
      db.notes.toArray(),
      db.pages.count(),
      db.covers.count(),
      db.contents.count(),
    ])
    return {
      media: media.filter((item) => !item.deletedAt).length,
      bookmarks: bookmarks.filter((item) => !item.deletedAt).length,
      books: books.filter((item) => !item.deletedAt).length,
      notes: notes.filter((item) => !item.deletedAt).length,
      deleted: books.filter((item) => item.deletedAt).length,
      pages,
      covers,
      contents,
    }
  }, []) ?? { media: 0, bookmarks: 0, books: 0, notes: 0, deleted: 0, pages: 0, covers: 0, contents: 0 }

  async function refreshStorage() {
    try {
      const estimate = await navigator.storage?.estimate?.()
      setStorage({ usage: estimate?.usage ?? 0, quota: estimate?.quota ?? 0 })
    } catch {
      setStorage({ usage: 0, quota: 0 })
    }
  }

  useEffect(() => {
    void refreshStorage()
  }, [])

  useEffect(() => {
    const onSynced = () => setLastSync(Number(localStorage.getItem('meme:lastSync') ?? 0))
    window.addEventListener('meme:synced', onSynced)
    return () => window.removeEventListener('meme:synced', onSynced)
  }, [])

  async function handleTest() {
    setTesting(true)
    setMessage(undefined)
    try {
      const info = await testConnection(sync)
      setMessage({ tone: 'ok', text: `连上了：${info}` })
    } catch (error) {
      setMessage({ tone: 'error', text: (error as Error).message })
    } finally {
      setTesting(false)
    }
  }

  async function handleSync() {
    setSyncing(true)
    setMessage({ tone: 'info', text: '正在和 GitHub 合并…' })
    try {
      const result = await syncNow(sync)
      setLastSync(result.at)
      setMessage({
        tone: 'ok',
        text: `同步完成：${result.media} 条目 / ${result.bookmarks} 书签 / ${result.books} 本书 / ${result.notes} 条备忘录。${result.pushed ? '已推送。' : ''}`,
      })
      toast('同步完成', 'success')
      window.dispatchEvent(new Event('meme:synced'))
    } catch (error) {
      setMessage({ tone: 'error', text: (error as Error).message })
      toast('同步失败', 'error')
    } finally {
      setSyncing(false)
    }
  }

  async function handleExport() {
    const backup = await exportBackup()
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    const date = new Date().toISOString().slice(0, 10)
    anchor.href = url
    anchor.download = `meme-backup-${date}.json`
    anchor.click()
    URL.revokeObjectURL(url)
    toast('备份已导出', 'success')
  }

  async function handleImport(file?: File) {
    if (!file) return
    try {
      const parsed = JSON.parse(await file.text())
      if (parsed?.app !== 'meme' || !Array.isArray(parsed.media)) {
        throw new Error('不是有效的 Meme 备份文件')
      }
      await importBackup(parsed)
      await refreshStorage()
      toast('备份已合并', 'success')
    } catch (error) {
      toast((error as Error).message || '导入失败', 'error')
    } finally {
      if (importRef.current) importRef.current.value = ''
    }
  }

  async function handleCleanup() {
    const result = await purgeDeletedContent()
    await refreshStorage()
    toast(
      result.books
        ? `已清理 ${result.books} 本已删除书籍和 ${result.pages} 页残留图片`
        : '没有需要清理的残留内容',
      'success',
    )
  }

  async function handleClearCovers() {
    await clearCoverCache()
    await refreshStorage()
    toast('封面缓存已清理', 'success')
  }

  async function handleReset() {
    if (!resetConfirm) {
      setResetConfirm(true)
      window.setTimeout(() => setResetConfirm(false), 4000)
      return
    }
    await resetLibrary()
    localStorage.setItem('meme:seeded:v1', '1')
    localStorage.setItem('meme:seed-tv:v2', '1')
    localStorage.setItem('meme:notes-seeded:v1', '1')
    toast('本地数据已清空', 'success')
    window.setTimeout(() => window.location.reload(), 500)
  }

  const repoUrl = `https://github.com/${sync.owner}/${sync.repo}`

  return (
    <div className="animate-fade-up">
      <header className="-mx-4 -mt-6 rounded-b-[2rem] px-4 pb-2 pt-6 sm:-mx-6 sm:px-6 lg:-mx-10 lg:-mt-10 lg:px-10 lg:pt-10">
        <div className="mx-auto max-w-3xl">
          <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-accent">Settings</p>
          <h1 className="mt-2 font-display text-[34px] font-semibold leading-[1.1] tracking-wide text-ink sm:text-[44px]">
            设置
          </h1>
          <p className="mt-2 text-[13px] text-muted">外观、元数据、同步与备份。</p>
        </div>
      </header>

      <div className="mx-auto mt-7 max-w-3xl space-y-4">
        <section className="rounded-2xl border border-line bg-surface/50 p-5">
          <div className="mb-4 flex items-center gap-2">
            <Sun size={15} className="text-accent" />
            <h2 className="text-[12px] font-medium uppercase tracking-[0.16em] text-faint">外观</h2>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {THEMES.map((entry) => (
              <button
                key={entry.value}
                type="button"
                onClick={() => setTheme(entry.value)}
                className={cn(
                  'flex flex-col items-center gap-2 rounded-xl border py-3 text-[12px] transition-colors',
                  theme === entry.value
                    ? 'border-accent bg-accent-soft text-accent'
                    : 'border-line text-muted hover:bg-surface-2',
                )}
              >
                <entry.icon size={17} />
                {entry.label}
              </button>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-faint">
            阅读器有自己的背景和字体，在阅读页右上角单独调。
          </p>
        </section>

        <section className="rounded-2xl border border-line bg-surface/50 p-5">
          <div className="mb-4 flex items-center gap-2">
            <KeyRound size={15} className="text-accent" />
            <h2 className="text-[12px] font-medium uppercase tracking-[0.16em] text-faint">元数据</h2>
          </div>
          <Field
            label="TMDB API Key"
            hint="电影 / 电视剧优先用；没有 Key 时自动走 Bangumi"
          >
            <Input
              type="password"
              value={tmdbKey}
              onChange={(event) => setTmdbKey(event.target.value)}
              placeholder="粘贴 v3 API Key 或 v4 Read Access Token"
            />
          </Field>
          <div className="mt-3 flex items-center gap-2 text-[11px] text-faint">
            <a
              href="https://www.themoviedb.org/settings/api"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-accent hover:underline"
            >
              去 TMDB 申请免费 Key
              <ExternalLink size={11} />
            </a>
            <span>·</span>
            <span>存在本机，不会上传</span>
          </div>
        </section>

        <section className="rounded-2xl border border-line bg-surface/50 p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Cloud size={15} className="text-accent" />
              <h2 className="text-[12px] font-medium uppercase tracking-[0.16em] text-faint">
                GitHub 同步
              </h2>
            </div>
            <Toggle
              checked={sync.enabled}
              onChange={(enabled) => setSync({ enabled })}
              label="开启自动同步"
            />
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Owner">
                <Input
                  value={sync.owner}
                  onChange={(event) => setSync({ owner: event.target.value })}
                  placeholder="zxy-fish"
                />
              </Field>
              <Field label="数据仓库">
                <Input
                  value={sync.repo}
                  onChange={(event) => setSync({ repo: event.target.value })}
                  placeholder="meme-data"
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="分支">
                <Input
                  value={sync.branch}
                  onChange={(event) => setSync({ branch: event.target.value })}
                  placeholder="main"
                />
              </Field>
              <Field label="文件路径">
                <Input
                  value={sync.path}
                  onChange={(event) => setSync({ path: event.target.value })}
                  placeholder="data/library.json"
                />
              </Field>
            </div>

            <Field label="GitHub Token" hint="需要该私有仓库的 Contents 读写权限">
              <Input
                type="password"
                value={sync.token}
                onChange={(event) => setSync({ token: event.target.value })}
                placeholder="github_pat_… 或 ghp_…"
              />
            </Field>

            <div className="flex flex-wrap items-center gap-2 text-[11px] text-faint">
              <a
                href="https://github.com/settings/tokens/new?scopes=repo&description=Meme%20Sync"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-accent hover:underline"
              >
                创建 Token
                <ExternalLink size={11} />
              </a>
              <span>·</span>
              <a href={repoUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-ink">
                {sync.owner}/{sync.repo}
                <ExternalLink size={10} />
              </a>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Button size="sm" variant="secondary" onClick={handleTest} disabled={testing || !sync.token}>
                {testing ? <Loader2 size={13} className="animate-spin" /> : <Code2 size={13} />}
                测试连接
              </Button>
              <Button
                size="sm"
                variant="primary"
                onClick={handleSync}
                disabled={syncing || !sync.token}
              >
                {syncing ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                立即同步
              </Button>
              <span className="ml-auto text-[10.5px] text-faint">
                {lastSync ? `上次同步 ${relativeTime(lastSync)}` : '还没有同步过'}
              </span>
            </div>

            {message ? (
              <p
                className={cn(
                  'rounded-xl border px-3 py-2 text-[11.5px]',
                  message.tone === 'ok' && 'border-ok/20 bg-ok/5 text-ok',
                  message.tone === 'error' && 'border-danger/20 bg-danger/5 text-danger',
                  message.tone === 'info' && 'border-accent/20 bg-accent-soft text-accent',
                )}
              >
                {message.text}
              </p>
            ) : null}

            <div className="rounded-xl bg-surface-2/60 px-3.5 py-3 text-[10.5px] leading-relaxed text-faint">
              <p>
                数据存在一个单独的私有仓库里，每次同步是一次 commit，历史就是备份。Token
                只保存在本机浏览器；换设备时重新填一次即可。
              </p>
              <p className="mt-1">
                自动同步：打开 App、切回前台、以及每 5 分钟检查一次。冲突按「更新时间较新」合并，删除也同步。
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-line bg-surface/50 p-5">
          <div className="mb-4 flex items-center gap-2">
            <Database size={15} className="text-accent" />
            <h2 className="text-[12px] font-medium uppercase tracking-[0.16em] text-faint">数据</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="secondary" onClick={handleExport}>
              <Download size={13} />
              导出备份
            </Button>
            <Button size="sm" variant="secondary" onClick={() => importRef.current?.click()}>
              <Upload size={13} />
              导入备份
            </Button>
            <Button size="sm" variant={resetConfirm ? 'danger' : 'ghost'} onClick={handleReset}>
              <Trash2 size={13} />
              {resetConfirm ? '再点一次清空' : '清空本地数据'}
            </Button>
            <input
              ref={importRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(event) => void handleImport(event.target.files?.[0])}
            />
          </div>
          <p className="mt-3 text-[11px] text-faint">
            当前：{counts.media} 条目 · {counts.bookmarks} 书签 · {counts.books} 本书 · {counts.notes} 条备忘录。导出包含条目、备忘录、阅读进度和阅读时长，不包含书籍正文。
          </p>
        </section>

        <section className="rounded-2xl border border-line bg-surface/50 p-5">
          <div className="mb-4 flex items-center gap-2">
            <HardDrive size={15} className="text-accent" />
            <h2 className="text-[12px] font-medium uppercase tracking-[0.16em] text-faint">存储</h2>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              { label: '浏览器已用', value: formatBytes(storage?.usage) },
              { label: '正文文件', value: `${counts.contents} 个` },
              { label: '漫画页', value: `${counts.pages} 页` },
              { label: '封面缓存', value: `${counts.covers} 张` },
            ].map((entry) => (
              <div key={entry.label} className="rounded-xl border border-line bg-surface-2/40 px-3 py-2.5">
                <p className="text-[10px] text-faint">{entry.label}</p>
                <p className="mt-0.5 font-display text-[16px] font-semibold text-ink">{entry.value}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button size="sm" variant="ghost" onClick={() => void refreshStorage()}>
              <RefreshCw size={13} />
              刷新
            </Button>
            <Button size="sm" variant="secondary" onClick={() => void handleCleanup()} disabled={!counts.deleted}>
              <Trash2 size={13} />
              清理已删除书籍{counts.deleted ? `（${counts.deleted}）` : ''}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => void handleClearCovers()} disabled={!counts.covers}>
              <ImageIcon size={13} />
              清空封面缓存
            </Button>
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-faint">
            删除书籍会先保留正文，方便误删恢复；清理后正文和漫画页会真正释放。封面缓存只存在本机，不参与同步。
            {storage?.quota
              ? ` 浏览器配额约 ${formatBytes(storage.quota)}。`
              : ''}
          </p>
        </section>

        <UpdatePanel />

        <section className="rounded-2xl border border-line bg-surface/50 p-5">
          <div className="mb-3 flex items-center gap-2">
            <Code2 size={15} className="text-accent" />
            <h2 className="text-[12px] font-medium uppercase tracking-[0.16em] text-faint">关于</h2>
          </div>
          <div className="flex items-center justify-between text-[11.5px]">
            <span className="text-muted">Meme · v{__APP_VERSION__}</span>
            <a
              href="https://github.com/zxy-fish/Meme"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-muted hover:text-accent"
            >
              源码
              <ExternalLink size={11} />
            </a>
          </div>
          <p className="mt-2 text-[10.5px] leading-relaxed text-faint">
            阅读排版：{reader.size}px / 行距 {reader.leading} / {reader.theme}。数据默认只存本机，开启同步后写入你的私有仓库。
          </p>
        </section>
      </div>
    </div>
  )
}
