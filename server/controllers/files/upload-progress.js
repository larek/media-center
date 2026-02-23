import { uploadProgress } from '../../uploadProgress.js'

/**
 * GET /api/files/upload-progress/:uploadId
 * SSE endpoint for upload progress
 */
export default async function (req, res) {
  const uploadId = req.params.key

  if (!uploadId) {
    return res.status(400).json({ error: 'Upload ID required' })
  }

  // SSE headers
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  res.flushHeaders()

  // Send current status immediately
  const currentStatus = uploadProgress.getStatus(uploadId)
  if (currentStatus) {
    res.write(`data: ${JSON.stringify(currentStatus)}\n\n`)
  }

  // Subscribe to updates
  const unsubscribe = uploadProgress.subscribe(uploadId, (status) => {
    res.write(`data: ${JSON.stringify(status)}\n\n`)

    // Close connection when completed or error
    if (status.completed || status.error) {
      res.end()
    }
  })

  // Handle client disconnect
  req.on('close', () => {
    unsubscribe()
  })
}
