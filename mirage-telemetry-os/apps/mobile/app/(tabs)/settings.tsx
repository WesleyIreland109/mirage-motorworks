import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput } from 'react-native';
import { Panel } from '../../src/components/Panel';
import { useMirage } from '../../src/context/MirageProvider';
import { colors, mono } from '../../src/theme';

export default function SettingsScreen() {
  const { baseUrl, setBaseUrl, refresh, online, error } = useMirage();
  const [draft, setDraft] = useState(baseUrl);
  useEffect(() => setDraft(baseUrl), [baseUrl]);
  async function save() { try { await setBaseUrl(draft); Alert.alert('Saved', 'Mirage will reconnect using the new address.'); } catch (e) { Alert.alert('Invalid address', String(e)); } }
  return <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
    <Panel title="DEVICE CONNECTION"><Text style={styles.label}>LOCAL API ADDRESS</Text><TextInput autoCapitalize="none" autoCorrect={false} keyboardType="url" value={draft} onChangeText={setDraft} style={styles.input} /><Pressable onPress={save} style={styles.primary}><Text style={styles.primaryText}>SAVE + RECONNECT</Text></Pressable><Pressable onPress={refresh} style={styles.secondary}><Text style={styles.secondaryText}>TEST CONNECTION</Text></Pressable><Text style={[styles.state, online ? styles.good : styles.bad]}>{online ? '● CONNECTED' : `● OFFLINE${error ? ` // ${error}` : ''}`}</Text></Panel>
    <Panel title="QUICK START"><Text style={styles.copy}>1. Join the same Wi-Fi network as the Mirage device.{`\n`}2. Keep the default mirage.local address, or enter its IP.{`\n`}3. Confirm the vehicle interface is connected before recording.</Text></Panel>
    <Panel title="PRIVACY"><Text style={styles.copy}>Drive recordings stay on your Mirage device. The mobile bootstrap exposes only a redacted VIN suffix. No cloud account is required for local operation.</Text></Panel>
  </ScrollView>;
}
const styles = StyleSheet.create({ screen: { flex: 1, backgroundColor: colors.background }, content: { padding: 16, gap: 12 }, label: { ...mono, color: colors.muted, fontSize: 10 }, input: { ...mono, borderColor: colors.line, borderWidth: 1, padding: 13, color: colors.text }, primary: { backgroundColor: colors.green, padding: 14, alignItems: 'center' }, primaryText: { ...mono, color: colors.black, fontWeight: '800' }, secondary: { borderColor: colors.green, borderWidth: 1, padding: 13, alignItems: 'center' }, secondaryText: { ...mono, color: colors.green }, state: { ...mono, fontSize: 10 }, good: { color: colors.green }, bad: { color: colors.danger }, copy: { ...mono, color: colors.text, lineHeight: 20, fontSize: 11 } });
