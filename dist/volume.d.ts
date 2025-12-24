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
 * Automatically uses Web Audio API on iOS devices for enhanced volume control
 * @param channelNumber - The channel number to set volume for
 * @param volume - Volume level (0-1)
 * @param transitionDuration - Optional transition duration in milliseconds
 * @param easing - Optional easing function
 * @throws Error if the channel number exceeds the maximum allowed channels
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
 * Sets the global volume multiplier that affects all channels
 * This acts as a global volume control - individual channel volumes are multiplied by this value
 * @param volume - Global volume level (0-1, will be clamped to this range)
 * @example
 * ```typescript
 * // Set channel-specific volumes
 * await setChannelVolume(0, 0.8); // SFX at 80%
 * await setChannelVolume(1, 0.6); // Music at 60%
 *
 * // Apply global volume of 50% - all channels play at half their set volume
 * await setGlobalVolume(0.5); // SFX now plays at 40%, music at 30%
 * ```
 */
export declare const setGlobalVolume: (volume: number) => Promise<void>;
/**
 * Gets the current global volume multiplier
 * @returns Current global volume level (0-1), defaults to 1.0
 * @example
 * ```typescript
 * const globalVol = getGlobalVolume();
 * console.log(`Global volume is ${globalVol * 100}%`);
 * ```
 */
export declare const getGlobalVolume: () => number;
/**
 * Configures volume ducking for channels. When the priority channel plays audio,
 * all other channels will be automatically reduced to the ducking volume level
 * @param config - Volume ducking configuration
 * @throws Error if the priority channel number exceeds the maximum allowed channels
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
 * Restores normal volume levels when priority channel queue becomes empty
 * @param stoppedChannelNumber - The channel that just stopped playing
 * @internal
 */
export declare const restoreVolumeLevels: (stoppedChannelNumber: number) => Promise<void>;
/**
 * Cancels any active volume transition for a specific channel
 * @param channelNumber - The channel number to cancel transitions for
 * @internal
 */
export declare const cancelVolumeTransition: (channelNumber: number) => void;
/**
 * Cancels all active volume transitions across all channels
 * @internal
 */
export declare const cancelAllVolumeTransitions: () => void;
/**
 * Initializes Web Audio API nodes for a new audio element
 * @param audio - The audio element to initialize nodes for
 * @param channelNumber - The channel number this audio belongs to
 * @internal
 */
export declare const initializeWebAudioForAudio: (audio: HTMLAudioElement, channelNumber: number) => Promise<void>;
/**
 * Cleans up Web Audio API nodes for an audio element
 * @param audio - The audio element to clean up nodes for
 * @param channelNumber - The channel number this audio belongs to
 * @internal
 */
export declare const cleanupWebAudioForAudio: (audio: HTMLAudioElement, channelNumber: number) => void;
