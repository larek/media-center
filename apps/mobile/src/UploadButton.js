import { useState } from 'react'
import { Alert, Pressable, StyleSheet, Text } from 'react-native'
import * as DocumentPicker from 'expo-document-picker'
import { api } from './api'

export function UploadButton({ onUploaded }) {
  const [uploading, setUploading] = useState(false)

  async function pickAndUpload() {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'audio/*',
      copyToCacheDirectory: true,
    })

    if (result.canceled || !result.assets?.[0]) return
    const file = result.assets[0]

    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', {
        uri: file.uri,
        name: file.name,
        type: file.mimeType || 'audio/mpeg',
      })

      const res = await fetch(api.uploadEndpoint(), {
        method: 'POST',
        body: form,
      })

      if (!res.ok) throw new Error(`upload failed: ${res.status}`)
      const json = await res.json()

      if (json.uploadId) {
        await waitForS3(json.uploadId)
      }

      onUploaded?.()
    } catch (e) {
      Alert.alert('Upload failed', String(e?.message ?? e))
    } finally {
      setUploading(false)
    }
  }

  async function waitForS3(uploadId) {
    const deadline = Date.now() + 5 * 60 * 1000
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 1500))
      try {
        const res = await fetch(api.uploadProgressUrl(uploadId), {
          headers: { Accept: 'application/json' },
        })
        if (!res.ok) continue
        const text = await res.text()
        const last = parseLastSseEvent(text)
        if (last?.completed) return
        if (last?.error) throw new Error(last.error)
      } catch {
        // keep polling
      }
    }
  }

  return (
    <Pressable
      onPress={pickAndUpload}
      disabled={uploading}
      style={[styles.btn, uploading && styles.btnDisabled]}
    >
      <Text style={styles.text}>
        {uploading ? 'Uploading…' : '+ Upload audio'}
      </Text>
    </Pressable>
  )
}

function parseLastSseEvent(text) {
  const events = text.split('\n\n').filter(Boolean)
  const last = events[events.length - 1]
  if (!last) return null
  const dataLine = last.split('\n').find((l) => l.startsWith('data:'))
  if (!dataLine) return null
  try {
    return JSON.parse(dataLine.slice(5).trim())
  } catch {
    return null
  }
}

const styles = StyleSheet.create({
  btn: {
    margin: 12,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
  },
  btnDisabled: { backgroundColor: '#374151' },
  text: { color: '#fff', fontSize: 15, fontWeight: '600' },
})
