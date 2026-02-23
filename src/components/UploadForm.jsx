import { useState, useRef } from 'react'

export function UploadForm({ onUploadComplete }) {
  const [isDragging, setIsDragging] = useState(false)
  const [uploadState, setUploadState] = useState({
    isUploading: false,
    stage: null, // 'server' | 's3'
    serverProgress: 0,
    s3Progress: 0,
  })
  const fileInputRef = useRef(null)
  const eventSourceRef = useRef(null)

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    const files = e.dataTransfer.files
    if (files.length > 0) {
      uploadFile(files[0])
    }
  }

  const handleFileSelect = (e) => {
    const files = e.target.files
    if (files.length > 0) {
      uploadFile(files[0])
    }
  }

  const resetUpload = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
    setUploadState({
      isUploading: false,
      stage: null,
      serverProgress: 0,
      s3Progress: 0,
    })
  }

  const uploadFile = async (file) => {
    if (!file.type.startsWith('audio/')) {
      alert('Please select an audio file')
      return
    }

    setUploadState({
      isUploading: true,
      stage: 'server',
      serverProgress: 0,
      s3Progress: 0,
    })

    const formData = new FormData()
    formData.append('file', file)

    try {
      const xhr = new XMLHttpRequest()

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 100)
          setUploadState((prev) => ({
            ...prev,
            serverProgress: progress,
          }))
        }
      })

      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          const response = JSON.parse(xhr.responseText)
          if (response.uploadId) {
            // Connect to SSE for S3 progress
            connectToSSE(response.uploadId)
          } else {
            // Legacy response without uploadId
            resetUpload()
            onUploadComplete?.()
          }
        } else {
          throw new Error('Upload failed')
        }
      })

      xhr.addEventListener('error', () => {
        resetUpload()
        alert('Upload failed')
      })

      xhr.open('POST', '/api/files/upload')
      xhr.send(formData)
    } catch (error) {
      console.error('Upload error:', error)
      resetUpload()
      alert('Upload failed')
    }
  }

  const connectToSSE = (uploadId) => {
    setUploadState((prev) => ({
      ...prev,
      stage: 's3',
      serverProgress: 100,
    }))

    const eventSource = new EventSource(`/api/files/upload-progress/${uploadId}`)
    eventSourceRef.current = eventSource

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data)

      setUploadState((prev) => ({
        ...prev,
        stage: data.stage,
        serverProgress: data.serverProgress,
        s3Progress: data.s3Progress,
      }))

      if (data.completed) {
        eventSource.close()
        eventSourceRef.current = null
        resetUpload()
        onUploadComplete?.()
      }

      if (data.error) {
        eventSource.close()
        eventSourceRef.current = null
        resetUpload()
        alert(data.error)
      }
    }

    eventSource.onerror = () => {
      eventSource.close()
      eventSourceRef.current = null
      // Don't reset - upload might still be processing
    }
  }

  const { isUploading, stage, serverProgress, s3Progress } = uploadState
  const totalProgress = stage === 'server'
    ? serverProgress * 0.5
    : 50 + s3Progress * 0.5

  return (
    <div className="mb-6">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center transition-colors
          ${isUploading ? 'cursor-default' : 'cursor-pointer'}
          ${isDragging
            ? 'border-[var(--accent)] bg-[var(--accent)]/10'
            : 'border-[var(--text-secondary)]/30 hover:border-[var(--accent)]'
          }
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          onChange={handleFileSelect}
          className="hidden"
        />

        {isUploading ? (
          <div className="space-y-4">
            {/* Total progress */}
            <div className="space-y-1">
              <p className="text-[var(--text-primary)] font-medium">
                {stage === 'server' ? 'Uploading to server...' : 'Uploading to cloud...'}
              </p>
              <div className="w-full bg-[var(--bg-secondary)] rounded-full h-3">
                <div
                  className="bg-[var(--accent)] h-3 rounded-full transition-all duration-300"
                  style={{ width: `${totalProgress}%` }}
                />
              </div>
              <p className="text-[var(--text-secondary)] text-sm">
                {Math.round(totalProgress)}%
              </p>
            </div>

            {/* Stage indicators */}
            <div className="flex justify-between text-sm">
              <div className={`flex items-center gap-2 ${serverProgress === 100 ? 'text-green-500' : 'text-[var(--text-secondary)]'}`}>
                <span className={`w-2 h-2 rounded-full ${serverProgress === 100 ? 'bg-green-500' : stage === 'server' ? 'bg-[var(--accent)] animate-pulse' : 'bg-[var(--text-secondary)]/30'}`} />
                Server {serverProgress}%
              </div>
              <div className={`flex items-center gap-2 ${s3Progress === 100 ? 'text-green-500' : 'text-[var(--text-secondary)]'}`}>
                <span className={`w-2 h-2 rounded-full ${s3Progress === 100 ? 'bg-green-500' : stage === 's3' ? 'bg-[var(--accent)] animate-pulse' : 'bg-[var(--text-secondary)]/30'}`} />
                Cloud {s3Progress}%
              </div>
            </div>
          </div>
        ) : (
          <>
            <svg
              className="w-12 h-12 mx-auto mb-2 text-[var(--text-secondary)]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <p className="text-[var(--text-secondary)]">
              Drag & drop audio file or click to select
            </p>
          </>
        )}
      </div>
    </div>
  )
}
