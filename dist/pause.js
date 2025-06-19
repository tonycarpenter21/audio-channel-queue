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
exports.togglePauseAllChannels = exports.getAllChannelsPauseState = exports.isChannelPaused = exports.resumeAllChannels = exports.pauseAllChannels = exports.togglePauseChannel = exports.resumeChannel = exports.pauseChannel = void 0;
const info_1 = require("./info");
const utils_1 = require("./utils");
const events_1 = require("./events");
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
    const channel = info_1.audioChannels[channelNumber];
    return (channel === null || channel === void 0 ? void 0 : channel.isPaused) || false;
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
    return info_1.audioChannels.map((channel) => (channel === null || channel === void 0 ? void 0 : channel.isPaused) || false);
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
