import { Tabs } from 'expo-router';
import { type ColorValue, Text } from 'react-native';
import { colors, mono } from '../../src/theme';

const Icon = ({ glyph, color }: { glyph: string; color: ColorValue }) => <Text style={{ ...mono, color, fontSize: 16 }}>{glyph}</Text>;
export default function TabLayout() {
  return <Tabs screenOptions={{ headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.green, headerTitleStyle: mono, tabBarStyle: { backgroundColor: colors.black, borderTopColor: colors.line }, tabBarActiveTintColor: colors.green, tabBarInactiveTintColor: colors.muted }}>
    <Tabs.Screen name="index" options={{ title: 'LIVE', tabBarIcon: ({ color }) => <Icon glyph="▰" color={color} /> }} />
    <Tabs.Screen name="sessions" options={{ title: 'DRIVES', tabBarIcon: ({ color }) => <Icon glyph="◫" color={color} /> }} />
    <Tabs.Screen name="device" options={{ title: 'DEVICE', tabBarIcon: ({ color }) => <Icon glyph="⌁" color={color} /> }} />
    <Tabs.Screen name="settings" options={{ title: 'SETTINGS', tabBarIcon: ({ color }) => <Icon glyph="⚙" color={color} /> }} />
  </Tabs>;
}
