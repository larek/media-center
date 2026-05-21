import 'react-native-gesture-handler'
import { registerRootComponent } from 'expo'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import TrackPlayer from 'react-native-track-player'

import App from './App'
import { DownloadsProvider } from './src/downloads'
import { ThemeProvider } from './src/theme'

function Root() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <DownloadsProvider>
            <App />
          </DownloadsProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}

registerRootComponent(Root)
TrackPlayer.registerPlaybackService(() => require('./src/trackPlayerService'))
