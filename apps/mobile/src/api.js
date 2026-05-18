import Constants from 'expo-constants'
import { createApiClient } from '@video-player/shared'

const apiUrl =
  process.env.EXPO_PUBLIC_API_URL ||
  Constants.expoConfig?.extra?.apiUrl ||
  'http://10.0.2.2:3001/api'

export const api = createApiClient({ baseUrl: apiUrl })
