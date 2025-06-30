/**
 * @fileoverview Utility functions for the audio-channel-queue package
 */
import { AudioInfo, QueueSnapshot, ExtendedAudioQueueChannel } from './types';
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
export declare const validateAudioUrl: (url: string) => string;
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
export declare const sanitizeForDisplay: (text: string) => string;
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
export declare const extractFileName: (url: string) => string;
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
export declare const getAudioInfoFromElement: (audio: HTMLAudioElement, channelNumber?: number, audioChannels?: ExtendedAudioQueueChannel[]) => AudioInfo | null;
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
export declare const createQueueSnapshot: (channelNumber: number, audioChannels: ExtendedAudioQueueChannel[]) => QueueSnapshot | null;
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
export declare const cleanWebpackFilename: (fileName: string) => string;
