/**
 * @fileoverview Main entry point for the audioq package
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
  playAudioQueue,
  destroyChannel,
  destroyAllChannels,
  setQueueConfig,
  getQueueConfig,
  setChannelQueueLimit
} from './core';

// Queue manipulation functions
export {
  clearQueueAfterCurrent,
  getQueueItemInfo,
  getQueueLength,
  removeQueuedItem,
  reorderQueue,
  swapQueueItems
} from './queue-manipulation';

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
  cancelAllVolumeTransitions,
  cancelVolumeTransition,
  clearVolumeDucking,
  getAllChannelsVolume,
  getChannelVolume,
  getFadeConfig,
  getGlobalVolume,
  setAllChannelsVolume,
  setChannelVolume,
  setGlobalVolume,
  setVolumeDucking,
  transitionVolume
} from './volume';

// Web Audio API support functions
export {
  cleanupWebAudioNodes,
  createWebAudioNodes,
  getAudioContext,
  getWebAudioConfig,
  getWebAudioSupport,
  getWebAudioVolume,
  isIOSDevice,
  isWebAudioSupported,
  resumeAudioContext,
  setWebAudioConfig,
  setWebAudioVolume,
  shouldUseWebAudio
} from './web-audio';

// Audio information and progress tracking functions
export {
  getAllChannelsInfo,
  getCurrentAudioInfo,
  getQueueSnapshot,
  offAudioComplete,
  offAudioPause,
  offAudioProgress,
  offAudioResume,
  offAudioStart,
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
  getAudioInfoFromElement,
  sanitizeForDisplay,
  validateAudioUrl
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
  QueueConfig,
  QueueItem,
  QueueManipulationResult,
  QueueSnapshot,
  RetryConfig,
  VolumeConfig,
  WebAudioConfig,
  WebAudioNodeSet,
  WebAudioSupport
} from './types';

// Enums and constants
export {
  AudioErrorType,
  EasingType,
  FadeType,
  MAX_CHANNELS,
  TimerType,
  GLOBAL_PROGRESS_KEY
} from './types';
