import AsyncStorage from '@react-native-async-storage/async-storage';

export interface CameraConfig {
  mode: 'camera2' | 'mjpeg' | 'rtsp';
  // Camera2 API camera IDs (0-based index)
  frontId: number;
  rearId: number;
  leftId: number;
  rightId: number;
  // MJPEG/RTSP URLs (used when mode is 'mjpeg' or 'rtsp')
  frontUrl: string;
  rearUrl: string;
  leftUrl: string;
  rightUrl: string;
  // Display
  showGrid: boolean;
  gridLayout: '2x2' | 'main+3' | 'single';
  activeCameraIndex: number;
}

export const DEFAULT_CONFIG: CameraConfig = {
  mode: 'camera2',
  frontId: 1,
  rearId: 0,
  leftId: 2,
  rightId: 3,
  frontUrl: 'http://192.168.1.100:8080/?action=stream',
  rearUrl: 'http://192.168.1.100:8081/?action=stream',
  leftUrl: 'http://192.168.1.100:8082/?action=stream',
  rightUrl: 'http://192.168.1.100:8083/?action=stream',
  showGrid: true,
  gridLayout: '2x2',
  activeCameraIndex: 0,
};

const STORAGE_KEY = 'open_surround_view_camera_config';

export async function loadConfig(): Promise<CameraConfig> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CONFIG;
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export async function saveConfig(config: CameraConfig): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}
