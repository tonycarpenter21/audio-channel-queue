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

  const audio: HTMLAudioElement = new Audio(audioUrl);
  
  // Apply audio configuration from options
  if (options?.loop) {
    audio.loop = true;
  }
  
  if (options?.volume !== undefined) {
    const clampedVolume: number = Math.max(0, Math.min(1, options.volume));
    // Handle NaN case - default to channel volume or 1.0
    const safeVolume: number = isNaN(clampedVolume) ? (audioChannels[channelNumber].volume || 1.0) : clampedVolume;
    audio.volume = safeVolume;
    // Also update the channel volume
    audioChannels[channelNumber].volume = safeVolume;
  } else {
    // Use channel volume if no specific volume is set
    const channelVolume: number = audioChannels[channelNumber].volume || 1.0;
    audio.volume = channelVolume;
  }

  // Add to front or back of queue based on options
  if ((options?.addToFront || options?.priority) && audioChannels[channelNumber].queue.length > 0) {
    // Insert after the currently playing audio (index 1)
    audioChannels[channelNumber].queue.splice(1, 0, audio);
  } else if ((options?.addToFront || options?.priority) && audioChannels[channelNumber].queue.length === 0) {
    // If queue is empty, just add normally
    audioChannels[channelNumber].queue.push(audio);
  } else {
    // Default behavior - add to back of queue
    audioChannels[channelNumber].queue.push(audio);
  }

  emitQueueChange(channelNumber, audioChannels);

  if (audioChannels[channelNumber].queue.length === 1) {
    // Don't await - let playback happen asynchronously
    playAudioQueue(channelNumber).catch(console.error);
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
        emitAudioStart(channelNumber, {
          channelNumber,
          duration: currentAudio.duration * 1000, // Now guaranteed to have valid duration
          fileName: extractFileName(currentAudio.src),
          src: currentAudio.src
        }, audioChannels);
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
      emitAudioComplete(channelNumber, {
        channelNumber,
        fileName: extractFileName(currentAudio.src),
        remainingInQueue: channel.queue.length - 1,
        src: currentAudio.src
      }, audioChannels);

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
        await currentAudio.play();
        // Don't remove from queue, but resolve the promise so tests don't hang
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
    if (currentAudio.readyState >= 1) { // HAVE_METADATA or higher
      metadataLoaded = true;
    }

    currentAudio.play();
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
    
    emitAudioComplete(channelNumber, {
      channelNumber,
      fileName: extractFileName(currentAudio.src),
      remainingInQueue: channel.queue.length - 1,
      src: currentAudio.src
    }, audioChannels);

    // Restore volume levels when stopping
    await restoreVolumeLevels(channelNumber);

    currentAudio.pause();
    cleanupProgressTracking(currentAudio, channelNumber, audioChannels);
    channel.queue.shift();
    channel.isPaused = false; // Reset pause state

    emitQueueChange(channelNumber, audioChannels);
    
    // Start next audio without waiting for it to complete
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
      
      emitAudioComplete(channelNumber, {
        channelNumber,
        fileName: extractFileName(currentAudio.src),
        remainingInQueue: 0, // Will be 0 since we're clearing the queue
        src: currentAudio.src
      }, audioChannels);

      // Restore volume levels when stopping
      await restoreVolumeLevels(channelNumber);

      currentAudio.pause();
      cleanupProgressTracking(currentAudio, channelNumber, audioChannels);
    }
    // Clean up all progress tracking for this channel
    channel.queue.forEach(audio => cleanupProgressTracking(audio, channelNumber, audioChannels));
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