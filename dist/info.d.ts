/**
 * @fileoverview Audio information and progress tracking functions for the audio-channel-queue package
 */
import { AudioInfo, QueueSnapshot, ProgressCallback, QueueChangeCallback, AudioStartCallback, AudioCompleteCallback, ExtendedAudioQueueChannel } from './types';
/**
 * Global array of extended audio queue channels
 */
export declare const audioChannels: ExtendedAudioQueueChannel[];
/**
 * Gets current audio information for a specific channel
 * @param channelNumber - The channel number (defaults to 0)
 * @returns AudioInfo object or null if no audio is playing
 * @example
 * ```typescript
 * const info = getCurrentAudioInfo(0);
 * if (info) {
 *   console.log(`Currently playing: ${info.fileName}`);
 *   console.log(`Progress: ${(info.progress * 100).toFixed(1)}%`);
 * }
 * ```
 */
export declare const getCurrentAudioInfo: (channelNumber?: number) => AudioInfo | null;
/**
 * Gets audio information for all channels
 * @returns Array of AudioInfo objects (null for channels with no audio)
 * @example
 * ```typescript
 * const allInfo = getAllChannelsInfo();
 * allInfo.forEach((info, channel) => {
 *   if (info) {
 *     console.log(`Channel ${channel}: ${info.fileName}`);
 *   }
 * });
 * ```
 */
export declare const getAllChannelsInfo: () => (AudioInfo | null)[];
/**
 * Gets a complete snapshot of the queue state for a specific channel
 * @param channelNumber - The channel number
 * @returns QueueSnapshot object or null if channel doesn't exist
 * @example
 * ```typescript
 * const snapshot = getQueueSnapshot(0);
 * if (snapshot) {
 *   console.log(`Queue has ${snapshot.totalItems} items`);
 *   console.log(`Currently playing: ${snapshot.items[0]?.fileName}`);
 * }
 * ```
 */
export declare const getQueueSnapshot: (channelNumber: number) => QueueSnapshot | null;
/**
 * Subscribes to real-time progress updates for a specific channel
 * @param channelNumber - The channel number
 * @param callback - Function to call with audio info updates
 * @example
 * ```typescript
 * onAudioProgress(0, (info) => {
 *   updateProgressBar(info.progress);
 *   updateTimeDisplay(info.currentTime, info.duration);
 * });
 * ```
 */
export declare const onAudioProgress: (channelNumber: number, callback: ProgressCallback) => void;
/**
 * Removes progress listeners for a specific channel
 * @param channelNumber - The channel number
 * @example
 * ```typescript
 * offAudioProgress(0); // Stop receiving progress updates for channel 0
 * ```
 */
export declare const offAudioProgress: (channelNumber: number) => void;
/**
 * Subscribes to queue change events for a specific channel
 * @param channelNumber - The channel number to monitor
 * @param callback - Function to call when queue changes
 * @example
 * ```typescript
 * onQueueChange(0, (snapshot) => {
 *   updateQueueDisplay(snapshot.items);
 *   updateQueueCount(snapshot.totalItems);
 * });
 * ```
 */
export declare const onQueueChange: (channelNumber: number, callback: QueueChangeCallback) => void;
/**
 * Removes queue change listeners for a specific channel
 * @param channelNumber - The channel number
 * @example
 * ```typescript
 * offQueueChange(0); // Stop receiving queue change notifications for channel 0
 * ```
 */
export declare const offQueueChange: (channelNumber: number) => void;
/**
 * Subscribes to audio start events for a specific channel
 * @param channelNumber - The channel number to monitor
 * @param callback - Function to call when audio starts playing
 * @example
 * ```typescript
 * onAudioStart(0, (info) => {
 *   showNowPlaying(info.fileName);
 *   setTotalDuration(info.duration);
 * });
 * ```
 */
export declare const onAudioStart: (channelNumber: number, callback: AudioStartCallback) => void;
/**
 * Subscribes to audio complete events for a specific channel
 * @param channelNumber - The channel number to monitor
 * @param callback - Function to call when audio completes
 * @example
 * ```typescript
 * onAudioComplete(0, (info) => {
 *   logPlaybackComplete(info.fileName);
 *   if (info.remainingInQueue === 0) {
 *     showQueueComplete();
 *   }
 * });
 * ```
 */
export declare const onAudioComplete: (channelNumber: number, callback: AudioCompleteCallback) => void;
