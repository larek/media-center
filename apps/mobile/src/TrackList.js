import { useEffect, useRef, useState } from 'react'
import {
  Alert,
  Animated,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { api } from './api'
import { useDownloads } from './downloads'
import { useTheme } from './theme'

export function TrackList({ tracks, currentTrack, onSelect }) {
  const { palette } = useTheme()
  const { downloads, download, cancelDownload, deleteDownload } = useDownloads()

  function handleDownloadTap(track) {
    const state = downloads[track.id]
    if (!state) {
      download(track, api.streamUrl(encodeURIComponent(track.s3_key)))
    } else if (state.status === 'downloading') {
      cancelDownload(track.id)
    } else if (state.status === 'done') {
      Alert.alert('Remove download?', `${track.name} will be streamed online.`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => deleteDownload(track.id),
        },
      ])
    } else if (state.status === 'error') {
      download(track, api.streamUrl(encodeURIComponent(track.s3_key)))
    }
  }

  return (
    <FlatList
      data={tracks}
      keyExtractor={(t) => String(t.id)}
      contentContainerStyle={styles.list}
      ListEmptyComponent={
        <Text style={[styles.empty, { color: palette.textMuted }]}>
          No tracks
        </Text>
      }
      renderItem={({ item }) => {
        const active = currentTrack?.id === item.id
        const dl = downloads[item.id]
        return (
          <Pressable
            onPress={() => onSelect(item)}
            android_ripple={{ color: palette.border }}
            style={styles.row}
          >
            {dl?.status === 'downloading' ? (
              <RowProgressFill
                progress={dl.progress}
                color={palette.accent}
              />
            ) : null}
            <View style={[styles.artwork, { backgroundColor: palette.artwork }]}>
              <Text style={[styles.artworkIcon, { color: palette.artworkIcon }]}>
                ♪
              </Text>
            </View>
            <View style={styles.rowInfo}>
              <Text
                style={[
                  styles.title,
                  { color: active ? palette.accent : palette.text },
                ]}
                numberOfLines={1}
              >
                {item.name}
              </Text>
              {item.artist || item.album ? (
                <Text
                  style={[styles.artist, { color: palette.textMuted }]}
                  numberOfLines={1}
                >
                  {[item.artist, item.album].filter(Boolean).join(' · ')}
                </Text>
              ) : null}
            </View>
            {active ? (
              <Text style={[styles.activeMark, { color: palette.accent }]}>
                ♪
              </Text>
            ) : null}
            <DownloadButton
              state={dl}
              palette={palette}
              onPress={() => handleDownloadTap(item)}
            />
          </Pressable>
        )
      }}
    />
  )
}

function RowProgressFill({ progress, color }) {
  const [width, setWidth] = useState(0)
  const animated = useRef(new Animated.Value(progress)).current

  useEffect(() => {
    Animated.timing(animated, {
      toValue: Math.max(0, Math.min(1, progress)),
      duration: 150,
      useNativeDriver: true,
    }).start()
  }, [progress, animated])

  const translateX = animated.interpolate({
    inputRange: [0, 1],
    outputRange: [-width / 2, 0],
  })

  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      pointerEvents="none"
      style={styles.fillContainer}
    >
      <Animated.View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: color + '22',
          transform: [{ translateX }, { scaleX: animated }],
        }}
      />
    </View>
  )
}

function DownloadButton({ state, palette, onPress }) {
  if (!state) {
    return (
      <Pressable onPress={onPress} hitSlop={6} style={styles.dlButton}>
        <DownIcon color={palette.textMuted} />
      </Pressable>
    )
  }
  if (state.status === 'downloading') {
    return (
      <Pressable onPress={onPress} hitSlop={6} style={styles.dlButton}>
        <Text style={[styles.dlPct, { color: palette.accent }]}>
          {Math.round(state.progress * 100)}%
        </Text>
      </Pressable>
    )
  }
  if (state.status === 'done') {
    return (
      <Pressable onPress={onPress} hitSlop={6} style={styles.dlButton}>
        <View
          style={[styles.dlDoneCircle, { backgroundColor: palette.accent }]}
        >
          <DownIcon color={palette.accentText} size={12} thickness={2} />
        </View>
      </Pressable>
    )
  }
  if (state.status === 'error') {
    return (
      <Pressable onPress={onPress} hitSlop={6} style={styles.dlButton}>
        <Text style={styles.dlError}>!</Text>
      </Pressable>
    )
  }
  return null
}

function DownIcon({ color, size = 18, thickness = 1.8 }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center' }}>
      <View
        style={{
          width: thickness,
          height: size * 0.65,
          backgroundColor: color,
          marginTop: size * 0.05,
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: size * 0.45,
          left: size * 0.18,
          width: size * 0.4,
          height: thickness,
          backgroundColor: color,
          transform: [{ rotate: '45deg' }],
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: size * 0.45,
          left: size * 0.42,
          width: size * 0.4,
          height: thickness,
          backgroundColor: color,
          transform: [{ rotate: '-45deg' }],
        }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: 8, paddingTop: 4, paddingBottom: 16 },
  empty: { textAlign: 'center', marginTop: 32 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  artwork: {
    width: 48,
    height: 48,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  artworkIcon: { fontSize: 22, fontWeight: '700' },
  rowInfo: { flex: 1, minWidth: 0 },
  title: { fontSize: 16, fontWeight: '500' },
  artist: { fontSize: 13, marginTop: 2 },
  activeMark: { fontSize: 18, marginLeft: 12, fontWeight: '700' },
  dlButton: {
    marginLeft: 12,
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dlPct: { fontSize: 11, fontWeight: '700' },
  dlDoneCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dlError: { color: '#E03131', fontSize: 18, fontWeight: '700' },
  fillContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
})
