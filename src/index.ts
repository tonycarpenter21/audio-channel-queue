/**
 * @fileoverview Main entry point for the audio-channel-queue package
 * 
 * A comprehensive audio queue management system with real-time progress tracking,
 * multi-channel support, pause/resume functionality, volume control with ducking,
 * looping capabilities, and extensive event handling.
 * 
 * @example Basic Usage
 * ```typescript
 * import { queueAudio, onAudioProgress, pauseChannel } from 'audio-channel-queue';
 * 
 * // Queue an audio file
 * await queueAudio('song.mp3');
 * 
 * // Track progress
 * onAudioProgress(0, (info) => {
 *   console.log(`Progress: ${info.progress * 100}%`);
 * });
 * 
 * // Pause playback
 * await pauseChannel(0);
 * ```
 */

// Export all type definitions
export type {
  AudioCompleteCallback,
  AudioCompleteInfo,
  AudioInfo,
  AudioPauseCallback,
  AudioQueue,
  AudioQueueChannel,
  AudioQueueOptions,
  AudioResumeCallback,
  AudioStartCallback,
  AudioStartInfo,
  ExtendedAudioQueueChannel,
  ProgressCallback,
  QueueChangeCallback,
  QueueItem,
  QueueSnapshot,
  VolumeConfig
} from './types';

// Export core queue management functions
export {
  playAudioQueue,
  queueAudio,
  queueAudioPriority,
  stopAllAudio,
  stopAllAudioInChannel,
  stopCurrentAudioInChannel
} from './core';

// Export pause and resume functionality
export {
  getAllChannelsPauseState,
  isChannelPaused,
  pauseAllChannels,
  pauseChannel,
  resumeAllChannels,
  resumeChannel,
  togglePauseAllChannels,
  togglePauseChannel
} from './pause';

// Export volume control functions
export {
  applyVolumeDucking,
  clearVolumeDucking,
  getAllChannelsVolume,
  getChannelVolume,
  restoreVolumeLevels,
  setAllChannelsVolume,
  setChannelVolume,
  setVolumeDucking,
  transitionVolume
} from './volume';

// Export audio information and progress tracking functions
export {
  audioChannels,
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

// Export utility functions (for advanced usage)
export {
  cleanWebpackFilename,
  createQueueSnapshot,
  extractFileName,
  getAudioInfoFromElement
} from './utils'; 