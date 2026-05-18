import { useState, useEffect, useCallback, useRef } from 'react'
import { ThemeToggle } from './components/ThemeToggle.jsx'
import { AudioPlayer } from './components/AudioPlayer.jsx'
import { UploadForm } from './components/UploadForm.jsx'
import { useAudio } from './hooks/useAudio.js'
import { api } from './api.js'

export default function App() {
  const {
    audioRef,
    isPlaying,
    duration,
    currentTime,
    volume,
    currentTrack,
    play,
    togglePlay,
    seek,
    changeVolume,
    loadTrack,
  } = useAudio()

  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingKey, setEditingKey] = useState(null)
  const [editName, setEditName] = useState('')
  const [editArtist, setEditArtist] = useState('')
  const editInputRef = useRef(null)

  const fetchFiles = useCallback(async () => {
    try {
      const data = await api.listTracks()
      setFiles(data)
    } catch (error) {
      console.error('Error fetching files:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchFiles()
  }, [fetchFiles])

  useEffect(() => {
    if (editingKey && editInputRef.current) {
      editInputRef.current.focus()
      editInputRef.current.select()
    }
  }, [editingKey])

  const handleSelectTrack = (track) => {
    if (editingKey) return
    loadTrack(track)
    setTimeout(() => play(), 100)
  }

  const handleUploadComplete = () => {
    fetchFiles()
  }

  const handleDelete = async (track) => {
    if (!confirm(`Delete "${track.name}"?`)) return

    try {
      await api.deleteTrack(track.id)
      if (currentTrack?.id === track.id) {
        loadTrack(null)
      }
      fetchFiles()
    } catch (error) {
      console.error('Error deleting file:', error)
    }
  }

  const startEditing = (track, e) => {
    e.stopPropagation()
    setEditingKey(track.id)
    setEditName(track.name)
    setEditArtist(track.artist || '')
  }

  const cancelEditing = () => {
    setEditingKey(null)
    setEditName('')
    setEditArtist('')
  }

  const handleSaveEdit = async (track) => {
    const newName = editName.trim()
    const newArtist = editArtist.trim()

    if (!newName) {
      cancelEditing()
      return
    }

    const hasChanges = newName !== track.name || newArtist !== (track.artist || '')
    if (!hasChanges) {
      cancelEditing()
      return
    }

    try {
      await api.updateTrack(track.id, { name: newName, artist: newArtist })
      if (currentTrack?.id === track.id) {
        loadTrack({ ...currentTrack, name: newName, artist: newArtist || null })
      }
      fetchFiles()
    } catch (error) {
      console.error('Error updating track:', error)
    }

    cancelEditing()
  }

  const handleKeyDown = (e, track) => {
    if (e.key === 'Enter') {
      handleSaveEdit(track)
    } else if (e.key === 'Escape') {
      cancelEditing()
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] transition-colors">
      <div className="max-w-2xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Audio Player</h1>
          <ThemeToggle />
        </div>

        <AudioPlayer
          audioRef={audioRef}
          isPlaying={isPlaying}
          duration={duration}
          currentTime={currentTime}
          volume={volume}
          currentTrack={currentTrack}
          togglePlay={togglePlay}
          seek={seek}
          changeVolume={changeVolume}
        />

        <UploadForm onUploadComplete={handleUploadComplete} />

        <h2 className="text-lg font-semibold mb-3">Files</h2>

        {loading ? (
          <div className="text-center py-8 text-[var(--text-secondary)]">Loading...</div>
        ) : files.length === 0 ? (
          <div className="text-center py-8 text-[var(--text-secondary)]">No files uploaded yet</div>
        ) : (
          <div className="space-y-2">
            {files.map((track) => (
              <div
                key={track.id}
                onClick={() => handleSelectTrack(track)}
                className={`
                  flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors
                  ${currentTrack?.id === track.id
                    ? 'bg-[var(--accent)] text-white'
                    : 'bg-[var(--bg-secondary)] hover:bg-[var(--accent)]/20'
                  }
                `}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                    />
                  </svg>
                  <div className="min-w-0 flex-1">
                    {editingKey === track.id ? (
                      <div className="space-y-1" onClick={(e) => e.stopPropagation()}>
                        <input
                          ref={editInputRef}
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, track)}
                          placeholder="Track name"
                          className="w-full px-2 py-1 rounded bg-[var(--bg-primary)] text-[var(--text-primary)] border border-[var(--accent)] outline-none"
                        />
                        <input
                          type="text"
                          value={editArtist}
                          onChange={(e) => setEditArtist(e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, track)}
                          placeholder="Artist"
                          className="w-full px-2 py-1 rounded bg-[var(--bg-primary)] text-[var(--text-primary)] border border-[var(--border)] outline-none text-sm"
                        />
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleSaveEdit(track)}
                            className="px-2 py-1 text-xs rounded bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]"
                          >
                            Save
                          </button>
                          <button
                            onClick={cancelEditing}
                            className="px-2 py-1 text-xs rounded bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="font-medium truncate">{track.name}</p>
                        {track.artist && (
                          <p className={`text-sm ${currentTrack?.id === track.id ? 'text-white/70' : 'text-[var(--text-secondary)]'}`}>
                            {track.artist}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={(e) => startEditing(track, e)}
                    className={`
                      p-2 rounded-lg transition-colors
                      ${currentTrack?.id === track.id
                        ? 'hover:bg-white/20'
                        : 'hover:bg-[var(--accent)]/20 hover:text-[var(--accent)]'
                      }
                    `}
                    aria-label="Rename track"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(track)
                    }}
                    className={`
                      p-2 rounded-lg transition-colors
                      ${currentTrack?.id === track.id
                        ? 'hover:bg-white/20'
                        : 'hover:bg-red-500/20 hover:text-red-500'
                      }
                    `}
                    aria-label="Delete track"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
