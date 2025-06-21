/**
 * @fileoverview Main entry point for the audio-channel-queue package
 * Exports all public functions and types for audio queue management, pause/resume controls,
 * volume management with ducking, progress tracking, and comprehensive event system
 */

// Core queue management functions
export {
  queueAudio,
  queueAudioPriority,
  stopCurrentAudioInChannel,
  stopAllAudioInChannel,
  stopAllAudio,
  playAudioQueue
} from './core';

// Error handling and recovery functions
export {
  getErrorRecovery,
  getRetryConfig,
  offAudioError,
  onAudioError,
  retryFailedAudio,
  setErrorRecovery,
  setRetryConfig
} from './errors';

// Pause and resume management functions
export {
  getAllChannelsPauseState,
  isChannelPaused,
  pauseAllChannels,
  pauseAllWithFade,
  pauseChannel,
  pauseWithFade,
  resumeAllChannels,
  resumeAllWithFade,
  resumeChannel,
  resumeWithFade,
  togglePauseAllChannels,
  togglePauseAllWithFade,
  togglePauseChannel,
  togglePauseWithFade
} from './pause';

// Volume control and ducking functions
export {
  clearVolumeDucking,
  fadeVolume,
  getAllChannelsVolume,
  getChannelVolume,
  getFadeConfig,
  setAllChannelsVolume,
  setChannelVolume,
  setVolumeDucking,
  transitionVolume
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
  onQueueChange
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
  ChannelFadeState,
  ErrorRecoveryOptions,
  ExtendedAudioQueueChannel,
  FadeConfig,
  ProgressCallback,
  QueueChangeCallback,
  QueueItem,
  QueueSnapshot,
  RetryConfig,
  VolumeConfig
} from './types';

// Enums and constants
export { EasingType, FadeType, GLOBAL_PROGRESS_KEY } from './types';
