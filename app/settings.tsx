import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { loadConfig, saveConfig, CameraConfig, DEFAULT_CONFIG } from '../utils/storage';

export default function SettingsScreen() {
  const [config, setConfig] = useState<CameraConfig>(DEFAULT_CONFIG);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadConfig().then(setConfig);
  }, []);

  const update = <K extends keyof CameraConfig>(key: K, value: CameraConfig[K]) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    await saveConfig(config);
    setSaving(false);
    Alert.alert('Saved', 'Settings saved. Restart the app to apply changes.', [
      { text: 'OK', onPress: () => router.back() },
    ]);
  };

  const handleReset = () => {
    Alert.alert('Reset', 'Reset to default settings?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: () => setConfig(DEFAULT_CONFIG),
      },
    ]);
  };

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>◀ BACK</Text>
        </TouchableOpacity>
        <Text style={styles.title}>CAMERA SETUP</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>

        {/* Camera Mode */}
        <Section title="CONNECTION MODE">
          <Row label="Mode">
            <View style={styles.modeRow}>
              {(['camera2', 'mjpeg'] as const).map((m) => (
                <TouchableOpacity
                  key={m}
                  style={[styles.modeBtn, config.mode === m && styles.modeBtnActive]}
                  onPress={() => update('mode', m)}
                >
                  <Text style={[styles.modeBtnText, config.mode === m && styles.modeBtnTextActive]}>
                    {m === 'camera2' ? 'CAMERA ID' : 'MJPEG / HTTP'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Row>

          <InfoBox
            text={
              config.mode === 'camera2'
                ? 'Uses Android Camera2 API. Camera IDs map to physical camera ports and vary by device. Try ID 0 for rear, 1 for front, 2 for left, and 3 for right.'
                : 'Connects to IP camera MJPEG streams. Enter the full URL including port. Example: http://192.168.1.100:8080/?action=stream'
            }
          />
        </Section>

        {/* Camera IDs (camera2 mode) */}
        {config.mode === 'camera2' && (
          <Section title="CAMERA IDs (0 = first camera on device)">
            {(['front', 'rear', 'left', 'right'] as const).map((cam) => (
              <Row key={cam} label={cam.toUpperCase()}>
                <NumberInput
                  value={config[`${cam}Id`]}
                  onChange={(v) => update(`${cam}Id`, v)}
                  min={0}
                  max={9}
                />
              </Row>
            ))}
            <InfoBox text="A common layout is Rear=0, Front=1, Left=2, Right=3. Try different values if cameras are assigned incorrectly." />
          </Section>
        )}

        {/* MJPEG URLs */}
        {config.mode === 'mjpeg' && (
          <Section title="STREAM URLs">
            {(['front', 'rear', 'left', 'right'] as const).map((cam) => (
              <Row key={cam} label={cam.toUpperCase()} vertical>
                <UrlInput
                  value={config[`${cam}Url`]}
                  onChange={(v) => update(`${cam}Url`, v)}
                  placeholder={`http://192.168.1.10X:8080/?action=stream`}
                />
              </Row>
            ))}
          </Section>
        )}

        {/* Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.resetBtn} onPress={handleReset}>
            <Text style={styles.resetBtnText}>RESET DEFAULTS</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
            <Text style={styles.saveBtnText}>{saving ? 'SAVING…' : 'SAVE & CLOSE'}</Text>
          </TouchableOpacity>
        </View>

        {/* Help */}
        <Section title="ANDROID HEAD-UNIT TIPS">
          <InfoBox
            text={
              '1. If cameras show black screen, switch from CAMERA ID to MJPEG mode.\n\n' +
              '2. Camera IDs depend on which port each camera is plugged into.\n\n' +
              '3. The rear camera (connected to reverse input) is usually Camera ID 0.\n\n' +
              '4. For MJPEG mode, your head unit must be running a camera stream server on the local network.\n\n' +
              '5. Make sure the head unit granted camera permission in Android Settings → Apps → OpenSurroundView → Permissions.'
            }
          />
        </Section>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// --- Sub-components ---

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={sStyles.section}>
      <Text style={sStyles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Row({ label, children, vertical = false }: { label: string; children: React.ReactNode; vertical?: boolean }) {
  return (
    <View style={[sStyles.row, vertical && sStyles.rowVertical]}>
      <Text style={sStyles.rowLabel}>{label}</Text>
      {children}
    </View>
  );
}

function InfoBox({ text }: { text: string }) {
  return (
    <View style={sStyles.infoBox}>
      <Text style={sStyles.infoText}>{text}</Text>
    </View>
  );
}

function NumberInput({ value, onChange, min, max }: { value: number; onChange: (v: number) => void; min: number; max: number }) {
  return (
    <View style={sStyles.numRow}>
      <TouchableOpacity
        style={sStyles.numBtn}
        onPress={() => onChange(Math.max(min, value - 1))}
      >
        <Text style={sStyles.numBtnText}>−</Text>
      </TouchableOpacity>
      <View style={sStyles.numVal}>
        <Text style={sStyles.numValText}>{value}</Text>
      </View>
      <TouchableOpacity
        style={sStyles.numBtn}
        onPress={() => onChange(Math.min(max, value + 1))}
      >
        <Text style={sStyles.numBtnText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

function UrlInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <TextInput
      style={sStyles.urlInput}
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor="#444"
      autoCapitalize="none"
      autoCorrect={false}
      keyboardType="url"
    />
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0a0a0f' },
  header: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#00e5ff22',
    paddingHorizontal: 12,
  },
  backBtn: { paddingRight: 16 },
  backText: { color: '#00e5ff', fontSize: 12, letterSpacing: 1 },
  title: {
    flex: 1,
    textAlign: 'center',
    color: '#00e5ff',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 4,
  },
  headerSpacer: { width: 60 },
  scroll: { flex: 1 },
  content: { padding: 16, gap: 16 },
  modeRow: { flexDirection: 'row', gap: 8 },
  modeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 4,
  },
  modeBtnActive: { borderColor: '#00e5ff', backgroundColor: 'rgba(0,229,255,0.1)' },
  modeBtnText: { color: '#666', fontSize: 11, letterSpacing: 1 },
  modeBtnTextActive: { color: '#00e5ff' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  resetBtn: {
    flex: 1,
    padding: 14,
    borderWidth: 1,
    borderColor: '#ff5252',
    borderRadius: 4,
    alignItems: 'center',
  },
  resetBtnText: { color: '#ff5252', fontSize: 12, letterSpacing: 2 },
  saveBtn: {
    flex: 2,
    padding: 14,
    backgroundColor: '#00e5ff',
    borderRadius: 4,
    alignItems: 'center',
  },
  saveBtnText: { color: '#000', fontSize: 13, fontWeight: 'bold', letterSpacing: 2 },
});

const sStyles = StyleSheet.create({
  section: {
    gap: 8,
    borderWidth: 1,
    borderColor: '#1a1a2a',
    borderRadius: 6,
    padding: 12,
  },
  sectionTitle: {
    color: '#00e5ff',
    fontSize: 10,
    letterSpacing: 2,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 36,
  },
  rowVertical: { flexDirection: 'column', alignItems: 'flex-start', gap: 6 },
  rowLabel: { color: '#aaa', fontSize: 12, letterSpacing: 1, minWidth: 60 },
  infoBox: {
    backgroundColor: '#0f0f1a',
    borderRadius: 4,
    padding: 10,
    borderLeftWidth: 2,
    borderLeftColor: '#00e5ff44',
  },
  infoText: { color: '#667', fontSize: 11, lineHeight: 17 },
  numRow: { flexDirection: 'row', alignItems: 'center', gap: 0 },
  numBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 3,
  },
  numBtnText: { color: '#00e5ff', fontSize: 18, lineHeight: 20 },
  numVal: {
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numValText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  urlInput: {
    width: '100%',
    backgroundColor: '#0d0d1a',
    color: '#fff',
    fontSize: 11,
    fontFamily: 'monospace',
    padding: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#333',
    height: 36,
  },
});
