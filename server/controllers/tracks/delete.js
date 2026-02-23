import { deleteTrack, getTrackById } from '../../repository/tracks.js'
import { deleteFile } from '../../s3.js'

export default async function (req, res) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const id = req.params.key

  if (!id) {
    return res.status(400).json({ error: 'Track ID is required' })
  }

  try {
    const track = await getTrackById(id)

    if (!track) {
      return res.status(404).json({ error: 'Track not found' })
    }

    await deleteFile(track.s3_key)
    await deleteTrack(id)

    res.json({ success: true })
  } catch (error) {
    console.error('Error deleting track:', error)
    res.status(500).json({ error: 'Failed to delete track' })
  }
}
