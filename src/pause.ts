/**
 * @fileoverview Pause and resume management functions for the audio-channel-queue package
 */

import { ExtendedAudioQueueChannel, AudioInfo, FadeType, FadeConfig, ChannelFadeState, EasingType } from './types';
import { audioChannels } from './info';
import { getAudioInfoFromElement } from './utils';
import { emitAudioPause, emitAudioResume } from './events';
import { transitionVolume } from './volume';

/**
 * Predefined fade configurations for different transition types
 */
const FADE_CONFIGS: Record<FadeType, FadeConfig> = {
  [FadeType.Linear]: { duration: 800, pauseCurve: EasingType.Linear, resumeCurve: EasingType.Linear },
  [FadeType.Gentle]: { duration: 800, pauseCurve: EasingType.EaseOut, resumeCurve: EasingType.EaseIn },
  [FadeType.Dramatic]: { duration: 800, pauseCurve: EasingType.EaseIn, resumeCurve: EasingType.EaseOut }
};

/**
 * Gets the current volume for a channel, accounting for synchronous state
 * @param channelNumber - The channel number
 * @returns Current volume level (0-1)
 */
const getChannelVolumeSync = (channelNumber: number): number => {
  const channel: ExtendedAudioQueueChannel = audioChannels[channelNumber];
  return channel?.volume || 1.0;
};

/**
 * Sets the channel volume synchronously in internal state
 * @param channelNumber - The channel number
 * @param volume - Volume level (0-1)
 */
const setChannelVolumeSync = (channelNumber: number, volume: number): void => {
  const channel: ExtendedAudioQueueChannel = audioChannels[channelNumber];
  if (channel) {
    channel.volume = volume;
    if (channel.queue.length > 0) {
      channel.queue[0].volume = volume;
    }
  }
};

/**
 * Pauses the currently playing audio in a specific channel with smooth volume fade
 * @param fadeType - Type of fade transition to apply
 * @param channelNumber - The channel number to pause (defaults to 0)
 * @returns Promise that resolves when the pause and fade are complete
 * @example
 * ```typescript
 * await pauseWithFade(FadeType.Gentle, 0); // Pause with gentle fade out over 800ms
 * await pauseWithFade(FadeType.Dramatic, 1); // Pause with dramatic fade out over 800ms
 * await pauseWithFade(FadeType.Linear, 2); // Linear pause with 800ms fade
 * ```
 */
export const pauseWithFade = async (fadeType: FadeType = FadeType.Gentle, channelNumber: number = 0): Promise<void> => {
  const channel: ExtendedAudioQueueChannel = audioChannels[channelNumber];
  
  if (!channel || channel.queue.length === 0) return;
  
  const currentAudio: HTMLAudioElement = channel.queue[0];
  
  // Don't pause if already paused or ended
  if (currentAudio.paused || currentAudio.ended) return;
  
  const config: FadeConfig = FADE_CONFIGS[fadeType];
  const originalVolume: number = getChannelVolumeSync(channelNumber);
  
  // Store fade state for resumeWithFade to use
  channel.fadeState = {
    originalVolume,
    fadeType,
    isPaused: true
  };
  
  if (config.duration === 0) {
    // Instant pause
    await pauseChannel(channelNumber);
    return;
  }
  
  // Fade to 0 with pause curve, then pause
  await transitionVolume(channelNumber, 0, config.duration, config.pauseCurve);
  await pauseChannel(channelNumber);
  
  // Reset volume to original for resume (synchronously to avoid state issues)
  setChannelVolumeSync(channelNumber, originalVolume);
};

/**
 * Resumes the currently paused audio in a specific channel with smooth volume fade
 * Uses the complementary fade curve automatically based on the pause fade type, or allows override
 * @param fadeType - Optional fade type to override the stored fade type from pause
 * @param channelNumber - The channel number to resume (defaults to 0)
 * @returns Promise that resolves when the resume and fade are complete
 * @example
 * ```typescript
 * await resumeWithFade(); // Resume with automatically paired fade curve from pause
 * await resumeWithFade(FadeType.Dramatic, 0); // Override with dramatic fade
 * await resumeWithFade(FadeType.Linear); // Override with linear fade on default channel
 * ```
 */
export const resumeWithFade = async (fadeType?: FadeType, channelNumber: number = 0): Promise<void> => {
  const channel: ExtendedAudioQueueChannel = audioChannels[channelNumber];
  
  if (!channel || channel.queue.length === 0) return;
  
  const fadeState: ChannelFadeState | undefined = channel.fadeState;
  if (!fadeState || !fadeState.isPaused) {
    // Fall back to regular resume if no fade state
    await resumeChannel(channelNumber);
    return;
  }
  
  // Use provided fadeType or fall back to stored fadeType from pause
  const effectiveFadeType: FadeType = fadeType || fadeState.fadeType;
  const config: FadeConfig = FADE_CONFIGS[effectiveFadeType];
  
  if (config.duration === 0) {
    // Instant resume
    await resumeChannel(channelNumber);
    fadeState.isPaused = false;
    return;
  }
  
  // Set volume to 0, resume, then fade to original with resume curve
  setChannelVolumeSync(channelNumber, 0);
  await resumeChannel(channelNumber);
  await transitionVolume(channelNumber, fadeState.originalVolume, config.duration, config.resumeCurve);
  
  fadeState.isPaused = false;
};

/**
 * Toggles pause/resume state for a specific channel with integrated fade
 * @param fadeType - Type of fade transition to apply when pausing
 * @param channelNumber - The channel number to toggle (defaults to 0)
 * @returns Promise that resolves when the toggle and fade are complete
 * @example
 * ```typescript
 * await togglePauseWithFade(FadeType.Gentle, 0); // Toggle with gentle fade
 * ```
 */
export const togglePauseWithFade = async (fadeType: FadeType = FadeType.Gentle, channelNumber: number = 0): Promise<void> => {
  const channel: ExtendedAudioQueueChannel = audioChannels[channelNumber];
  
  if (!channel || channel.queue.length === 0) return;
  
  const currentAudio: HTMLAudioElement = channel.queue[0];
  
  if (currentAudio.paused) {
    await resumeWithFade(undefined, channelNumber);
  } else {
    await pauseWithFade(fadeType, channelNumber);
  }
};

/**
 * Pauses all currently playing audio across all channels with smooth volume fade
 * @param fadeType - Type of fade transition to apply to all channels
 * @returns Promise that resolves when all channels are paused and faded
 * @example
 * ```typescript
 * await pauseAllWithFade('dramatic'); // Pause everything with dramatic fade
 * ```
 */
export const pauseAllWithFade = async (fadeType: FadeType = FadeType.Gentle): Promise<void> => {
  const pausePromises: Promise<void>[] = [];
  
  audioChannels.forEach((_channel: ExtendedAudioQueueChannel, index: number) => {
    pausePromises.push(pauseWithFade(fadeType, index));
  });
  
  await Promise.all(pausePromises);
};

/**
 * Resumes all currently paused audio across all channels with smooth volume fade
 * Uses automatically paired fade curves based on each channel's pause fade type
 * @returns Promise that resolves when all channels are resumed and faded
 * @example
 * ```typescript
 * await resumeAllWithFade(); // Resume everything with paired fade curves
 * ```
 */
export const resumeAllWithFade = async (): Promise<void> => {
  const resumePromises: Promise<void>[] = [];
  
  audioChannels.forEach((_channel: ExtendedAudioQueueChannel, index: number) => {
    resumePromises.push(resumeWithFade(undefined, index));
  });
  
  await Promise.all(resumePromises);
};

/**
 * Toggles pause/resume state for all channels with integrated fade
 * If any channels are playing, all will be paused with fade
 * If all channels are paused, all will be resumed with fade
 * @param fadeType - Type of fade transition to apply when pausing
 * @returns Promise that resolves when all toggles and fades are complete
 * @example
 * ```typescript
 * await togglePauseAllWithFade('gentle'); // Global toggle with gentle fade
 * ```
 */
export const togglePauseAllWithFade = async (fadeType: FadeType = FadeType.Gentle): Promise<void> => {
  let hasPlayingChannel: boolean = false;
  
  // Check if any channel is currently playing
  for (let i = 0; i < audioChannels.length; i++) {
    const channel: ExtendedAudioQueueChannel = audioChannels[i];
    if (channel && channel.queue.length > 0) {
      const currentAudio: HTMLAudioElement = channel.queue[0];
      if (!currentAudio.paused && !currentAudio.ended) {
        hasPlayingChannel = true;
        break;
      }
    }
  }
  
  // If any channel is playing, pause all with fade
  // If no channels are playing, resume all with fade
  if (hasPlayingChannel) {
    await pauseAllWithFade(fadeType);
  } else {
    await resumeAllWithFade();
  }
};

/**
 * Pauses the currently playing audio in a specific channel
 * @param channelNumber - The channel number to pause (defaults to 0)
 * @returns Promise that resolves when the audio is paused
 * @example
 * ```typescript
 * await pauseChannel(0); // Pause audio in channel 0
 * await pauseChannel(); // Pause audio in default channel
 * ```
 */
export const pauseChannel = async (channelNumber: number = 0): Promise<void> => {
  const channel: ExtendedAudioQueueChannel = audioChannels[channelNumber];
  
  if (channel && channel.queue.length > 0) {
    const currentAudio: HTMLAudioElement = channel.queue[0];
    
    if (!currentAudio.paused && !currentAudio.ended) {
      currentAudio.pause();
      channel.isPaused = true;
      
      const audioInfo: AudioInfo | null = getAudioInfoFromElement(currentAudio, channelNumber, audioChannels);
      if (audioInfo) {
        emitAudioPause(channelNumber, audioInfo, audioChannels);
      }
    }
  }
};

/**
 * Resumes the currently paused audio in a specific channel
 * @param channelNumber - The channel number to resume (defaults to 0)
 * @returns Promise that resolves when the audio starts playing
 * @example
 * ```typescript
 * await resumeChannel(0); // Resume audio in channel 0
 * await resumeChannel(); // Resume audio in default channel
 * ```
 */
export const resumeChannel = async (channelNumber: number = 0): Promise<void> => {
  const channel: ExtendedAudioQueueChannel = audioChannels[channelNumber];
  
  if (channel && channel.queue.length > 0) {
    const currentAudio: HTMLAudioElement = channel.queue[0];
    
    // Only resume if both the channel is marked as paused AND the audio element is actually paused AND not ended
    if (channel.isPaused && currentAudio.paused && !currentAudio.ended) {
      await currentAudio.play();
      channel.isPaused = false;
      
      const audioInfo: AudioInfo | null = getAudioInfoFromElement(currentAudio, channelNumber, audioChannels);
      if (audioInfo) {
        emitAudioResume(channelNumber, audioInfo, audioChannels);
      }
    }
  }
};

/**
 * Toggles pause/resume state for a specific channel
 * @param channelNumber - The channel number to toggle (defaults to 0)
 * @returns Promise that resolves when the toggle is complete
 * @example
 * ```typescript
 * await togglePauseChannel(0); // Toggle pause state for channel 0
 * ```
 */
export const togglePauseChannel = async (channelNumber: number = 0): Promise<void> => {
  const channel: ExtendedAudioQueueChannel = audioChannels[channelNumber];
  
  if (channel && channel.queue.length > 0) {
    const currentAudio: HTMLAudioElement = channel.queue[0];
    
    if (currentAudio.paused) {
      await resumeChannel(channelNumber);
    } else {
      await pauseChannel(channelNumber);
    }
  }
};

/**
 * Pauses all currently playing audio across all channels
 * @returns Promise that resolves when all audio is paused
 * @example
 * ```typescript
 * await pauseAllChannels(); // Pause everything
 * ```
 */
export const pauseAllChannels = async (): Promise<void> => {
  const pausePromises: Promise<void>[] = [];
  
  audioChannels.forEach((_channel: ExtendedAudioQueueChannel, index: number) => {
    pausePromises.push(pauseChannel(index));
  });
  
  await Promise.all(pausePromises);
};

/**
 * Resumes all currently paused audio across all channels
 * @returns Promise that resolves when all audio is resumed
 * @example
 * ```typescript
 * await resumeAllChannels(); // Resume everything that was paused
 * ```
 */
export const resumeAllChannels = async (): Promise<void> => {
  const resumePromises: Promise<void>[] = [];
  
  audioChannels.forEach((_channel: ExtendedAudioQueueChannel, index: number) => {
    resumePromises.push(resumeChannel(index));
  });
  
  await Promise.all(resumePromises);
};

/**
 * Checks if a specific channel is currently paused
 * @param channelNumber - The channel number to check (defaults to 0)
 * @returns True if the channel is paused, false otherwise
 * @example
 * ```typescript
 * const isPaused = isChannelPaused(0);
 * console.log(`Channel 0 is ${isPaused ? 'paused' : 'playing'}`);
 * ```
 */
export const isChannelPaused = (channelNumber: number = 0): boolean => {
  const channel: ExtendedAudioQueueChannel = audioChannels[channelNumber];
  return channel?.isPaused || false;
};

/**
 * Gets the pause state of all channels
 * @returns Array of boolean values indicating pause state for each channel
 * @example
 * ```typescript
 * const pauseStates = getAllChannelsPauseState();
 * pauseStates.forEach((isPaused, index) => {
 *   console.log(`Channel ${index}: ${isPaused ? 'paused' : 'playing'}`);
 * });
 * ```
 */
export const getAllChannelsPauseState = (): boolean[] => {
  return audioChannels.map((channel: ExtendedAudioQueueChannel) => 
    channel?.isPaused || false
  );
};

/**
 * Toggles pause/resume state for all channels globally
 * If any channels are currently playing, all channels will be paused
 * If all channels are paused, all channels will be resumed
 * @returns Promise that resolves when the toggle is complete
 * @example
 * ```typescript
 * await togglePauseAllChannels(); // Pause all if any are playing, resume all if all are paused
 * ```
 */
export const togglePauseAllChannels = async (): Promise<void> => {
  let hasPlayingChannel: boolean = false;
  
  // Check if any channel is currently playing
  for (let i = 0; i < audioChannels.length; i++) {
    const channel: ExtendedAudioQueueChannel = audioChannels[i];
    if (channel && channel.queue.length > 0) {
      const currentAudio: HTMLAudioElement = channel.queue[0];
      if (!currentAudio.paused && !currentAudio.ended) {
        hasPlayingChannel = true;
        break;
      }
    }
  }
  
  // If any channel is playing, pause all channels
  // If no channels are playing, resume all channels
  if (hasPlayingChannel) {
    await pauseAllChannels();
  } else {
    await resumeAllChannels();
  }
}; 