/**
 * @fileoverview Utility functions for the audio-channel-queue package
 */

import { AudioInfo, QueueSnapshot, ExtendedAudioQueueChannel, QueueItem } from './types';

/**
 * Extracts the filename from a URL string
 * @param url - The URL to extract the filename from
 * @returns The extracted filename or 'unknown' if extraction fails
 * @example
 * ```typescript
 * extractFileName('https://example.com/audio/song.mp3') // Returns: 'song.mp3'
 * extractFileName('/path/to/audio.wav') // Returns: 'audio.wav'
 * ```
 */
export const extractFileName = (url: string): string => {
  try {
    const urlObj: URL = new URL(url);
    const pathname: string = urlObj.pathname;
    const segments: string[] = pathname.split('/');
    const fileName: string = segments[segments.length - 1];
    return fileName || 'unknown';
  } catch {
    // If URL parsing fails, try simple string manipulation
    const segments: string[] = url.split('/');
    const fileName: string = segments[segments.length - 1];
    return fileName || 'unknown';
  }
};

/**
 * Extracts comprehensive audio information from an HTMLAudioElement
 * @param audio - The HTML audio element to extract information from
 * @param channelNumber - Optional channel number to include remaining queue info
 * @param audioChannels - Optional audio channels array to calculate remainingInQueue
 * @returns AudioInfo object with current playback state or null if audio is invalid
 * @example
 * ```typescript
 * const audioElement = new Audio('song.mp3');
 * const info = getAudioInfoFromElement(audioElement);
 * console.log(info?.progress); // Current progress as decimal (0-1)
 * 
 * // With channel context for remainingInQueue
 * const infoWithQueue = getAudioInfoFromElement(audioElement, 0, audioChannels);
 * console.log(infoWithQueue?.remainingInQueue); // Number of items left in queue
 * ```
 */
export const getAudioInfoFromElement = (
  audio: HTMLAudioElement, 
  channelNumber?: number,
  audioChannels?: ExtendedAudioQueueChannel[]
): AudioInfo | null => {
  if (!audio) return null;

  const duration: number = isNaN(audio.duration) ? 0 : audio.duration * 1000; // Convert to milliseconds
  const currentTime: number = isNaN(audio.currentTime) ? 0 : audio.currentTime * 1000; // Convert to milliseconds
  const progress: number = duration > 0 ? Math.min(currentTime / duration, 1) : 0;
  const isPlaying: boolean = !audio.paused && !audio.ended && audio.readyState > 2;

  // Calculate remainingInQueue if channel context is provided
  let remainingInQueue: number = 0;
  if (channelNumber !== undefined && audioChannels && audioChannels[channelNumber]) {
    const channel = audioChannels[channelNumber];
    remainingInQueue = Math.max(0, channel.queue.length - 1); // Exclude current playing audio
  }

  return {
    currentTime,
    duration,
    fileName: extractFileName(audio.src),
    isLooping: audio.loop,
    isPaused: audio.paused && !audio.ended,
    isPlaying,
    progress,
    remainingInQueue,
    src: audio.src,
    volume: audio.volume
  };
};

/**
 * Creates a complete snapshot of a queue's current state
 * @param channelNumber - The channel number to create a snapshot for
 * @param audioChannels - Array of audio channels
 * @returns QueueSnapshot object or null if channel doesn't exist
 * @example
 * ```typescript
 * const snapshot = createQueueSnapshot(0, audioChannels);
 * console.log(`Queue has ${snapshot?.totalItems} items`);
 * ```
 */
export const createQueueSnapshot = (
  channelNumber: number, 
  audioChannels: ExtendedAudioQueueChannel[]
): QueueSnapshot | null => {
  const channel: ExtendedAudioQueueChannel = audioChannels[channelNumber];
  if (!channel) return null;

  const items: QueueItem[] = channel.queue.map((audio: HTMLAudioElement, index: number) => ({
    duration: isNaN(audio.duration) ? 0 : audio.duration * 1000,
    fileName: extractFileName(audio.src),
    isCurrentlyPlaying: index === 0 && !audio.paused && !audio.ended,
    isLooping: audio.loop,
    src: audio.src,
    volume: audio.volume
  }));

  return {
    channelNumber,
    currentIndex: 0, // Current playing is always index 0 in our queue structure
    isPaused: channel.isPaused || false,
    items,
    totalItems: channel.queue.length,
    volume: channel.volume || 1.0
  };
};

/**
 * Removes webpack hash patterns from filenames to get clean, readable names
 * @param fileName - The filename that may contain webpack hashes
 * @returns The cleaned filename with webpack hashes removed
 * @example
 * ```typescript
 * cleanWebpackFilename('song.a1b2c3d4.mp3') // Returns: 'song.mp3'
 * cleanWebpackFilename('notification.1a2b3c4d5e6f7890.wav') // Returns: 'notification.wav'
 * cleanWebpackFilename('music.12345678.ogg') // Returns: 'music.ogg'
 * cleanWebpackFilename('clean-file.mp3') // Returns: 'clean-file.mp3' (unchanged)
 * ```
 */
export const cleanWebpackFilename = (fileName: string): string => {
  // Remove webpack hash pattern: filename.hash.ext → filename.ext
  return fileName.replace(/\.[a-f0-9]{8,}\./i, '.');
}; 