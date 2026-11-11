import { useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2, Download, Loader2, RefreshCw, Rocket } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { canSelfUpdate, desktopBridge, type UpdateState } from '@/lib/desktop'
import { androidUpdateVersion, checkAndroidUpdate, isAndroidApp, startAndroidUpdate } from '@/lib/android-update'

const RELEASES_URL = 'https://github.com/zxy-fish/Meme/releases/latest'

function StatusLine({ state }: { state: UpdateState }) {
  switch (state.status) {
    case 'checking':
      return <span className="text-muted">正在检查更新…</span>
    case 'latest':
      return (
        <span className="inline-flex items-center gap-1 text-muted">
          <CheckCircle2 size={12} className="text-accent" />
          已是最新版本
        </span>
      )
    case 'available':
      return <span className="text-ink">发现新版本 v{state.version}</span>
    case 'downloading':
      return <span className="text-ink">正在下载 {state.percent ?? 0}%</span>
    case 'downloaded':
      return (
        <span className="inline-flex items-center gap-1 text-ink">
          <CheckCircle2 size={12} className="text-accent" />
          v{state.version} 已下载，重启后生效
        </span>
      )
    case 'installing':
      return <span className="text-ink">正在安装，应用即将重启…</span>
    case 'error':
      return (
        <span className="inline-flex items-center gap-1 text-danger">
          <AlertTriangle size={12} />
          更新失败
        </span>
      )
    case 'unsupported':
      return <span className="text-muted">当前环境不支持自动更新</span>
    default:
      return <span className="text-muted">还没检查过</span>
  }
}

export function UpdatePanel() {
  const [state, setState] = useState<UpdateState>({ status: 'idle' })
  const [busy, setBusy] = useState(false)
  const [version, setVersion] = useState<string>()

  useEffect(() => {
    if (isAndroidApp) {
      setVersion(__APP_VERSION__)
      return
    }
    if (!canSelfUpdate || !desktopBridge) return
    let alive = true
    void desktopBridge.appInfo().then((info) => {
      if (alive) setVersion(info.version)
    })
    void desktopBridge.updates.getState().then((next) => {
      if (alive) setState(next)
    })
    const off = desktopBridge.updates.onState((next) => setState(next))
    return () => {
      alive = false
      off()
    }
  }, [])

  // The web build updates itself through the service worker, so this card only
  // exists in the desktop shell and the Android app.
  if (isAndroidApp) {
    // fall through to the shared renderer below
  } else if (!canSelfUpdate || !desktopBridge) {
    return null
  }

  const checking =
    busy ||
    state.status === 'checking' ||
    state.status === 'downloading' ||
    state.status === 'installing'

  async function check() {
    setBusy(true)
    try {
      if (isAndroidApp) {
        setState(await checkAndroidUpdate())
        return
      }
      setState(await desktopBridge!.updates.check())
    } catch (error) {
      setState({ status: 'error', message: error instanceof Error ? error.message : String(error) })
    } finally {
      setBusy(false)
    }
  }

  async function download() {
    setBusy(true)
    try {
      if (isAndroidApp) {
        setState({ status: 'downloading', percent: 0 })
        await startAndroidUpdate((percent) => setState({ status: 'downloading', percent }))
        setState({ status: 'installing', version: androidUpdateVersion(), percent: 100 })
        return
      }
      setState(await desktopBridge!.updates.download())
    } catch (error) {
      setState({ status: 'error', message: error instanceof Error ? error.message : String(error) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="rounded-2xl border border-line bg-surface/50 p-5">
      <div className="mb-3 flex items-center gap-2">
        <Rocket size={15} className="text-accent" />
        <h2 className="text-[12px] font-medium uppercase tracking-[0.16em] text-faint">应用更新</h2>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-[11.5px]">
        <span className="text-ink-soft">
          当前 v{version ?? '—'}
          <span className="mx-2 text-faint">·</span>
          <StatusLine state={state} />
        </span>
        <div className="flex items-center gap-2">
          {state.status === 'available' ? (
            <Button size="sm" variant="primary" onClick={() => void download()} disabled={busy}>
              {busy ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
              {isAndroidApp ? '下载并安装' : '下载更新'}
            </Button>
          ) : state.status === 'downloaded' ? (
            <Button size="sm" variant="primary" onClick={() => void desktopBridge!.updates.install()}>
              <Rocket size={13} />
              重启并安装
            </Button>
          ) : (
            <Button size="sm" variant="secondary" onClick={() => void check()} disabled={checking}>
              {checking ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
              检查更新
            </Button>
          )}
        </div>
      </div>

      {state.status === 'downloading' ? (
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-surface-2">
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-300"
            style={{ width: `${Math.max(state.percent ?? 0, 2)}%` }}
          />
        </div>
      ) : null}

      {state.status === 'error' ? (
        <p className="mt-3 text-[10.5px] leading-relaxed text-faint">
          {state.message ? `${state.message}。` : ''}
          也可以到下载页手动更新。
          <a
            href={RELEASES_URL}
            target="_blank"
            rel="noreferrer"
            className="ml-1 text-accent hover:underline"
          >
            打开下载页
          </a>
        </p>
      ) : (
        <p className="mt-3 text-[10.5px] leading-relaxed text-faint">
          {isAndroidApp
            ? '新版本会下载到应用缓存并校验 sha256，然后交给系统安装器；点「安装」即可覆盖升级。网页版无需手动更新。'
            : '新版本会先在后台下载并校验；点「重启并安装」后应用会自动替换并重新打开。网页版无需手动更新。'}
        </p>
      )}
    </section>
  )
}
