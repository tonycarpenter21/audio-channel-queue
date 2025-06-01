/**
 * @fileoverview Core queue management functions for the audio-channel-queue package
 */
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
export declare const queueAudio: (audioUrl: string, channelNumber?: number) => Promise<void>;
/**
 * Plays the audio queue for a specific channel
 * @param channelNumber - The channel number to play
 * @returns Promise that resolves when the current audio finishes playing
 * @example
 * ```typescript
 * await playAudioQueue(0); // Play queue for channel 0
 * ```
 */
export declare const playAudioQueue: (channelNumber: number) => Promise<void>;
/**
 * Stops the currently playing audio in a specific channel and plays the next audio in queue
 * @param channelNumber - The channel number (defaults to 0)
 * @example
 * ```typescript
 * stopCurrentAudioInChannel(0); // Stop current audio in channel 0
 * stopCurrentAudioInChannel(); // Stop current audio in default channel
 * ```
 */
export declare const stopCurrentAudioInChannel: (channelNumber?: number) => void;
/**
 * Stops all audio in a specific channel and clears the entire queue
 * @param channelNumber - The channel number (defaults to 0)
 * @example
 * ```typescript
 * stopAllAudioInChannel(0); // Clear all audio in channel 0
 * stopAllAudioInChannel(); // Clear all audio in default channel
 * ```
 */
export declare const stopAllAudioInChannel: (channelNumber?: number) => void;
/**
 * Stops all audio across all channels and clears all queues
 * @example
 * ```typescript
 * stopAllAudio(); // Emergency stop - clears everything
 * ```
 */
export declare const stopAllAudio: () => void;
