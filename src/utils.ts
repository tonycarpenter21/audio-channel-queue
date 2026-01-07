/**
 * @fileoverview Utility functions for the audioq package
 */

import { AudioInfo, QueueSnapshot, ExtendedAudioQueueChannel, QueueItem } from './types';

/**
 * Validates an audio URL for security and correctness
 * @param url - The URL to validate
 * @returns The validated URL
 * @throws Error if the URL is invalid or potentially malicious
 * @example
 * ```typescript
 * validateAudioUrl('https://example.com/audio.mp3'); // Valid
 * validateAudioUrl('./sounds/local.wav'); // Valid relative path
 * validateAudioUrl('javascript:alert("XSS")'); // Throws error
 * validateAudioUrl('data:text/html,<script>alert("XSS")</script>'); // Throws error
 * ```
 */
export const validateAudioUrl = (url: string): string => {
  if (!url || typeof url !== 'string') {
    throw new Error('Audio URL must be a non-empty string');
  }

  // Trim whitespace
  const trimmedUrl: string = url.trim();

  // Check for dangerous protocols
  const dangerousProtocols: string[] = [
    'javascript:',
    'data:',
    'vbscript:',
    'file:',
    'about:',
    'chrome:',
    'chrome-extension:'
  ];

  const lowerUrl: string = trimmedUrl.toLowerCase();
  for (const protocol of dangerousProtocols) {
    if (lowerUrl.startsWith(protocol)) {
      throw new Error(`Invalid audio URL: dangerous protocol "${protocol}" is not allowed`);
    }
  }

  // Check for path traversal attempts
  if (trimmedUrl.includes('../') || trimmedUrl.includes('..\\')) {
    throw new Error('Invalid audio URL: path traversal attempts are not allowed');
  }

  // For relative URLs, ensure they don't start with dangerous characters
  if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
    // Check for protocol-less URLs that might be interpreted as protocols
    if (trimmedUrl.includes(':') && !trimmedUrl.startsWith('//')) {
      const colonIndex: number = trimmedUrl.indexOf(':');
      const beforeColon: string = trimmedUrl.substring(0, colonIndex);
      // Allow only if it looks like a Windows drive letter (e.g., C:)
      if (!/^[a-zA-Z]$/.test(beforeColon)) {
        throw new Error('Invalid audio URL: suspicious protocol-like pattern detected');
      }
    }
  }

  // Validate common audio file extensions (warning, not error)
  const hasAudioExtension: boolean = /\.(mp3|wav|ogg|m4a|webm|aac|flac|opus|weba|mp4)$/i.test(
    trimmedUrl
  );
  if (!hasAudioExtension && !trimmedUrl.includes('?')) {
    // Log warning but don't throw - some valid URLs might not have extensions
    // eslint-disable-next-line no-console
    console.warn(`Audio URL "${trimmedUrl}" does not have a recognized audio file extension`);
  }

  return trimmedUrl;
};

/**
 * Sanitizes a string for safe display in HTML contexts
 * @param text - The text to sanitize
 * @returns The sanitized text safe for display
 * @example
 * ```typescript
 * sanitizeForDisplay('<script>alert("XSS")</script>'); // Returns: '&lt;script&gt;alert("XSS")&lt;/script&gt;'
 * sanitizeForDisplay('normal-file.mp3'); // Returns: 'normal-file.mp3'
 * ```
 */
export const sanitizeForDisplay = (text: string): string => {
  if (!text || typeof text !== 'string') {
    return '';
  }

  // Replace HTML special characters
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

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
  if (!url || typeof url !== 'string') {
    return sanitizeForDisplay('unknown');
  }

  // Always use simple string manipulation for consistency
  const segments: string[] = url.split('/');
  const lastSegment: string = segments[segments.length - 1] || '';

  // Remove query parameters and hash
  const fileName: string = lastSegment.split('?')[0].split('#')[0];

  // Decode URI components and sanitize
  try {
    return sanitizeForDisplay(decodeURIComponent(fileName || 'unknown'));
  } catch {
    // If decoding fails, return the sanitized raw filename
    return sanitizeForDisplay(fileName || 'unknown');
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
  if (channelNumber !== undefined && audioChannels?.[channelNumber]) {
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
    isPaused: channel.isPaused ?? false,
    items,
    totalItems: channel.queue.length,
    volume: channel.volume ?? 1.0
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
