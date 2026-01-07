/**
 * @fileoverview Audio information and progress tracking functions for the audioq package
 */
import { AudioInfo, QueueSnapshot, ProgressCallback, QueueChangeCallback, AudioStartCallback, AudioCompleteCallback, AudioPauseCallback, AudioResumeCallback, ExtendedAudioQueueChannel } from './types';
/**
 * Gets the current list of whitelisted channel properties
 * This is automatically derived from the ExtendedAudioQueueChannel interface
 * @returns Array of whitelisted property names
 * @internal
 */
export declare const getWhitelistedChannelProperties: () => string[];
/**
 * Returns the list of non-whitelisted properties found on a specific channel
 * These are properties that will trigger warnings when modified directly
 * @param channelNumber - The channel number to inspect (defaults to 0)
 * @returns Array of property names that are not in the whitelist, or empty array if channel doesn't exist
 * @example
 * ```typescript
 * // Add some custom property to a channel
 * (audioChannels[0] as any).customProperty = 'test';
 *
 * const nonWhitelisted = getNonWhitelistedChannelProperties(0);
 * console.log(nonWhitelisted); // ['customProperty']
 * ```
 * @internal
 */
export declare const getNonWhitelistedChannelProperties: (channelNumber?: number) => string[];
/**
 * Global array to store audio channels with their queues and callback management
 * Each channel maintains its own audio queue and event callback sets
 *
 * Note: While you can inspect this array for debugging, direct modification is discouraged.
 * Use the provided API functions for safe channel management.
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
 * @param channelNumber - The channel number (defaults to 0)
 * @returns QueueSnapshot object or null if channel doesn't exist
 * @example
 * ```typescript
 * const snapshot = getQueueSnapshot();
 * if (snapshot) {
 *   console.log(`Queue has ${snapshot.totalItems} items`);
 *   console.log(`Currently playing: ${snapshot.items[0]?.fileName}`);
 * }
 * const channelSnapshot = getQueueSnapshot(2);
 * ```
 */
export declare const getQueueSnapshot: (channelNumber?: number) => QueueSnapshot | null;
/**
 * Subscribes to real-time progress updates for a specific channel
 * @param channelNumber - The channel number
 * @param callback - Function to call with audio info updates
 * @throws Error if the channel number exceeds the maximum allowed channels
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
 * @param channelNumber - The channel number (defaults to 0)
 * @example
 * ```typescript
 * offAudioProgress();
 * offAudioProgress(1); // Stop receiving progress updates for channel 1
 * ```
 */
export declare function offAudioProgress(channelNumber?: number): void;
/**
 * Subscribes to queue change events for a specific channel
 * @param channelNumber - The channel number to monitor
 * @param callback - Function to call when queue changes
 * @throws Error if the channel number exceeds the maximum allowed channels
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
 * @param channelNumber - The channel number (defaults to 0)
 * @example
 * ```typescript
 * offQueueChange(); // Stop receiving queue change notifications for default channel (0)
 * offQueueChange(1); // Stop receiving queue change notifications for channel 1
 * ```
 */
export declare const offQueueChange: (channelNumber?: number) => void;
/**
 * Subscribes to audio start events for a specific channel
 * @param channelNumber - The channel number to monitor
 * @param callback - Function to call when audio starts playing
 * @throws Error if the channel number exceeds the maximum allowed channels
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
 * @throws Error if the channel number exceeds the maximum allowed channels
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
/**
 * Subscribes to audio pause events for a specific channel
 * @param channelNumber - The channel number to monitor
 * @param callback - Function to call when audio is paused
 * @throws Error if the channel number exceeds the maximum allowed channels
 * @example
 * ```typescript
 * onAudioPause(0, (channelNumber, info) => {
 *   showPauseIndicator();
 *   logPauseEvent(info.fileName, info.currentTime);
 * });
 * ```
 */
export declare const onAudioPause: (channelNumber: number, callback: AudioPauseCallback) => void;
/**
 * Subscribes to audio resume events for a specific channel
 * @param channelNumber - The channel number to monitor
 * @param callback - Function to call when audio is resumed
 * @throws Error if the channel number exceeds the maximum allowed channels
 * @example
 * ```typescript
 * onAudioResume(0, (channelNumber, info) => {
 *   hidePauseIndicator();
 *   logResumeEvent(info.fileName, info.currentTime);
 * });
 * ```
 */
export declare const onAudioResume: (channelNumber: number, callback: AudioResumeCallback) => void;
/**
 * Removes pause event listeners for a specific channel
 * @param channelNumber - The channel number (defaults to 0)
 * @example
 * ```typescript
 * offAudioPause(); // Stop receiving pause notifications for default channel (0)
 * offAudioPause(1); // Stop receiving pause notifications for channel 1
 * ```
 */
export declare const offAudioPause: (channelNumber?: number) => void;
/**
 * Removes resume event listeners for a specific channel
 * @param channelNumber - The channel number (defaults to 0)
 * @example
 * ```typescript
 * offAudioResume(); // Stop receiving resume notifications for default channel (0)
 * offAudioResume(1); // Stop receiving resume notifications for channel 1
 * ```
 */
export declare const offAudioResume: (channelNumber?: number) => void;
/**
 * Removes audio start event listeners for a specific channel
 * @param channelNumber - The channel number (defaults to 0)
 * @example
 * ```typescript
 * offAudioStart(); // Stop receiving start notifications for default channel (0)
 * offAudioStart(1); // Stop receiving start notifications for channel 1
 * ```
 */
export declare const offAudioStart: (channelNumber?: number) => void;
/**
 * Removes audio complete event listeners for a specific channel
 * @param channelNumber - The channel number (defaults to 0)
 * @example
 * ```typescript
 * offAudioComplete(); // Stop receiving completion notifications for default channel (0)
 * offAudioComplete(1); // Stop receiving completion notifications for channel 1
 * ```
 */
export declare const offAudioComplete: (channelNumber?: number) => void;
