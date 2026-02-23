import { getFileStream } from '../../s3.js'

/**
 * GET /files/stream/:key
 * Streams file from S3 with Range request support
 */
export default async function (req, res) {
  try {
    const key = decodeURIComponent(req.params.key)
    const range = req.headers.range

    const { stream, contentLength, contentType, fileSize, start, end } =
      await getFileStream(key, range)

    if (range) {
      res.status(206)
      res.set({
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': contentLength,
        'Content-Type': contentType,
      })
    } else {
      res.set({
        'Accept-Ranges': 'bytes',
        'Content-Length': fileSize,
        'Content-Type': contentType,
      })
    }

    stream.pipe(res)
  } catch (error) {
    console.error('Error streaming file:', error)
    res.status(500).json({ error: 'Failed to stream file' })
  }
}
