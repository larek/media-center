import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native'

export function TrackList({ tracks, currentTrack, onSelect }) {
  return (
    <FlatList
      data={tracks}
      keyExtractor={(t) => String(t.id)}
      contentContainerStyle={styles.list}
      ListEmptyComponent={<Text style={styles.empty}>No tracks</Text>}
      renderItem={({ item }) => {
        const active = currentTrack?.id === item.id
        return (
          <Pressable
            onPress={() => onSelect(item)}
            android_ripple={{ color: '#282828' }}
            style={styles.row}
          >
            <View style={styles.artwork}>
              <Text style={styles.artworkIcon}>♪</Text>
            </View>
            <View style={styles.rowInfo}>
              <Text
                style={[styles.title, active && styles.titleActive]}
                numberOfLines={1}
              >
                {item.name}
              </Text>
              {item.artist ? (
                <Text style={styles.artist} numberOfLines={1}>
                  {item.artist}
                </Text>
              ) : null}
            </View>
            {active ? <Text style={styles.activeMark}>♪</Text> : null}
          </Pressable>
        )
      }}
    />
  )
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: 8, paddingTop: 4, paddingBottom: 16 },
  empty: { color: '#B3B3B3', textAlign: 'center', marginTop: 32 },
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
    backgroundColor: '#282828',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  artworkIcon: { color: '#B3B3B3', fontSize: 22, fontWeight: '700' },
  rowInfo: { flex: 1, minWidth: 0 },
  title: { color: '#FFFFFF', fontSize: 16, fontWeight: '500' },
  titleActive: { color: '#1DB954' },
  artist: { color: '#B3B3B3', fontSize: 13, marginTop: 2 },
  activeMark: {
    color: '#1DB954',
    fontSize: 18,
    marginLeft: 12,
    fontWeight: '700',
  },
})
