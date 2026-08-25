import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { WebView } from 'react-native-webview';
import CameraFeed, { FeedMode } from '../components/CameraFeed';
import AdasFeed from '../components/AdasFeed';
import { loadConfig, CameraConfig, DEFAULT_CONFIG } from '../utils/storage';
import { getBirdsEyeHtml } from '../utils/cameraHtml';

type ViewMode = '2x2' | 'main+3' | 'single' | 'birds-eye';

const CAMERAS = [
  { key: 'front', label: 'FRONT' },
  { key: 'rear',  label: 'REAR'  },
  { key: 'left',  label: 'LEFT'  },
  { key: 'right', label: 'RIGHT' },
] as const;

export default function MainScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [config, setConfig] = useState<CameraConfig>(DEFAULT_CONFIG);
  const [viewMode, setViewMode] = useState<ViewMode>('2x2');
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [permissionGranted, setPermissionGranted] = useState(false);

  const { width: W, height: H } = Dimensions.get('window');

  useEffect(() => {
    loadConfig().then(setConfig);
  }, []);

  useEffect(() => {
    if (permission?.granted) {
      setPermissionGranted(true);
    } else if (permission?.canAskAgain === false) {
      // Permission permanently denied — still show but with error state
      setPermissionGranted(true);
    }
  }, [permission]);

  const handleRequestPermission = useCallback(async () => {
    const result = await requestPermission();
    if (result.granted) setPermissionGranted(true);
    else setPermissionGranted(true); // show app anyway with error states in feeds
  }, [requestPermission]);

  const getFeedProps = (idx: number) => {
    const cam = CAMERAS[idx];
    const mode: FeedMode = config.mode === 'mjpeg' ? 'mjpeg' : 'camera2';
    const idKey = `${cam.key}Id` as keyof CameraConfig;
    const urlKey = `${cam.key}Url` as keyof CameraConfig;
    return {
      index: idx,
      label: cam.label,
      mode,
      cameraId: config[idKey] as number,
      mjpegUrl: config[urlKey] as string,
    };
  };

  if (!permission) {
    return (
      <View style={styles.splash}>
        <Text style={styles.splashTitle}>OPEN SURROUND VIEW</Text>
        <Text style={styles.splashSub}>Initializing…</Text>
      </View>
    );
  }

  if (!permissionGranted) {
    return (
      <View style={styles.splash}>
        <Text style={styles.splashTitle}>OPEN SURROUND VIEW</Text>
        <Text style={styles.splashSub}>Camera access required for surround view</Text>
        <TouchableOpacity style={styles.permBtn} onPress={handleRequestPermission}>
          <Text style={styles.permBtnText}>GRANT CAMERA ACCESS</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.permBtn, { marginTop: 10, borderColor: '#444' }]}
          onPress={() => setPermissionGranted(true)}
        >
          <Text style={[styles.permBtnText, { color: '#888' }]}>CONTINUE ANYWAY</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* Camera Grid */}
      <View style={styles.grid}>
        {viewMode === '2x2' && (
          <View style={styles.grid2x2}>
            {CAMERAS.map((_, idx) =>
              idx === 0 ? (
                // Front camera always gets full ADAS
                <AdasFeed
                  key={idx}
                  cameraId={config.frontId}
                  style={styles.cell2x2}
                  onPress={() => { setFocusedIndex(0); setViewMode('single'); }}
                />
              ) : (
                <CameraFeed
                  key={idx}
                  {...getFeedProps(idx)}
                  style={styles.cell2x2}
                  onPress={() => { setFocusedIndex(idx); setViewMode('single'); }}
                />
              )
            )}
          </View>
        )}

        {viewMode === 'main+3' && (
          <View style={styles.mainPlusThree}>
            {focusedIndex === 0 ? (
              <AdasFeed
                cameraId={config.frontId}
                style={styles.mainCell}
                onPress={() => setViewMode('single')}
              />
            ) : (
              <CameraFeed
                {...getFeedProps(focusedIndex)}
                style={styles.mainCell}
                onPress={() => setViewMode('single')}
              />
            )}
            <View style={styles.sideColumn}>
              {CAMERAS.map((_, idx) =>
                idx !== focusedIndex ? (
                  idx === 0 ? (
                    <AdasFeed
                      key={idx}
                      cameraId={config.frontId}
                      style={styles.sideCell}
                      onPress={() => setFocusedIndex(0)}
                    />
                  ) : (
                    <CameraFeed
                      key={idx}
                      {...getFeedProps(idx)}
                      style={styles.sideCell}
                      onPress={() => setFocusedIndex(idx)}
                    />
                  )
                ) : null
              )}
            </View>
          </View>
        )}

        {viewMode === 'single' && focusedIndex === 0 && (
          <AdasFeed
            cameraId={config.frontId}
            style={StyleSheet.absoluteFill}
            onPress={() => setViewMode('2x2')}
          />
        )}
        {viewMode === 'single' && focusedIndex !== 0 && (
          <CameraFeed
            {...getFeedProps(focusedIndex)}
            style={StyleSheet.absoluteFill}
            onPress={() => setViewMode('2x2')}
          />
        )}

        {viewMode === 'birds-eye' && (
          <WebView
            style={StyleSheet.absoluteFill}
            source={{ html: getBirdsEyeHtml() }}
            javaScriptEnabled
            scrollEnabled={false}
            bounces={false}
            originWhitelist={['*']}
          />
        )}
      </View>

      {/* HUD Toolbar */}
      <View style={styles.toolbar}>
        <TouchableOpacity
          style={[styles.toolBtn, viewMode === '2x2' && styles.toolBtnActive]}
          onPress={() => setViewMode('2x2')}
        >
          <Text style={styles.toolIcon}>⊞</Text>
          <Text style={styles.toolLabel}>GRID</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.toolBtn, viewMode === 'main+3' && styles.toolBtnActive]}
          onPress={() => setViewMode('main+3')}
        >
          <Text style={styles.toolIcon}>⊡</Text>
          <Text style={styles.toolLabel}>MAIN</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.toolBtn, viewMode === 'birds-eye' && styles.toolBtnActive]}
          onPress={() => setViewMode('birds-eye')}
        >
          <Text style={styles.toolIcon}>◎</Text>
          <Text style={styles.toolLabel}>360°</Text>
        </TouchableOpacity>

        {viewMode === 'main+3' && (
          <View style={styles.camSelector}>
            {CAMERAS.map((cam, idx) => (
              <TouchableOpacity
                key={idx}
                style={[styles.camBtn, focusedIndex === idx && styles.camBtnActive]}
                onPress={() => setFocusedIndex(idx)}
              >
                <Text style={styles.camBtnText}>{cam.label[0]}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={styles.spacer} />

        <TouchableOpacity
          style={styles.settingsBtn}
          onPress={() => router.push('/settings')}
        >
          <Text style={styles.toolIcon}>⚙</Text>
          <Text style={styles.toolLabel}>SETUP</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.settingsBtn}
          onPress={() => router.push('/camera-finder')}
        >
          <Text style={styles.toolIcon}>🔍</Text>
          <Text style={styles.toolLabel}>FIND CAMS</Text>
        </TouchableOpacity>
      </View>

      {/* Mode label */}
      <View style={styles.modeTag} pointerEvents="none">
        <Text style={styles.modeTagText}>
          {viewMode === '2x2' ? 'SURROUND VIEW'
            : viewMode === 'main+3' ? `${CAMERAS[focusedIndex].label} + 3`
            : viewMode === 'birds-eye' ? "BIRD'S EYE"
            : CAMERAS[focusedIndex].label + ' — TAP TO RETURN'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
  splash: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  splashTitle: {
    color: '#00e5ff',
    fontSize: 28,
    fontWeight: 'bold',
    letterSpacing: 6,
    textShadowColor: '#00e5ff',
    textShadowRadius: 12,
    textShadowOffset: { width: 0, height: 0 },
  },
  splashSub: {
    color: '#666',
    fontSize: 13,
    letterSpacing: 1,
  },
  permBtn: {
    borderWidth: 1,
    borderColor: '#00e5ff',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 4,
  },
  permBtnText: {
    color: '#00e5ff',
    fontSize: 13,
    letterSpacing: 2,
    fontWeight: 'bold',
  },
  grid: {
    flex: 1,
  },
  grid2x2: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell2x2: {
    width: '50%',
    height: '50%',
  },
  mainPlusThree: {
    flex: 1,
    flexDirection: 'row',
  },
  mainCell: {
    flex: 3,
    height: '100%',
  },
  sideColumn: {
    flex: 1,
    flexDirection: 'column',
  },
  sideCell: {
    flex: 1,
    width: '100%',
  },
  toolbar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderTopWidth: 1,
    borderTopColor: '#00e5ff22',
    paddingHorizontal: 8,
    gap: 4,
  },
  toolBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#333',
    gap: 4,
  },
  toolBtnActive: {
    borderColor: '#00e5ff',
    backgroundColor: 'rgba(0,229,255,0.1)',
  },
  toolIcon: {
    color: '#00e5ff',
    fontSize: 14,
  },
  toolLabel: {
    color: '#aaa',
    fontSize: 9,
    letterSpacing: 1,
  },
  camSelector: {
    flexDirection: 'row',
    gap: 4,
    marginLeft: 4,
  },
  camBtn: {
    width: 26,
    height: 26,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  camBtnActive: {
    borderColor: '#00e5ff',
    backgroundColor: 'rgba(0,229,255,0.15)',
  },
  camBtnText: {
    color: '#00e5ff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  spacer: {
    flex: 1,
  },
  settingsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#333',
    gap: 4,
  },
  modeTag: {
    position: 'absolute',
    top: 8,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  modeTagText: {
    color: 'rgba(0,229,255,0.5)',
    fontSize: 9,
    letterSpacing: 3,
    fontWeight: 'bold',
  },
});
