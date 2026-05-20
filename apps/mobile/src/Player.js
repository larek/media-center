import { Pressable, StyleSheet, Text, View } from 'react-native'
import TrackPlayer, {
  State,
  useActiveTrack,
  usePlaybackState,
  useProgress,
} from 'react-native-track-player'
import { formatTime } from '@video-player/shared'

export function Player({ bottomInset = 0 }) {
  const playbackState = usePlaybackState()
  const { position, duration } = useProgress()
  const activeTrack = useActiveTrack()

  const isPlaying = playbackState.state === State.Playing
  const hasTrack = !!activeTrack
  const progress = duration > 0 ? Math.min(position / duration, 1) : 0

  return (
    <View style={[styles.container, { paddingBottom: 18 + bottomInset }]}>
      <View style={styles.row}>
        <View style={styles.artwork}>
          <Text style={styles.artworkIcon}>♪</Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={1}>
            {activeTrack?.title || 'No track selected'}
          </Text>
          {activeTrack?.artist ? (
            <Text style={styles.artist} numberOfLines={1}>
              {activeTrack.artist}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
      </View>
      <View style={styles.timeRow}>
        <Text style={styles.time}>{formatTime(position)}</Text>
        <Text style={styles.time}>{formatTime(duration)}</Text>
      </View>

      <View style={styles.controlsRow}>
        <Pressable
          onPress={() => TrackPlayer.skipToPrevious()}
          disabled={!hasTrack}
          style={[styles.sideButton, !hasTrack && styles.disabled]}
          hitSlop={8}
        >
          <Text style={styles.sideIcon}>⏮</Text>
        </Pressable>
        <Pressable
          onPress={() => (isPlaying ? TrackPlayer.pause() : TrackPlayer.play())}
          disabled={!hasTrack}
          style={[styles.playButton, !hasTrack && styles.playButtonDisabled]}
        >
          <Text style={styles.playIcon}>{isPlaying ? '❚❚' : '▶'}</Text>
        </Pressable>
        <Pressable
          onPress={() => TrackPlayer.skipToNext()}
          disabled={!hasTrack}
          style={[styles.sideButton, !hasTrack && styles.disabled]}
          hitSlop={8}
        >
          <Text style={styles.sideIcon}>⏭</Text>
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#181818',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 18,
    borderTopWidth: 1,
    borderTopColor: '#282828',
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  artwork: {
    width: 48,
    height: 48,
    borderRadius: 4,
    backgroundColor: '#282828',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  artworkIcon: { color: '#1DB954', fontSize: 22, fontWeight: '700' },
  info: { flex: 1, minWidth: 0 },
  title: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  artist: { color: '#B3B3B3', fontSize: 12, marginTop: 2 },
  progressBar: {
    height: 3,
    backgroundColor: '#4D4D4D',
    borderRadius: 1.5,
    overflow: 'hidden',
    marginTop: 16,
  },
  progressFill: { height: '100%', backgroundColor: '#FFFFFF' },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  time: { color: '#B3B3B3', fontSize: 11 },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 32,
    marginTop: 14,
  },
  sideButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sideIcon: { color: '#FFFFFF', fontSize: 24 },
  disabled: { opacity: 0.3 },
  playButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButtonDisabled: { backgroundColor: '#535353' },
  playIcon: { color: '#000000', fontSize: 18, fontWeight: '900' },
})
