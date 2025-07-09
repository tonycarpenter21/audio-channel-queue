/**
 * @fileoverview Volume management functions for the audio-channel-queue package
 */

import {
  ExtendedAudioQueueChannel,
  VolumeConfig,
  FadeType,
  FadeConfig,
  EasingType,
  TimerType,
  MAX_CHANNELS
} from './types';
import { audioChannels } from './info';

// Store active volume transitions to handle interruptions
const activeTransitions: Map<number, number> = new Map();
// Track which timer type was used for each channel
const timerTypes: Map<number, TimerType> = new Map();

/**
 * Global volume ducking configuration
 * Stores the volume ducking settings that apply to all channels
 */
let globalVolumeConfig: VolumeConfig | null = null;

/**
 * Predefined fade configurations for different transition types
 */
const fadeConfigs: Record<FadeType, FadeConfig> = {
  [FadeType.Dramatic]: {
    duration: 800,
    pauseCurve: EasingType.EaseIn,
    resumeCurve: EasingType.EaseOut
  },
  [FadeType.Gentle]: {
    duration: 800,
    pauseCurve: EasingType.EaseOut,
    resumeCurve: EasingType.EaseIn
  },
  [FadeType.Linear]: {
    duration: 800,
    pauseCurve: EasingType.Linear,
    resumeCurve: EasingType.Linear
  }
};

/**
 * Gets the fade configuration for a specific fade type
 * @param fadeType - The fade type to get configuration for
 * @returns Fade configuration object
 * @example
 * ```typescript
 * const config = getFadeConfig('gentle');
 * console.log(`Gentle fade duration: ${config.duration}ms`);
 * ```
 */
export const getFadeConfig = (fadeType: FadeType): FadeConfig => {
  return { ...fadeConfigs[fadeType] };
};

/**
 * Easing functions for smooth volume transitions
 */
const easingFunctions: Record<EasingType, (t: number) => number> = {
  [EasingType.Linear]: (t: number): number => t,
  [EasingType.EaseIn]: (t: number): number => t * t,
  [EasingType.EaseOut]: (t: number): number => t * (2 - t),
  [EasingType.EaseInOut]: (t: number): number => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t)
};

/**
 * Smoothly transitions volume for a specific channel over time
 * @param channelNumber - The channel number to transition
 * @param targetVolume - Target volume level (0-1)
 * @param duration - Transition duration in milliseconds
 * @param easing - Easing function type
 * @returns Promise that resolves when transition completes
 * @example
 * ```typescript
 * await transitionVolume(0, 0.2, 500, 'ease-out'); // Duck to 20% over 500ms
 * ```
 */
export const transitionVolume = async (
  channelNumber: number,
  targetVolume: number,
  duration: number = 250,
  easing: EasingType = EasingType.EaseOut
): Promise<void> => {
  const channel: ExtendedAudioQueueChannel = audioChannels[channelNumber];
  if (!channel || channel.queue.length === 0) return;

  const currentAudio: HTMLAudioElement = channel.queue[0];
  const startVolume: number = currentAudio.volume;
  const volumeDelta: number = targetVolume - startVolume;

  // Cancel any existing transition for this channel
  if (activeTransitions.has(channelNumber)) {
    const transitionId = activeTransitions.get(channelNumber);
    const timerType = timerTypes.get(channelNumber);
    if (transitionId) {
      // Cancel based on the timer type that was actually used
      if (
        timerType === TimerType.RequestAnimationFrame &&
        typeof cancelAnimationFrame !== 'undefined'
      ) {
        cancelAnimationFrame(transitionId);
      } else if (timerType === TimerType.Timeout) {
        clearTimeout(transitionId);
      }
    }
    activeTransitions.delete(channelNumber);
    timerTypes.delete(channelNumber);
  }

  // If no change needed, resolve immediately
  if (Math.abs(volumeDelta) < 0.001) {
    channel.volume = targetVolume;
    return Promise.resolve();
  }

  // Handle zero or negative duration - instant change
  if (duration <= 0) {
    channel.volume = targetVolume;
    if (channel.queue.length > 0) {
      channel.queue[0].volume = targetVolume;
    }
    return Promise.resolve();
  }

  const startTime: number = performance.now();
  const easingFn = easingFunctions[easing];

  return new Promise<void>((resolve) => {
    const updateVolume = (): void => {
      const elapsed: number = performance.now() - startTime;
      const progress: number = Math.min(elapsed / duration, 1);
      const easedProgress: number = easingFn(progress);

      const currentVolume: number = startVolume + volumeDelta * easedProgress;
      const clampedVolume: number = Math.max(0, Math.min(1, currentVolume));

      // Apply volume to both channel config and current audio
      channel.volume = clampedVolume;
      if (channel.queue.length > 0) {
        channel.queue[0].volume = clampedVolume;
      }

      if (progress >= 1) {
        // Transition complete
        activeTransitions.delete(channelNumber);
        timerTypes.delete(channelNumber);
        resolve();
      } else {
        // Use requestAnimationFrame in browser, setTimeout in tests
        if (typeof requestAnimationFrame !== 'undefined') {
          const rafId = requestAnimationFrame(updateVolume);
          activeTransitions.set(channelNumber, rafId as unknown as number);
          timerTypes.set(channelNumber, TimerType.RequestAnimationFrame);
        } else {
          // In test environment, use shorter intervals
          const timeoutId = setTimeout(updateVolume, 1);
          activeTransitions.set(channelNumber, timeoutId as unknown as number);
          timerTypes.set(channelNumber, TimerType.Timeout);
        }
      }
    };

    updateVolume();
  });
};

/**
 * Sets the volume for a specific channel with optional smooth transition
 * @param channelNumber - The channel number to set volume for
 * @param volume - Volume level (0-1)
 * @param transitionDuration - Optional transition duration in milliseconds
 * @param easing - Optional easing function
 * @throws Error if the channel number exceeds the maximum allowed channels
 * @example
 * ```typescript
 * setChannelVolume(0, 0.5); // Set channel 0 to 50%
 * setChannelVolume(0, 0.5, 300, 'ease-out'); // Smooth transition over 300ms
 * ```
 */
export const setChannelVolume = async (
  channelNumber: number,
  volume: number,
  transitionDuration?: number,
  easing?: EasingType
): Promise<void> => {
  const clampedVolume: number = Math.max(0, Math.min(1, volume));

  // Check channel number limits
  if (channelNumber < 0) {
    throw new Error('Channel number must be non-negative');
  }
  if (channelNumber >= MAX_CHANNELS) {
    throw new Error(
      `Channel number ${channelNumber} exceeds maximum allowed channels (${MAX_CHANNELS})`
    );
  }

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
      volume: clampedVolume
    };
    return;
  }

  if (transitionDuration && transitionDuration > 0) {
    // Smooth transition
    await transitionVolume(channelNumber, clampedVolume, transitionDuration, easing);
  } else {
    // Instant change (backward compatibility)
    audioChannels[channelNumber].volume = clampedVolume;
    const channel: ExtendedAudioQueueChannel = audioChannels[channelNumber];
    if (channel.queue.length > 0) {
      const currentAudio: HTMLAudioElement = channel.queue[0];
      currentAudio.volume = clampedVolume;
    }
  }
};

/**
 * Gets the current volume for a specific channel
 * @param channelNumber - The channel number to get volume for (defaults to 0)
 * @returns Current volume level (0-1) or 1.0 if channel doesn't exist
 * @example
 * ```typescript
 * const volume = getChannelVolume(0);
 * const defaultChannelVolume = getChannelVolume(); // Gets channel 0
 * console.log(`Channel 0 volume: ${volume * 100}%`);
 * ```
 */
export const getChannelVolume = (channelNumber: number = 0): number => {
  const channel: ExtendedAudioQueueChannel = audioChannels[channelNumber];
  return channel?.volume ?? 1.0;
};

/**
 * Gets the volume levels for all channels
 * @returns Array of volume levels (0-1) for each channel
 * @example
 * ```typescript
 * const volumes = getAllChannelsVolume();
 * volumes.forEach((volume, index) => {
 *   console.log(`Channel ${index}: ${volume * 100}%`);
 * });
 * ```
 */
export const getAllChannelsVolume = (): number[] => {
  return audioChannels.map((channel: ExtendedAudioQueueChannel) => channel?.volume ?? 1.0);
};

/**
 * Sets volume for all channels to the same level
 * @param volume - Volume level (0-1) to apply to all channels
 * @example
 * ```typescript
 * await setAllChannelsVolume(0.6); // Set all channels to 60% volume
 * ```
 */
export const setAllChannelsVolume = async (volume: number): Promise<void> => {
  const promises: Promise<void>[] = [];
  audioChannels.forEach((_channel: ExtendedAudioQueueChannel, index: number) => {
    promises.push(setChannelVolume(index, volume));
  });
  await Promise.all(promises);
};

/**
 * Configures volume ducking for channels. When the priority channel plays audio,
 * all other channels will be automatically reduced to the ducking volume level
 * @param config - Volume ducking configuration
 * @throws Error if the priority channel number exceeds the maximum allowed channels
 * @example
 * ```typescript
 * // When channel 1 plays, reduce all other channels to 20% volume
 * setVolumeDucking({
 *   priorityChannel: 1,
 *   priorityVolume: 1.0,
 *   duckingVolume: 0.2
 * });
 * ```
 */
export const setVolumeDucking = (config: VolumeConfig): void => {
  const { priorityChannel } = config;

  // Check priority channel limits
  if (priorityChannel < 0) {
    throw new Error('Priority channel number must be non-negative');
  }
  if (priorityChannel >= MAX_CHANNELS) {
    throw new Error(
      `Priority channel ${priorityChannel} exceeds maximum allowed channels (${MAX_CHANNELS})`
    );
  }

  // Store the configuration globally
  globalVolumeConfig = config;

  // Ensure we have enough channels for the priority channel
  while (audioChannels.length <= priorityChannel) {
    audioChannels.push({
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
    });
  }
};

/**
 * Removes volume ducking configuration from all channels
 * @example
 * ```typescript
 * clearVolumeDucking(); // Remove all volume ducking effects
 * ```
 */
export const clearVolumeDucking = (): void => {
  globalVolumeConfig = null;
};

/**
 * Applies volume ducking effects based on current playback state with smooth transitions
 * @param activeChannelNumber - The channel that just started playing
 * @internal
 */
export const applyVolumeDucking = async (activeChannelNumber: number): Promise<void> => {
  // Check if ducking is configured and this channel is the priority channel
  if (!globalVolumeConfig || globalVolumeConfig.priorityChannel !== activeChannelNumber) {
    return; // No ducking configured for this channel
  }

  const config = globalVolumeConfig;
  const transitionPromises: Promise<void>[] = [];
  const duration = config.duckTransitionDuration ?? 250;
  const easing = config.transitionEasing ?? EasingType.EaseOut;

  // Duck all channels except the priority channel
  audioChannels.forEach((channel: ExtendedAudioQueueChannel, channelNumber: number) => {
    if (!channel || channel.queue.length === 0) {
      return; // Skip channels without audio
    }

    if (channelNumber === activeChannelNumber) {
      // This is the priority channel - set to priority volume
      // Only change audio volume, preserve channel.volume as desired volume
      const currentAudio: HTMLAudioElement = channel.queue[0];
      transitionPromises.push(
        transitionAudioVolume(currentAudio, config.priorityVolume, duration, easing)
      );
    } else {
      // This is a background channel - duck it
      // Only change audio volume, preserve channel.volume as desired volume
      const currentAudio: HTMLAudioElement = channel.queue[0];
      transitionPromises.push(
        transitionAudioVolume(currentAudio, config.duckingVolume, duration, easing)
      );
    }
  });

  // Wait for all transitions to complete
  await Promise.all(transitionPromises);
};

/**
 * Restores normal volume levels when priority channel queue becomes empty
 * @param stoppedChannelNumber - The channel that just stopped playing
 * @internal
 */
export const restoreVolumeLevels = async (stoppedChannelNumber: number): Promise<void> => {
  // Check if ducking is configured and this channel is the priority channel
  if (!globalVolumeConfig || globalVolumeConfig.priorityChannel !== stoppedChannelNumber) {
    return; // No ducking configured for this channel
  }

  // Check if the priority channel queue is now empty
  const priorityChannel = audioChannels[stoppedChannelNumber];
  if (priorityChannel && priorityChannel.queue.length > 0) {
    return; // Priority channel still has audio queued, don't restore yet
  }

  const config = globalVolumeConfig;
  const transitionPromises: Promise<void>[] = [];

  // Restore volume for all channels EXCEPT the priority channel
  audioChannels.forEach((channel: ExtendedAudioQueueChannel, channelNumber: number) => {
    // Skip the priority channel itself and channels without audio
    if (channelNumber === stoppedChannelNumber || !channel || channel.queue.length === 0) {
      return;
    }

    // Restore this channel to its desired volume
    const duration = config.restoreTransitionDuration ?? 250;
    const easing = config.transitionEasing ?? EasingType.EaseOut;
    const targetVolume = channel.volume ?? 1.0;

    // Only transition the audio element volume, keep channel.volume as the desired volume
    const currentAudio: HTMLAudioElement = channel.queue[0];
    transitionPromises.push(transitionAudioVolume(currentAudio, targetVolume, duration, easing));
  });

  // Wait for all transitions to complete
  await Promise.all(transitionPromises);
};

/**
 * Transitions only the audio element volume without affecting channel.volume
 * This is used for ducking/restoration where channel.volume represents desired volume
 * @param audio - The audio element to transition
 * @param targetVolume - Target volume level (0-1)
 * @param duration - Transition duration in milliseconds
 * @param easing - Easing function type
 * @returns Promise that resolves when transition completes
 * @internal
 */
const transitionAudioVolume = async (
  audio: HTMLAudioElement,
  targetVolume: number,
  duration: number = 250,
  easing: EasingType = EasingType.EaseOut
): Promise<void> => {
  const startVolume: number = audio.volume;
  const volumeDelta: number = targetVolume - startVolume;

  // If no change needed, resolve immediately
  if (Math.abs(volumeDelta) < 0.001) {
    return Promise.resolve();
  }

  // Handle zero or negative duration - instant change
  if (duration <= 0) {
    audio.volume = Math.max(0, Math.min(1, targetVolume));
    return Promise.resolve();
  }

  const startTime: number = performance.now();
  const easingFn = easingFunctions[easing];

  return new Promise<void>((resolve) => {
    const updateVolume = (): void => {
      const elapsed: number = performance.now() - startTime;
      const progress: number = Math.min(elapsed / duration, 1);
      const easedProgress: number = easingFn(progress);

      const currentVolume: number = startVolume + volumeDelta * easedProgress;
      const clampedVolume: number = Math.max(0, Math.min(1, currentVolume));

      // Only apply volume to audio element, not channel.volume
      audio.volume = clampedVolume;

      if (progress >= 1) {
        resolve();
      } else {
        // Use requestAnimationFrame in browser, setTimeout in tests
        if (typeof requestAnimationFrame !== 'undefined') {
          requestAnimationFrame(updateVolume);
        } else {
          setTimeout(updateVolume, 1);
        }
      }
    };

    updateVolume();
  });
};

/**
 * Cancels any active volume transition for a specific channel
 * @param channelNumber - The channel number to cancel transitions for
 * @internal
 */
export const cancelVolumeTransition = (channelNumber: number): void => {
  if (activeTransitions.has(channelNumber)) {
    const transitionId = activeTransitions.get(channelNumber);
    const timerType = timerTypes.get(channelNumber);

    if (transitionId) {
      // Cancel based on the timer type that was actually used
      if (
        timerType === TimerType.RequestAnimationFrame &&
        typeof cancelAnimationFrame !== 'undefined'
      ) {
        cancelAnimationFrame(transitionId);
      } else if (timerType === TimerType.Timeout) {
        clearTimeout(transitionId);
      }
    }

    activeTransitions.delete(channelNumber);
    timerTypes.delete(channelNumber);
  }
};

/**
 * Cancels all active volume transitions across all channels
 * @internal
 */
export const cancelAllVolumeTransitions = (): void => {
  // Get all active channel numbers to avoid modifying Map while iterating
  const activeChannels = Array.from(activeTransitions.keys());

  activeChannels.forEach((channelNumber) => {
    cancelVolumeTransition(channelNumber);
  });
};
