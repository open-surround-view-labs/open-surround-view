import React, { useRef, useCallback } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { getCameraHtml, getMjpegHtml } from '../utils/cameraHtml';

export type FeedMode = 'camera2' | 'mjpeg';

interface Props {
  index: number;
  label: string;
  mode: FeedMode;
  cameraId?: number;
  mjpegUrl?: string;
  onPress?: () => void;
  style?: object;
}

export default function CameraFeed({
  index,
  label,
  mode,
  cameraId = 0,
  mjpegUrl = '',
  onPress,
  style,
}: Props) {
  const webViewRef = useRef<WebView>(null);

  const html =
    mode === 'mjpeg'
      ? getMjpegHtml(mjpegUrl, label)
      : getCameraHtml(cameraId, label);

  const onMessage = useCallback((event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (__DEV__) {
        console.log(`[Camera ${label}]`, data);
      }
    } catch {}
  }, [label]);

  return (
    <TouchableOpacity
      style={[styles.container, style]}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <WebView
        ref={webViewRef}
        style={styles.webview}
        source={{ html }}
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
        incognito={false}
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        setDisplayZoomControls={false}
        originWhitelist={['*']}
        onError={(e) => {
          console.warn(`WebView error [${label}]:`, e.nativeEvent.description);
        }}
      />
      <View style={styles.cornerTL} />
      <View style={styles.cornerBR} />
    </TouchableOpacity>
  );
}

const CORNER = 14;
const BORDER = '#00e5ff44';

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
  cornerTL: {
    position: 'absolute',
    top: 4,
    left: 4,
    width: CORNER,
    height: CORNER,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderColor: '#00e5ff',
  },
  cornerBR: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: CORNER,
    height: CORNER,
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderColor: '#00e5ff',
  },
});
