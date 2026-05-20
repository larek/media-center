import {
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { getSchemePalette, SCHEMES, useTheme } from './theme'

export function Settings({ visible, onClose }) {
  const insets = useSafeAreaInsets()
  const { palette, mode, scheme, toggleMode, setScheme } = useTheme()

  function renderSwatches(schemeId) {
    const p = getSchemePalette(schemeId, mode)
    const colors = [p.bg, p.bgElevated, p.accent, p.text]
    return (
      <View style={styles.swatchRow}>
        {colors.map((c, idx) => (
          <View
            key={idx}
            style={[
              styles.swatch,
              {
                backgroundColor: c,
                borderColor: palette.border,
                marginLeft: idx === 0 ? 0 : -6,
                zIndex: colors.length - idx,
              },
            ]}
          />
        ))}
      </View>
    )
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={[styles.root, { backgroundColor: palette.bg }]}>
        <StatusBar
          barStyle={palette.statusBarStyle}
          backgroundColor="transparent"
          translucent
        />
        <View style={{ height: insets.top, backgroundColor: palette.bg }} />

        <View
          style={[styles.navbar, { borderBottomColor: palette.border }]}
        >
          <Pressable onPress={onClose} hitSlop={8} style={styles.navAction}>
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
                      {renderSwatches(s.id)}
                      <Text style={[styles.rowLabel, { color: palette.text }]}>
                        {s.label}
                      </Text>
                    </View>
                    {scheme === s.id ? (
                      <Text
                        style={[styles.check, { color: palette.accent }]}
                      >
                        ✓
                      </Text>
                    ) : null}
                  </Row>
                </Pressable>
              </View>
            ))}
          </Group>
        </ScrollView>
      </View>
    </Modal>
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
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 16,
  },
  check: { fontSize: 20, fontWeight: '600' },
  schemeLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  swatchRow: { flexDirection: 'row', marginRight: 12 },
  swatch: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: StyleSheet.hairlineWidth,
  },
})
