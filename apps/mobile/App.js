import { useEffect } from 'react'
import { Platform } from 'react-native'
import * as NavigationBar from 'expo-navigation-bar'
import {
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
} from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { Home } from './src/Home'
import { Settings } from './src/Settings'
import { useTheme } from './src/theme'

const Stack = createNativeStackNavigator()

export default function App() {
  const { palette, mode } = useTheme()

  useEffect(() => {
    if (Platform.OS !== 'android') return
    const buttonStyle =
      palette.statusBarStyle === 'dark-content' ? 'dark' : 'light'
    NavigationBar.setButtonStyleAsync(buttonStyle).catch(() => {})
    NavigationBar.setBackgroundColorAsync(palette.bgElevated).catch(() => {})
  }, [palette.statusBarStyle, palette.bgElevated])

  const navTheme = {
    ...(mode === 'dark' ? DarkTheme : DefaultTheme),
    colors: {
      ...(mode === 'dark' ? DarkTheme.colors : DefaultTheme.colors),
      background: palette.bg,
      card: palette.bgElevated,
      text: palette.text,
      border: palette.border,
      primary: palette.accent,
    },
  }

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Home" component={Home} />
        <Stack.Screen
          name="Settings"
          component={Settings}
          options={{ animation: 'slide_from_bottom' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  )
}
