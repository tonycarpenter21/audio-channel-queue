/**
 * @fileoverview Main entry point for the audio-channel-queue package
 * Exports all public functions and types for audio queue management, pause/resume controls,
 * volume management with ducking, progress tracking, and comprehensive event system
 */

// Core queue management functions
export { queueAudio, queueAudioPriority, stopCurrentAudioInChannel, stopAllAudioInChannel, stopAllAudio, playAudioQueue } from './core';

// Error handling and recovery functions
export { 
  getErrorRecovery, 
  getRetryConfig, 
  offAudioError, 
  onAudioError, 
  retryFailedAudio,
  setErrorRecovery, 
  setRetryConfig, 
} from './errors';

// Pause and resume management functions
export { 
  getAllChannelsPauseState, 
  isChannelPaused, 
  pauseAllChannels, 
  pauseChannel, 
  resumeAllChannels, 
  resumeChannel, 
  togglePauseAllChannels,
  togglePauseChannel, 
} from './pause';

// Volume control and ducking functions
export { 
  clearVolumeDucking,
  getAllChannelsVolume, 
  getChannelVolume, 
  setAllChannelsVolume, 
  setChannelVolume, 
  setVolumeDucking, 
} from './volume';

// Audio information and progress tracking functions
export { 
  getAllChannelsInfo, 
  getCurrentAudioInfo, 
  getQueueSnapshot, 
  offAudioPause, 
  offAudioProgress, 
  offAudioResume,
  offQueueChange, 
  onAudioComplete, 
  onAudioPause, 
  onAudioProgress, 
  onAudioResume, 
  onAudioStart, 
  onQueueChange, 
} from './info';

// Core data access for legacy compatibility
export { audioChannels } from './info';

// Utility helper functions
export {
  cleanWebpackFilename,
  createQueueSnapshot,
  extractFileName,
  getAudioInfoFromElement
} from './utils';

// TypeScript type definitions and interfaces
export type { 
  AudioCompleteCallback,
  AudioCompleteInfo,
  AudioErrorCallback,
  AudioErrorInfo,
  AudioInfo, 
  AudioPauseCallback,
  AudioQueueOptions,
  AudioResumeCallback,
  AudioStartCallback,
  AudioStartInfo,
  ErrorRecoveryOptions,
  ExtendedAudioQueueChannel,
  ProgressCallback,
  QueueChangeCallback,
  QueueSnapshot,
  RetryConfig,
  VolumeConfig 
} from './types'; 