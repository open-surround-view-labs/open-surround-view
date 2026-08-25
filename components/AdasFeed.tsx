import React, { useRef, useCallback, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Animated } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { getAdasHtml } from '../utils/adasHtml';

interface Props {
  cameraId: number;
  onPress?: () => void;
  style?: object;
}

type FcwLevel = 'critical' | 'warning' | null;

export default function AdasFeed({ cameraId, onPress, style }: Props) {
  const webViewRef = useRef<WebView>(null);
  const [fcwLevel, setFcwLevel] = useState<FcwLevel>(null);
  const [ldwDir, setLdwDir] = useState<'left' | 'right' | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const triggerPulse = useCallback(() => {
    Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 0.3, duration: 150, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();
  }, [pulseAnim]);

  const onMessage = useCallback((event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'fcw') {
        setFcwLevel(data.level);
        triggerPulse();
        // Clear after 2s of no new FCW
        setTimeout(() => setFcwLevel(null), 2000);
      } else if (data.type === 'ldw') {
        setLdwDir(data.direction);
        setTimeout(() => setLdwDir(null), 1500);
      }
    } catch {}
  }, [triggerPulse]);

  return (
    <TouchableOpacity
      style={[styles.container, style]}
      onPress={onPress}
      activeOpacity={0.95}
    >
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: pulseAnim }]}>
        <WebView
          ref={webViewRef}
          style={styles.webview}
          source={{ html: getAdasHtml(cameraId) }}
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          javaScriptEnabled
          domStorageEnabled
          allowFileAccess
          allowUniversalAccessFromFileURLs
          mixedContentMode="always"
          androidLayerType="hardware"
          onMessage={onMessage}
          cacheEnabled={false}
          scrollEnabled={false}
          bounces={false}
          overScrollMode="never"
          originWhitelist={['*', 'https://*', 'http://*']}
          onError={(e) => console.warn('ADAS WebView error:', e.nativeEvent.description)}
        />
      </Animated.View>

      {/* FCW native border overlay */}
      {fcwLevel && (
        <View
          style={[
            styles.fcwBorder,
            fcwLevel === 'critical' ? styles.fcwCritical : styles.fcwWarning,
          ]}
          pointerEvents="none"
        />
      )}

      {/* LDW native side flash */}
      {ldwDir === 'left'  && <View style={[styles.ldwFlash, styles.ldwLeft]}  pointerEvents="none" />}
      {ldwDir === 'right' && <View style={[styles.ldwFlash, styles.ldwRight]} pointerEvents="none" />}

      {/* Corner brackets */}
      <View style={styles.cornerTL} pointerEvents="none" />
      <View style={styles.cornerBR} pointerEvents="none" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    backgroundColor: '#000',
    borderWidth: 1,
    borderColor: '#00e5ff22',
  },
  webview: {
    flex: 1,
    backgroundColor: '#000',
  },
  fcwBorder: {
    position: 'absolute',
    inset: 0,
    borderWidth: 3,
    borderRadius: 1,
  },
  fcwCritical: { borderColor: '#ff1744' },
  fcwWarning:  { borderColor: '#ff6d00' },
  ldwFlash: {
    position: 'absolute',
    top: 0, bottom: 0,
    width: 6,
    backgroundColor: 'rgba(255,235,59,0.5)',
  },
  ldwLeft:  { left: 0 },
  ldwRight: { right: 0 },
  cornerTL: {
    position: 'absolute', top: 4, left: 4,
    width: 14, height: 14,
    borderTopWidth: 2, borderLeftWidth: 2,
    borderColor: '#00e5ff',
  },
  cornerBR: {
    position: 'absolute', bottom: 4, right: 4,
    width: 14, height: 14,
    borderBottomWidth: 2, borderRightWidth: 2,
    borderColor: '#00e5ff',
  },
});
