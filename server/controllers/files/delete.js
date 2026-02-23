import { deleteFile } from '../../s3.js'

/**
 * DELETE /files/delete/:key
 * Deletes a file from S3 bucket
 */
export default async function (req, res) {
  try {
    const key = decodeURIComponent(req.params.key)
    await deleteFile(key)
    res.json({ success: true })
  } catch (error) {
    console.error('Error deleting file:', error)
    res.status(500).json({ error: 'Failed to delete file' })
  }
}
