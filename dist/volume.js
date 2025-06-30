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
exports.cancelAllVolumeTransitions = exports.cancelVolumeTransition = exports.restoreVolumeLevels = exports.fadeVolume = exports.applyVolumeDucking = exports.clearVolumeDucking = exports.setVolumeDucking = exports.setAllChannelsVolume = exports.getAllChannelsVolume = exports.getChannelVolume = exports.setChannelVolume = exports.transitionVolume = exports.getFadeConfig = void 0;
const types_1 = require("./types");
const info_1 = require("./info");
// Store active volume transitions to handle interruptions
const activeTransitions = new Map();
// Track which timer type was used for each channel
const timerTypes = new Map();
/**
 * Global volume ducking configuration
 * Stores the volume ducking settings that apply to all channels
 */
let globalVolumeConfig = null;
/**
 * Predefined fade configurations for different transition types
 */
const fadeConfigs = {
    [types_1.FadeType.Dramatic]: {
        duration: 800,
        pauseCurve: types_1.EasingType.EaseIn,
        resumeCurve: types_1.EasingType.EaseOut
    },
    [types_1.FadeType.Gentle]: {
        duration: 800,
        pauseCurve: types_1.EasingType.EaseOut,
        resumeCurve: types_1.EasingType.EaseIn
    },
    [types_1.FadeType.Linear]: {
        duration: 800,
        pauseCurve: types_1.EasingType.Linear,
        resumeCurve: types_1.EasingType.Linear
    }
};
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
const getFadeConfig = (fadeType) => {
    return Object.assign({}, fadeConfigs[fadeType]);
};
exports.getFadeConfig = getFadeConfig;
/**
 * Easing functions for smooth volume transitions
 */
const easingFunctions = {
    [types_1.EasingType.Linear]: (t) => t,
    [types_1.EasingType.EaseIn]: (t) => t * t,
    [types_1.EasingType.EaseOut]: (t) => t * (2 - t),
    [types_1.EasingType.EaseInOut]: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t)
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
const transitionVolume = (channelNumber_1, targetVolume_1, ...args_1) => __awaiter(void 0, [channelNumber_1, targetVolume_1, ...args_1], void 0, function* (channelNumber, targetVolume, duration = 250, easing = types_1.EasingType.EaseOut) {
    const channel = info_1.audioChannels[channelNumber];
    if (!channel || channel.queue.length === 0)
        return;
    const currentAudio = channel.queue[0];
    const startVolume = currentAudio.volume;
    const volumeDelta = targetVolume - startVolume;
    // Cancel any existing transition for this channel
    if (activeTransitions.has(channelNumber)) {
        const transitionId = activeTransitions.get(channelNumber);
        const timerType = timerTypes.get(channelNumber);
        if (transitionId) {
            // Cancel based on the timer type that was actually used
            if (timerType === types_1.TimerType.RequestAnimationFrame &&
                typeof cancelAnimationFrame !== 'undefined') {
                cancelAnimationFrame(transitionId);
            }
            else if (timerType === types_1.TimerType.Timeout) {
                clearTimeout(transitionId);
            }
        }
        activeTransitions.delete(channelNumber);
        timerTypes.delete(channelNumber);
    }
    // If no change needed, resolve immediately
    if (Math.abs(volumeDelta) < 0.001) {
        channel.volume = targetVolume;
        return Promise.resolve();
    }
    // Handle zero or negative duration - instant change
    if (duration <= 0) {
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
            const currentVolume = startVolume + volumeDelta * easedProgress;
            const clampedVolume = Math.max(0, Math.min(1, currentVolume));
            // Apply volume to both channel config and current audio
            channel.volume = clampedVolume;
            if (channel.queue.length > 0) {
                channel.queue[0].volume = clampedVolume;
            }
            if (progress >= 1) {
                // Transition complete
                activeTransitions.delete(channelNumber);
                timerTypes.delete(channelNumber);
                resolve();
            }
            else {
                // Use requestAnimationFrame in browser, setTimeout in tests
                if (typeof requestAnimationFrame !== 'undefined') {
                    const rafId = requestAnimationFrame(updateVolume);
                    activeTransitions.set(channelNumber, rafId);
                    timerTypes.set(channelNumber, types_1.TimerType.RequestAnimationFrame);
                }
                else {
                    // In test environment, use shorter intervals
                    const timeoutId = setTimeout(updateVolume, 1);
                    activeTransitions.set(channelNumber, timeoutId);
                    timerTypes.set(channelNumber, types_1.TimerType.Timeout);
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
 * @throws Error if the channel number exceeds the maximum allowed channels
 * @example
 * ```typescript
 * setChannelVolume(0, 0.5); // Set channel 0 to 50%
 * setChannelVolume(0, 0.5, 300, 'ease-out'); // Smooth transition over 300ms
 * ```
 */
const setChannelVolume = (channelNumber, volume, transitionDuration, easing) => __awaiter(void 0, void 0, void 0, function* () {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    // Check channel number limits
    if (channelNumber < 0) {
        throw new Error('Channel number must be non-negative');
    }
    if (channelNumber >= types_1.MAX_CHANNELS) {
        throw new Error(`Channel number ${channelNumber} exceeds maximum allowed channels (${types_1.MAX_CHANNELS})`);
    }
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
    var _a;
    const channel = info_1.audioChannels[channelNumber];
    return (_a = channel === null || channel === void 0 ? void 0 : channel.volume) !== null && _a !== void 0 ? _a : 1.0;
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
    return info_1.audioChannels.map((channel) => { var _a; return (_a = channel === null || channel === void 0 ? void 0 : channel.volume) !== null && _a !== void 0 ? _a : 1.0; });
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
const setVolumeDucking = (config) => {
    const { priorityChannel } = config;
    // Check priority channel limits
    if (priorityChannel < 0) {
        throw new Error('Priority channel number must be non-negative');
    }
    if (priorityChannel >= types_1.MAX_CHANNELS) {
        throw new Error(`Priority channel ${priorityChannel} exceeds maximum allowed channels (${types_1.MAX_CHANNELS})`);
    }
    // Store the configuration globally
    globalVolumeConfig = config;
    // Ensure we have enough channels for the priority channel
    while (info_1.audioChannels.length <= priorityChannel) {
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
    globalVolumeConfig = null;
};
exports.clearVolumeDucking = clearVolumeDucking;
/**
 * Applies volume ducking effects based on current playback state with smooth transitions
 * @param activeChannelNumber - The channel that just started playing
 * @internal
 */
const applyVolumeDucking = (activeChannelNumber) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    // Check if ducking is configured and this channel is the priority channel
    if (!globalVolumeConfig || globalVolumeConfig.priorityChannel !== activeChannelNumber) {
        return; // No ducking configured for this channel
    }
    const config = globalVolumeConfig;
    const transitionPromises = [];
    const duration = (_a = config.duckTransitionDuration) !== null && _a !== void 0 ? _a : 250;
    const easing = (_b = config.transitionEasing) !== null && _b !== void 0 ? _b : types_1.EasingType.EaseOut;
    // Duck all channels except the priority channel
    info_1.audioChannels.forEach((channel, channelNumber) => {
        if (!channel || channel.queue.length === 0) {
            return; // Skip channels without audio
        }
        if (channelNumber === activeChannelNumber) {
            // This is the priority channel - set to priority volume
            // Only change audio volume, preserve channel.volume as desired volume
            const currentAudio = channel.queue[0];
            transitionPromises.push(transitionAudioVolume(currentAudio, config.priorityVolume, duration, easing));
        }
        else {
            // This is a background channel - duck it
            // Only change audio volume, preserve channel.volume as desired volume
            const currentAudio = channel.queue[0];
            transitionPromises.push(transitionAudioVolume(currentAudio, config.duckingVolume, duration, easing));
        }
    });
    // Wait for all transitions to complete
    yield Promise.all(transitionPromises);
});
exports.applyVolumeDucking = applyVolumeDucking;
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
const fadeVolume = (channelNumber_1, targetVolume_1, ...args_1) => __awaiter(void 0, [channelNumber_1, targetVolume_1, ...args_1], void 0, function* (channelNumber, targetVolume, duration = 250, easing = types_1.EasingType.EaseOut) {
    return (0, exports.transitionVolume)(channelNumber, targetVolume, duration, easing);
});
exports.fadeVolume = fadeVolume;
/**
 * Restores normal volume levels when priority channel queue becomes empty
 * @param stoppedChannelNumber - The channel that just stopped playing
 * @internal
 */
const restoreVolumeLevels = (stoppedChannelNumber) => __awaiter(void 0, void 0, void 0, function* () {
    // Check if ducking is configured and this channel is the priority channel
    if (!globalVolumeConfig || globalVolumeConfig.priorityChannel !== stoppedChannelNumber) {
        return; // No ducking configured for this channel
    }
    // Check if the priority channel queue is now empty
    const priorityChannel = info_1.audioChannels[stoppedChannelNumber];
    if (priorityChannel && priorityChannel.queue.length > 0) {
        return; // Priority channel still has audio queued, don't restore yet
    }
    const config = globalVolumeConfig;
    const transitionPromises = [];
    // Restore volume for all channels EXCEPT the priority channel
    info_1.audioChannels.forEach((channel, channelNumber) => {
        var _a, _b, _c;
        // Skip the priority channel itself and channels without audio
        if (channelNumber === stoppedChannelNumber || !channel || channel.queue.length === 0) {
            return;
        }
        // Restore this channel to its desired volume
        const duration = (_a = config.restoreTransitionDuration) !== null && _a !== void 0 ? _a : 500;
        const easing = (_b = config.transitionEasing) !== null && _b !== void 0 ? _b : types_1.EasingType.EaseOut;
        const targetVolume = (_c = channel.volume) !== null && _c !== void 0 ? _c : 1.0;
        // Only transition the audio element volume, keep channel.volume as the desired volume
        const currentAudio = channel.queue[0];
        transitionPromises.push(transitionAudioVolume(currentAudio, targetVolume, duration, easing));
    });
    // Wait for all transitions to complete
    yield Promise.all(transitionPromises);
});
exports.restoreVolumeLevels = restoreVolumeLevels;
/**
 * Transitions only the audio element volume without affecting channel.volume
 * This is used for ducking/restoration where channel.volume represents desired volume
 * @param audio - The audio element to transition
 * @param targetVolume - Target volume level (0-1)
 * @param duration - Transition duration in milliseconds
 * @param easing - Easing function type
 * @returns Promise that resolves when transition completes
 * @internal
 */
const transitionAudioVolume = (audio_1, targetVolume_1, ...args_1) => __awaiter(void 0, [audio_1, targetVolume_1, ...args_1], void 0, function* (audio, targetVolume, duration = 250, easing = types_1.EasingType.EaseOut) {
    const startVolume = audio.volume;
    const volumeDelta = targetVolume - startVolume;
    // If no change needed, resolve immediately
    if (Math.abs(volumeDelta) < 0.001) {
        return Promise.resolve();
    }
    // Handle zero or negative duration - instant change
    if (duration <= 0) {
        audio.volume = Math.max(0, Math.min(1, targetVolume));
        return Promise.resolve();
    }
    const startTime = performance.now();
    const easingFn = easingFunctions[easing];
    return new Promise((resolve) => {
        const updateVolume = () => {
            const elapsed = performance.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easedProgress = easingFn(progress);
            const currentVolume = startVolume + volumeDelta * easedProgress;
            const clampedVolume = Math.max(0, Math.min(1, currentVolume));
            // Only apply volume to audio element, not channel.volume
            audio.volume = clampedVolume;
            if (progress >= 1) {
                resolve();
            }
            else {
                // Use requestAnimationFrame in browser, setTimeout in tests
                if (typeof requestAnimationFrame !== 'undefined') {
                    requestAnimationFrame(updateVolume);
                }
                else {
                    setTimeout(updateVolume, 1);
                }
            }
        };
        updateVolume();
    });
});
/**
 * Cancels any active volume transition for a specific channel
 * @param channelNumber - The channel number to cancel transitions for
 * @internal
 */
const cancelVolumeTransition = (channelNumber) => {
    if (activeTransitions.has(channelNumber)) {
        const transitionId = activeTransitions.get(channelNumber);
        const timerType = timerTypes.get(channelNumber);
        if (transitionId) {
            // Cancel based on the timer type that was actually used
            if (timerType === types_1.TimerType.RequestAnimationFrame &&
                typeof cancelAnimationFrame !== 'undefined') {
                cancelAnimationFrame(transitionId);
            }
            else if (timerType === types_1.TimerType.Timeout) {
                clearTimeout(transitionId);
            }
        }
        activeTransitions.delete(channelNumber);
        timerTypes.delete(channelNumber);
    }
};
exports.cancelVolumeTransition = cancelVolumeTransition;
/**
 * Cancels all active volume transitions across all channels
 * @internal
 */
const cancelAllVolumeTransitions = () => {
    // Get all active channel numbers to avoid modifying Map while iterating
    const activeChannels = Array.from(activeTransitions.keys());
    activeChannels.forEach((channelNumber) => {
        (0, exports.cancelVolumeTransition)(channelNumber);
    });
};
exports.cancelAllVolumeTransitions = cancelAllVolumeTransitions;
