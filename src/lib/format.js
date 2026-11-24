export const formatTaka = (n) => '৳' + Number(n || 0).toLocaleString('en-US')
export const formatNumber = (n) => Number(n || 0).toLocaleString('en-US')
export const uid = (prefix = 'id') => prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
export const idempotencyKey = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : uid('key'))
export const clamp = (n, min, max) => Math.min(max, Math.max(min, n))
export const timeAgo = (iso) => {
  const d = new Date(iso)
  if (isNaN(d)) return ''
  const s = Math.floor((Date.now() - d.getTime()) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return Math.floor(s / 60) + ' min ago'
  if (s < 86400) return Math.floor(s / 3600) + ' hr ago'
  return d.toLocaleDateString('en-GB')
}
