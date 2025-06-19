/**
 * @fileoverview Volume management functions for the audio-channel-queue package
 */
import { VolumeConfig, FadeType, FadeConfig, EasingType } from './types';
/**
 * Gets the fade configuration for a specific fade type
 * @param fadeType - The fade type to get configuration for
 * @returns Fade configuration object
 * @example
 * ```typescript
 * const config = getFadeConfig('gentle');
 * console.log(`Gentle fade duration: ${config.duration}ms`);
 * ```
 */
export declare const getFadeConfig: (fadeType: FadeType) => FadeConfig;
/**
 * Smoothly transitions volume for a specific channel over time
 * @param channelNumber - The channel number to transition
 * @param targetVolume - Target volume level (0-1)
 * @param duration - Transition duration in milliseconds
 * @param easing - Easing function type
 * @returns Promise that resolves when transition completes
 * @example
 * ```typescript
 * await transitionVolume(0, 0.2, 500, 'ease-out'); // Duck to 20% over 500ms
 * ```
 */
export declare const transitionVolume: (channelNumber: number, targetVolume: number, duration?: number, easing?: EasingType) => Promise<void>;
/**
 * Sets the volume for a specific channel with optional smooth transition
 * @param channelNumber - The channel number to set volume for
 * @param volume - Volume level (0-1)
 * @param transitionDuration - Optional transition duration in milliseconds
 * @param easing - Optional easing function
 * @example
 * ```typescript
 * setChannelVolume(0, 0.5); // Set channel 0 to 50%
 * setChannelVolume(0, 0.5, 300, 'ease-out'); // Smooth transition over 300ms
 * ```
 */
export declare const setChannelVolume: (channelNumber: number, volume: number, transitionDuration?: number, easing?: EasingType) => Promise<void>;
/**
 * Gets the current volume for a specific channel
 * @param channelNumber - The channel number to get volume for (defaults to 0)
 * @returns Current volume level (0-1) or 1.0 if channel doesn't exist
 * @example
 * ```typescript
 * const volume = getChannelVolume(0);
 * const defaultChannelVolume = getChannelVolume(); // Gets channel 0
 * console.log(`Channel 0 volume: ${volume * 100}%`);
 * ```
 */
export declare const getChannelVolume: (channelNumber?: number) => number;
/**
 * Gets the volume levels for all channels
 * @returns Array of volume levels (0-1) for each channel
 * @example
 * ```typescript
 * const volumes = getAllChannelsVolume();
 * volumes.forEach((volume, index) => {
 *   console.log(`Channel ${index}: ${volume * 100}%`);
 * });
 * ```
 */
export declare const getAllChannelsVolume: () => number[];
/**
 * Sets volume for all channels to the same level
 * @param volume - Volume level (0-1) to apply to all channels
 * @example
 * ```typescript
 * await setAllChannelsVolume(0.6); // Set all channels to 60% volume
 * ```
 */
export declare const setAllChannelsVolume: (volume: number) => Promise<void>;
/**
 * Configures volume ducking for channels. When the priority channel plays audio,
 * all other channels will be automatically reduced to the ducking volume level
 * @param config - Volume ducking configuration
 * @example
 * ```typescript
 * // When channel 1 plays, reduce all other channels to 20% volume
 * setVolumeDucking({
 *   priorityChannel: 1,
 *   priorityVolume: 1.0,
 *   duckingVolume: 0.2
 * });
 * ```
 */
export declare const setVolumeDucking: (config: VolumeConfig) => void;
/**
 * Removes volume ducking configuration from all channels
 * @example
 * ```typescript
 * clearVolumeDucking(); // Remove all volume ducking effects
 * ```
 */
export declare const clearVolumeDucking: () => void;
/**
 * Applies volume ducking effects based on current playback state with smooth transitions
 * @param activeChannelNumber - The channel that just started playing
 * @internal
 */
export declare const applyVolumeDucking: (activeChannelNumber: number) => Promise<void>;
/**
 * Fades the volume for a specific channel over time (alias for transitionVolume with improved naming)
 * @param channelNumber - The channel number to fade
 * @param targetVolume - Target volume level (0-1)
 * @param duration - Fade duration in milliseconds (defaults to 250)
 * @param easing - Easing function type (defaults to 'ease-out')
 * @returns Promise that resolves when fade completes
 * @example
 * ```typescript
 * await fadeVolume(0, 0, 800, 'ease-in'); // Fade out over 800ms
 * await fadeVolume(0, 1, 600, 'ease-out'); // Fade in over 600ms
 * ```
 */
export declare const fadeVolume: (channelNumber: number, targetVolume: number, duration?: number, easing?: EasingType) => Promise<void>;
/**
 * Restores normal volume levels when priority channel stops with smooth transitions
 * @param stoppedChannelNumber - The channel that just stopped playing
 * @internal
 */
export declare const restoreVolumeLevels: (stoppedChannelNumber: number) => Promise<void>;
