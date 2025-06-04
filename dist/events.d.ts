/**
 * @fileoverview Event handling and emission for the audio-channel-queue package
 */
import { AudioStartInfo, AudioCompleteInfo, ExtendedAudioQueueChannel, AudioInfo } from './types';
/**
 * Emits a queue change event to all registered listeners for a specific channel
 * @param channelNumber - The channel number that experienced a queue change
 * @param audioChannels - Array of audio channels
 * @example
 * ```typescript
 * emitQueueChange(0, audioChannels); // Notifies all queue change listeners
 * ```
 */
export declare const emitQueueChange: (channelNumber: number, audioChannels: ExtendedAudioQueueChannel[]) => void;
/**
 * Emits an audio start event to all registered listeners for a specific channel
 * @param channelNumber - The channel number where audio started
 * @param audioInfo - Information about the audio that started
 * @param audioChannels - Array of audio channels
 * @example
 * ```typescript
 * emitAudioStart(0, { src: 'song.mp3', fileName: 'song.mp3', duration: 180000, channelNumber: 0 }, audioChannels);
 * ```
 */
export declare const emitAudioStart: (channelNumber: number, audioInfo: AudioStartInfo, audioChannels: ExtendedAudioQueueChannel[]) => void;
/**
 * Emits an audio complete event to all registered listeners for a specific channel
 * @param channelNumber - The channel number where audio completed
 * @param audioInfo - Information about the audio that completed
 * @param audioChannels - Array of audio channels
 * @example
 * ```typescript
 * emitAudioComplete(0, { src: 'song.mp3', fileName: 'song.mp3', channelNumber: 0, remainingInQueue: 2 }, audioChannels);
 * ```
 */
export declare const emitAudioComplete: (channelNumber: number, audioInfo: AudioCompleteInfo, audioChannels: ExtendedAudioQueueChannel[]) => void;
/**
 * Emits an audio pause event to all registered listeners for a specific channel
 * @param channelNumber - The channel number where audio was paused
 * @param audioInfo - Information about the audio that was paused
 * @param audioChannels - Array of audio channels
 * @example
 * ```typescript
 * emitAudioPause(0, audioInfo, audioChannels);
 * ```
 */
export declare const emitAudioPause: (channelNumber: number, audioInfo: AudioInfo, audioChannels: ExtendedAudioQueueChannel[]) => void;
/**
 * Emits an audio resume event to all registered listeners for a specific channel
 * @param channelNumber - The channel number where audio was resumed
 * @param audioInfo - Information about the audio that was resumed
 * @param audioChannels - Array of audio channels
 * @example
 * ```typescript
 * emitAudioResume(0, audioInfo, audioChannels);
 * ```
 */
export declare const emitAudioResume: (channelNumber: number, audioInfo: AudioInfo, audioChannels: ExtendedAudioQueueChannel[]) => void;
/**
 * Sets up comprehensive progress tracking for an audio element
 * @param audio - The HTML audio element to track
 * @param channelNumber - The channel number this audio belongs to
 * @param audioChannels - Array of audio channels
 * @example
 * ```typescript
 * const audioElement = new Audio('song.mp3');
 * setupProgressTracking(audioElement, 0, audioChannels);
 * ```
 */
export declare const setupProgressTracking: (audio: HTMLAudioElement, channelNumber: number, audioChannels: ExtendedAudioQueueChannel[]) => void;
/**
 * Cleans up progress tracking for an audio element to prevent memory leaks
 * @param audio - The HTML audio element to clean up
 * @param channelNumber - The channel number this audio belongs to
 * @param audioChannels - Array of audio channels
 * @example
 * ```typescript
 * cleanupProgressTracking(audioElement, 0, audioChannels);
 * ```
 */
export declare const cleanupProgressTracking: (audio: HTMLAudioElement, channelNumber: number, audioChannels: ExtendedAudioQueueChannel[]) => void;
