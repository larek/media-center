import { Pressable, StyleSheet, Text, View } from 'react-native'
import TrackPlayer, {
  State,
  useActiveTrack,
  usePlaybackState,
  useProgress,
} from 'react-native-track-player'
import { formatTime } from '@video-player/shared'
import { useTheme } from './theme'

export function Player({ bottomInset = 0 }) {
  const { palette } = useTheme()
  const playbackState = usePlaybackState()
  const { position, duration } = useProgress()
  const activeTrack = useActiveTrack()

  const isPlaying = playbackState.state === State.Playing
  const hasTrack = !!activeTrack
  const progress = duration > 0 ? Math.min(position / duration, 1) : 0

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: palette.bgElevated,
          borderTopColor: palette.border,
          paddingBottom: 18 + bottomInset,
        },
      ]}
    >
      <View style={styles.row}>
        <View style={[styles.artwork, { backgroundColor: palette.artwork }]}>
          <Text style={[styles.artworkIcon, { color: palette.accent }]}>♪</Text>
        </View>
        <View style={styles.info}>
          <Text
            style={[styles.title, { color: palette.text }]}
            numberOfLines={1}
          >
            {activeTrack?.title || 'No track selected'}
          </Text>
          {activeTrack?.artist ? (
            <Text
              style={[styles.artist, { color: palette.textMuted }]}
              numberOfLines={1}
            >
              {activeTrack.artist}
            </Text>
          ) : null}
        </View>
      </View>

      <View
        style={[styles.progressBar, { backgroundColor: palette.progressTrack }]}
      >
        <View
          style={[
            styles.progressFill,
            { width: `${progress * 100}%`, backgroundColor: palette.progressFill },
          ]}
        />
      </View>
      <View style={styles.timeRow}>
        <Text style={[styles.time, { color: palette.textMuted }]}>
          {formatTime(position)}
        </Text>
        <Text style={[styles.time, { color: palette.textMuted }]}>
          {formatTime(duration)}
        </Text>
      </View>

      <View style={styles.controlsRow}>
        <Pressable
          onPress={() => TrackPlayer.skipToPrevious()}
          disabled={!hasTrack}
          style={[styles.sideButton, !hasTrack && styles.disabled]}
          hitSlop={8}
        >
          <Text style={[styles.sideIcon, { color: palette.text }]}>⏮</Text>
        </Pressable>
        <Pressable
          onPress={() => (isPlaying ? TrackPlayer.pause() : TrackPlayer.play())}
          disabled={!hasTrack}
          style={[
            styles.playButton,
            {
              backgroundColor: hasTrack ? palette.playButton : palette.border,
            },
          ]}
        >
          <Text style={[styles.playIcon, { color: palette.playIcon }]}>
            {isPlaying ? '❚❚' : '▶'}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => TrackPlayer.skipToNext()}
          disabled={!hasTrack}
          style={[styles.sideButton, !hasTrack && styles.disabled]}
          hitSlop={8}
        >
          <Text style={[styles.sideIcon, { color: palette.text }]}>⏭</Text>
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 14,
    borderTopWidth: 1,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  artwork: {
    width: 48,
    height: 48,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  artworkIcon: { fontSize: 22, fontWeight: '700' },
  info: { flex: 1, minWidth: 0 },
  title: { fontSize: 15, fontWeight: '700' },
  artist: { fontSize: 12, marginTop: 2 },
  progressBar: {
    height: 3,
    borderRadius: 1.5,
    overflow: 'hidden',
    marginTop: 16,
  },
  progressFill: { height: '100%' },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  time: { fontSize: 11 },
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
  sideIcon: { fontSize: 24 },
  disabled: { opacity: 0.3 },
  playButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: { fontSize: 18, fontWeight: '900' },
})
