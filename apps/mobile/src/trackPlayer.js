import TrackPlayer, {
  AppKilledPlaybackBehavior,
  Capability,
} from 'react-native-track-player'

let setupPromise = null

export function setupPlayerOnce() {
  if (!setupPromise) {
    setupPromise = (async () => {
      await TrackPlayer.setupPlayer({
        autoHandleInterruptions: true,
      })
      await TrackPlayer.updateOptions({
        android: {
          appKilledPlaybackBehavior:
            AppKilledPlaybackBehavior.StopPlaybackAndRemoveNotification,
        },
        capabilities: [
          Capability.Play,
          Capability.Pause,
          Capability.SkipToNext,
          Capability.SkipToPrevious,
          Capability.SeekTo,
          Capability.Stop,
        ],
        compactCapabilities: [
          Capability.Play,
          Capability.Pause,
          Capability.SkipToNext,
          Capability.SkipToPrevious,
        ],
        notificationCapabilities: [
          Capability.Play,
          Capability.Pause,
          Capability.SkipToNext,
          Capability.SkipToPrevious,
          Capability.SeekTo,
        ],
        progressUpdateEventInterval: 1,
      })
    })().catch((e) => {
      setupPromise = null
      throw e
    })
  }
  return setupPromise
}

export function tracksToRntpQueue(tracks, streamUrl, getLocalUri) {
  return tracks.map((t) => ({
    id: String(t.id),
    url: getLocalUri?.(t.id) || streamUrl(encodeURIComponent(t.s3_key)),
    title: t.name,
    artist: t.artist || 'Unknown',
  }))
}
