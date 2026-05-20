import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import TrackPlayer, { Event } from 'react-native-track-player'
import { api } from './src/api'
import { useDownloads } from './src/downloads'
import { Player } from './src/Player'
import { Settings } from './src/Settings'
import { useTheme } from './src/theme'
import { TrackList } from './src/TrackList'
import { setupPlayerOnce, tracksToRntpQueue } from './src/trackPlayer'

function tracksSignature(list, getLocalUri) {
  return list.map((t) => `${t.id}:${getLocalUri(t.id) ? 'L' : 'R'}`).join('|')
}

function filterTracks(tracks, query) {
  const q = query.trim().toLowerCase()
  if (!q) return tracks
  return tracks.filter(
    (t) =>
      t.name.toLowerCase().includes(q) ||
      (t.artist || '').toLowerCase().includes(q)
  )
}

export default function App() {
  const insets = useSafeAreaInsets()
  const { palette } = useTheme()
  const { getLocalUri } = useDownloads()
  const [tracks, setTracks] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentTrackId, setCurrentTrackId] = useState(null)
  const [search, setSearch] = useState('')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const queueSignatureRef = useRef(null)

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
      queueSignatureRef.current = null
    } catch (e) {
      Alert.alert('Failed to load tracks', String(e?.message ?? e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTracks()
  }, [fetchTracks])

  async function ensureQueueSynced() {
    await setupPlayerOnce()
    const signature = tracksSignature(tracks, getLocalUri)
    if (queueSignatureRef.current === signature) return
    const queue = tracksToRntpQueue(tracks, api.streamUrl, getLocalUri)
    await TrackPlayer.reset()
    await TrackPlayer.add(queue)
    queueSignatureRef.current = signature
  }

  async function handleSelect(track) {
    try {
      await ensureQueueSynced()
      const index = tracks.findIndex((t) => t.id === track.id)
      if (index < 0) return
      await TrackPlayer.skip(index)
      await TrackPlayer.play()
      setCurrentTrackId(track.id)
    } catch (e) {
      Alert.alert('Play failed', String(e?.message ?? e))
    }
  }

  const filteredTracks = useMemo(
    () => filterTracks(tracks, search),
    [tracks, search]
  )

  const currentTrack = tracks.find((t) => t.id === currentTrackId) || null

  return (
    <View style={[styles.root, { backgroundColor: palette.bg }]}>
      <StatusBar
        barStyle={palette.statusBarStyle}
        backgroundColor="transparent"
        translucent
      />
      <View style={{ height: insets.top, backgroundColor: palette.bg }} />

      <View style={[styles.header, { backgroundColor: palette.bg }]}>
        <Text style={[styles.headerText, { color: palette.text }]}>
          Your Library
        </Text>
        <Pressable
          onPress={() => setSettingsOpen(true)}
          hitSlop={8}
          style={styles.gearButton}
        >
          <Text style={[styles.gear, { color: palette.text }]}>⚙</Text>
        </Pressable>
      </View>

      <View style={[styles.searchWrap, { backgroundColor: palette.bgInput }]}>
        <Text style={[styles.searchIcon, { color: palette.textMuted }]}>⌕</Text>
        <TextInput
          style={[styles.search, { color: palette.text }]}
          placeholder="Search songs and artists"
          placeholderTextColor={palette.textMuted}
          value={search}
          onChangeText={setSearch}
          autoCorrect={false}
          autoCapitalize="none"
        />
        {search ? (
          <Pressable
            onPress={() => setSearch('')}
            hitSlop={8}
            style={styles.searchClear}
          >
            <Text style={[styles.searchClearText, { color: palette.textMuted }]}>
              ×
            </Text>
          </Pressable>
        ) : null}
      </View>

      {loading ? (
        <Text style={[styles.loading, { color: palette.textMuted }]}>
          Loading…
        </Text>
      ) : (
        <TrackList
          tracks={filteredTracks}
          currentTrack={currentTrack}
          onSelect={handleSelect}
        />
      )}

      <Player bottomInset={insets.bottom} />

      <Settings
        visible={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
  },
  headerText: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  gearButton: { padding: 4 },
  gear: { fontSize: 24 },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 12,
    height: 40,
    borderRadius: 4,
  },
  searchIcon: { fontSize: 18, marginRight: 8 },
  search: { flex: 1, fontSize: 15, paddingVertical: 0 },
  searchClear: { paddingHorizontal: 6 },
  searchClearText: { fontSize: 22, lineHeight: 24 },
  loading: { textAlign: 'center', marginTop: 32 },
})
