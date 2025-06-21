/**
 * @fileoverview Core queue management functions for the audio-channel-queue package
 */

import { ExtendedAudioQueueChannel, AudioQueueOptions } from './types';
import { audioChannels } from './info';
import { extractFileName } from './utils';
import {
  emitQueueChange,
  emitAudioStart,
  emitAudioComplete,
  setupProgressTracking,
  cleanupProgressTracking
} from './events';
import { applyVolumeDucking, restoreVolumeLevels } from './volume';
import { setupAudioErrorHandling, handleAudioError } from './errors';

/**
 * Queues an audio file to a specific channel and starts playing if it's the first in queue
 * @param audioUrl - The URL of the audio file to queue
 * @param channelNumber - The channel number to queue the audio to (defaults to 0)
 * @param options - Optional configuration for the audio file
 * @returns Promise that resolves when the audio is queued and starts playing (if first in queue)
 * @example
 * ```typescript
 * await queueAudio('https://example.com/song.mp3', 0);
 * await queueAudio('./sounds/notification.wav'); // Uses default channel 0
 * await queueAudio('./music/loop.mp3', 1, { loop: true }); // Loop the audio
 * await queueAudio('./urgent.wav', 0, { addToFront: true }); // Add to front of queue
 * ```
 */
export const queueAudio = async (
  audioUrl: string,
  channelNumber: number = 0,
  options?: AudioQueueOptions
): Promise<void> => {
  // Ensure the channel exists
  while (audioChannels.length <= channelNumber) {
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

  const channel: ExtendedAudioQueueChannel = audioChannels[channelNumber];
  const audio: HTMLAudioElement = new Audio(audioUrl);

  // Set up comprehensive error handling
  setupAudioErrorHandling(audio, channelNumber, audioUrl, async (error: Error) => {
    await handleAudioError(audio, channelNumber, audioUrl, error);
  });

  // Apply options if provided
  if (options) {
    if (typeof options.loop === 'boolean') {
      audio.loop = options.loop;
    }
    if (typeof options.volume === 'number' && !isNaN(options.volume)) {
      const clampedVolume = Math.max(0, Math.min(1, options.volume));
      audio.volume = clampedVolume;
      // Set channel volume to match the audio volume
      channel.volume = clampedVolume;
    }
  }

  // Handle priority option (same as addToFront for backward compatibility)
  const shouldAddToFront = options?.addToFront || options?.priority;

  // Add to queue based on priority/addToFront option
  if (shouldAddToFront && channel.queue.length > 0) {
    // Insert after currently playing track (at index 1)
    channel.queue.splice(1, 0, audio);
  } else if (shouldAddToFront) {
    // If queue is empty, add to front
    channel.queue.unshift(audio);
  } else {
    // Add to back of queue
    channel.queue.push(audio);
  }

  // Emit queue change event
  emitQueueChange(channelNumber, audioChannels);

  // Start playing if this is the first item and channel isn't paused
  if (channel.queue.length === 1 && !channel.isPaused) {
    // Use setTimeout to ensure the queue change event is emitted first
    setTimeout(() => {
      playAudioQueue(channelNumber).catch((error: Error) => {
        handleAudioError(audio, channelNumber, audioUrl, error);
      });
    }, 0);
  }
};

/**
 * Adds an audio file to the front of the queue in a specific channel
 * This is a convenience function that places the audio right after the currently playing track
 * @param audioUrl - The URL of the audio file to queue
 * @param channelNumber - The channel number to queue the audio to (defaults to 0)
 * @param options - Optional configuration for the audio file
 * @returns Promise that resolves when the audio is queued
 * @example
 * ```typescript
 * await queueAudioPriority('./urgent-announcement.wav', 0);
 * await queueAudioPriority('./priority-sound.mp3', 1, { loop: true });
 * ```
 */
export const queueAudioPriority = async (
  audioUrl: string,
  channelNumber: number = 0,
  options?: AudioQueueOptions
): Promise<void> => {
  const priorityOptions: AudioQueueOptions = { ...options, addToFront: true };
  return queueAudio(audioUrl, channelNumber, priorityOptions);
};

/**
 * Plays the audio queue for a specific channel
 * @param channelNumber - The channel number to play
 * @returns Promise that resolves when the current audio finishes playing
 * @example
 * ```typescript
 * await playAudioQueue(0); // Play queue for channel 0
 * ```
 */
export const playAudioQueue = async (channelNumber: number): Promise<void> => {
  const channel: ExtendedAudioQueueChannel = audioChannels[channelNumber];

  if (!channel || channel.queue.length === 0) return;

  const currentAudio: HTMLAudioElement = channel.queue[0];

  // Apply channel volume if not already set
  if (currentAudio.volume === 1.0 && channel.volume !== undefined) {
    currentAudio.volume = channel.volume;
  }

  setupProgressTracking(currentAudio, channelNumber, audioChannels);

  // Apply volume ducking when audio starts
  await applyVolumeDucking(channelNumber);

  return new Promise<void>((resolve) => {
    let hasStarted: boolean = false;
    let metadataLoaded: boolean = false;
    let playStarted: boolean = false;

    // Check if we should fire onAudioStart (both conditions met)
    const tryFireAudioStart = (): void => {
      if (!hasStarted && metadataLoaded && playStarted) {
        hasStarted = true;
        emitAudioStart(
          channelNumber,
          {
            channelNumber,
            duration: currentAudio.duration * 1000,
            fileName: extractFileName(currentAudio.src),
            src: currentAudio.src
          },
          audioChannels
        );
      }
    };

    // Event handler for when metadata loads (duration becomes available)
    const handleLoadedMetadata = (): void => {
      metadataLoaded = true;
      tryFireAudioStart();
    };

    // Event handler for when audio actually starts playing
    const handlePlay = (): void => {
      playStarted = true;
      tryFireAudioStart();
    };

    // Event handler for when audio ends
    const handleEnded = async (): Promise<void> => {
      emitAudioComplete(
        channelNumber,
        {
          channelNumber,
          fileName: extractFileName(currentAudio.src),
          remainingInQueue: channel.queue.length - 1,
          src: currentAudio.src
        },
        audioChannels
      );

      // Restore volume levels when priority channel stops
      await restoreVolumeLevels(channelNumber);

      // Clean up event listeners
      currentAudio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      currentAudio.removeEventListener('play', handlePlay);
      currentAudio.removeEventListener('ended', handleEnded);

      cleanupProgressTracking(currentAudio, channelNumber, audioChannels);

      // Handle looping vs non-looping audio
      if (currentAudio.loop) {
        // For looping audio, reset current time and continue playing
        currentAudio.currentTime = 0;
        try {
          await currentAudio.play();
        } catch (error) {
          await handleAudioError(currentAudio, channelNumber, currentAudio.src, error as Error);
        }
        resolve();
      } else {
        // For non-looping audio, remove from queue and play next
        channel.queue.shift();

        // Emit queue change after completion
        setTimeout(() => emitQueueChange(channelNumber, audioChannels), 10);

        await playAudioQueue(channelNumber);
        resolve();
      }
    };

    // Add event listeners
    currentAudio.addEventListener('loadedmetadata', handleLoadedMetadata);
    currentAudio.addEventListener('play', handlePlay);
    currentAudio.addEventListener('ended', handleEnded);

    // Check if metadata is already loaded (in case it loads before we add the listener)
    if (currentAudio.readyState >= 1) {
      metadataLoaded = true;
    }

    // Enhanced play with error handling
    currentAudio.play().catch(async (error: Error) => {
      await handleAudioError(currentAudio, channelNumber, currentAudio.src, error);
      resolve(); // Resolve to prevent hanging
    });
  });
};

/**
 * Stops the currently playing audio in a specific channel and plays the next audio in queue
 * @param channelNumber - The channel number (defaults to 0)
 * @example
 * ```typescript
 * await stopCurrentAudioInChannel(); // Stop current audio in default channel (0)
 * await stopCurrentAudioInChannel(1); // Stop current audio in channel 1
 * ```
 */
export const stopCurrentAudioInChannel = async (channelNumber: number = 0): Promise<void> => {
  const channel: ExtendedAudioQueueChannel = audioChannels[channelNumber];
  if (channel && channel.queue.length > 0) {
    const currentAudio: HTMLAudioElement = channel.queue[0];

    emitAudioComplete(
      channelNumber,
      {
        channelNumber,
        fileName: extractFileName(currentAudio.src),
        remainingInQueue: channel.queue.length - 1,
        src: currentAudio.src
      },
      audioChannels
    );

    // Restore volume levels when stopping
    await restoreVolumeLevels(channelNumber);

    currentAudio.pause();
    cleanupProgressTracking(currentAudio, channelNumber, audioChannels);
    channel.queue.shift();
    channel.isPaused = false; // Reset pause state

    emitQueueChange(channelNumber, audioChannels);

    // Start next audio without waiting for it to complete
    // eslint-disable-next-line no-console
    playAudioQueue(channelNumber).catch(console.error);
  }
};

/**
 * Stops all audio in a specific channel and clears the entire queue
 * @param channelNumber - The channel number (defaults to 0)
 * @example
 * ```typescript
 * await stopAllAudioInChannel(); // Clear all audio in default channel (0)
 * await stopAllAudioInChannel(1); // Clear all audio in channel 1
 * ```
 */
export const stopAllAudioInChannel = async (channelNumber: number = 0): Promise<void> => {
  const channel: ExtendedAudioQueueChannel = audioChannels[channelNumber];
  if (channel) {
    if (channel.queue.length > 0) {
      const currentAudio: HTMLAudioElement = channel.queue[0];

      emitAudioComplete(
        channelNumber,
        {
          channelNumber,
          fileName: extractFileName(currentAudio.src),
          remainingInQueue: 0, // Will be 0 since we're clearing the queue
          src: currentAudio.src
        },
        audioChannels
      );

      // Restore volume levels when stopping
      await restoreVolumeLevels(channelNumber);

      currentAudio.pause();
      cleanupProgressTracking(currentAudio, channelNumber, audioChannels);
    }
    // Clean up all progress tracking for this channel
    channel.queue.forEach((audio) => cleanupProgressTracking(audio, channelNumber, audioChannels));
    channel.queue = [];
    channel.isPaused = false; // Reset pause state

    emitQueueChange(channelNumber, audioChannels);
  }
};

/**
 * Stops all audio across all channels and clears all queues
 * @example
 * ```typescript
 * await stopAllAudio(); // Emergency stop - clears everything
 * ```
 */
export const stopAllAudio = async (): Promise<void> => {
  const stopPromises: Promise<void>[] = [];
  audioChannels.forEach((_channel: ExtendedAudioQueueChannel, index: number) => {
    stopPromises.push(stopAllAudioInChannel(index));
  });
  await Promise.all(stopPromises);
};
