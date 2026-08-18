import * as Linking from 'expo-linking';
import { useLocalSearchParams } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { Panel } from '../../src/components/Panel';
import { useMirage } from '../../src/context/MirageProvider';
import { colors, mono } from '../../src/theme';

export default function SessionDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { sessions, replay, client } = useMirage();
  const item = sessions.find(session => session.id === id);
  if (!item) return <Text style={styles.missing}>SESSION NOT FOUND</Text>;
  const session = item;
  async function startReplay() { try { await replay(session.id); Alert.alert('Replay started', 'Return to Live to inspect the recorded telemetry.'); } catch (e) { Alert.alert('Replay error', String(e)); } }
  return <ScrollView style={styles.screen} contentContainerStyle={styles.content}><Panel title={item.id}><Text style={styles.title}>{item.label || 'UNLABELED DRIVE'}</Text><Text style={styles.meta}>{new Date(item.startedAt).toLocaleString()}</Text><Text style={styles.stat}>{item.samples} TELEMETRY SAMPLES</Text><Text style={styles.stat}>{item.obdRequests} OBD REQUESTS // {item.obdErrors} ERRORS</Text><Text style={styles.stat}>{Math.round(item.durationMs / 1000)} SECONDS</Text></Panel><Pressable style={styles.primary} onPress={startReplay}><Text style={styles.primaryText}>REPLAY AT 1×</Text></Pressable><Pressable style={styles.secondary} onPress={() => Linking.openURL(client.telemetryDownload(item.id))}><Text style={styles.secondaryText}>DOWNLOAD TELEMETRY.JSONL</Text></Pressable><Pressable style={styles.secondary} onPress={() => Linking.openURL(client.obdDownload(item.id))}><Text style={styles.secondaryText}>DOWNLOAD RAW OBD.JSONL</Text></Pressable></ScrollView>;
}
const styles = StyleSheet.create({ screen: { flex: 1, backgroundColor: colors.background }, content: { padding: 16, gap: 12 }, missing: { ...mono, flex: 1, color: colors.danger, backgroundColor: colors.background, padding: 24 }, title: { ...mono, color: colors.green, fontSize: 19, fontWeight: '700' }, meta: { ...mono, color: colors.muted, fontSize: 10 }, stat: { ...mono, color: colors.text, fontSize: 11 }, primary: { backgroundColor: colors.green, padding: 15, alignItems: 'center' }, primaryText: { ...mono, color: colors.black, fontWeight: '800' }, secondary: { borderColor: colors.green, borderWidth: 1, padding: 14, alignItems: 'center' }, secondaryText: { ...mono, color: colors.green, fontSize: 11 } });
