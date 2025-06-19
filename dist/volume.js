"use strict";
/**
 * @fileoverview Volume management functions for the audio-channel-queue package
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.restoreVolumeLevels = exports.applyVolumeDucking = exports.clearVolumeDucking = exports.setVolumeDucking = exports.setAllChannelsVolume = exports.getAllChannelsVolume = exports.getChannelVolume = exports.setChannelVolume = exports.transitionVolume = void 0;
const info_1 = require("./info");
// Store active volume transitions to handle interruptions
const activeTransitions = new Map();
/**
 * Easing functions for smooth volume transitions
 */
const easingFunctions = {
    linear: (t) => t,
    'ease-in': (t) => t * t,
    'ease-out': (t) => t * (2 - t),
    'ease-in-out': (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
};
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
const transitionVolume = (channelNumber_1, targetVolume_1, ...args_1) => __awaiter(void 0, [channelNumber_1, targetVolume_1, ...args_1], void 0, function* (channelNumber, targetVolume, duration = 250, easing = 'ease-out') {
    const channel = info_1.audioChannels[channelNumber];
    if (!channel || channel.queue.length === 0)
        return;
    const currentAudio = channel.queue[0];
    const startVolume = currentAudio.volume;
    const volumeDelta = targetVolume - startVolume;
    // Cancel any existing transition for this channel
    if (activeTransitions.has(channelNumber)) {
        clearTimeout(activeTransitions.get(channelNumber));
        activeTransitions.delete(channelNumber);
    }
    // If no change needed, resolve immediately
    if (Math.abs(volumeDelta) < 0.001) {
        channel.volume = targetVolume;
        return Promise.resolve();
    }
    // Handle zero duration - instant change
    if (duration === 0) {
        channel.volume = targetVolume;
        if (channel.queue.length > 0) {
            channel.queue[0].volume = targetVolume;
        }
        return Promise.resolve();
    }
    const startTime = performance.now();
    const easingFn = easingFunctions[easing];
    return new Promise((resolve) => {
        const updateVolume = () => {
            const elapsed = performance.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easedProgress = easingFn(progress);
            const currentVolume = startVolume + (volumeDelta * easedProgress);
            const clampedVolume = Math.max(0, Math.min(1, currentVolume));
            // Apply volume to both channel config and current audio
            channel.volume = clampedVolume;
            if (channel.queue.length > 0) {
                channel.queue[0].volume = clampedVolume;
            }
            if (progress >= 1) {
                // Transition complete
                activeTransitions.delete(channelNumber);
                resolve();
            }
            else {
                // Use requestAnimationFrame in browser, setTimeout in tests
                if (typeof requestAnimationFrame !== 'undefined') {
                    const rafId = requestAnimationFrame(updateVolume);
                    activeTransitions.set(channelNumber, rafId);
                }
                else {
                    // In test environment, use shorter intervals
                    const timeoutId = setTimeout(updateVolume, 1);
                    activeTransitions.set(channelNumber, timeoutId);
                }
            }
        };
        updateVolume();
    });
});
exports.transitionVolume = transitionVolume;
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
const setChannelVolume = (channelNumber, volume, transitionDuration, easing) => __awaiter(void 0, void 0, void 0, function* () {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    if (!info_1.audioChannels[channelNumber]) {
        info_1.audioChannels[channelNumber] = {
            audioCompleteCallbacks: new Set(),
            audioErrorCallbacks: new Set(),
            audioPauseCallbacks: new Set(),
            audioResumeCallbacks: new Set(),
            audioStartCallbacks: new Set(),
            isPaused: false,
            progressCallbacks: new Map(),
            queue: [],
            queueChangeCallbacks: new Set(),
            volume: clampedVolume
        };
        return;
    }
    if (transitionDuration && transitionDuration > 0) {
        // Smooth transition
        yield (0, exports.transitionVolume)(channelNumber, clampedVolume, transitionDuration, easing);
    }
    else {
        // Instant change (backward compatibility)
        info_1.audioChannels[channelNumber].volume = clampedVolume;
        const channel = info_1.audioChannels[channelNumber];
        if (channel.queue.length > 0) {
            const currentAudio = channel.queue[0];
            currentAudio.volume = clampedVolume;
        }
    }
});
exports.setChannelVolume = setChannelVolume;
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
const getChannelVolume = (channelNumber = 0) => {
    const channel = info_1.audioChannels[channelNumber];
    return (channel === null || channel === void 0 ? void 0 : channel.volume) || 1.0;
};
exports.getChannelVolume = getChannelVolume;
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
const getAllChannelsVolume = () => {
    return info_1.audioChannels.map((channel) => (channel === null || channel === void 0 ? void 0 : channel.volume) || 1.0);
};
exports.getAllChannelsVolume = getAllChannelsVolume;
/**
 * Sets volume for all channels to the same level
 * @param volume - Volume level (0-1) to apply to all channels
 * @example
 * ```typescript
 * await setAllChannelsVolume(0.6); // Set all channels to 60% volume
 * ```
 */
const setAllChannelsVolume = (volume) => __awaiter(void 0, void 0, void 0, function* () {
    const promises = [];
    info_1.audioChannels.forEach((_channel, index) => {
        promises.push((0, exports.setChannelVolume)(index, volume));
    });
    yield Promise.all(promises);
});
exports.setAllChannelsVolume = setAllChannelsVolume;
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
const setVolumeDucking = (config) => {
    // First, ensure we have enough channels for the priority channel
    while (info_1.audioChannels.length <= config.priorityChannel) {
        info_1.audioChannels.push({
            audioCompleteCallbacks: new Set(),
            audioErrorCallbacks: new Set(),
            audioPauseCallbacks: new Set(),
            audioResumeCallbacks: new Set(),
            audioStartCallbacks: new Set(),
            isPaused: false,
            progressCallbacks: new Map(),
            queue: [],
            queueChangeCallbacks: new Set(),
            volume: 1.0
        });
    }
    // Apply the config to all existing channels
    info_1.audioChannels.forEach((channel, index) => {
        if (!info_1.audioChannels[index]) {
            info_1.audioChannels[index] = {
                audioCompleteCallbacks: new Set(),
                audioErrorCallbacks: new Set(),
                audioPauseCallbacks: new Set(),
                audioResumeCallbacks: new Set(),
                audioStartCallbacks: new Set(),
                isPaused: false,
                progressCallbacks: new Map(),
                queue: [],
                queueChangeCallbacks: new Set(),
                volume: 1.0
            };
        }
        info_1.audioChannels[index].volumeConfig = config;
    });
};
exports.setVolumeDucking = setVolumeDucking;
/**
 * Removes volume ducking configuration from all channels
 * @example
 * ```typescript
 * clearVolumeDucking(); // Remove all volume ducking effects
 * ```
 */
const clearVolumeDucking = () => {
    info_1.audioChannels.forEach((channel) => {
        if (channel) {
            delete channel.volumeConfig;
        }
    });
};
exports.clearVolumeDucking = clearVolumeDucking;
/**
 * Applies volume ducking effects based on current playback state with smooth transitions
 * @param activeChannelNumber - The channel that just started playing
 * @internal
 */
const applyVolumeDucking = (activeChannelNumber) => __awaiter(void 0, void 0, void 0, function* () {
    const transitionPromises = [];
    info_1.audioChannels.forEach((channel, channelNumber) => {
        if (channel === null || channel === void 0 ? void 0 : channel.volumeConfig) {
            const config = channel.volumeConfig;
            if (activeChannelNumber === config.priorityChannel) {
                const duration = config.duckTransitionDuration || 250;
                const easing = config.transitionEasing || 'ease-out';
                // Priority channel is active, duck other channels
                if (channelNumber === config.priorityChannel) {
                    transitionPromises.push((0, exports.transitionVolume)(channelNumber, config.priorityVolume, duration, easing));
                }
                else {
                    transitionPromises.push((0, exports.transitionVolume)(channelNumber, config.duckingVolume, duration, easing));
                }
            }
        }
    });
    // Wait for all transitions to complete
    yield Promise.all(transitionPromises);
});
exports.applyVolumeDucking = applyVolumeDucking;
/**
 * Restores normal volume levels when priority channel stops with smooth transitions
 * @param stoppedChannelNumber - The channel that just stopped playing
 * @internal
 */
const restoreVolumeLevels = (stoppedChannelNumber) => __awaiter(void 0, void 0, void 0, function* () {
    const transitionPromises = [];
    info_1.audioChannels.forEach((channel, channelNumber) => {
        if (channel === null || channel === void 0 ? void 0 : channel.volumeConfig) {
            const config = channel.volumeConfig;
            if (stoppedChannelNumber === config.priorityChannel) {
                const duration = config.restoreTransitionDuration || 500;
                const easing = config.transitionEasing || 'ease-out';
                // Priority channel stopped, restore normal volumes
                transitionPromises.push((0, exports.transitionVolume)(channelNumber, channel.volume || 1.0, duration, easing));
            }
        }
    });
    // Wait for all transitions to complete
    yield Promise.all(transitionPromises);
});
exports.restoreVolumeLevels = restoreVolumeLevels;
