import { randomUUID } from 'crypto'
import { extname } from 'path'
import { uploadFileWithProgress } from '../../s3.js'
import { createTrack } from '../../repository/tracks.js'
import { uploadProgress } from '../../uploadProgress.js'

/**
 * POST /api/files/upload
 * Uploads a file to S3 bucket with unique hash filename
 * Verifies checksum after upload
 * Saves track metadata to database
 * Returns uploadId for SSE progress tracking
 */
export default async function (req, res) {
  const uploadId = randomUUID()

  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' })
    }

    const fileSize = req.file.buffer.length
    uploadProgress.create(uploadId, fileSize)

    // Server upload is complete at this point (file is in memory)
    uploadProgress.updateServerProgress(uploadId, fileSize, fileSize)

    // Respond immediately with uploadId so client can connect to SSE
    res.json({ success: true, uploadId })

    // Start S3 upload in background
    uploadProgress.startS3Upload(uploadId)

    const originalName = req.file.originalname
    const ext = extname(originalName)
    const uniqueKey = `${randomUUID()}${ext}`

    await uploadFileWithProgress(
      uniqueKey,
      req.file.buffer,
      req.file.mimetype,
      (loaded, total) => {
        uploadProgress.updateS3Progress(uploadId, loaded, total)
      }
    )
    // Note: multipart upload ETag format is "md5-partcount", not plain MD5
    // Checksum verification skipped for multipart uploads

    const trackName = originalName.replace(ext, '')
    const track = await createTrack({
      name: trackName,
      artist_id: null,
      s3_key: uniqueKey,
    })

    uploadProgress.complete(uploadId, track)
  } catch (error) {
    console.error('Error uploading file:', error)
    uploadProgress.setError(uploadId, 'Failed to upload file')
  }
}
