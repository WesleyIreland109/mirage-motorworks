import type { PropsWithChildren } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, mono } from '../theme';

export function Panel({ title, children }: PropsWithChildren<{ title?: string }>) {
  return <View style={styles.panel}>{title ? <Text style={styles.title}>{title}</Text> : null}{children}</View>;
}
const styles = StyleSheet.create({
  panel: { backgroundColor: colors.panel, borderColor: colors.line, borderWidth: 1, padding: 16, gap: 12 },
  title: { ...mono, color: colors.greenDim, fontSize: 12, fontWeight: '700' },
});
