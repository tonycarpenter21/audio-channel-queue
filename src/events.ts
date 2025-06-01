/**
 * @fileoverview Event handling and emission for the audio-channel-queue package
 */

import { 
  AudioStartInfo, 
  AudioCompleteInfo, 
  ExtendedAudioQueueChannel,
  QueueSnapshot,
  ProgressCallback,
  AudioInfo,
} from './types';
import { createQueueSnapshot, getAudioInfoFromElement } from './utils';

/**
 * Emits a queue change event to all registered listeners for a specific channel
 * @param channelNumber - The channel number that experienced a queue change
 * @param audioChannels - Array of audio channels
 * @example
 * ```typescript
 * emitQueueChange(0, audioChannels); // Notifies all queue change listeners
 * ```
 */
export const emitQueueChange = (
  channelNumber: number, 
  audioChannels: ExtendedAudioQueueChannel[]
): void => {
  const channel: ExtendedAudioQueueChannel = audioChannels[channelNumber];
  if (!channel || !channel.queueChangeCallbacks) return;

  const snapshot: QueueSnapshot | null = createQueueSnapshot(channelNumber, audioChannels);
  if (!snapshot) return;

  channel.queueChangeCallbacks.forEach(callback => {
    try {
      callback(snapshot);
    } catch (error) {
      console.error('Error in queue change callback:', error);
    }
  });
};

/**
 * Emits an audio start event to all registered listeners for a specific channel
 * @param channelNumber - The channel number where audio started
 * @param audioInfo - Information about the audio that started
 * @param audioChannels - Array of audio channels
 * @example
 * ```typescript
 * emitAudioStart(0, { src: 'song.mp3', fileName: 'song.mp3', duration: 180000, channelNumber: 0 }, audioChannels);
 * ```
 */
export const emitAudioStart = (
  channelNumber: number, 
  audioInfo: AudioStartInfo,
  audioChannels: ExtendedAudioQueueChannel[]
): void => {
  const channel: ExtendedAudioQueueChannel = audioChannels[channelNumber];
  if (!channel || !channel.audioStartCallbacks) return;

  channel.audioStartCallbacks.forEach(callback => {
    try {
      callback(audioInfo);
    } catch (error) {
      console.error('Error in audio start callback:', error);
    }
  });
};

/**
 * Emits an audio complete event to all registered listeners for a specific channel
 * @param channelNumber - The channel number where audio completed
 * @param audioInfo - Information about the audio that completed
 * @param audioChannels - Array of audio channels
 * @example
 * ```typescript
 * emitAudioComplete(0, { src: 'song.mp3', fileName: 'song.mp3', channelNumber: 0, remainingInQueue: 2 }, audioChannels);
 * ```
 */
export const emitAudioComplete = (
  channelNumber: number, 
  audioInfo: AudioCompleteInfo,
  audioChannels: ExtendedAudioQueueChannel[]
): void => {
  const channel: ExtendedAudioQueueChannel = audioChannels[channelNumber];
  if (!channel || !channel.audioCompleteCallbacks) return;

  channel.audioCompleteCallbacks.forEach(callback => {
    try {
      callback(audioInfo);
    } catch (error) {
      console.error('Error in audio complete callback:', error);
    }
  });
};

// Store listener functions for cleanup
const progressListeners = new WeakMap<HTMLAudioElement, () => void>();

/**
 * Sets up comprehensive progress tracking for an audio element
 * @param audio - The HTML audio element to track
 * @param channelNumber - The channel number this audio belongs to
 * @param audioChannels - Array of audio channels
 * @example
 * ```typescript
 * const audioElement = new Audio('song.mp3');
 * setupProgressTracking(audioElement, 0, audioChannels);
 * ```
 */
export const setupProgressTracking = (
  audio: HTMLAudioElement, 
  channelNumber: number,
  audioChannels: ExtendedAudioQueueChannel[]
): void => {
  const channel: ExtendedAudioQueueChannel = audioChannels[channelNumber];
  if (!channel) return;

  if (!channel.progressCallbacks) {
    channel.progressCallbacks = new Map();
  }

  // Don't set up tracking if already exists
  if (progressListeners.has(audio)) return;

  const updateProgress = (): void => {
    // Get callbacks for this specific audio element AND the channel-wide callbacks
    const audioCallbacks: Set<ProgressCallback> = channel.progressCallbacks?.get(audio) || new Set();
    const channelCallbacks: Set<ProgressCallback> = channel.progressCallbacks?.get(null as any) || new Set();
    
    // Combine both sets of callbacks
    const allCallbacks: Set<ProgressCallback> = new Set([...audioCallbacks, ...channelCallbacks]);
    
    if (allCallbacks.size === 0) return;

    const info: AudioInfo | null = getAudioInfoFromElement(audio);
    if (info) {
      allCallbacks.forEach((callback: ProgressCallback) => {
        try {
          callback(info);
        } catch (error) {
          console.error('Error in progress callback:', error);
        }
      });
    }
  };

  // Store the listener function for cleanup
  progressListeners.set(audio, updateProgress);

  // Set up comprehensive event listeners for progress tracking
  audio.addEventListener('timeupdate', updateProgress);
  audio.addEventListener('loadedmetadata', updateProgress);
  audio.addEventListener('play', updateProgress);
  audio.addEventListener('pause', updateProgress);
  audio.addEventListener('ended', updateProgress);
};

/**
 * Cleans up progress tracking for an audio element to prevent memory leaks
 * @param audio - The HTML audio element to clean up
 * @param channelNumber - The channel number this audio belongs to
 * @param audioChannels - Array of audio channels
 * @example
 * ```typescript
 * cleanupProgressTracking(audioElement, 0, audioChannels);
 * ```
 */
export const cleanupProgressTracking = (
  audio: HTMLAudioElement, 
  channelNumber: number,
  audioChannels: ExtendedAudioQueueChannel[]
): void => {
  const channel: ExtendedAudioQueueChannel = audioChannels[channelNumber];
  if (!channel || !channel.progressCallbacks) return;

  // Remove event listeners
  const updateProgress: (() => void) | undefined = progressListeners.get(audio);
  if (updateProgress) {
    audio.removeEventListener('timeupdate', updateProgress);
    audio.removeEventListener('loadedmetadata', updateProgress);
    audio.removeEventListener('play', updateProgress);
    audio.removeEventListener('pause', updateProgress);
    audio.removeEventListener('ended', updateProgress);
    progressListeners.delete(audio);
  }

  channel.progressCallbacks.delete(audio);
}; 