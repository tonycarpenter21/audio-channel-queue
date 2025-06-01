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
export type { AudioCompleteCallback, AudioCompleteInfo, AudioInfo, AudioQueue, AudioQueueChannel, AudioStartCallback, AudioStartInfo, ExtendedAudioQueueChannel, ProgressCallback, QueueChangeCallback, QueueItem, QueueSnapshot } from './types';
export { playAudioQueue, queueAudio, stopAllAudio, stopAllAudioInChannel, stopCurrentAudioInChannel } from './core';
export { audioChannels, getAllChannelsInfo, getCurrentAudioInfo, getQueueSnapshot, offAudioProgress, onAudioComplete, onAudioProgress, onAudioStart, onQueueChange, offQueueChange } from './info';
export { cleanWebpackFilename, createQueueSnapshot, extractFileName, getAudioInfoFromElement } from './utils';
