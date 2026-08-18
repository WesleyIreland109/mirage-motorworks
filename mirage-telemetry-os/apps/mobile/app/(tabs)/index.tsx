import { Platform, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MetricCard } from '../../src/components/MetricCard';
import { Panel } from '../../src/components/Panel';
import { useMirage } from '../../src/context/MirageProvider';
import { colors, mono } from '../../src/theme';

export default function LiveScreen() {
  const { online, telemetry, bootstrap, refresh } = useMirage();
  const vehicle = telemetry?.attachment || bootstrap?.vehicle;
  const identity = vehicle?.identity;
  const name = [identity?.modelYear?.value, identity?.make?.value, identity?.model?.value].filter(Boolean).join(' ') || 'WAITING FOR VEHICLE';
  return <ScrollView style={styles.screen} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={false} onRefresh={refresh} tintColor={colors.green} />}>
    <View style={styles.status}><View style={[styles.dot, online && styles.online]} /><Text style={styles.statusText}>{online ? 'MIRAGE LINK ONLINE' : 'MIRAGE LINK OFFLINE'}</Text></View>
    <Text style={styles.vehicle}>{name.toUpperCase()}</Text>
    <Text style={styles.sub}>{vehicle?.ecuConnected ? `${vehicle.supportedMetrics} LIVE SIGNALS` : vehicle?.message || 'CONNECT TO MIRAGE DEVICE'}</Text>
    <View style={styles.grid}>
      <MetricCard label="ENGINE SPEED" reading={telemetry?.rpm} unit="RPM" />
      <MetricCard label="VEHICLE SPEED" reading={telemetry?.vehicle_speed_mph} unit="MPH" />
      <MetricCard label="COOLANT" reading={telemetry?.coolant_temp_f} unit="°F" />
      <MetricCard label="THROTTLE" reading={telemetry?.throttle_percent} unit="%" digits={1} />
      <MetricCard label="ENGINE LOAD" reading={telemetry?.engine_load_percent} unit="%" digits={1} />
      <MetricCard label="SYSTEM VOLTAGE" reading={telemetry?.battery_voltage} unit="V" digits={1} />
    </View>
    <Panel title="DATA POLICY"><Text style={styles.copy}>Only values reported by the connected vehicle are displayed. Unsupported signals remain blank—never simulated.</Text></Panel>
  </ScrollView>;
}
const styles = StyleSheet.create({ screen: { flex: 1, backgroundColor: colors.background }, content: { padding: 16, gap: 14 }, status: { flexDirection: 'row', gap: 8, alignItems: 'center' }, dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.danger }, online: { backgroundColor: colors.green, ...Platform.select({ web: { boxShadow: `0 0 8px ${colors.green}` }, default: { shadowColor: colors.green, shadowOpacity: 1, shadowRadius: 8 } }) }, statusText: { ...mono, color: colors.muted, fontSize: 10 }, vehicle: { ...mono, color: colors.green, fontWeight: '700', fontSize: 23 }, sub: { ...mono, color: colors.greenDim, fontSize: 11 }, grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10 }, copy: { ...mono, color: colors.text, lineHeight: 20, fontSize: 12 } });
