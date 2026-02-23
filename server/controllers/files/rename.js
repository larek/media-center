import { renameFile } from '../../s3.js'

/**
 * PATCH /files/rename/:key
 * Renames a file in S3 bucket
 * Body: { newName: string }
 */
export default async function (req, res) {
  try {
    const oldKey = decodeURIComponent(req.params.key)
    const { newName } = req.body

    if (!newName) {
      return res.status(400).json({ error: 'New name is required' })
    }

    await renameFile(oldKey, newName)
    res.json({ success: true, key: newName })
  } catch (error) {
    console.error('Error renaming file:', error)
    res.status(500).json({ error: 'Failed to rename file' })
  }
}
