import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { MirageProvider } from '../src/context/MirageProvider';
import { colors } from '../src/theme';

export default function RootLayout() {
  return <MirageProvider><StatusBar style="light" /><Stack screenOptions={{ headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.green, contentStyle: { backgroundColor: colors.background } }}><Stack.Screen name="(tabs)" options={{ headerShown: false }} /><Stack.Screen name="session/[id]" options={{ title: 'SESSION DETAIL' }} /></Stack></MirageProvider>;
}
