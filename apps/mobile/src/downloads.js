import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import * as FileSystem from 'expo-file-system/legacy'

const TRACKS_DIR = FileSystem.documentDirectory + 'tracks/'

function getExt(s3Key) {
  const m = s3Key.match(/\.([a-z0-9]+)$/i)
  return m ? m[1].toLowerCase() : 'mp3'
}

function fileUriFor(track) {
  return `${TRACKS_DIR}${track.id}.${getExt(track.s3_key)}`
}

async function ensureDir() {
  const info = await FileSystem.getInfoAsync(TRACKS_DIR)
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(TRACKS_DIR, { intermediates: true })
  }
}

const DownloadsContext = createContext(null)

export function DownloadsProvider({ children }) {
  const [downloads, setDownloads] = useState({})
  const resumablesRef = useRef({})

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        await ensureDir()
        const files = await FileSystem.readDirectoryAsync(TRACKS_DIR)
        if (cancelled) return
        const next = {}
        for (const filename of files) {
          const idMatch = filename.match(/^(\d+)\./)
          if (!idMatch) continue
          const uri = TRACKS_DIR + filename
          const info = await FileSystem.getInfoAsync(uri)
          if (cancelled) return
          next[Number(idMatch[1])] = {
            status: 'done',
            progress: 1,
            uri,
            size: info.size || 0,
          }
        }
        setDownloads(next)
      } catch (e) {
        console.warn('Downloads init failed', e)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const download = useCallback(
    async (track, remoteUrl) => {
      const cur = downloads[track.id]
      if (cur?.status === 'done' || cur?.status === 'downloading') return

      await ensureDir()
      const fileUri = fileUriFor(track)

      setDownloads((d) => ({
        ...d,
        [track.id]: { status: 'downloading', progress: 0, uri: null },
      }))

      let lastEmit = 0
      let lastProgress = -1
      const resumable = FileSystem.createDownloadResumable(
        remoteUrl,
        fileUri,
        {},
        (p) => {
          const total = p.totalBytesExpectedToWrite || 0
          const progress =
            total > 0 ? Math.min(1, p.totalBytesWritten / total) : 0
          const now = Date.now()
          const isFinal = progress >= 1
          if (
            !isFinal &&
            (now - lastEmit < 120 || Math.abs(progress - lastProgress) < 0.01)
          ) {
            return
          }
          lastEmit = now
          lastProgress = progress
          setDownloads((d) => ({
            ...d,
            [track.id]: {
              status: 'downloading',
              progress,
              uri: null,
            },
          }))
        }
      )
      resumablesRef.current[track.id] = resumable

      try {
        const result = await resumable.downloadAsync()
        delete resumablesRef.current[track.id]
        if (!result) {
          setDownloads((d) => {
            const { [track.id]: _, ...rest } = d
            return rest
          })
          return
        }
        const info = await FileSystem.getInfoAsync(result.uri)
        setDownloads((d) => ({
          ...d,
          [track.id]: {
            status: 'done',
            progress: 1,
            uri: result.uri,
            size: info.size || 0,
          },
        }))
      } catch (e) {
        delete resumablesRef.current[track.id]
        setDownloads((d) => ({
          ...d,
          [track.id]: {
            status: 'error',
            progress: 0,
            uri: null,
            error: String(e?.message ?? e),
          },
        }))
      }
    },
    [downloads]
  )

  const cancelDownload = useCallback(async (trackId) => {
    const r = resumablesRef.current[trackId]
    if (r) {
      try {
        await r.pauseAsync()
      } catch {}
      delete resumablesRef.current[trackId]
    }
    try {
      const fileUri = fileUriFor({ id: trackId, s3_key: '.dat' })
      await FileSystem.deleteAsync(fileUri, { idempotent: true })
    } catch {}
    setDownloads((d) => {
      const { [trackId]: _, ...rest } = d
      return rest
    })
  }, [])

  const deleteDownload = useCallback(
    async (trackId) => {
      const cur = downloads[trackId]
      if (cur?.uri) {
        try {
          await FileSystem.deleteAsync(cur.uri, { idempotent: true })
        } catch {}
      }
      setDownloads((d) => {
        const { [trackId]: _, ...rest } = d
        return rest
      })
    },
    [downloads]
  )

  const getLocalUri = useCallback(
    (trackId) => {
      const d = downloads[trackId]
      return d?.status === 'done' ? d.uri : null
    },
    [downloads]
  )

  const clearAll = useCallback(async () => {
    for (const r of Object.values(resumablesRef.current)) {
      try {
        await r.pauseAsync()
      } catch {}
    }
    resumablesRef.current = {}
    try {
      await FileSystem.deleteAsync(TRACKS_DIR, { idempotent: true })
      await ensureDir()
    } catch (e) {
      console.warn('clearAll failed', e)
    }
    setDownloads({})
  }, [])

  const totalSize = useMemo(() => {
    let total = 0
    for (const d of Object.values(downloads)) {
      if (d.status === 'done') total += d.size || 0
    }
    return total
  }, [downloads])

  const downloadedCount = useMemo(
    () => Object.values(downloads).filter((d) => d.status === 'done').length,
    [downloads]
  )

  const value = useMemo(
    () => ({
      downloads,
      download,
      cancelDownload,
      deleteDownload,
      getLocalUri,
      clearAll,
      totalSize,
      downloadedCount,
    }),
    [
      downloads,
      download,
      cancelDownload,
      deleteDownload,
      getLocalUri,
      clearAll,
      totalSize,
      downloadedCount,
    ]
  )

  return (
    <DownloadsContext.Provider value={value}>
      {children}
    </DownloadsContext.Provider>
  )
}

export function useDownloads() {
  const ctx = useContext(DownloadsContext)
  if (!ctx) throw new Error('useDownloads must be used inside DownloadsProvider')
  return ctx
}
