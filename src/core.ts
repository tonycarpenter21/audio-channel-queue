/**
 * @fileoverview Core queue management functions for the audio-channel-queue package
 */

import { ExtendedAudioQueueChannel } from './types';
import { audioChannels } from './info';
import { extractFileName } from './utils';
import { 
  emitQueueChange, 
  emitAudioStart, 
  emitAudioComplete, 
  setupProgressTracking, 
  cleanupProgressTracking 
} from './events';

/**
 * Queues an audio file to a specific channel and starts playing if it's the first in queue
 * @param audioUrl - The URL of the audio file to queue
 * @param channelNumber - The channel number to queue the audio to (defaults to 0)
 * @returns Promise that resolves when the audio is queued and starts playing (if first in queue)
 * @example
 * ```typescript
 * await queueAudio('https://example.com/song.mp3', 0);
 * await queueAudio('./sounds/notification.wav'); // Uses default channel 0
 * ```
 */
export const queueAudio = async (audioUrl: string, channelNumber: number = 0): Promise<void> => {
  if (!audioChannels[channelNumber]) {
    audioChannels[channelNumber] = { 
      audioCompleteCallbacks: new Set(),
      audioStartCallbacks: new Set(),
      progressCallbacks: new Map(),
      queue: [],
      queueChangeCallbacks: new Set()
    };
  }

  const audio: HTMLAudioElement = new Audio(audioUrl);
  audioChannels[channelNumber].queue.push(audio);

  emitQueueChange(channelNumber, audioChannels);

  if (audioChannels[channelNumber].queue.length === 1) {
    playAudioQueue(channelNumber);
  }
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

  if (channel.queue.length === 0) return;

  const currentAudio: HTMLAudioElement = channel.queue[0];

  setupProgressTracking(currentAudio, channelNumber, audioChannels);

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

      // Clean up event listeners
      currentAudio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      currentAudio.removeEventListener('play', handlePlay);
      currentAudio.removeEventListener('ended', handleEnded);
      
      cleanupProgressTracking(currentAudio, channelNumber, audioChannels);
      channel.queue.shift();
      
      // Emit queue change after completion
      setTimeout(() => emitQueueChange(channelNumber, audioChannels), 10);
      
      await playAudioQueue(channelNumber);
      resolve();
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
 * stopCurrentAudioInChannel(0); // Stop current audio in channel 0
 * stopCurrentAudioInChannel(); // Stop current audio in default channel
 * ```
 */
export const stopCurrentAudioInChannel = (channelNumber: number = 0): void => {
  const channel: ExtendedAudioQueueChannel = audioChannels[channelNumber];
  if (channel && channel.queue.length > 0) {
    const currentAudio: HTMLAudioElement = channel.queue[0];
    
    emitAudioComplete(channelNumber, {
      channelNumber,
      fileName: extractFileName(currentAudio.src),
      remainingInQueue: channel.queue.length - 1,
      src: currentAudio.src
    }, audioChannels);

    currentAudio.pause();
    cleanupProgressTracking(currentAudio, channelNumber, audioChannels);
    channel.queue.shift();

    emitQueueChange(channelNumber, audioChannels);
    
    playAudioQueue(channelNumber);
  }
};

/**
 * Stops all audio in a specific channel and clears the entire queue
 * @param channelNumber - The channel number (defaults to 0)
 * @example
 * ```typescript
 * stopAllAudioInChannel(0); // Clear all audio in channel 0
 * stopAllAudioInChannel(); // Clear all audio in default channel
 * ```
 */
export const stopAllAudioInChannel = (channelNumber: number = 0): void => {
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

      currentAudio.pause();
      cleanupProgressTracking(currentAudio, channelNumber, audioChannels);
    }
    // Clean up all progress tracking for this channel
    channel.queue.forEach(audio => cleanupProgressTracking(audio, channelNumber, audioChannels));
    channel.queue = [];
    
    emitQueueChange(channelNumber, audioChannels);
  }
};

/**
 * Stops all audio across all channels and clears all queues
 * @example
 * ```typescript
 * stopAllAudio(); // Emergency stop - clears everything
 * ```
 */
export const stopAllAudio = (): void => {
  audioChannels.forEach((_channel: ExtendedAudioQueueChannel, index: number) => {
    stopAllAudioInChannel(index);
  });
}; 