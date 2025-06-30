"use strict";
/**
 * @fileoverview Pause and resume management functions for the audio-channel-queue package
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
exports.togglePauseAllChannels = exports.getAllChannelsPauseState = exports.isChannelPaused = exports.resumeAllChannels = exports.pauseAllChannels = exports.togglePauseChannel = exports.resumeChannel = exports.pauseChannel = exports.togglePauseAllWithFade = exports.resumeAllWithFade = exports.pauseAllWithFade = exports.togglePauseWithFade = exports.resumeWithFade = exports.pauseWithFade = void 0;
const types_1 = require("./types");
const info_1 = require("./info");
const utils_1 = require("./utils");
const events_1 = require("./events");
const volume_1 = require("./volume");
/**
 * Gets the current volume for a channel, accounting for synchronous state
 * @param channelNumber - The channel number
 * @returns Current volume level (0-1)
 */
const getChannelVolumeSync = (channelNumber) => {
    var _a;
    const channel = info_1.audioChannels[channelNumber];
    return (_a = channel === null || channel === void 0 ? void 0 : channel.volume) !== null && _a !== void 0 ? _a : 1.0;
};
/**
 * Sets the channel volume synchronously in internal state
 * @param channelNumber - The channel number
 * @param volume - Volume level (0-1)
 */
const setChannelVolumeSync = (channelNumber, volume) => {
    const channel = info_1.audioChannels[channelNumber];
    if (channel) {
        channel.volume = volume;
        if (channel.queue.length > 0) {
            channel.queue[0].volume = volume;
        }
    }
};
/**
 * Pauses the currently playing audio in a specific channel with smooth volume fade
 * @param fadeType - Type of fade transition to apply
 * @param channelNumber - The channel number to pause (defaults to 0)
 * @param duration - Optional custom fade duration in milliseconds (uses fadeType default if not provided)
 * @returns Promise that resolves when the pause and fade are complete
 * @example
 * ```typescript
 * await pauseWithFade(FadeType.Gentle, 0); // Pause with gentle fade out over 800ms
 * await pauseWithFade(FadeType.Dramatic, 1, 1500); // Pause with dramatic fade out over 1.5s
 * await pauseWithFade(FadeType.Linear, 2, 500); // Linear pause with custom 500ms fade
 * ```
 */
const pauseWithFade = (...args_1) => __awaiter(void 0, [...args_1], void 0, function* (fadeType = types_1.FadeType.Gentle, channelNumber = 0, duration) {
    var _a, _b, _c;
    const channel = info_1.audioChannels[channelNumber];
    if (!channel || channel.queue.length === 0)
        return;
    const currentAudio = channel.queue[0];
    // Don't pause if already paused or ended
    if (currentAudio.paused || currentAudio.ended)
        return;
    const config = (0, volume_1.getFadeConfig)(fadeType);
    const effectiveDuration = duration !== null && duration !== void 0 ? duration : config.duration;
    // Race condition fix: Use existing fadeState originalVolume if already transitioning,
    // otherwise capture current volume
    let originalVolume;
    if ((_a = channel.fadeState) === null || _a === void 0 ? void 0 : _a.isTransitioning) {
        // We're already in any kind of transition (pause or resume), preserve original volume
        originalVolume = channel.fadeState.originalVolume;
    }
    else {
        // First fade or no transition in progress, capture current volume
        // But ensure we don't capture a volume of 0 during a transition
        const currentVolume = getChannelVolumeSync(channelNumber);
        originalVolume = currentVolume > 0 ? currentVolume : ((_c = (_b = channel.fadeState) === null || _b === void 0 ? void 0 : _b.originalVolume) !== null && _c !== void 0 ? _c : 1.0);
    }
    // Store fade state for resumeWithFade to use (including custom duration)
    channel.fadeState = {
        customDuration: duration,
        fadeType,
        isPaused: true,
        isTransitioning: true,
        originalVolume
    };
    if (effectiveDuration === 0) {
        // Instant pause
        yield (0, exports.pauseChannel)(channelNumber);
        // Reset volume to original for resume (synchronously to avoid state issues)
        setChannelVolumeSync(channelNumber, originalVolume);
        // Mark transition as complete for instant pause
        if (channel.fadeState) {
            channel.fadeState.isTransitioning = false;
        }
        return;
    }
    // Fade to 0 with pause curve, then pause
    yield (0, volume_1.transitionVolume)(channelNumber, 0, effectiveDuration, config.pauseCurve);
    yield (0, exports.pauseChannel)(channelNumber);
    // Reset volume to original for resume (synchronously to avoid state issues)
    setChannelVolumeSync(channelNumber, originalVolume);
    // Mark transition as complete
    if (channel.fadeState) {
        channel.fadeState.isTransitioning = false;
    }
});
exports.pauseWithFade = pauseWithFade;
/**
 * Resumes the currently paused audio in a specific channel with smooth volume fade
 * Uses the complementary fade curve automatically based on the pause fade type, or allows override
 * @param fadeType - Optional fade type to override the stored fade type from pause
 * @param channelNumber - The channel number to resume (defaults to 0)
 * @param duration - Optional custom fade duration in milliseconds (uses stored or fadeType default if not provided)
 * @returns Promise that resolves when the resume and fade are complete
 * @example
 * ```typescript
 * await resumeWithFade(); // Resume with automatically paired fade curve from pause
 * await resumeWithFade(FadeType.Dramatic, 0); // Override with dramatic fade
 * await resumeWithFade(FadeType.Linear, 0, 1000); // Override with linear fade over 1 second
 * ```
 */
const resumeWithFade = (fadeType_1, ...args_1) => __awaiter(void 0, [fadeType_1, ...args_1], void 0, function* (fadeType, channelNumber = 0, duration) {
    const channel = info_1.audioChannels[channelNumber];
    if (!channel || channel.queue.length === 0)
        return;
    const fadeState = channel.fadeState;
    if (!(fadeState === null || fadeState === void 0 ? void 0 : fadeState.isPaused)) {
        // Fall back to regular resume if no fade state
        yield (0, exports.resumeChannel)(channelNumber);
        return;
    }
    // Use provided fadeType or fall back to stored fadeType from pause
    const effectiveFadeType = fadeType !== null && fadeType !== void 0 ? fadeType : fadeState.fadeType;
    const config = (0, volume_1.getFadeConfig)(effectiveFadeType);
    // Determine effective duration: custom parameter > stored custom > fadeType default
    let effectiveDuration;
    if (duration !== undefined) {
        effectiveDuration = duration;
    }
    else if (fadeState.customDuration !== undefined) {
        effectiveDuration = fadeState.customDuration;
    }
    else {
        effectiveDuration = config.duration;
    }
    if (effectiveDuration === 0) {
        // Instant resume
        const targetVolume = fadeState.originalVolume > 0 ? fadeState.originalVolume : 1.0;
        setChannelVolumeSync(channelNumber, targetVolume);
        yield (0, exports.resumeChannel)(channelNumber);
        fadeState.isPaused = false;
        fadeState.isTransitioning = false;
        return;
    }
    // Race condition fix: Ensure we have a valid original volume to restore to
    const targetVolume = fadeState.originalVolume > 0 ? fadeState.originalVolume : 1.0;
    // Mark as transitioning to prevent volume capture during rapid toggles
    fadeState.isTransitioning = true;
    // Set volume to 0, resume, then fade to original with resume curve
    setChannelVolumeSync(channelNumber, 0);
    yield (0, exports.resumeChannel)(channelNumber);
    // Use the stored original volume, not current volume, to prevent race conditions
    yield (0, volume_1.transitionVolume)(channelNumber, targetVolume, effectiveDuration, config.resumeCurve);
    fadeState.isPaused = false;
    fadeState.isTransitioning = false;
});
exports.resumeWithFade = resumeWithFade;
/**
 * Toggles pause/resume state for a specific channel with integrated fade
 * @param fadeType - Type of fade transition to apply when pausing
 * @param channelNumber - The channel number to toggle (defaults to 0)
 * @param duration - Optional custom fade duration in milliseconds (uses fadeType default if not provided)
 * @returns Promise that resolves when the toggle and fade are complete
 * @example
 * ```typescript
 * await togglePauseWithFade(FadeType.Gentle, 0); // Toggle with gentle fade
 * await togglePauseWithFade(FadeType.Dramatic, 0, 500); // Toggle with custom 500ms fade
 * ```
 */
const togglePauseWithFade = (...args_1) => __awaiter(void 0, [...args_1], void 0, function* (fadeType = types_1.FadeType.Gentle, channelNumber = 0, duration) {
    const channel = info_1.audioChannels[channelNumber];
    if (!channel || channel.queue.length === 0)
        return;
    const currentAudio = channel.queue[0];
    if (currentAudio.paused) {
        yield (0, exports.resumeWithFade)(undefined, channelNumber, duration);
    }
    else {
        yield (0, exports.pauseWithFade)(fadeType, channelNumber, duration);
    }
});
exports.togglePauseWithFade = togglePauseWithFade;
/**
 * Pauses all currently playing audio across all channels with smooth volume fade
 * @param fadeType - Type of fade transition to apply to all channels
 * @param duration - Optional custom fade duration in milliseconds (uses fadeType default if not provided)
 * @returns Promise that resolves when all channels are paused and faded
 * @example
 * ```typescript
 * await pauseAllWithFade(FadeType.Dramatic); // Pause everything with dramatic fade
 * await pauseAllWithFade(FadeType.Gentle, 1200); // Pause all channels with custom 1.2s fade
 * ```
 */
const pauseAllWithFade = (...args_1) => __awaiter(void 0, [...args_1], void 0, function* (fadeType = types_1.FadeType.Gentle, duration) {
    const pausePromises = [];
    info_1.audioChannels.forEach((_channel, index) => {
        pausePromises.push((0, exports.pauseWithFade)(fadeType, index, duration));
    });
    yield Promise.all(pausePromises);
});
exports.pauseAllWithFade = pauseAllWithFade;
/**
 * Resumes all currently paused audio across all channels with smooth volume fade
 * Uses automatically paired fade curves based on each channel's pause fade type, or allows override
 * @param fadeType - Optional fade type to override stored fade types for all channels
 * @param duration - Optional custom fade duration in milliseconds (uses stored or fadeType default if not provided)
 * @returns Promise that resolves when all channels are resumed and faded
 * @example
 * ```typescript
 * await resumeAllWithFade(); // Resume everything with paired fade curves
 * await resumeAllWithFade(FadeType.Gentle, 800); // Override all channels with gentle fade over 800ms
 * await resumeAllWithFade(undefined, 600); // Use stored fade types with custom 600ms duration
 * ```
 */
const resumeAllWithFade = (fadeType, duration) => __awaiter(void 0, void 0, void 0, function* () {
    const resumePromises = [];
    info_1.audioChannels.forEach((_channel, index) => {
        resumePromises.push((0, exports.resumeWithFade)(fadeType, index, duration));
    });
    yield Promise.all(resumePromises);
});
exports.resumeAllWithFade = resumeAllWithFade;
/**
 * Toggles pause/resume state for all channels with integrated fade
 * If any channels are playing, all will be paused with fade
 * If all channels are paused, all will be resumed with fade
 * @param fadeType - Type of fade transition to apply when pausing
 * @param duration - Optional custom fade duration in milliseconds (uses fadeType default if not provided)
 * @returns Promise that resolves when all toggles and fades are complete
 * @example
 * ```typescript
 * await togglePauseAllWithFade(FadeType.Gentle); // Global toggle with gentle fade
 * await togglePauseAllWithFade(FadeType.Dramatic, 600); // Global toggle with custom 600ms fade
 * ```
 */
const togglePauseAllWithFade = (...args_1) => __awaiter(void 0, [...args_1], void 0, function* (fadeType = types_1.FadeType.Gentle, duration) {
    let hasPlayingChannel = false;
    // Check if any channel is currently playing
    for (let i = 0; i < info_1.audioChannels.length; i++) {
        const channel = info_1.audioChannels[i];
        if (channel && channel.queue.length > 0) {
            const currentAudio = channel.queue[0];
            if (!currentAudio.paused && !currentAudio.ended) {
                hasPlayingChannel = true;
                break;
            }
        }
    }
    // If any channel is playing, pause all with fade
    // If no channels are playing, resume all with fade
    if (hasPlayingChannel) {
        yield (0, exports.pauseAllWithFade)(fadeType, duration);
    }
    else {
        yield (0, exports.resumeAllWithFade)(fadeType, duration);
    }
});
exports.togglePauseAllWithFade = togglePauseAllWithFade;
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
const pauseChannel = (...args_1) => __awaiter(void 0, [...args_1], void 0, function* (channelNumber = 0) {
    const channel = info_1.audioChannels[channelNumber];
    if (channel && channel.queue.length > 0) {
        const currentAudio = channel.queue[0];
        if (!currentAudio.paused && !currentAudio.ended) {
            currentAudio.pause();
            channel.isPaused = true;
            const audioInfo = (0, utils_1.getAudioInfoFromElement)(currentAudio, channelNumber, info_1.audioChannels);
            if (audioInfo) {
                (0, events_1.emitAudioPause)(channelNumber, audioInfo, info_1.audioChannels);
            }
        }
    }
});
exports.pauseChannel = pauseChannel;
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
const resumeChannel = (...args_1) => __awaiter(void 0, [...args_1], void 0, function* (channelNumber = 0) {
    const channel = info_1.audioChannels[channelNumber];
    if (channel && channel.queue.length > 0) {
        const currentAudio = channel.queue[0];
        // Only resume if both the channel is marked as paused AND the audio element is actually paused AND not ended
        if (channel.isPaused && currentAudio.paused && !currentAudio.ended) {
            yield currentAudio.play();
            channel.isPaused = false;
            const audioInfo = (0, utils_1.getAudioInfoFromElement)(currentAudio, channelNumber, info_1.audioChannels);
            if (audioInfo) {
                (0, events_1.emitAudioResume)(channelNumber, audioInfo, info_1.audioChannels);
            }
        }
    }
});
exports.resumeChannel = resumeChannel;
/**
 * Toggles pause/resume state for a specific channel
 * @param channelNumber - The channel number to toggle (defaults to 0)
 * @returns Promise that resolves when the toggle is complete
 * @example
 * ```typescript
 * await togglePauseChannel(0); // Toggle pause state for channel 0
 * ```
 */
const togglePauseChannel = (...args_1) => __awaiter(void 0, [...args_1], void 0, function* (channelNumber = 0) {
    const channel = info_1.audioChannels[channelNumber];
    if (channel && channel.queue.length > 0) {
        const currentAudio = channel.queue[0];
        if (currentAudio.paused) {
            yield (0, exports.resumeChannel)(channelNumber);
        }
        else {
            yield (0, exports.pauseChannel)(channelNumber);
        }
    }
});
exports.togglePauseChannel = togglePauseChannel;
/**
 * Pauses all currently playing audio across all channels
 * @returns Promise that resolves when all audio is paused
 * @example
 * ```typescript
 * await pauseAllChannels(); // Pause everything
 * ```
 */
const pauseAllChannels = () => __awaiter(void 0, void 0, void 0, function* () {
    const pausePromises = [];
    info_1.audioChannels.forEach((_channel, index) => {
        pausePromises.push((0, exports.pauseChannel)(index));
    });
    yield Promise.all(pausePromises);
});
exports.pauseAllChannels = pauseAllChannels;
/**
 * Resumes all currently paused audio across all channels
 * @returns Promise that resolves when all audio is resumed
 * @example
 * ```typescript
 * await resumeAllChannels(); // Resume everything that was paused
 * ```
 */
const resumeAllChannels = () => __awaiter(void 0, void 0, void 0, function* () {
    const resumePromises = [];
    info_1.audioChannels.forEach((_channel, index) => {
        resumePromises.push((0, exports.resumeChannel)(index));
    });
    yield Promise.all(resumePromises);
});
exports.resumeAllChannels = resumeAllChannels;
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
const isChannelPaused = (channelNumber = 0) => {
    var _a;
    const channel = info_1.audioChannels[channelNumber];
    return (_a = channel === null || channel === void 0 ? void 0 : channel.isPaused) !== null && _a !== void 0 ? _a : false;
};
exports.isChannelPaused = isChannelPaused;
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
const getAllChannelsPauseState = () => {
    return info_1.audioChannels.map((channel) => { var _a; return (_a = channel === null || channel === void 0 ? void 0 : channel.isPaused) !== null && _a !== void 0 ? _a : false; });
};
exports.getAllChannelsPauseState = getAllChannelsPauseState;
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
const togglePauseAllChannels = () => __awaiter(void 0, void 0, void 0, function* () {
    let hasPlayingChannel = false;
    // Check if any channel is currently playing
    for (let i = 0; i < info_1.audioChannels.length; i++) {
        const channel = info_1.audioChannels[i];
        if (channel && channel.queue.length > 0) {
            const currentAudio = channel.queue[0];
            if (!currentAudio.paused && !currentAudio.ended) {
                hasPlayingChannel = true;
                break;
            }
        }
    }
    // If any channel is playing, pause all channels
    // If no channels are playing, resume all channels
    if (hasPlayingChannel) {
        yield (0, exports.pauseAllChannels)();
    }
    else {
        yield (0, exports.resumeAllChannels)();
    }
});
exports.togglePauseAllChannels = togglePauseAllChannels;
