import { createContext, useContext } from 'react';

export interface VideoSyncController {
  register: (ref: HTMLVideoElement) => void;
  unregister: (ref: HTMLVideoElement) => void;
  onSeek: (time: number, source: HTMLVideoElement) => void;
}

export const VideoSyncContext = createContext<VideoSyncController | null>(null);

export function useVideoSync(): VideoSyncController | null {
  return useContext(VideoSyncContext);
}
