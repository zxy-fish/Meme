import { useEffect, useState } from 'react'
import { Loader2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { Field, Input, Textarea } from '@/components/ui/Input'
import { createBookmark, deleteBookmark, updateBookmark } from '@/lib/repo'
import type { Bookmark } from '@/lib/types'
import { hostname, normalizeUrl, parseTags } from '@/lib/utils'
import { toast } from '@/store/toast'

export function BookmarkDialog({
  open,
  onClose,
  initial,
}: {
  open: boolean
  onClose: () => void
  initial?: Bookmark
}) {
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState('')
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (!open) return
    setUrl(initial?.url ?? '')
    setTitle(initial?.title ?? '')
    setDescription(initial?.description ?? '')
    setTags(initial?.tags.join(', ') ?? '')
    setConfirmDelete(false)
  }, [open, initial])

  async function save() {
    const normalized = normalizeUrl(url)
    if (!normalized) {
      toast('先填一个网址', 'error')
      return
    }
    try {
      new URL(normalized)
    } catch {
      toast('网址格式不太对', 'error')
      return
    }
    setSaving(true)
    try {
      const payload = {
        url: normalized,
        title: title.trim() || hostname(normalized),
        description: description.trim() || undefined,
        tags: parseTags(tags),
        favicon: `https://www.google.com/s2/favicons?domain=${hostname(normalized)}&sz=64`,
      }
      if (initial) {
        await updateBookmark(initial.id, payload)
        toast('书签已更新', 'success')
      } else {
        await createBookmark(payload)
        toast('书签已保存', 'success')
      }
      onClose()
    } catch (error) {
      toast((error as Error).message || '保存失败', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    if (!initial) return
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    await deleteBookmark(initial.id)
    toast('书签已删除', 'success')
    onClose()
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={initial ? '编辑书签' : '添加书签'}
      description="网址、标题、标签。标题留空就用域名。"
      footer={
        <div className="flex items-center justify-between gap-3">
          {initial ? (
            <Button
              variant={confirmDelete ? 'danger' : 'ghost'}
              size="sm"
              onClick={remove}
              type="button"
            >
              <Trash2 size={14} />
              {confirmDelete ? '再点一次确认' : '删除'}
            </Button>
          ) : (
            <span />
          )}
          <Button variant="primary" onClick={save} disabled={saving}>
            {saving ? <Loader2 size={15} className="animate-spin" /> : null}
            {initial ? '保存修改' : '保存书签'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <Field label="网址">
          <Input
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://bgm.tv"
            autoFocus
          />
        </Field>
        <Field label="标题">
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="留空则使用域名"
          />
        </Field>
        <Field label="描述">
          <Textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="一句话说明这个网站是干什么的"
            rows={3}
          />
        </Field>
        <Field label="标签" hint="用逗号或空格分隔">
          <Input
            value={tags}
            onChange={(event) => setTags(event.target.value)}
            placeholder="番剧, 数据库"
          />
        </Field>
      </div>
    </Dialog>
  )
}
