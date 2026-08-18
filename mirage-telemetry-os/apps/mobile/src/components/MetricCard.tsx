import { Platform, StyleSheet, Text, View } from 'react-native';
import type { Reading } from '../api/types';
import { colors, mono } from '../theme';

export function MetricCard({ label, reading, unit, digits = 0 }: { label: string; reading?: Reading; unit: string; digits?: number }) {
  const shown = reading?.available && reading.value != null;
  return <View style={styles.card}><Text style={styles.label}>{label}</Text><Text style={[styles.value, !shown && styles.missing]}>{shown ? reading.value!.toFixed(digits) : '—'}</Text><Text style={styles.unit}>{shown ? unit : 'NOT REPORTED'}</Text></View>;
}
const styles = StyleSheet.create({
  card: { width: '48%', minHeight: 130, backgroundColor: colors.panel, borderColor: colors.line, borderWidth: 1, padding: 14, justifyContent: 'space-between' },
  label: { ...mono, color: colors.greenDim, fontSize: 11 }, value: { ...mono, color: colors.green, fontSize: 40, fontWeight: '700', ...Platform.select({ web: { textShadow: `0 0 12px ${colors.green}` }, default: { textShadowColor: colors.green, textShadowRadius: 12 } }) },
  missing: { color: colors.muted, ...Platform.select({ web: { textShadow: 'none' }, default: { textShadowRadius: 0 } }) }, unit: { ...mono, color: colors.muted, fontSize: 10 },
});
