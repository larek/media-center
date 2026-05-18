import { useCallback, useEffect, useState } from 'react'
import { Alert, SafeAreaView, StatusBar, StyleSheet, Text, View } from 'react-native'
import TrackPlayer, { Event } from 'react-native-track-player'
import { api } from './src/api'
import { Player } from './src/Player'
import { TrackList } from './src/TrackList'
import { UploadButton } from './src/UploadButton'
import { setupPlayerOnce, tracksToRntpQueue } from './src/trackPlayer'

export default function App() {
  const [tracks, setTracks] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentTrackId, setCurrentTrackId] = useState(null)

  useEffect(() => {
    setupPlayerOnce().catch((e) => console.warn('TrackPlayer setup failed', e))
  }, [])

  useEffect(() => {
    const sub = TrackPlayer.addEventListener(
      Event.PlaybackActiveTrackChanged,
      (e) => {
        const id = e?.track?.id
        if (id != null) setCurrentTrackId(Number(id))
      }
    )
    return () => sub.remove()
  }, [])

  const fetchTracks = useCallback(async () => {
    try {
      const data = await api.listTracks()
      setTracks(data)
    } catch (e) {
      Alert.alert('Failed to load tracks', String(e?.message ?? e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTracks()
  }, [fetchTracks])

  async function handleSelect(track) {
    try {
      await setupPlayerOnce()
      const index = tracks.findIndex((t) => t.id === track.id)
      if (index < 0) return
      const queue = tracksToRntpQueue(tracks, api.streamUrl)
      await TrackPlayer.reset()
      await TrackPlayer.add(queue)
      await TrackPlayer.skip(index)
      await TrackPlayer.play()
      setCurrentTrackId(track.id)
    } catch (e) {
      Alert.alert('Play failed', String(e?.message ?? e))
    }
  }

  async function handleDelete(track) {
    try {
      await api.deleteTrack(track.id)
      if (currentTrackId === track.id) {
        await TrackPlayer.reset()
        setCurrentTrackId(null)
      }
      fetchTracks()
    } catch (e) {
      Alert.alert('Delete failed', String(e?.message ?? e))
    }
  }

  const currentTrack = tracks.find((t) => t.id === currentTrackId) || null

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0e1621" />
      <View style={styles.header}>
        <Text style={styles.headerText}>Audio Player</Text>
      </View>

      <Player />
      <UploadButton onUploaded={fetchTracks} />

      {loading ? (
        <Text style={styles.loading}>Loading…</Text>
      ) : (
        <TrackList
          tracks={tracks}
          currentTrack={currentTrack}
          onSelect={handleSelect}
          onDelete={handleDelete}
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#17212b' },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: '#0e1621',
  },
  headerText: { color: '#f3f4f6', fontSize: 20, fontWeight: '700' },
  loading: { color: '#9ca3af', textAlign: 'center', marginTop: 32 },
})
