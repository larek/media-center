import {
  Alert,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native'
import { useEffect, useState } from 'react'
import * as FileSystem from 'expo-file-system/legacy'
import { useNavigation } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Check } from 'lucide-react-native'
import { useDownloads } from './downloads'
import { getSchemePalette, SCHEMES, useTheme } from './theme'

function formatBytes(bytes) {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  let i = 0
  let n = bytes
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024
    i++
  }
  return `${n.toFixed(n >= 10 || i === 0 ? 0 : 1)} ${units[i]}`
}

export function Settings() {
  const navigation = useNavigation()
  const insets = useSafeAreaInsets()
  const { palette, mode, scheme, toggleMode, setScheme } = useTheme()
  const { totalSize, clearAll, downloadedCount } = useDownloads()
  const [disk, setDisk] = useState({ free: null, total: null })

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [free, total] = await Promise.all([
          FileSystem.getFreeDiskStorageAsync(),
          FileSystem.getTotalDiskCapacityAsync(),
        ])
        if (!cancelled) setDisk({ free, total })
      } catch (e) {
        console.warn('disk info failed', e)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [totalSize])

  function confirmClearAll() {
    if (totalSize === 0) return
    Alert.alert(
      'Clear all downloads?',
      `${formatBytes(totalSize)} will be removed from this device. Tracks will still be available for streaming.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', style: 'destructive', onPress: clearAll },
      ]
    )
  }

  function renderSwatch(schemeId) {
    const p = getSchemePalette(schemeId, mode)
    return (
      <View
        style={[
          styles.swatch,
          { backgroundColor: p.bg, borderColor: palette.border },
        ]}
      >
        <View
          style={[styles.swatchAccent, { backgroundColor: p.accent }]}
        />
        <View style={[styles.swatchLine, { backgroundColor: p.text }]} />
        <View
          style={[
            styles.swatchLine,
            styles.swatchLineShort,
            { backgroundColor: p.textMuted },
          ]}
        />
      </View>
    )
  }

  return (
    <View style={[styles.root, { backgroundColor: palette.bg }]}>
      <StatusBar
        barStyle={palette.statusBarStyle}
        backgroundColor="transparent"
        translucent
      />
      <View style={{ height: insets.top, backgroundColor: palette.bg }} />

      <View style={[styles.navbar, { borderBottomColor: palette.border }]}>
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={8}
          style={styles.navAction}
        >
          <Text style={[styles.navActionText, { color: palette.accent }]}>
            Done
          </Text>
        </Pressable>
        <Text style={[styles.navTitle, { color: palette.text }]}>
          Settings
        </Text>
        <View style={styles.navAction} />
        </View>

        <ScrollView
          contentContainerStyle={{ paddingBottom: 32 + insets.bottom }}
        >
          <SectionLabel palette={palette}>Theme</SectionLabel>
          <Group palette={palette}>
            <Row>
              <Text style={[styles.rowLabel, { color: palette.text }]}>
                Dark mode
              </Text>
              <Switch
                value={mode === 'dark'}
                onValueChange={toggleMode}
                trackColor={{ false: '#D1D1D6', true: palette.accent }}
                thumbColor="#FFFFFF"
              />
            </Row>
          </Group>

          <SectionLabel palette={palette}>Scheme</SectionLabel>
          <Group palette={palette}>
            {SCHEMES.map((s, i) => (
              <View key={s.id}>
                {i > 0 ? (
                  <View
                    style={[styles.separator, { backgroundColor: palette.border }]}
                  />
                ) : null}
                <Pressable
                  onPress={() => setScheme(s.id)}
                  android_ripple={{ color: palette.border }}
                >
                  <Row>
                    <View style={styles.schemeLeft}>
                      {renderSwatch(s.id)}
                      <Text style={[styles.rowLabel, { color: palette.text }]}>
                        {s.label}
                      </Text>
                    </View>
                    {scheme === s.id ? (
                      <Check size={20} color={palette.accent} strokeWidth={2.5} />
                    ) : null}
                  </Row>
                </Pressable>
              </View>
            ))}
          </Group>

          <SectionLabel palette={palette}>Storage</SectionLabel>
          <Group palette={palette}>
            <Row>
              <Text style={[styles.rowLabel, { color: palette.text }]}>
                Downloaded
              </Text>
              <Text style={[styles.rowValue, { color: palette.textMuted }]}>
                {downloadedCount} {downloadedCount === 1 ? 'track' : 'tracks'} ·{' '}
                {formatBytes(totalSize)}
              </Text>
            </Row>
            <View
              style={[styles.separator, { backgroundColor: palette.border }]}
            />
            <Row>
              <Text style={[styles.rowLabel, { color: palette.text }]}>
                Device free
              </Text>
              <Text style={[styles.rowValue, { color: palette.textMuted }]}>
                {disk.free != null && disk.total != null
                  ? `${formatBytes(disk.free)} / ${formatBytes(disk.total)}`
                  : '—'}
              </Text>
            </Row>
            <View
              style={[styles.separator, { backgroundColor: palette.border }]}
            />
            <Pressable
              onPress={confirmClearAll}
              android_ripple={{ color: palette.border }}
              disabled={totalSize === 0}
            >
              <Row>
                <Text
                  style={[
                    styles.rowLabel,
                    {
                      color: totalSize === 0 ? palette.textMuted : '#E03131',
                    },
                  ]}
                >
                  Clear all downloads
                </Text>
              </Row>
            </Pressable>
        </Group>
      </ScrollView>
    </View>
  )
}

function SectionLabel({ children, palette }) {
  return (
    <Text style={[styles.sectionLabel, { color: palette.textMuted }]}>
      {children}
    </Text>
  )
}

function Group({ children, palette }) {
  return (
    <View style={[styles.group, { backgroundColor: palette.bgElevated }]}>
      {children}
    </View>
  )
}

function Row({ children }) {
  return <View style={styles.row}>{children}</View>
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 44,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  navAction: { minWidth: 60 },
  navActionText: { fontSize: 17, fontWeight: '400' },
  navTitle: { fontSize: 17, fontWeight: '600' },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '400',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 32,
    marginTop: 28,
    marginBottom: 8,
  },
  group: {
    marginHorizontal: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    minHeight: 48,
  },
  rowLabel: { fontSize: 17, fontWeight: '400' },
  rowValue: { fontSize: 17, fontWeight: '400' },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 16,
  },
  schemeLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  swatch: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    marginRight: 14,
    padding: 6,
    justifyContent: 'flex-end',
  },
  swatchAccent: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginBottom: 4,
  },
  swatchLine: {
    height: 2,
    borderRadius: 1,
    marginTop: 2,
  },
  swatchLineShort: { width: '60%' },
})
