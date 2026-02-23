import { listFiles } from '../../s3.js'

/**
 * GET /files/list
 * Returns list of all files in S3 bucket
 */
export default async function (req, res) {
  try {
    const files = await listFiles()
    res.json(files)
  } catch (error) {
    console.error('Error listing files:', error)
    res.status(500).json({ error: 'Failed to list files' })
  }
}
