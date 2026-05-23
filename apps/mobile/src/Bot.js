import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  FlatList,
  Keyboard,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import TrackPlayer from 'react-native-track-player'
import { ArrowUp, ChevronLeft, Trash2 } from 'lucide-react-native'
import { api, streamBotChat } from './api'
import { useDownloads } from './downloads'
import { useTheme } from './theme'
import { setupPlayerOnce, tracksToRntpQueue } from './trackPlayer'

let nextId = 1
const newId = () => `m${nextId++}`

const PLACEHOLDERS = ['печатает…', 'думает…', 'ищет…']
const pickPlaceholder = () =>
  PLACEHOLDERS[Math.floor(Math.random() * PLACEHOLDERS.length)]

export function Bot() {
  const navigation = useNavigation()
  const insets = useSafeAreaInsets()
  const { palette } = useTheme()
  const { getLocalUri } = useDownloads()
  const listRef = useRef(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [kbdHeight, setKbdHeight] = useState(0)
  const stableInsets = useMemo(
    () => ({ top: insets.top, bottom: insets.bottom }),
    []
  )

  useEffect(() => {
    const showEvent =
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow'
    const hideEvent =
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide'
    const showSub = Keyboard.addListener(showEvent, (e) => {
      setKbdHeight(e?.endCoordinates?.height ?? 0)
    })
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKbdHeight(0)
    })
    return () => {
      showSub.remove()
      hideSub.remove()
    }
  }, [])

  const send = useCallback(async () => {
    const text = input.trim()
    if (!text || sending) return
    const userMessage = { id: newId(), role: 'user', content: text }
    const assistantId = newId()
    const placeholder = pickPlaceholder()
    const history = [...messages, userMessage]
    setMessages([
      ...history,
      { id: assistantId, role: 'assistant', content: '', placeholder },
    ])
    setInput('')
    setSending(true)
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }))
    try {
      const payload = history.map(({ role, content }) => ({ role, content }))
      await streamBotChat({
        messages: payload,
        onDelta: (delta) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: m.content + delta } : m
            )
          )
        },
        onAction: async (action) => {
          if (action?.type === 'play_tracks' && Array.isArray(action.tracks)) {
            try {
              await setupPlayerOnce()
              const queue = tracksToRntpQueue(
                action.tracks,
                api.streamUrl,
                getLocalUri
              )
              await TrackPlayer.reset()
              await TrackPlayer.add(queue)
              await TrackPlayer.play()
              navigation.navigate('Home')
            } catch (e) {
              console.warn('play_tracks dispatch failed', e)
            }
          }
        },
      })
    } catch (e) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: '', error: e?.message || 'Request failed' }
            : m
        )
      )
    } finally {
      setSending(false)
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }))
    }
  }, [input, messages, sending])

  function clear() {
    setMessages([])
  }

  return (
    <View style={[styles.root, { backgroundColor: palette.bg }]}>
      <StatusBar
        barStyle={palette.statusBarStyle}
        backgroundColor="transparent"
        translucent
      />
      <View style={{ height: stableInsets.top, backgroundColor: palette.bg }} />

      <View style={[styles.header, { borderBottomColor: palette.border }]}>
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={8}
          style={styles.headerSide}
        >
          <ChevronLeft size={26} color={palette.text} strokeWidth={2} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: palette.text }]}>Bot</Text>
        <Pressable
          onPress={clear}
          hitSlop={8}
          style={styles.headerSide}
          disabled={messages.length === 0}
        >
          <Trash2
            size={22}
            color={messages.length === 0 ? palette.textMuted : palette.text}
            strokeWidth={2}
          />
        </Pressable>
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        style={styles.listFlex}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: palette.textMuted }]}>
            Ask anything…
          </Text>
        }
        renderItem={({ item }) => (
          <MessageBubble message={item} palette={palette} />
        )}
        onContentSizeChange={() =>
          listRef.current?.scrollToEnd({ animated: true })
        }
      />

      <View
        style={[
          styles.inputBar,
          {
            backgroundColor: palette.bgElevated,
            borderTopColor: palette.border,
            paddingBottom: 10 + (kbdHeight > 0 ? 0 : stableInsets.bottom),
          },
        ]}
      >
        <TextInput
          style={[
            styles.input,
            { backgroundColor: palette.bgInput, color: palette.text },
          ]}
          placeholder="Message"
          placeholderTextColor={palette.textMuted}
          value={input}
          onChangeText={setInput}
          multiline
          editable={!sending}
          maxLength={8000}
        />
        <Pressable
          onPress={send}
          disabled={!input.trim() || sending}
          style={[
            styles.sendButton,
            {
              backgroundColor:
                !input.trim() || sending ? palette.border : palette.accent,
            },
          ]}
        >
          <ArrowUp
            size={20}
            color={palette.accentText}
            strokeWidth={2.5}
          />
        </Pressable>
      </View>

      <View
        style={{
          height: kbdHeight > 0 ? kbdHeight + stableInsets.bottom : 0,
          backgroundColor: palette.bgElevated,
        }}
      />
    </View>
  )
}

function MessageBubble({ message, palette }) {
  const isUser = message.role === 'user'
  const isError = !!message.error
  const isPlaceholder = !isUser && !isError && !message.content && !!message.placeholder
  return (
    <View
      style={[
        styles.bubbleRow,
        { justifyContent: isUser ? 'flex-end' : 'flex-start' },
      ]}
    >
      <View
        style={[
          styles.bubble,
          {
            backgroundColor: isUser
              ? palette.accent
              : isError
                ? '#E0313122'
                : palette.bgElevated,
            borderColor: isError ? '#E0313166' : 'transparent',
            borderWidth: isError ? StyleSheet.hairlineWidth : 0,
          },
        ]}
      >
        <Text
          style={[
            styles.bubbleText,
            isPlaceholder && styles.bubbleTextPlaceholder,
            {
              color: isUser
                ? palette.accentText
                : isError
                  ? '#E03131'
                  : isPlaceholder
                    ? palette.textMuted
                    : palette.text,
            },
          ]}
          selectable
        >
          {isError
            ? message.error
            : isPlaceholder
              ? message.placeholder
              : message.content}
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    height: 44,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerSide: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '600' },
  listFlex: { flex: 1 },
  list: { padding: 12, paddingBottom: 8, flexGrow: 1 },
  empty: { textAlign: 'center', marginTop: 64, fontSize: 14 },
  bubbleRow: { flexDirection: 'row', marginBottom: 8 },
  bubble: {
    maxWidth: '85%',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  bubbleText: { fontSize: 15, lineHeight: 20 },
  bubbleTextPlaceholder: { fontStyle: 'italic' },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingTop: 8,
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    maxHeight: 120,
    minHeight: 40,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
    borderRadius: 20,
    fontSize: 15,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
