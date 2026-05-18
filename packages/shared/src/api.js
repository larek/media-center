export function createApiClient({ baseUrl = '/api' } = {}) {
  const url = (path) => `${baseUrl}${path}`

  async function listTracks() {
    const res = await fetch(url('/tracks/list'))
    if (!res.ok) throw new Error(`listTracks failed: ${res.status}`)
    return res.json()
  }

  async function updateTrack(id, { name, artist }) {
    const res = await fetch(url(`/tracks/update/${id}`), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, artist: artist || null }),
    })
    if (!res.ok) throw new Error(`updateTrack failed: ${res.status}`)
    return res.json()
  }

  async function deleteTrack(id) {
    const res = await fetch(url(`/tracks/delete/${id}`), { method: 'DELETE' })
    if (!res.ok) throw new Error(`deleteTrack failed: ${res.status}`)
    return res.json()
  }

  function streamUrl(key) {
    return url(`/files/stream/${key}`)
  }

  function uploadProgressUrl(uploadId) {
    return url(`/files/upload-progress/${uploadId}`)
  }

  function uploadEndpoint() {
    return url('/files/upload')
  }

  return {
    baseUrl,
    listTracks,
    updateTrack,
    deleteTrack,
    streamUrl,
    uploadProgressUrl,
    uploadEndpoint,
  }
}
