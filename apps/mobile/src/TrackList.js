import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native'

export function TrackList({ tracks, currentTrack, onSelect, onDelete }) {
  return (
    <FlatList
      data={tracks}
      keyExtractor={(t) => String(t.id)}
      contentContainerStyle={styles.list}
      ListEmptyComponent={
        <Text style={styles.empty}>No tracks yet</Text>
      }
      renderItem={({ item }) => {
        const active = currentTrack?.id === item.id
        return (
          <Pressable
            onPress={() => onSelect(item)}
            style={[styles.row, active && styles.rowActive]}
          >
            <View style={styles.rowInfo}>
              <Text
                style={[styles.title, active && styles.titleActive]}
                numberOfLines={1}
              >
                {item.name}
              </Text>
              {item.artist ? (
                <Text
                  style={[styles.artist, active && styles.artistActive]}
                  numberOfLines={1}
                >
                  {item.artist}
                </Text>
              ) : null}
            </View>
            <Pressable
              onPress={() => onDelete(item)}
              style={styles.delete}
              hitSlop={8}
            >
              <Text style={styles.deleteText}>✕</Text>
            </Pressable>
          </Pressable>
        )
      }}
    />
  )
}

const styles = StyleSheet.create({
  list: { padding: 12, gap: 8 },
  empty: { color: '#9ca3af', textAlign: 'center', marginTop: 32 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#1f2a37',
    marginBottom: 8,
  },
  rowActive: { backgroundColor: '#3b82f6' },
  rowInfo: { flex: 1, marginRight: 12 },
  title: { color: '#f3f4f6', fontSize: 16, fontWeight: '500' },
  titleActive: { color: '#ffffff' },
  artist: { color: '#9ca3af', fontSize: 13, marginTop: 2 },
  artistActive: { color: 'rgba(255,255,255,0.8)' },
  delete: { padding: 6 },
  deleteText: { color: '#ef4444', fontSize: 16 },
})
