/**
 * @fileoverview Core queue management functions for the audioq package
 */
import { AudioQueueOptions, QueueConfig } from './types';
/**
 * Sets the global queue configuration
 * @param config - Queue configuration options
 * @example
 * ```typescript
 * setQueueConfig({
 *   defaultMaxQueueSize: 50,
 *   dropOldestWhenFull: true,
 *   showQueueWarnings: true
 * });
 * ```
 */
export declare const setQueueConfig: (config: Partial<QueueConfig>) => void;
/**
 * Gets the current global queue configuration
 * @returns Current queue configuration
 * @example
 * ```typescript
 * const config = getQueueConfig();
 * console.log(`Default max queue size: ${config.defaultMaxQueueSize}`);
 * ```
 */
export declare const getQueueConfig: () => QueueConfig;
/**
 * Sets the maximum queue size for a specific channel
 * @param channelNumber - The channel number to configure
 * @param maxSize - Maximum queue size (undefined for unlimited)
 * @throws Error if the channel number exceeds the maximum allowed channels
 * @example
 * ```typescript
 * setChannelQueueLimit(0, 25); // Limit channel 0 to 25 items
 * setChannelQueueLimit(1, undefined); // Remove limit for channel 1
 * ```
 */
export declare const setChannelQueueLimit: (channelNumber: number, maxSize?: number) => void;
/**
 * Queues an audio file to a specific channel and starts playing if it's the first in queue
 * @param audioUrl - The URL of the audio file to queue
 * @param channelNumber - The channel number to queue the audio to (defaults to 0)
 * @param options - Optional configuration for the audio file
 * @returns Promise that resolves when the audio is queued and starts playing (if first in queue)
 * @throws Error if the audio URL is invalid or potentially malicious
 * @throws Error if the channel number exceeds the maximum allowed channels
 * @throws Error if the queue size limit would be exceeded
 * @example
 * ```typescript
 * await queueAudio('https://example.com/song.mp3', 0);
 * await queueAudio('./sounds/notification.wav'); // Uses default channel 0
 * await queueAudio('./music/loop.mp3', 1, { loop: true }); // Loop the audio
 * await queueAudio('./urgent.wav', 0, { addToFront: true }); // Add to front of queue
 * await queueAudio('./limited.mp3', 0, { maxQueueSize: 10 }); // Limit this queue to 10 items
 * ```
 */
export declare const queueAudio: (audioUrl: string, channelNumber?: number, options?: AudioQueueOptions) => Promise<void>;
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
export declare const queueAudioPriority: (audioUrl: string, channelNumber?: number, options?: AudioQueueOptions) => Promise<void>;
/**
 * Plays the audio queue for a specific channel
 * @param channelNumber - The channel number to play
 * @returns Promise that resolves when the audio starts playing (setup complete)
 * @example
 * ```typescript
 * await playAudioQueue(0); // Start playing queue for channel 0
 * ```
 */
export declare const playAudioQueue: (channelNumber: number) => Promise<void>;
/**
 * Stops the currently playing audio in a specific channel and plays the next audio in queue
 * @param channelNumber - The channel number (defaults to 0)
 * @example
 * ```typescript
 * await stopCurrentAudioInChannel(); // Stop current audio in default channel (0)
 * await stopCurrentAudioInChannel(1); // Stop current audio in channel 1
 * ```
 */
export declare const stopCurrentAudioInChannel: (channelNumber?: number) => Promise<void>;
/**
 * Stops all audio in a specific channel and clears the entire queue
 * @param channelNumber - The channel number (defaults to 0)
 * @example
 * ```typescript
 * await stopAllAudioInChannel(); // Clear all audio in default channel (0)
 * await stopAllAudioInChannel(1); // Clear all audio in channel 1
 * ```
 */
export declare const stopAllAudioInChannel: (channelNumber?: number) => Promise<void>;
/**
 * Stops all audio across all channels and clears all queues
 * @example
 * ```typescript
 * await stopAllAudio(); // Emergency stop - clears everything
 * ```
 */
export declare const stopAllAudio: () => Promise<void>;
/**
 * Completely destroys a channel and cleans up all associated resources
 * This stops all audio, cancels transitions, clears callbacks, and removes the channel
 * @param channelNumber - The channel number to destroy (defaults to 0)
 * @example
 * ```typescript
 * await destroyChannel(1); // Completely removes channel 1 and cleans up resources
 * ```
 */
export declare const destroyChannel: (channelNumber?: number) => Promise<void>;
/**
 * Destroys all channels and cleans up all resources
 * This is useful for complete cleanup when the audio system is no longer needed
 * @example
 * ```typescript
 * await destroyAllChannels(); // Complete cleanup - removes all channels
 * ```
 */
export declare const destroyAllChannels: () => Promise<void>;
