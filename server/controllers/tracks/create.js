import { createTrack } from '../../repository/tracks.js'

export default async function (req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { name, artist, s3_key } = req.body

  if (!name || !s3_key) {
    return res.status(400).json({ error: 'name and s3_key are required' })
  }

  try {
    const track = await createTrack({ name, artist, s3_key })
    res.status(201).json(track)
  } catch (error) {
    console.error('Error creating track:', error)
    res.status(500).json({ error: 'Failed to create track' })
  }
}
