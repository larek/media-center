const TrackPlayer = require('react-native-track-player').default
const { Event } = require('react-native-track-player')

module.exports = async function () {
  TrackPlayer.addEventListener(Event.RemotePlay, () => TrackPlayer.play())
  TrackPlayer.addEventListener(Event.RemotePause, () => TrackPlayer.pause())
  TrackPlayer.addEventListener(Event.RemoteStop, () => TrackPlayer.reset())
  TrackPlayer.addEventListener(Event.RemoteNext, () => TrackPlayer.skipToNext())
  TrackPlayer.addEventListener(Event.RemotePrevious, () => TrackPlayer.skipToPrevious())
  TrackPlayer.addEventListener(Event.RemoteSeek, (e) => TrackPlayer.seekTo(e.position))
  TrackPlayer.addEventListener(Event.RemoteJumpForward, async (e) => {
    const pos = (await TrackPlayer.getProgress()).position
    TrackPlayer.seekTo(pos + (e.interval ?? 15))
  })
  TrackPlayer.addEventListener(Event.RemoteJumpBackward, async (e) => {
    const pos = (await TrackPlayer.getProgress()).position
    TrackPlayer.seekTo(Math.max(0, pos - (e.interval ?? 15)))
  })
}
