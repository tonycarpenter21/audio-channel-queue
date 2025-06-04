/**
 * @fileoverview Audio information and progress tracking functions for the audio-channel-queue package
 */

import { 
  AudioInfo, 
  QueueSnapshot, 
  ProgressCallback,
  QueueChangeCallback,
  AudioStartCallback,
  AudioCompleteCallback,
  AudioPauseCallback,
  AudioResumeCallback,
  ExtendedAudioQueueChannel
} from './types';
import { getAudioInfoFromElement, createQueueSnapshot } from './utils';
import { setupProgressTracking, cleanupProgressTracking } from './events';

/**
 * Global array of extended audio queue channels
 */
export const audioChannels: ExtendedAudioQueueChannel[] = [];

/**
 * Gets current audio information for a specific channel
 * @param channelNumber - The channel number (defaults to 0)
 * @returns AudioInfo object or null if no audio is playing
 * @example
 * ```typescript
 * const info = getCurrentAudioInfo(0);
 * if (info) {
 *   console.log(`Currently playing: ${info.fileName}`);
 *   console.log(`Progress: ${(info.progress * 100).toFixed(1)}%`);
 * }
 * ```
 */
export const getCurrentAudioInfo = (channelNumber: number = 0): AudioInfo | null => {
  const channel: ExtendedAudioQueueChannel = audioChannels[channelNumber];
  if (!channel || channel.queue.length === 0) {
    return null;
  }

  const currentAudio: HTMLAudioElement = channel.queue[0];
  return getAudioInfoFromElement(currentAudio, channelNumber, audioChannels);
};

/**
 * Gets audio information for all channels
 * @returns Array of AudioInfo objects (null for channels with no audio)
 * @example
 * ```typescript
 * const allInfo = getAllChannelsInfo();
 * allInfo.forEach((info, channel) => {
 *   if (info) {
 *     console.log(`Channel ${channel}: ${info.fileName}`);
 *   }
 * });
 * ```
 */
export const getAllChannelsInfo = (): (AudioInfo | null)[] => {
  const allChannelsInfo: (AudioInfo | null)[] = [];
  
  for (let i = 0; i < audioChannels.length; i++) {
    allChannelsInfo.push(getCurrentAudioInfo(i));
  }
  
  return allChannelsInfo;
};

/**
 * Gets a complete snapshot of the queue state for a specific channel
 * @param channelNumber - The channel number
 * @returns QueueSnapshot object or null if channel doesn't exist
 * @example
 * ```typescript
 * const snapshot = getQueueSnapshot(0);
 * if (snapshot) {
 *   console.log(`Queue has ${snapshot.totalItems} items`);
 *   console.log(`Currently playing: ${snapshot.items[0]?.fileName}`);
 * }
 * ```
 */
export const getQueueSnapshot = (channelNumber: number): QueueSnapshot | null => {
  return createQueueSnapshot(channelNumber, audioChannels);
};

/**
 * Subscribes to real-time progress updates for a specific channel
 * @param channelNumber - The channel number
 * @param callback - Function to call with audio info updates
 * @example
 * ```typescript
 * onAudioProgress(0, (info) => {
 *   updateProgressBar(info.progress);
 *   updateTimeDisplay(info.currentTime, info.duration);
 * });
 * ```
 */
export const onAudioProgress = (channelNumber: number, callback: ProgressCallback): void => {
  if (!audioChannels[channelNumber]) {
    audioChannels[channelNumber] = { 
      audioCompleteCallbacks: new Set(),
      audioPauseCallbacks: new Set(),
      audioResumeCallbacks: new Set(),
      audioStartCallbacks: new Set(),
      isPaused: false,
      progressCallbacks: new Map(),
      queue: [],
      queueChangeCallbacks: new Set(),
      volume: 1.0
    };
  }

  const channel: ExtendedAudioQueueChannel = audioChannels[channelNumber];
  if (!channel.progressCallbacks) {
    channel.progressCallbacks = new Map();
  }

  // Add callback for current audio if exists
  if (channel.queue.length > 0) {
    const currentAudio: HTMLAudioElement = channel.queue[0];
    if (!channel.progressCallbacks.has(currentAudio)) {
      channel.progressCallbacks.set(currentAudio, new Set());
    }
    channel.progressCallbacks.get(currentAudio)!.add(callback);
    
    // Set up tracking if not already done
    setupProgressTracking(currentAudio, channelNumber, audioChannels);
  }

  // Store callback for future audio elements in this channel
  if (!channel.progressCallbacks.has(null as any)) {
    channel.progressCallbacks.set(null as any, new Set());
  }
  channel.progressCallbacks.get(null as any)!.add(callback);
};

/**
 * Removes progress listeners for a specific channel
 * @param channelNumber - The channel number
 * @example
 * ```typescript
 * offAudioProgress(0); // Stop receiving progress updates for channel 0
 * ```
 */
export const offAudioProgress = (channelNumber: number): void => {
  const channel: ExtendedAudioQueueChannel = audioChannels[channelNumber];
  if (!channel || !channel.progressCallbacks) return;

  // Clean up event listeners for current audio if exists
  if (channel.queue.length > 0) {
    const currentAudio: HTMLAudioElement = channel.queue[0];
    cleanupProgressTracking(currentAudio, channelNumber, audioChannels);
  }

  // Clear all callbacks for this channel
  channel.progressCallbacks.clear();
};

/**
 * Subscribes to queue change events for a specific channel
 * @param channelNumber - The channel number to monitor
 * @param callback - Function to call when queue changes
 * @example
 * ```typescript
 * onQueueChange(0, (snapshot) => {
 *   updateQueueDisplay(snapshot.items);
 *   updateQueueCount(snapshot.totalItems);
 * });
 * ```
 */
export const onQueueChange = (channelNumber: number, callback: QueueChangeCallback): void => {
  if (!audioChannels[channelNumber]) {
    audioChannels[channelNumber] = { 
      audioCompleteCallbacks: new Set(),
      audioPauseCallbacks: new Set(),
      audioResumeCallbacks: new Set(),
      audioStartCallbacks: new Set(),
      isPaused: false,
      progressCallbacks: new Map(),
      queue: [],
      queueChangeCallbacks: new Set(),
      volume: 1.0
    };
  }

  const channel: ExtendedAudioQueueChannel = audioChannels[channelNumber];
  if (!channel.queueChangeCallbacks) {
    channel.queueChangeCallbacks = new Set();
  }

  channel.queueChangeCallbacks.add(callback);
};

/**
 * Removes queue change listeners for a specific channel
 * @param channelNumber - The channel number
 * @example
 * ```typescript
 * offQueueChange(0); // Stop receiving queue change notifications for channel 0
 * ```
 */
export const offQueueChange = (channelNumber: number): void => {
  const channel: ExtendedAudioQueueChannel = audioChannels[channelNumber];
  if (!channel || !channel.queueChangeCallbacks) return;

  channel.queueChangeCallbacks.clear();
};

/**
 * Subscribes to audio start events for a specific channel
 * @param channelNumber - The channel number to monitor
 * @param callback - Function to call when audio starts playing
 * @example
 * ```typescript
 * onAudioStart(0, (info) => {
 *   showNowPlaying(info.fileName);
 *   setTotalDuration(info.duration);
 * });
 * ```
 */
export const onAudioStart = (channelNumber: number, callback: AudioStartCallback): void => {
  if (!audioChannels[channelNumber]) {
    audioChannels[channelNumber] = { 
      audioCompleteCallbacks: new Set(),
      audioPauseCallbacks: new Set(),
      audioResumeCallbacks: new Set(),
      audioStartCallbacks: new Set(),
      isPaused: false,
      progressCallbacks: new Map(),
      queue: [],
      queueChangeCallbacks: new Set(),
      volume: 1.0
    };
  }

  const channel: ExtendedAudioQueueChannel = audioChannels[channelNumber];
  if (!channel.audioStartCallbacks) {
    channel.audioStartCallbacks = new Set();
  }

  channel.audioStartCallbacks.add(callback);
};

/**
 * Subscribes to audio complete events for a specific channel
 * @param channelNumber - The channel number to monitor
 * @param callback - Function to call when audio completes
 * @example
 * ```typescript
 * onAudioComplete(0, (info) => {
 *   logPlaybackComplete(info.fileName);
 *   if (info.remainingInQueue === 0) {
 *     showQueueComplete();
 *   }
 * });
 * ```
 */
export const onAudioComplete = (channelNumber: number, callback: AudioCompleteCallback): void => {
  if (!audioChannels[channelNumber]) {
    audioChannels[channelNumber] = { 
      audioCompleteCallbacks: new Set(),
      audioPauseCallbacks: new Set(),
      audioResumeCallbacks: new Set(),
      audioStartCallbacks: new Set(),
      isPaused: false,
      progressCallbacks: new Map(),
      queue: [],
      queueChangeCallbacks: new Set(),
      volume: 1.0
    };
  }

  const channel: ExtendedAudioQueueChannel = audioChannels[channelNumber];
  if (!channel.audioCompleteCallbacks) {
    channel.audioCompleteCallbacks = new Set();
  }

  channel.audioCompleteCallbacks.add(callback);
};

/**
 * Subscribes to audio pause events for a specific channel
 * @param channelNumber - The channel number to monitor
 * @param callback - Function to call when audio is paused
 * @example
 * ```typescript
 * onAudioPause(0, (channelNumber, info) => {
 *   showPauseIndicator();
 *   logPauseEvent(info.fileName, info.currentTime);
 * });
 * ```
 */
export const onAudioPause = (channelNumber: number, callback: AudioPauseCallback): void => {
  if (!audioChannels[channelNumber]) {
    audioChannels[channelNumber] = { 
      audioCompleteCallbacks: new Set(),
      audioPauseCallbacks: new Set(),
      audioResumeCallbacks: new Set(),
      audioStartCallbacks: new Set(),
      isPaused: false,
      progressCallbacks: new Map(),
      queue: [],
      queueChangeCallbacks: new Set(),
      volume: 1.0
    };
  }

  const channel: ExtendedAudioQueueChannel = audioChannels[channelNumber];
  if (!channel.audioPauseCallbacks) {
    channel.audioPauseCallbacks = new Set();
  }

  channel.audioPauseCallbacks.add(callback);
};

/**
 * Subscribes to audio resume events for a specific channel
 * @param channelNumber - The channel number to monitor
 * @param callback - Function to call when audio is resumed
 * @example
 * ```typescript
 * onAudioResume(0, (channelNumber, info) => {
 *   hidePauseIndicator();
 *   logResumeEvent(info.fileName, info.currentTime);
 * });
 * ```
 */
export const onAudioResume = (channelNumber: number, callback: AudioResumeCallback): void => {
  if (!audioChannels[channelNumber]) {
    audioChannels[channelNumber] = { 
      audioCompleteCallbacks: new Set(),
      audioPauseCallbacks: new Set(),
      audioResumeCallbacks: new Set(),
      audioStartCallbacks: new Set(),
      isPaused: false,
      progressCallbacks: new Map(),
      queue: [],
      queueChangeCallbacks: new Set(),
      volume: 1.0
    };
  }

  const channel: ExtendedAudioQueueChannel = audioChannels[channelNumber];
  if (!channel.audioResumeCallbacks) {
    channel.audioResumeCallbacks = new Set();
  }

  channel.audioResumeCallbacks.add(callback);
};

/**
 * Removes pause event listeners for a specific channel
 * @param channelNumber - The channel number
 * @example
 * ```typescript
 * offAudioPause(0); // Stop receiving pause notifications for channel 0
 * ```
 */
export const offAudioPause = (channelNumber: number): void => {
  const channel: ExtendedAudioQueueChannel = audioChannels[channelNumber];
  if (!channel || !channel.audioPauseCallbacks) return;

  channel.audioPauseCallbacks.clear();
};

/**
 * Removes resume event listeners for a specific channel
 * @param channelNumber - The channel number
 * @example
 * ```typescript
 * offAudioResume(0); // Stop receiving resume notifications for channel 0
 * ```
 */
export const offAudioResume = (channelNumber: number): void => {
  const channel: ExtendedAudioQueueChannel = audioChannels[channelNumber];
  if (!channel || !channel.audioResumeCallbacks) return;

  channel.audioResumeCallbacks.clear();
}; 