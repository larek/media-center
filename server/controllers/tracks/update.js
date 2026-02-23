import { updateTrack, getTrackById } from '../../repository/tracks.js'
import { findOrCreateArtist } from '../../repository/artists.js'

export default async function (req, res) {
  if (req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const id = req.params.key

  if (!id) {
    return res.status(400).json({ error: 'Track ID is required' })
  }

  const { name, artist } = req.body

  if (name === undefined && artist === undefined) {
    return res.status(400).json({ error: 'At least one field (name or artist) is required' })
  }

  try {
    const updateData = {}

    if (name !== undefined) {
      updateData.name = name
    }

    if (artist !== undefined) {
      if (artist === null || artist === '') {
        updateData.artist_id = null
      } else {
        const artistRecord = await findOrCreateArtist(artist)
        updateData.artist_id = artistRecord.id
      }
    }

    const track = await updateTrack(id, updateData)

    if (!track) {
      return res.status(404).json({ error: 'Track not found' })
    }

    const fullTrack = await getTrackById(id)
    res.json(fullTrack)
  } catch (error) {
    console.error('Error updating track:', error)
    res.status(500).json({ error: 'Failed to update track' })
  }
}
