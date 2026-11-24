// Upload an image file through the server-side /api/upload proxy (ImgBB).
// The API key never leaves the server — the browser only talks to /api/upload.
// Returns { url, preview, error }: url is the hosted ImgBB URL on success;
// when the proxy is unavailable (e.g. local dev without env vars) url is
// null and preview is a local data URL so the form still works as a preview.
export async function uploadImage(file) {
  const dataUrl = await new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result)
    r.onerror = () => reject(new Error('read failed'))
    r.readAsDataURL(file)
  })
  try {
    const res = await fetch('/api/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: dataUrl, name: file.name }),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok || !json?.url) return { url: null, preview: dataUrl, error: json?.error || 'upload failed' }
    return { url: json.url, preview: json.url, error: null }
  } catch {
    return { url: null, preview: dataUrl, error: 'upload unavailable' }
  }
}
