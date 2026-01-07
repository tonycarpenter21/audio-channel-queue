"use strict";
/**
 * @fileoverview Volume management functions for the audioq package
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
exports.cleanupWebAudioForAudio = exports.initializeWebAudioForAudio = exports.cancelAllVolumeTransitions = exports.cancelVolumeTransition = exports.restoreVolumeLevels = exports.applyVolumeDucking = exports.clearVolumeDucking = exports.setVolumeDucking = exports.getGlobalVolume = exports.setGlobalVolume = exports.setAllChannelsVolume = exports.getAllChannelsVolume = exports.getChannelVolume = exports.setChannelVolume = exports.transitionVolume = exports.getFadeConfig = void 0;
const types_1 = require("./types");
const info_1 = require("./info");
const web_audio_1 = require("./web-audio");
// Store active volume transitions to handle interruptions
const activeTransitions = new Map();
// Track which timer type was used for each channel
const timerTypes = new Map();
/**
 * Global volume multiplier that affects all channels
 * Acts as a global volume control (0-1)
 */
let globalVolume = 1.0;
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
    if (!channel || channel.queue.length === 0) {
        return;
    }
    const currentAudio = channel.queue[0];
    // When Web Audio is active, read the actual start volume from the gain node
    // This is critical for iOS where audio.volume is ignored when Web Audio is active
    let startVolume = currentAudio.volume;
    if (channel.webAudioNodes) {
        const nodes = channel.webAudioNodes.get(currentAudio);
        if (nodes) {
            startVolume = nodes.gainNode.gain.value;
        }
    }
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
        const updateVolume = () => __awaiter(void 0, void 0, void 0, function* () {
            const elapsed = performance.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easedProgress = easingFn(progress);
            const currentVolume = startVolume + volumeDelta * easedProgress;
            const clampedVolume = Math.max(0, Math.min(1, currentVolume));
            // Apply volume to both channel config and current audio
            channel.volume = clampedVolume;
            if (channel.queue.length > 0) {
                yield setVolumeForAudio(channel.queue[0], clampedVolume, channelNumber);
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
                    const rafId = requestAnimationFrame(() => updateVolume());
                    activeTransitions.set(channelNumber, rafId);
                    timerTypes.set(channelNumber, types_1.TimerType.RequestAnimationFrame);
                }
                else {
                    // In test environment, use shorter intervals
                    const timeoutId = setTimeout(() => updateVolume(), 1);
                    activeTransitions.set(channelNumber, timeoutId);
                    timerTypes.set(channelNumber, types_1.TimerType.Timeout);
                }
            }
        });
        updateVolume();
    });
});
exports.transitionVolume = transitionVolume;
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
    const channel = info_1.audioChannels[channelNumber];
    // Initialize Web Audio API if needed and supported
    if ((0, web_audio_1.shouldUseWebAudio)() && !channel.webAudioContext) {
        yield initializeWebAudioForChannel(channelNumber);
    }
    if (transitionDuration && transitionDuration > 0) {
        // Smooth transition
        yield (0, exports.transitionVolume)(channelNumber, clampedVolume, transitionDuration, easing);
    }
    else {
        // Instant change (backward compatibility)
        channel.volume = clampedVolume;
        if (channel.queue.length > 0) {
            const currentAudio = channel.queue[0];
            yield setVolumeForAudio(currentAudio, clampedVolume, channelNumber);
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
const setGlobalVolume = (volume) => __awaiter(void 0, void 0, void 0, function* () {
    // Clamp to valid range
    globalVolume = Math.max(0, Math.min(1, volume));
    // Update all currently playing audio to reflect the new global volume
    // Note: setVolumeForAudio internally multiplies channel.volume by globalVolume
    const updatePromises = [];
    info_1.audioChannels.forEach((channel, channelNumber) => {
        if (channel && channel.queue.length > 0) {
            const currentAudio = channel.queue[0];
            updatePromises.push(setVolumeForAudio(currentAudio, channel.volume, channelNumber));
        }
    });
    yield Promise.all(updatePromises);
});
exports.setGlobalVolume = setGlobalVolume;
/**
 * Gets the current global volume multiplier
 * @returns Current global volume level (0-1), defaults to 1.0
 * @example
 * ```typescript
 * const globalVol = getGlobalVolume();
 * console.log(`Global volume is ${globalVol * 100}%`);
 * ```
 */
const getGlobalVolume = () => {
    return globalVolume;
};
exports.getGlobalVolume = getGlobalVolume;
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
            transitionPromises.push(transitionAudioVolume(currentAudio, config.priorityVolume, duration, easing, channelNumber));
        }
        else {
            // This is a background channel - duck it
            // Only change audio volume, preserve channel.volume as desired volume
            const currentAudio = channel.queue[0];
            transitionPromises.push(transitionAudioVolume(currentAudio, config.duckingVolume, duration, easing, channelNumber));
        }
    });
    // Wait for all transitions to complete
    yield Promise.all(transitionPromises);
});
exports.applyVolumeDucking = applyVolumeDucking;
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
        const duration = (_a = config.restoreTransitionDuration) !== null && _a !== void 0 ? _a : 250;
        const easing = (_b = config.transitionEasing) !== null && _b !== void 0 ? _b : types_1.EasingType.EaseOut;
        const targetVolume = (_c = channel.volume) !== null && _c !== void 0 ? _c : 1.0;
        // Only transition the audio element volume, keep channel.volume as the desired volume
        const currentAudio = channel.queue[0];
        transitionPromises.push(transitionAudioVolume(currentAudio, targetVolume, duration, easing, channelNumber));
    });
    // Wait for all transitions to complete
    yield Promise.all(transitionPromises);
});
exports.restoreVolumeLevels = restoreVolumeLevels;
/**
 * Transitions only the audio element volume without affecting channel.volume
 * This is used for ducking/restoration where channel.volume represents desired volume
 * Uses Web Audio API when available for enhanced volume control
 * @param audio - The audio element to transition
 * @param targetVolume - Target volume level (0-1)
 * @param duration - Transition duration in milliseconds
 * @param easing - Easing function type
 * @param channelNumber - The channel number this audio belongs to (for Web Audio API)
 * @returns Promise that resolves when transition completes
 * @internal
 */
const transitionAudioVolume = (audio_1, targetVolume_1, ...args_1) => __awaiter(void 0, [audio_1, targetVolume_1, ...args_1], void 0, function* (audio, targetVolume, duration = 250, easing = types_1.EasingType.EaseOut, channelNumber) {
    // Apply global volume multiplier
    const actualTargetVolume = targetVolume * globalVolume;
    // Try to use Web Audio API if available and channel number is provided
    if (channelNumber !== undefined) {
        const channel = info_1.audioChannels[channelNumber];
        if ((channel === null || channel === void 0 ? void 0 : channel.webAudioContext) && channel.webAudioNodes) {
            const nodes = channel.webAudioNodes.get(audio);
            if (nodes) {
                // Use Web Audio API for smooth transitions
                (0, web_audio_1.setWebAudioVolume)(nodes.gainNode, actualTargetVolume, duration);
                // Also update the audio element's volume property for consistency
                audio.volume = actualTargetVolume;
                return;
            }
        }
    }
    // Fallback to standard HTMLAudioElement volume control with manual transition
    const startVolume = audio.volume;
    const volumeDelta = actualTargetVolume - startVolume;
    // If no change needed, resolve immediately
    if (Math.abs(volumeDelta) < 0.001) {
        return Promise.resolve();
    }
    // Handle zero or negative duration - instant change
    if (duration <= 0) {
        audio.volume = actualTargetVolume;
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
                    // In test environment, use longer intervals to prevent stack overflow
                    setTimeout(updateVolume, 16);
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
/**
 * Initializes Web Audio API for a specific channel
 * @param channelNumber - The channel number to initialize Web Audio for
 * @internal
 */
const initializeWebAudioForChannel = (channelNumber) => __awaiter(void 0, void 0, void 0, function* () {
    const channel = info_1.audioChannels[channelNumber];
    if (!channel || channel.webAudioContext)
        return;
    const audioContext = (0, web_audio_1.getAudioContext)();
    if (!audioContext) {
        throw new Error('AudioContext creation failed');
    }
    // Resume audio context if needed (for autoplay policy)
    yield (0, web_audio_1.resumeAudioContext)(audioContext);
    channel.webAudioContext = audioContext;
    channel.webAudioNodes = new Map();
    // Initialize Web Audio nodes for existing audio elements
    for (const audio of channel.queue) {
        const nodes = (0, web_audio_1.createWebAudioNodes)(audio, audioContext);
        if (!nodes) {
            throw new Error('Node creation failed');
        }
        channel.webAudioNodes.set(audio, nodes);
        // Set initial volume to match channel volume
        nodes.gainNode.gain.value = channel.volume;
    }
});
/**
 * Sets volume for an audio element using the appropriate method (Web Audio API or standard)
 * @param audio - The audio element to set volume for
 * @param volume - Channel volume level (0-1) - will be multiplied by global volume
 * @param channelNumber - The channel number this audio belongs to
 * @param transitionDuration - Optional transition duration in milliseconds
 * @internal
 */
const setVolumeForAudio = (audio, volume, channelNumber, transitionDuration) => __awaiter(void 0, void 0, void 0, function* () {
    const channel = info_1.audioChannels[channelNumber];
    // Apply global volume multiplier to the channel volume
    const actualVolume = volume * globalVolume;
    // Use Web Audio API if available and initialized
    if ((channel === null || channel === void 0 ? void 0 : channel.webAudioContext) && channel.webAudioNodes) {
        const nodes = channel.webAudioNodes.get(audio);
        if (nodes) {
            (0, web_audio_1.setWebAudioVolume)(nodes.gainNode, actualVolume, transitionDuration);
            return;
        }
    }
    // Fallback to standard HTMLAudioElement volume control
    audio.volume = actualVolume;
});
/**
 * Initializes Web Audio API nodes for a new audio element
 * @param audio - The audio element to initialize nodes for
 * @param channelNumber - The channel number this audio belongs to
 * @internal
 */
const initializeWebAudioForAudio = (audio, channelNumber) => __awaiter(void 0, void 0, void 0, function* () {
    const channel = info_1.audioChannels[channelNumber];
    if (!channel)
        return;
    // Initialize Web Audio API for the channel if needed
    if ((0, web_audio_1.shouldUseWebAudio)() && !channel.webAudioContext) {
        yield initializeWebAudioForChannel(channelNumber);
    }
    // Create nodes for this specific audio element
    if (channel.webAudioContext && channel.webAudioNodes && !channel.webAudioNodes.has(audio)) {
        const nodes = (0, web_audio_1.createWebAudioNodes)(audio, channel.webAudioContext);
        if (nodes) {
            channel.webAudioNodes.set(audio, nodes);
            // Set initial volume to match channel volume with global volume multiplier
            nodes.gainNode.gain.value = channel.volume * globalVolume;
        }
    }
});
exports.initializeWebAudioForAudio = initializeWebAudioForAudio;
/**
 * Cleans up Web Audio API nodes for an audio element
 * @param audio - The audio element to clean up nodes for
 * @param channelNumber - The channel number this audio belongs to
 * @internal
 */
const cleanupWebAudioForAudio = (audio, channelNumber) => {
    const channel = info_1.audioChannels[channelNumber];
    if (!(channel === null || channel === void 0 ? void 0 : channel.webAudioNodes))
        return;
    const nodes = channel.webAudioNodes.get(audio);
    if (nodes) {
        (0, web_audio_1.cleanupWebAudioNodes)(nodes);
        channel.webAudioNodes.delete(audio);
    }
};
exports.cleanupWebAudioForAudio = cleanupWebAudioForAudio;
