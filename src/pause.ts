/**
 * @fileoverview Pause and resume management functions for the audio-channel-queue package
 */

import { ExtendedAudioQueueChannel, AudioInfo } from './types';
import { audioChannels } from './info';
import { getAudioInfoFromElement } from './utils';
import { emitAudioPause, emitAudioResume } from './events';

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