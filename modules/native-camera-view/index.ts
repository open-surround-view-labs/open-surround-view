import { requireNativeModule, requireNativeViewManager } from 'expo-modules-core';
import * as React from 'react';
import { ViewProps } from 'react-native';

const NativeCameraModule = requireNativeModule('NativeCameraView');

export type CameraDeviceInfo = {
  id: string;
  facing: 'front' | 'back' | 'external' | 'unknown';
  width: number;
  height: number;
};

/**
 * Lists ALL camera devices the Android system can see — including
 * external/composite-video decoder cameras wired to car camera inputs,
 * which standard camera APIs (and WebViews) cannot enumerate.
 */
export async function listCameraDevices(): Promise<CameraDeviceInfo[]> {
  return await NativeCameraModule.listCameraDevices();
}

export type NativeCameraViewProps = ViewProps & {
  /** The Camera2 camera ID string to display, e.g. "0", "1", "2", "3" */
  cameraId?: string;
  onCameraConnected?: (event: { nativeEvent: { cameraId: string } }) => void;
  onCameraError?: (event: { nativeEvent: { cameraId: string; error: string } }) => void;
};

const NativeView: React.ComponentType<NativeCameraViewProps> =
  requireNativeViewManager('NativeCameraView');

export default function NativeCameraView(props: NativeCameraViewProps) {
  return React.createElement(NativeView, props);
}
