import { getAllTracks } from '../../repository/tracks.js'

export default async function (req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const tracks = await getAllTracks()
    res.json(tracks)
  } catch (error) {
    console.error('Error listing tracks:', error)
    res.status(500).json({ error: 'Failed to list tracks' })
  }
}
