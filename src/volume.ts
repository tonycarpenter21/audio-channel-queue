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
import {
  shouldUseWebAudio,
  getAudioContext,
  createWebAudioNodes,
  setWebAudioVolume,
  resumeAudioContext,
  cleanupWebAudioNodes
} from './web-audio';

// Store active volume transitions to handle interruptions
const activeTransitions: Map<number, number> = new Map();
// Track which timer type was used for each channel
const timerTypes: Map<number, TimerType> = new Map();

/**
 * Global volume multiplier that affects all channels
 * Acts as a global volume control (0-1)
 */
let globalVolume: number = 1.0;

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

  if (!channel || channel.queue.length === 0) {
    return;
  }

  const currentAudio: HTMLAudioElement = channel.queue[0];

  // When Web Audio is active, read the actual start volume from the gain node
  // This is critical for iOS where audio.volume is ignored when Web Audio is active
  let startVolume: number = currentAudio.volume;
  if (channel.webAudioNodes) {
    const nodes = channel.webAudioNodes.get(currentAudio);
    if (nodes) {
      startVolume = nodes.gainNode.gain.value;
    }
  }

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
    const updateVolume = async (): Promise<void> => {
      const elapsed: number = performance.now() - startTime;
      const progress: number = Math.min(elapsed / duration, 1);
      const easedProgress: number = easingFn(progress);

      const currentVolume: number = startVolume + volumeDelta * easedProgress;
      const clampedVolume: number = Math.max(0, Math.min(1, currentVolume));

      // Apply volume to both channel config and current audio
      channel.volume = clampedVolume;
      if (channel.queue.length > 0) {
        await setVolumeForAudio(channel.queue[0], clampedVolume, channelNumber);
      }

      if (progress >= 1) {
        // Transition complete
        activeTransitions.delete(channelNumber);
        timerTypes.delete(channelNumber);
        resolve();
      } else {
        // Use requestAnimationFrame in browser, setTimeout in tests
        if (typeof requestAnimationFrame !== 'undefined') {
          const rafId = requestAnimationFrame(() => updateVolume());
          activeTransitions.set(channelNumber, rafId as unknown as number);
          timerTypes.set(channelNumber, TimerType.RequestAnimationFrame);
        } else {
          // In test environment, use shorter intervals
          const timeoutId = setTimeout(() => updateVolume(), 1);
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
 * Automatically uses Web Audio API on iOS devices for enhanced volume control
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

  const channel: ExtendedAudioQueueChannel = audioChannels[channelNumber];

  // Initialize Web Audio API if needed and supported
  if (shouldUseWebAudio() && !channel.webAudioContext) {
    await initializeWebAudioForChannel(channelNumber);
  }

  if (transitionDuration && transitionDuration > 0) {
    // Smooth transition
    await transitionVolume(channelNumber, clampedVolume, transitionDuration, easing);
  } else {
    // Instant change (backward compatibility)
    channel.volume = clampedVolume;
    if (channel.queue.length > 0) {
      const currentAudio: HTMLAudioElement = channel.queue[0];
      await setVolumeForAudio(currentAudio, clampedVolume, channelNumber);
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
 * Sets the global volume multiplier that affects all channels
 * This acts as a global volume control - individual channel volumes are multiplied by this value
 * @param volume - Global volume level (0-1, will be clamped to this range)
 * @example
 * ```typescript
 * // Set channel-specific volumes
 * await setChannelVolume(0, 0.8); // SFX at 80%
 * await setChannelVolume(1, 0.6); // Music at 60%
 *
 * // Apply global volume of 50% - all channels play at half their set volume
 * await setGlobalVolume(0.5); // SFX now plays at 40%, music at 30%
 * ```
 */
export const setGlobalVolume = async (volume: number): Promise<void> => {
  // Clamp to valid range
  globalVolume = Math.max(0, Math.min(1, volume));

  // Update all currently playing audio to reflect the new global volume
  // Note: setVolumeForAudio internally multiplies channel.volume by globalVolume
  const updatePromises: Promise<void>[] = [];
  audioChannels.forEach((channel: ExtendedAudioQueueChannel, channelNumber: number) => {
    if (channel && channel.queue.length > 0) {
      const currentAudio: HTMLAudioElement = channel.queue[0];
      updatePromises.push(setVolumeForAudio(currentAudio, channel.volume, channelNumber));
    }
  });

  await Promise.all(updatePromises);
};

/**
 * Gets the current global volume multiplier
 * @returns Current global volume level (0-1), defaults to 1.0
 * @example
 * ```typescript
 * const globalVol = getGlobalVolume();
 * console.log(`Global volume is ${globalVol * 100}%`);
 * ```
 */
export const getGlobalVolume = (): number => {
  return globalVolume;
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
        transitionAudioVolume(currentAudio, config.priorityVolume, duration, easing, channelNumber)
      );
    } else {
      // This is a background channel - duck it
      // Only change audio volume, preserve channel.volume as desired volume
      const currentAudio: HTMLAudioElement = channel.queue[0];
      transitionPromises.push(
        transitionAudioVolume(currentAudio, config.duckingVolume, duration, easing, channelNumber)
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
    transitionPromises.push(
      transitionAudioVolume(currentAudio, targetVolume, duration, easing, channelNumber)
    );
  });

  // Wait for all transitions to complete
  await Promise.all(transitionPromises);
};

/**
 * Transitions only the audio element volume without affecting channel.volume
 * This is used for ducking/restoration where channel.volume represents desired volume
 * Uses Web Audio API when available for enhanced volume control
 * @param audio - The audio element to transition
 * @param targetVolume - Target volume level (0-1)
 * @param duration - Transition duration in milliseconds
 * @param easing - Easing function type
 * @param channelNumber - The channel number this audio belongs to (for Web Audio API)
 * @returns Promise that resolves when transition completes
 * @internal
 */
const transitionAudioVolume = async (
  audio: HTMLAudioElement,
  targetVolume: number,
  duration: number = 250,
  easing: EasingType = EasingType.EaseOut,
  channelNumber?: number
): Promise<void> => {
  // Apply global volume multiplier
  const actualTargetVolume: number = targetVolume * globalVolume;

  // Try to use Web Audio API if available and channel number is provided
  if (channelNumber !== undefined) {
    const channel: ExtendedAudioQueueChannel = audioChannels[channelNumber];
    if (channel?.webAudioContext && channel.webAudioNodes) {
      const nodes = channel.webAudioNodes.get(audio);
      if (nodes) {
        // Use Web Audio API for smooth transitions
        setWebAudioVolume(nodes.gainNode, actualTargetVolume, duration);
        // Also update the audio element's volume property for consistency
        audio.volume = actualTargetVolume;
        return;
      }
    }
  }

  // Fallback to standard HTMLAudioElement volume control with manual transition
  const startVolume: number = audio.volume;
  const volumeDelta: number = actualTargetVolume - startVolume;

  // If no change needed, resolve immediately
  if (Math.abs(volumeDelta) < 0.001) {
    return Promise.resolve();
  }

  // Handle zero or negative duration - instant change
  if (duration <= 0) {
    audio.volume = actualTargetVolume;
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
          // In test environment, use longer intervals to prevent stack overflow
          setTimeout(updateVolume, 16);
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

/**
 * Initializes Web Audio API for a specific channel
 * @param channelNumber - The channel number to initialize Web Audio for
 * @internal
 */
const initializeWebAudioForChannel = async (channelNumber: number): Promise<void> => {
  const channel: ExtendedAudioQueueChannel = audioChannels[channelNumber];
  if (!channel || channel.webAudioContext) return;

  const audioContext = getAudioContext();
  if (!audioContext) {
    throw new Error('AudioContext creation failed');
  }

  // Resume audio context if needed (for autoplay policy)
  await resumeAudioContext(audioContext);

  channel.webAudioContext = audioContext;
  channel.webAudioNodes = new Map();

  // Initialize Web Audio nodes for existing audio elements
  for (const audio of channel.queue) {
    const nodes = createWebAudioNodes(audio, audioContext);
    if (!nodes) {
      throw new Error('Node creation failed');
    }
    channel.webAudioNodes.set(audio, nodes);
    // Set initial volume to match channel volume
    nodes.gainNode.gain.value = channel.volume;
  }
};

/**
 * Sets volume for an audio element using the appropriate method (Web Audio API or standard)
 * @param audio - The audio element to set volume for
 * @param volume - Channel volume level (0-1) - will be multiplied by global volume
 * @param channelNumber - The channel number this audio belongs to
 * @param transitionDuration - Optional transition duration in milliseconds
 * @internal
 */
const setVolumeForAudio = async (
  audio: HTMLAudioElement,
  volume: number,
  channelNumber: number,
  transitionDuration?: number
): Promise<void> => {
  const channel: ExtendedAudioQueueChannel = audioChannels[channelNumber];

  // Apply global volume multiplier to the channel volume
  const actualVolume: number = volume * globalVolume;

  // Use Web Audio API if available and initialized
  if (channel?.webAudioContext && channel.webAudioNodes) {
    const nodes = channel.webAudioNodes.get(audio);
    if (nodes) {
      setWebAudioVolume(nodes.gainNode, actualVolume, transitionDuration);
      return;
    }
  }

  // Fallback to standard HTMLAudioElement volume control
  audio.volume = actualVolume;
};

/**
 * Initializes Web Audio API nodes for a new audio element
 * @param audio - The audio element to initialize nodes for
 * @param channelNumber - The channel number this audio belongs to
 * @internal
 */
export const initializeWebAudioForAudio = async (
  audio: HTMLAudioElement,
  channelNumber: number
): Promise<void> => {
  const channel: ExtendedAudioQueueChannel = audioChannels[channelNumber];
  if (!channel) return;

  // Initialize Web Audio API for the channel if needed
  if (shouldUseWebAudio() && !channel.webAudioContext) {
    await initializeWebAudioForChannel(channelNumber);
  }

  // Create nodes for this specific audio element
  if (channel.webAudioContext && channel.webAudioNodes && !channel.webAudioNodes.has(audio)) {
    const nodes = createWebAudioNodes(audio, channel.webAudioContext);
    if (nodes) {
      channel.webAudioNodes.set(audio, nodes);
      // Set initial volume to match channel volume with global volume multiplier
      nodes.gainNode.gain.value = channel.volume * globalVolume;
    }
  }
};

/**
 * Cleans up Web Audio API nodes for an audio element
 * @param audio - The audio element to clean up nodes for
 * @param channelNumber - The channel number this audio belongs to
 * @internal
 */
export const cleanupWebAudioForAudio = (audio: HTMLAudioElement, channelNumber: number): void => {
  const channel: ExtendedAudioQueueChannel = audioChannels[channelNumber];
  if (!channel?.webAudioNodes) return;

  const nodes = channel.webAudioNodes.get(audio);
  if (nodes) {
    cleanupWebAudioNodes(nodes);
    channel.webAudioNodes.delete(audio);
  }
};
