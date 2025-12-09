
export enum SecuritySeverity {
  SAFE = 'SAFE',
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export type FireSensitivity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

// [ymin, xmin, ymax, xmax] normalized to 1000
export type BoundingBox = [number, number, number, number];

export interface DetectedEvent {
  category: string;
  description: string;
  severity: SecuritySeverity;
  timestamp: string;
  box_2d?: BoundingBox; 
}

export interface AnalysisResult {
  detectedEvents: DetectedEvent[];
  summary: string;
}

export interface CameraSource {
  id: string;
  name: string;
  type: 'webcam' | 'video_file' | 'screen_capture' | 'network_url';
  fileSrc?: string;
  urlSrc?: string;
  stream?: MediaStream; // For screen capture streams
}

export interface CameraConfig {
  intervalMs: number;
  active: boolean;
  fireSensitivity: FireSensitivity;
}
