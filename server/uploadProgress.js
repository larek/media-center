import { EventEmitter } from 'events'

class UploadProgressStore extends EventEmitter {
  constructor() {
    super()
    this.uploads = new Map()
  }

  create(uploadId, totalSize) {
    this.uploads.set(uploadId, {
      stage: 'server', // 'server' | 's3'
      serverProgress: 0,
      s3Progress: 0,
      totalSize,
      error: null,
      completed: false,
    })
  }

  updateServerProgress(uploadId, loaded, total) {
    const upload = this.uploads.get(uploadId)
    if (upload) {
      upload.serverProgress = Math.round((loaded / total) * 100)
      this.emit(`progress:${uploadId}`, this.getStatus(uploadId))
    }
  }

  startS3Upload(uploadId) {
    const upload = this.uploads.get(uploadId)
    if (upload) {
      upload.stage = 's3'
      upload.serverProgress = 100
      this.emit(`progress:${uploadId}`, this.getStatus(uploadId))
    }
  }

  updateS3Progress(uploadId, loaded, total) {
    const upload = this.uploads.get(uploadId)
    if (upload) {
      upload.s3Progress = Math.round((loaded / total) * 100)
      this.emit(`progress:${uploadId}`, this.getStatus(uploadId))
    }
  }

  complete(uploadId, track) {
    const upload = this.uploads.get(uploadId)
    if (upload) {
      upload.completed = true
      upload.s3Progress = 100
      upload.track = track
      this.emit(`progress:${uploadId}`, this.getStatus(uploadId))
      // Cleanup after 30 seconds
      setTimeout(() => this.uploads.delete(uploadId), 30000)
    }
  }

  setError(uploadId, error) {
    const upload = this.uploads.get(uploadId)
    if (upload) {
      upload.error = error
      this.emit(`progress:${uploadId}`, this.getStatus(uploadId))
      setTimeout(() => this.uploads.delete(uploadId), 30000)
    }
  }

  getStatus(uploadId) {
    const upload = this.uploads.get(uploadId)
    if (!upload) return null
    return { ...upload }
  }

  subscribe(uploadId, callback) {
    const event = `progress:${uploadId}`
    this.on(event, callback)
    return () => this.off(event, callback)
  }
}

export const uploadProgress = new UploadProgressStore()
