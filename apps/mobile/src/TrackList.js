import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native'
import { useTheme } from './theme'

export function TrackList({ tracks, currentTrack, onSelect }) {
  const { palette } = useTheme()
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
        return (
          <Pressable
            onPress={() => onSelect(item)}
            android_ripple={{ color: palette.border }}
            style={styles.row}
          >
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
              {item.artist ? (
                <Text
                  style={[styles.artist, { color: palette.textMuted }]}
                  numberOfLines={1}
                >
                  {item.artist}
                </Text>
              ) : null}
            </View>
            {active ? (
              <Text style={[styles.activeMark, { color: palette.accent }]}>
                ♪
              </Text>
            ) : null}
          </Pressable>
        )
      }}
    />
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
})
