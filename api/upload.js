// Vercel Serverless Function — ImgBB upload proxy (server-side only).
// The ImgBB API key lives ONLY in the IMGBB_API_KEY environment variable
// (Vercel dashboard -> Settings -> Environment Variables). It must never be
// committed to the repo or shipped in frontend code — the key is a secret
// that anyone could reuse if it appeared in client-side JavaScript.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const key = process.env.IMGBB_API_KEY
  if (!key) return res.status(500).json({ error: 'Image upload is not configured (IMGBB_API_KEY missing)' })
  let body = req.body
  if (typeof body === 'string') {
    try { body = JSON.parse(body) } catch { return res.status(400).json({ error: 'Invalid JSON' }) }
  }
  const dataUrl = body?.image
  if (!dataUrl || typeof dataUrl !== 'string') return res.status(400).json({ error: 'No image provided' })
  const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl
  if (base64.length > 7_000_000) return res.status(413).json({ error: 'Image too large (max ~5 MB)' })
  const form = new FormData()
  form.append('key', key)
  form.append('image', base64)
  if (body?.name) form.append('name', String(body.name).slice(0, 100))
  let r
  try {
    r = await fetch('https://api.imgbb.com/1/upload', { method: 'POST', body: form })
  } catch {
    return res.status(502).json({ error: 'Could not reach ImgBB' })
  }
  const json = await r.json().catch(() => ({}))
  if (!r.ok || !json?.data?.url) return res.status(502).json({ error: json?.error?.message || 'ImgBB upload failed' })
  return res.status(200).json({ url: json.data.url })
}
