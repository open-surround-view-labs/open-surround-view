import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import NativeCameraView, { listCameraDevices, CameraDeviceInfo } from '../modules/native-camera-view';

export default function CameraFinderScreen() {
  const [devices, setDevices] = useState<CameraDeviceInfo[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusById, setStatusById] = useState<Record<string, string>>({});

  useEffect(() => {
    listCameraDevices()
      .then(setDevices)
      .catch((e) => setError(String(e?.message || e)));
  }, []);

  const setStatus = (id: string, msg: string) => {
    setStatusById((prev) => ({ ...prev, [id]: msg }));
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
        <Text style={styles.backText}>‹ Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Camera Finder</Text>
      <Text style={styles.subtitle}>
        This scans for EVERY camera device your head unit's Android system can see —
        including the 4 external car cameras (front/rear/left/right) that normal apps
        can't detect. Watch each preview below and note which one shows which physical
        camera (e.g. "shows the view behind the car" = REAR).
      </Text>

      {error && <Text style={styles.error}>Error: {error}</Text>}
      {!devices && !error && <Text style={styles.info}>Scanning for cameras…</Text>}
      {devices && devices.length === 0 && (
        <Text style={styles.error}>No camera devices found on this system.</Text>
      )}

      {devices?.map((d) => (
        <View key={d.id} style={styles.card}>
          <Text style={styles.cardTitle}>
            Camera ID "{d.id}"  •  type: {d.facing}
            {d.width > 0 ? `  •  ${d.width}x${d.height}` : ''}
          </Text>
          <View style={styles.previewBox}>
            <NativeCameraView
              cameraId={d.id}
              style={{ width: '100%', height: '100%' }}
              onCameraConnected={() => setStatus(d.id, 'Connected ✓')}
              onCameraError={(e) => setStatus(d.id, `Error: ${e.nativeEvent.error}`)}
            />
          </View>
          <Text style={styles.status}>{statusById[d.id] || 'Connecting…'}</Text>
        </View>
      ))}

      <Text style={styles.footerNote}>
        Once you know which Camera ID corresponds to FRONT, REAR, LEFT and RIGHT,
        open Settings and enter those exact ID numbers for each camera.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  backBtn: { marginBottom: 12 },
  backText: { color: '#4af', fontSize: 16 },
  title: { color: '#fff', fontSize: 22, fontWeight: '700', marginBottom: 8 },
  subtitle: { color: '#aaa', fontSize: 13, marginBottom: 16, lineHeight: 18 },
  info: { color: '#aaa', fontSize: 14 },
  error: { color: '#f55', fontSize: 14, marginBottom: 12 },
  card: { marginBottom: 24, backgroundColor: '#111', borderRadius: 8, padding: 10 },
  cardTitle: { color: '#fff', fontSize: 15, fontWeight: '600', marginBottom: 8 },
  previewBox: { width: '100%', height: 220, backgroundColor: '#222', borderRadius: 6, overflow: 'hidden' },
  status: { color: '#9f9', fontSize: 13, marginTop: 6 },
  footerNote: { color: '#888', fontSize: 12, marginTop: 8, marginBottom: 40, lineHeight: 17 },
});
