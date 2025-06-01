/**
 * @fileoverview Main entry point for the audio-channel-queue package
 * 
 * A comprehensive audio queue management system with real-time progress tracking,
 * multi-channel support, and extensive event handling capabilities.
 * 
 * @example Basic Usage
 * ```typescript
 * import { queueAudio, onAudioProgress } from 'audio-channel-queue';
 * 
 * // Queue an audio file
 * await queueAudio('song.mp3');
 * 
 * // Track progress
 * onAudioProgress(0, (info) => {
 *   console.log(`Progress: ${info.progress * 100}%`);
 * });
 * ```
 */

// Export all type definitions
export type {
  AudioCompleteCallback,
  AudioCompleteInfo,
  AudioInfo,
  AudioQueue,
  AudioQueueChannel,
  AudioStartCallback,
  AudioStartInfo,
  ExtendedAudioQueueChannel,
  ProgressCallback,
  QueueChangeCallback,
  QueueItem,
  QueueSnapshot
} from './types';

// Export core queue management functions
export {
  playAudioQueue,
  queueAudio,
  stopAllAudio,
  stopAllAudioInChannel,
  stopCurrentAudioInChannel
} from './core';

// Export audio information and progress tracking functions
export {
  audioChannels,
  getAllChannelsInfo,
  getCurrentAudioInfo,
  getQueueSnapshot,
  offAudioProgress,
  onAudioComplete,
  onAudioProgress,
  onAudioStart,
  onQueueChange,
  offQueueChange
} from './info';

// Export utility functions (for advanced usage)
export {
  cleanWebpackFilename,
  createQueueSnapshot,
  extractFileName,
  getAudioInfoFromElement
} from './utils'; 