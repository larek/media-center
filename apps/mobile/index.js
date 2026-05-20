import { registerRootComponent } from 'expo'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import TrackPlayer from 'react-native-track-player'

import App from './App'
import { ThemeProvider } from './src/theme'

function Root() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </SafeAreaProvider>
  )
}

registerRootComponent(Root)
TrackPlayer.registerPlaybackService(() => require('./src/trackPlayerService'))
