import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Panel } from '../../src/components/Panel';
import { useMirage } from '../../src/context/MirageProvider';
import { colors, mono } from '../../src/theme';

function Row({ label, value }: { label: string; value?: string | number | boolean }) { return <View style={styles.row}><Text style={styles.label}>{label}</Text><Text style={styles.value}>{value === undefined || value === '' ? '—' : String(value)}</Text></View>; }
export default function DeviceScreen() {
  const { online, baseUrl, bootstrap, telemetry } = useMirage();
  const vehicle = telemetry?.attachment || bootstrap?.vehicle;
  const identity = vehicle?.identity;
  return <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
    <Panel title="MIRAGE UNIT"><Row label="LOCAL LINK" value={online ? 'ONLINE' : 'OFFLINE'} /><Row label="ADDRESS" value={baseUrl} /><Row label="SOFTWARE" value={bootstrap?.device.version} /><Row label="OFFLINE MODE" value="READY" /></Panel>
    <Panel title="VEHICLE INTERFACE"><Row label="STATE" value={vehicle?.state} /><Row label="ECU" value={vehicle?.ecuConnected ? 'CONNECTED' : 'NOT CONNECTED'} /><Row label="ADAPTER" value={vehicle?.adapter?.port} /><Row label="SIGNALS" value={vehicle?.supportedMetrics} /><Row label="MESSAGE" value={vehicle?.message} /></Panel>
    <Panel title="DECODED IDENTITY"><Row label="YEAR" value={identity?.modelYear.value} /><Row label="MAKE" value={identity?.make.value} /><Row label="MODEL" value={identity?.model.value} /><Row label="TRIM" value={identity?.trim.value} /><Row label="ENGINE" value={identity?.engine.value} /><Row label="VIN" value={identity?.vin.value} /></Panel>
    <Panel title="BLUETOOTH UPDATE CHANNEL"><Text style={styles.copy}>Reserved for Pi provisioning and software updates. It will activate when the device-side BLE service and signed update workflow are implemented. Current telemetry uses your private local network.</Text></Panel>
  </ScrollView>;
}
const styles = StyleSheet.create({ screen: { flex: 1, backgroundColor: colors.background }, content: { padding: 16, gap: 12 }, row: { flexDirection: 'row', justifyContent: 'space-between', gap: 14, borderBottomColor: colors.line, borderBottomWidth: StyleSheet.hairlineWidth, paddingBottom: 9 }, label: { ...mono, color: colors.muted, fontSize: 10 }, value: { ...mono, color: colors.green, fontSize: 10, textAlign: 'right', flex: 1 }, copy: { ...mono, color: colors.text, fontSize: 11, lineHeight: 18 } });
