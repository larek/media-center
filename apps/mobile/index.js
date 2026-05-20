import { registerRootComponent } from 'expo'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import TrackPlayer from 'react-native-track-player'

import App from './App'

function Root() {
  return (
    <SafeAreaProvider>
      <App />
    </SafeAreaProvider>
  )
}

registerRootComponent(Root)
TrackPlayer.registerPlaybackService(() => require('./src/trackPlayerService'))
