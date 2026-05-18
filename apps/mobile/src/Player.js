import { Pressable, StyleSheet, Text, View } from 'react-native'
import TrackPlayer, {
  State,
  useActiveTrack,
  usePlaybackState,
  useProgress,
} from 'react-native-track-player'
import { formatTime } from '@video-player/shared'

export function Player() {
  const playbackState = usePlaybackState()
  const { position, duration } = useProgress()
  const activeTrack = useActiveTrack()

  const isPlaying = playbackState.state === State.Playing
  const hasTrack = !!activeTrack
  const progress = duration > 0 ? Math.min(position / duration, 1) : 0

  return (
    <View style={styles.container}>
      <Text style={styles.title} numberOfLines={1}>
        {activeTrack?.title || 'No track selected'}
      </Text>
      {activeTrack?.artist ? (
        <Text style={styles.artist} numberOfLines={1}>
          {activeTrack.artist}
        </Text>
      ) : null}

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
    backgroundColor: '#0e1621',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2a37',
  },
  title: { color: '#f3f4f6', fontSize: 16, fontWeight: '600' },
  artist: { color: '#9ca3af', fontSize: 13, marginTop: 2 },
  progressBar: {
    height: 4,
    backgroundColor: '#1f2a37',
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 14,
  },
  progressFill: { height: '100%', backgroundColor: '#3b82f6' },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  time: { color: '#9ca3af', fontSize: 12 },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    marginTop: 12,
  },
  sideButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sideIcon: { color: '#f3f4f6', fontSize: 22 },
  disabled: { opacity: 0.4 },
  playButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButtonDisabled: { backgroundColor: '#374151' },
  playIcon: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
})
