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
import { useNavigation } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { MessageCircle, Settings as SettingsIcon } from 'lucide-react-native'
import TrackPlayer, { Event } from 'react-native-track-player'
import { api } from './api'
import { useDownloads } from './downloads'
import { Player } from './Player'
import { useTheme } from './theme'
import { TrackList } from './TrackList'
import { setupPlayerOnce, tracksToRntpQueue } from './trackPlayer'

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

export function Home() {
  const navigation = useNavigation()
  const insets = useSafeAreaInsets()
  const { palette } = useTheme()
  const { getLocalUri } = useDownloads()
  const [tracks, setTracks] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentTrackId, setCurrentTrackId] = useState(null)
  const [search, setSearch] = useState('')
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
        <View style={styles.headerActions}>
          <Pressable
            onPress={() => navigation.navigate('Bot')}
            hitSlop={8}
            style={styles.headerButton}
          >
            <MessageCircle size={24} color={palette.text} strokeWidth={2} />
          </Pressable>
          <Pressable
            onPress={() => navigation.navigate('Settings')}
            hitSlop={8}
            style={styles.headerButton}
          >
            <SettingsIcon size={24} color={palette.text} strokeWidth={2} />
          </Pressable>
        </View>
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
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerButton: { padding: 4 },
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
