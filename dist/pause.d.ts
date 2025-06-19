/**
 * @fileoverview Pause and resume management functions for the audio-channel-queue package
 */
import { FadeType } from './types';
/**
 * Pauses the currently playing audio in a specific channel with smooth volume fade
 * @param fadeType - Type of fade transition to apply
 * @param channelNumber - The channel number to pause (defaults to 0)
 * @returns Promise that resolves when the pause and fade are complete
 * @example
 * ```typescript
 * await pauseWithFade(FadeType.Gentle, 0); // Pause with gentle fade out over 800ms
 * await pauseWithFade(FadeType.Dramatic, 1); // Pause with dramatic fade out over 800ms
 * await pauseWithFade(FadeType.Linear, 2); // Linear pause with 800ms fade
 * ```
 */
export declare const pauseWithFade: (fadeType?: FadeType, channelNumber?: number) => Promise<void>;
/**
 * Resumes the currently paused audio in a specific channel with smooth volume fade
 * Uses the complementary fade curve automatically based on the pause fade type, or allows override
 * @param fadeType - Optional fade type to override the stored fade type from pause
 * @param channelNumber - The channel number to resume (defaults to 0)
 * @returns Promise that resolves when the resume and fade are complete
 * @example
 * ```typescript
 * await resumeWithFade(); // Resume with automatically paired fade curve from pause
 * await resumeWithFade(FadeType.Dramatic, 0); // Override with dramatic fade
 * await resumeWithFade(FadeType.Linear); // Override with linear fade on default channel
 * ```
 */
export declare const resumeWithFade: (fadeType?: FadeType, channelNumber?: number) => Promise<void>;
/**
 * Toggles pause/resume state for a specific channel with integrated fade
 * @param fadeType - Type of fade transition to apply when pausing
 * @param channelNumber - The channel number to toggle (defaults to 0)
 * @returns Promise that resolves when the toggle and fade are complete
 * @example
 * ```typescript
 * await togglePauseWithFade(FadeType.Gentle, 0); // Toggle with gentle fade
 * ```
 */
export declare const togglePauseWithFade: (fadeType?: FadeType, channelNumber?: number) => Promise<void>;
/**
 * Pauses all currently playing audio across all channels with smooth volume fade
 * @param fadeType - Type of fade transition to apply to all channels
 * @returns Promise that resolves when all channels are paused and faded
 * @example
 * ```typescript
 * await pauseAllWithFade('dramatic'); // Pause everything with dramatic fade
 * ```
 */
export declare const pauseAllWithFade: (fadeType?: FadeType) => Promise<void>;
/**
 * Resumes all currently paused audio across all channels with smooth volume fade
 * Uses automatically paired fade curves based on each channel's pause fade type
 * @returns Promise that resolves when all channels are resumed and faded
 * @example
 * ```typescript
 * await resumeAllWithFade(); // Resume everything with paired fade curves
 * ```
 */
export declare const resumeAllWithFade: () => Promise<void>;
/**
 * Toggles pause/resume state for all channels with integrated fade
 * If any channels are playing, all will be paused with fade
 * If all channels are paused, all will be resumed with fade
 * @param fadeType - Type of fade transition to apply when pausing
 * @returns Promise that resolves when all toggles and fades are complete
 * @example
 * ```typescript
 * await togglePauseAllWithFade('gentle'); // Global toggle with gentle fade
 * ```
 */
export declare const togglePauseAllWithFade: (fadeType?: FadeType) => Promise<void>;
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
