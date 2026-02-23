export function AudioPlayer({
  audioRef,
  isPlaying,
  duration,
  currentTime,
  volume,
  currentTrack,
  togglePlay,
  seek,
  changeVolume,
}) {
  const formatTime = (time) => {
    if (!time || !isFinite(time)) return '0:00'
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const handleProgressClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const percent = (e.clientX - rect.left) / rect.width
    seek(percent * duration)
  }

  const handleVolumeChange = (e) => {
    changeVolume(parseFloat(e.target.value))
  }

  const progress = duration ? (currentTime / duration) * 100 : 0

  return (
    <div className="bg-[var(--bg-secondary)] rounded-xl p-4 mb-6">
      <audio
        ref={audioRef}
        src={currentTrack ? `/api/files/stream/${encodeURIComponent(currentTrack.s3_key)}` : undefined}
      />

      <div className="flex items-center gap-4">
        <button
          onClick={togglePlay}
          disabled={!currentTrack}
          className={`
            w-12 h-12 rounded-full flex items-center justify-center transition-colors
            ${currentTrack
              ? 'bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white'
              : 'bg-[var(--text-secondary)]/20 text-[var(--text-secondary)] cursor-not-allowed'
            }
          `}
        >
          {isPlaying ? (
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
            </svg>
          ) : (
            <svg className="w-6 h-6 ml-1" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        <div className="flex-1 space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--text-secondary)]">{formatTime(currentTime)}</span>
            <span className="font-medium truncate mx-2">
              {currentTrack?.name || 'No track selected'}
            </span>
            <span className="text-[var(--text-secondary)]">{formatTime(duration)}</span>
          </div>

          <div
            onClick={handleProgressClick}
            className="h-2 bg-[var(--bg-primary)] rounded-full cursor-pointer group"
          >
            <div
              className="h-full bg-[var(--accent)] rounded-full relative transition-all"
              style={{ width: `${progress}%` }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 w-28">
          <svg className="w-5 h-5 text-[var(--text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
            />
          </svg>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={handleVolumeChange}
            className="w-full accent-[var(--accent)]"
          />
        </div>
      </div>
    </div>
  )
}
