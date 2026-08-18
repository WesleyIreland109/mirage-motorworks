import { Link } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Panel } from '../../src/components/Panel';
import { useMirage } from '../../src/context/MirageProvider';
import { colors, mono } from '../../src/theme';
import { useState } from 'react';

export default function SessionsScreen() {
  const { bootstrap, sessions, startSession, stopSession } = useMirage();
  const [label, setLabel] = useState('Road test');
  const active = bootstrap?.session?.state === 'recording';
  async function toggle() { try { active ? await stopSession() : await startSession(label); } catch (e) { Alert.alert('Session error', e instanceof Error ? e.message : String(e)); } }
  return <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
    <Panel title="DRIVE RECORDER"><TextInput value={label} onChangeText={setLabel} editable={!active} placeholder="Drive label" placeholderTextColor={colors.muted} style={styles.input} /><Pressable onPress={toggle} style={[styles.button, active && styles.stop]}><Text style={styles.buttonText}>{active ? 'STOP + SAVE SESSION' : 'START RECORDING'}</Text></Pressable><Text style={styles.note}>Telemetry and raw OBD requests are stored on the Mirage device for later replay and diagnosis.</Text></Panel>
    <Text style={styles.heading}>RECORDED DRIVES // {sessions.length}</Text>
    {sessions.map(item => <Link key={item.id} href={{ pathname: '/session/[id]', params: { id: item.id } }} asChild><Pressable style={styles.row}><View><Text style={styles.label}>{item.label || 'Unlabeled drive'}</Text><Text style={styles.meta}>{new Date(item.startedAt).toLocaleString()}</Text></View><View style={styles.right}><Text style={styles.samples}>{item.samples}</Text><Text style={styles.meta}>SAMPLES ›</Text></View></Pressable></Link>)}
  </ScrollView>;
}
const styles = StyleSheet.create({ screen: { flex: 1, backgroundColor: colors.background }, content: { padding: 16, gap: 12 }, input: { ...mono, borderColor: colors.line, borderWidth: 1, color: colors.text, padding: 12 }, button: { backgroundColor: colors.green, padding: 14, alignItems: 'center' }, stop: { backgroundColor: colors.danger }, buttonText: { ...mono, color: colors.black, fontWeight: '800' }, note: { ...mono, color: colors.muted, fontSize: 10, lineHeight: 16 }, heading: { ...mono, color: colors.greenDim, fontSize: 11, marginTop: 8 }, row: { borderColor: colors.line, borderWidth: 1, backgroundColor: colors.panel, padding: 14, flexDirection: 'row', justifyContent: 'space-between' }, label: { ...mono, color: colors.text, fontWeight: '700' }, meta: { ...mono, color: colors.muted, fontSize: 9, marginTop: 6 }, right: { alignItems: 'flex-end' }, samples: { ...mono, color: colors.green, fontSize: 18 } });
