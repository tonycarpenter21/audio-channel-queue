/**
 * @fileoverview Pause and resume management functions for the audio-channel-queue package
 */
/**
 * Pauses the currently playing audio in a specific channel
 * @param channelNumber - The channel number to pause (defaults to 0)
 * @returns Promise that resolves when the audio is paused
 * @example
 * ```typescript
 * await pauseChannel(0); // Pause audio in channel 0
 * await pauseChannel(); // Pause audio in default channel
 * ```
 */
export declare const pauseChannel: (channelNumber?: number) => Promise<void>;
/**
 * Resumes the currently paused audio in a specific channel
 * @param channelNumber - The channel number to resume (defaults to 0)
 * @returns Promise that resolves when the audio starts playing
 * @example
 * ```typescript
 * await resumeChannel(0); // Resume audio in channel 0
 * await resumeChannel(); // Resume audio in default channel
 * ```
 */
export declare const resumeChannel: (channelNumber?: number) => Promise<void>;
/**
 * Toggles pause/resume state for a specific channel
 * @param channelNumber - The channel number to toggle (defaults to 0)
 * @returns Promise that resolves when the toggle is complete
 * @example
 * ```typescript
 * await togglePauseChannel(0); // Toggle pause state for channel 0
 * ```
 */
export declare const togglePauseChannel: (channelNumber?: number) => Promise<void>;
/**
 * Pauses all currently playing audio across all channels
 * @returns Promise that resolves when all audio is paused
 * @example
 * ```typescript
 * await pauseAllChannels(); // Pause everything
 * ```
 */
export declare const pauseAllChannels: () => Promise<void>;
/**
 * Resumes all currently paused audio across all channels
 * @returns Promise that resolves when all audio is resumed
 * @example
 * ```typescript
 * await resumeAllChannels(); // Resume everything that was paused
 * ```
 */
export declare const resumeAllChannels: () => Promise<void>;
/**
 * Checks if a specific channel is currently paused
 * @param channelNumber - The channel number to check (defaults to 0)
 * @returns True if the channel is paused, false otherwise
 * @example
 * ```typescript
 * const isPaused = isChannelPaused(0);
 * console.log(`Channel 0 is ${isPaused ? 'paused' : 'playing'}`);
 * ```
 */
export declare const isChannelPaused: (channelNumber?: number) => boolean;
/**
 * Gets the pause state of all channels
 * @returns Array of boolean values indicating pause state for each channel
 * @example
 * ```typescript
 * const pauseStates = getAllChannelsPauseState();
 * pauseStates.forEach((isPaused, index) => {
 *   console.log(`Channel ${index}: ${isPaused ? 'paused' : 'playing'}`);
 * });
 * ```
 */
export declare const getAllChannelsPauseState: () => boolean[];
/**
 * Toggles pause/resume state for all channels globally
 * If any channels are currently playing, all channels will be paused
 * If all channels are paused, all channels will be resumed
 * @returns Promise that resolves when the toggle is complete
 * @example
 * ```typescript
 * await togglePauseAllChannels(); // Pause all if any are playing, resume all if all are paused
 * ```
 */
export declare const togglePauseAllChannels: () => Promise<void>;
