/**
 * @fileoverview Volume management functions for the audio-channel-queue package
 */

import { ExtendedAudioQueueChannel, VolumeConfig, FadeType, FadeConfig, EasingType } from './types';
import { audioChannels } from './info';

// Store active volume transitions to handle interruptions
const activeTransitions = new Map<number, number>();

/**
 * Predefined fade configurations for different transition types
 */
const FADE_CONFIGS: Record<FadeType, FadeConfig> = {
  [FadeType.Dramatic]: { duration: 800, pauseCurve: EasingType.EaseIn, resumeCurve: EasingType.EaseOut },
  [FadeType.Gentle]: { duration: 800, pauseCurve: EasingType.EaseOut, resumeCurve: EasingType.EaseIn },
  [FadeType.Linear]: { duration: 800, pauseCurve: EasingType.Linear, resumeCurve: EasingType.Linear }
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
  return { ...FADE_CONFIGS[fadeType] };
};

/**
 * Easing functions for smooth volume transitions
 */
const easingFunctions: Record<EasingType, (t: number) => number> = {
  [EasingType.Linear]: (t: number): number => t,
  [EasingType.EaseIn]: (t: number): number => t * t,
  [EasingType.EaseOut]: (t: number): number => t * (2 - t),
  [EasingType.EaseInOut]: (t: number): number => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
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
    clearTimeout(activeTransitions.get(channelNumber));
    activeTransitions.delete(channelNumber);
  }

  // If no change needed, resolve immediately
  if (Math.abs(volumeDelta) < 0.001) {
    channel.volume = targetVolume;
    return Promise.resolve();
  }

  // Handle zero duration - instant change
  if (duration === 0) {
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
      
      const currentVolume: number = startVolume + (volumeDelta * easedProgress);
      const clampedVolume: number = Math.max(0, Math.min(1, currentVolume));
      
      // Apply volume to both channel config and current audio
      channel.volume = clampedVolume;
      if (channel.queue.length > 0) {
        channel.queue[0].volume = clampedVolume;
      }

      if (progress >= 1) {
        // Transition complete
        activeTransitions.delete(channelNumber);
        resolve();
      } else {
        // Use requestAnimationFrame in browser, setTimeout in tests
        if (typeof requestAnimationFrame !== 'undefined') {
          const rafId = requestAnimationFrame(updateVolume);
          activeTransitions.set(channelNumber, rafId as unknown as number);
        } else {
          // In test environment, use shorter intervals
          const timeoutId = setTimeout(updateVolume, 1);
          activeTransitions.set(channelNumber, timeoutId as unknown as number);
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
  return channel?.volume || 1.0;
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
  return audioChannels.map((channel: ExtendedAudioQueueChannel) => 
    channel?.volume || 1.0
  );
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
  // First, ensure we have enough channels for the priority channel
  while (audioChannels.length <= config.priorityChannel) {
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

  // Apply the config to all existing channels
  audioChannels.forEach((channel: ExtendedAudioQueueChannel, index: number) => {
    if (!audioChannels[index]) {
      audioChannels[index] = {
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
    audioChannels[index].volumeConfig = config;
  });
};

/**
 * Removes volume ducking configuration from all channels
 * @example
 * ```typescript
 * clearVolumeDucking(); // Remove all volume ducking effects
 * ```
 */
export const clearVolumeDucking = (): void => {
  audioChannels.forEach((channel: ExtendedAudioQueueChannel) => {
    if (channel) {
      delete channel.volumeConfig;
    }
  });
};

/**
 * Applies volume ducking effects based on current playback state with smooth transitions
 * @param activeChannelNumber - The channel that just started playing
 * @internal
 */
export const applyVolumeDucking = async (activeChannelNumber: number): Promise<void> => {
  const transitionPromises: Promise<void>[] = [];

  audioChannels.forEach((channel: ExtendedAudioQueueChannel, channelNumber: number) => {
    if (channel?.volumeConfig) {
      const config: VolumeConfig = channel.volumeConfig;
      
      if (activeChannelNumber === config.priorityChannel) {
        const duration = config.duckTransitionDuration || 250;
        const easing = config.transitionEasing || EasingType.EaseOut;
        
        // Priority channel is active, duck other channels
        if (channelNumber === config.priorityChannel) {
          transitionPromises.push(
            transitionVolume(channelNumber, config.priorityVolume, duration, easing)
          );
        } else {
          transitionPromises.push(
            transitionVolume(channelNumber, config.duckingVolume, duration, easing)
          );
        }
      }
    }
  });

    // Wait for all transitions to complete
  await Promise.all(transitionPromises);
};

/**
 * Fades the volume for a specific channel over time (alias for transitionVolume with improved naming)
 * @param channelNumber - The channel number to fade
 * @param targetVolume - Target volume level (0-1)
 * @param duration - Fade duration in milliseconds (defaults to 250)
 * @param easing - Easing function type (defaults to 'ease-out')
 * @returns Promise that resolves when fade completes
 * @example
 * ```typescript
 * await fadeVolume(0, 0, 800, 'ease-in'); // Fade out over 800ms
 * await fadeVolume(0, 1, 600, 'ease-out'); // Fade in over 600ms
 * ```
 */
export const fadeVolume = async (
  channelNumber: number,
  targetVolume: number,
  duration: number = 250,
  easing: EasingType = EasingType.EaseOut
): Promise<void> => {
  return transitionVolume(channelNumber, targetVolume, duration, easing);
}; 

/**
 * Restores normal volume levels when priority channel stops with smooth transitions
 * @param stoppedChannelNumber - The channel that just stopped playing
 * @internal
 */
export const restoreVolumeLevels = async (stoppedChannelNumber: number): Promise<void> => {
  const transitionPromises: Promise<void>[] = [];

  audioChannels.forEach((channel: ExtendedAudioQueueChannel, channelNumber: number) => {
    if (channel?.volumeConfig) {
      const config: VolumeConfig = channel.volumeConfig;
      
      if (stoppedChannelNumber === config.priorityChannel) {
        const duration = config.restoreTransitionDuration || 500;
        const easing = config.transitionEasing || EasingType.EaseOut;
        
        // Priority channel stopped, restore normal volumes
        transitionPromises.push(
          transitionVolume(channelNumber, channel.volume || 1.0, duration, easing)
        );
      }
    }
  });

  // Wait for all transitions to complete
  await Promise.all(transitionPromises);
}; 