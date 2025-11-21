export enum AppState {
  IDLE = 'IDLE',
  ANALYZING = 'ANALYZING',
  READY = 'READY',
  INTERVIEWING = 'INTERVIEWING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}

export interface CVAnalysis {
  candidateName: string;
  summary: string;
  topics: string[];
  technicalSkills: string[];
}

export type CVInput = string | { mimeType: string; data: string };

export interface AudioVisualizerProps {
  analyser: AnalyserNode | null;
  isActive: boolean;
}