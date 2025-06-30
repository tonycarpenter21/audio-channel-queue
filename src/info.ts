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
  ExtendedAudioQueueChannel,
  GLOBAL_PROGRESS_KEY,
  MAX_CHANNELS
} from './types';
import { getAudioInfoFromElement, createQueueSnapshot } from './utils';
import { setupProgressTracking, cleanupProgressTracking } from './events';

/**
 * Global array to store audio channels with their queues and callback management
 * Each channel maintains its own audio queue and event callback sets
 *
 * Note: While you can inspect this array for debugging, direct modification is discouraged.
 * Use the provided API functions for safe channel management.
 */
export const audioChannels: ExtendedAudioQueueChannel[] = new Proxy(
  [] as ExtendedAudioQueueChannel[],
  {
    deleteProperty(target: ExtendedAudioQueueChannel[], prop: string | symbol): boolean {
      if (typeof prop === 'string' && !isNaN(Number(prop))) {
        // eslint-disable-next-line no-console
        console.warn(
          'Warning: Direct deletion from audioChannels detected. ' +
            'Consider using stopAllAudioInChannel() for proper cleanup.'
        );
      }
      delete (target as unknown as Record<string, unknown>)[prop as string];
      return true;
    },
    get(target: ExtendedAudioQueueChannel[], prop: string | symbol): unknown {
      const value = (target as unknown as Record<string, unknown>)[prop as string];

      // Return channel objects with warnings on modification attempts
      if (
        typeof value === 'object' &&
        value !== null &&
        typeof prop === 'string' &&
        !isNaN(Number(prop))
      ) {
        return new Proxy(value as ExtendedAudioQueueChannel, {
          set(
            channelTarget: ExtendedAudioQueueChannel,
            channelProp: string | symbol,
            channelValue: unknown
          ): boolean {
            // Allow internal modifications but warn about direct property changes
            if (
              typeof channelProp === 'string' &&
              !['queue', 'volume', 'isPaused', 'isLocked', 'volumeConfig'].includes(channelProp)
            ) {
              // eslint-disable-next-line no-console
              console.warn(
                `Warning: Direct modification of channel.${channelProp} detected. ` +
                  'Use API functions for safer channel management.'
              );
            }
            const key = typeof channelProp === 'symbol' ? channelProp.toString() : channelProp;
            (channelTarget as unknown as Record<string, unknown>)[key] = channelValue;
            return true;
          }
        });
      }

      return value;
    },
    set(target: ExtendedAudioQueueChannel[], prop: string | symbol, value: unknown): boolean {
      // Allow normal array operations
      const key = typeof prop === 'symbol' ? prop.toString() : prop;
      (target as unknown as Record<string, unknown>)[key] = value;
      return true;
    }
  }
);

/**
 * Validates a channel number against MAX_CHANNELS limit
 * @param channelNumber - The channel number to validate
 * @throws Error if the channel number is invalid
 * @internal
 */
const validateChannelNumber = (channelNumber: number): void => {
  if (channelNumber < 0) {
    throw new Error('Channel number must be non-negative');
  }
  if (channelNumber >= MAX_CHANNELS) {
    throw new Error(
      `Channel number ${channelNumber} exceeds maximum allowed channels (${MAX_CHANNELS})`
    );
  }
};

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

  for (let i: number = 0; i < audioChannels.length; i++) {
    allChannelsInfo.push(getCurrentAudioInfo(i));
  }

  return allChannelsInfo;
};

/**
 * Gets a complete snapshot of the queue state for a specific channel
 * @param channelNumber - The channel number (defaults to 0)
 * @returns QueueSnapshot object or null if channel doesn't exist
 * @example
 * ```typescript
 * const snapshot = getQueueSnapshot();
 * if (snapshot) {
 *   console.log(`Queue has ${snapshot.totalItems} items`);
 *   console.log(`Currently playing: ${snapshot.items[0]?.fileName}`);
 * }
 * const channelSnapshot = getQueueSnapshot(2);
 * ```
 */
export const getQueueSnapshot = (channelNumber: number = 0): QueueSnapshot | null => {
  return createQueueSnapshot(channelNumber, audioChannels);
};

/**
 * Subscribes to real-time progress updates for a specific channel
 * @param channelNumber - The channel number
 * @param callback - Function to call with audio info updates
 * @throws Error if the channel number exceeds the maximum allowed channels
 * @example
 * ```typescript
 * onAudioProgress(0, (info) => {
 *   updateProgressBar(info.progress);
 *   updateTimeDisplay(info.currentTime, info.duration);
 * });
 * ```
 */
export const onAudioProgress = (channelNumber: number, callback: ProgressCallback): void => {
  validateChannelNumber(channelNumber);

  if (!audioChannels[channelNumber]) {
    audioChannels[channelNumber] = {
      audioCompleteCallbacks: new Set(),
      audioErrorCallbacks: new Set(),
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
  if (!channel.progressCallbacks.has(GLOBAL_PROGRESS_KEY)) {
    channel.progressCallbacks.set(GLOBAL_PROGRESS_KEY, new Set());
  }
  channel.progressCallbacks.get(GLOBAL_PROGRESS_KEY)!.add(callback);
};

/**
 * Removes progress listeners for a specific channel
 * @param channelNumber - The channel number (defaults to 0)
 * @example
 * ```typescript
 * offAudioProgress();
 * offAudioProgress(1); // Stop receiving progress updates for channel 1
 * ```
 */
export function offAudioProgress(channelNumber: number = 0): void {
  const channel: ExtendedAudioQueueChannel = audioChannels[channelNumber];
  if (!channel?.progressCallbacks) return;

  // Clean up event listeners for current audio if exists
  if (channel.queue.length > 0) {
    const currentAudio: HTMLAudioElement = channel.queue[0];
    cleanupProgressTracking(currentAudio, channelNumber, audioChannels);
  }

  // Clear all callbacks for this channel
  channel.progressCallbacks.clear();
}

/**
 * Subscribes to queue change events for a specific channel
 * @param channelNumber - The channel number to monitor
 * @param callback - Function to call when queue changes
 * @throws Error if the channel number exceeds the maximum allowed channels
 * @example
 * ```typescript
 * onQueueChange(0, (snapshot) => {
 *   updateQueueDisplay(snapshot.items);
 *   updateQueueCount(snapshot.totalItems);
 * });
 * ```
 */
export const onQueueChange = (channelNumber: number, callback: QueueChangeCallback): void => {
  validateChannelNumber(channelNumber);

  if (!audioChannels[channelNumber]) {
    audioChannels[channelNumber] = {
      audioCompleteCallbacks: new Set(),
      audioErrorCallbacks: new Set(),
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
  if (!channel?.queueChangeCallbacks) return;

  channel.queueChangeCallbacks.clear();
};

/**
 * Subscribes to audio start events for a specific channel
 * @param channelNumber - The channel number to monitor
 * @param callback - Function to call when audio starts playing
 * @throws Error if the channel number exceeds the maximum allowed channels
 * @example
 * ```typescript
 * onAudioStart(0, (info) => {
 *   showNowPlaying(info.fileName);
 *   setTotalDuration(info.duration);
 * });
 * ```
 */
export const onAudioStart = (channelNumber: number, callback: AudioStartCallback): void => {
  validateChannelNumber(channelNumber);

  if (!audioChannels[channelNumber]) {
    audioChannels[channelNumber] = {
      audioCompleteCallbacks: new Set(),
      audioErrorCallbacks: new Set(),
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
 * @throws Error if the channel number exceeds the maximum allowed channels
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
  validateChannelNumber(channelNumber);

  if (!audioChannels[channelNumber]) {
    audioChannels[channelNumber] = {
      audioCompleteCallbacks: new Set(),
      audioErrorCallbacks: new Set(),
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
 * @throws Error if the channel number exceeds the maximum allowed channels
 * @example
 * ```typescript
 * onAudioPause(0, (channelNumber, info) => {
 *   showPauseIndicator();
 *   logPauseEvent(info.fileName, info.currentTime);
 * });
 * ```
 */
export const onAudioPause = (channelNumber: number, callback: AudioPauseCallback): void => {
  validateChannelNumber(channelNumber);

  if (!audioChannels[channelNumber]) {
    audioChannels[channelNumber] = {
      audioCompleteCallbacks: new Set(),
      audioErrorCallbacks: new Set(),
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
 * @throws Error if the channel number exceeds the maximum allowed channels
 * @example
 * ```typescript
 * onAudioResume(0, (channelNumber, info) => {
 *   hidePauseIndicator();
 *   logResumeEvent(info.fileName, info.currentTime);
 * });
 * ```
 */
export const onAudioResume = (channelNumber: number, callback: AudioResumeCallback): void => {
  validateChannelNumber(channelNumber);

  if (!audioChannels[channelNumber]) {
    audioChannels[channelNumber] = {
      audioCompleteCallbacks: new Set(),
      audioErrorCallbacks: new Set(),
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
  if (!channel?.audioPauseCallbacks) return;

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
  if (!channel?.audioResumeCallbacks) return;

  channel.audioResumeCallbacks.clear();
};
