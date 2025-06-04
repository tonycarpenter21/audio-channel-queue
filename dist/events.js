"use strict";
/**
 * @fileoverview Event handling and emission for the audio-channel-queue package
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanupProgressTracking = exports.setupProgressTracking = exports.emitAudioResume = exports.emitAudioPause = exports.emitAudioComplete = exports.emitAudioStart = exports.emitQueueChange = void 0;
const utils_1 = require("./utils");
/**
 * Emits a queue change event to all registered listeners for a specific channel
 * @param channelNumber - The channel number that experienced a queue change
 * @param audioChannels - Array of audio channels
 * @example
 * ```typescript
 * emitQueueChange(0, audioChannels); // Notifies all queue change listeners
 * ```
 */
const emitQueueChange = (channelNumber, audioChannels) => {
    const channel = audioChannels[channelNumber];
    if (!channel || !channel.queueChangeCallbacks)
        return;
    const snapshot = (0, utils_1.createQueueSnapshot)(channelNumber, audioChannels);
    if (!snapshot)
        return;
    channel.queueChangeCallbacks.forEach(callback => {
        try {
            callback(snapshot);
        }
        catch (error) {
            console.error('Error in queue change callback:', error);
        }
    });
};
exports.emitQueueChange = emitQueueChange;
/**
 * Emits an audio start event to all registered listeners for a specific channel
 * @param channelNumber - The channel number where audio started
 * @param audioInfo - Information about the audio that started
 * @param audioChannels - Array of audio channels
 * @example
 * ```typescript
 * emitAudioStart(0, { src: 'song.mp3', fileName: 'song.mp3', duration: 180000, channelNumber: 0 }, audioChannels);
 * ```
 */
const emitAudioStart = (channelNumber, audioInfo, audioChannels) => {
    const channel = audioChannels[channelNumber];
    if (!channel || !channel.audioStartCallbacks)
        return;
    channel.audioStartCallbacks.forEach(callback => {
        try {
            callback(audioInfo);
        }
        catch (error) {
            console.error('Error in audio start callback:', error);
        }
    });
};
exports.emitAudioStart = emitAudioStart;
/**
 * Emits an audio complete event to all registered listeners for a specific channel
 * @param channelNumber - The channel number where audio completed
 * @param audioInfo - Information about the audio that completed
 * @param audioChannels - Array of audio channels
 * @example
 * ```typescript
 * emitAudioComplete(0, { src: 'song.mp3', fileName: 'song.mp3', channelNumber: 0, remainingInQueue: 2 }, audioChannels);
 * ```
 */
const emitAudioComplete = (channelNumber, audioInfo, audioChannels) => {
    const channel = audioChannels[channelNumber];
    if (!channel || !channel.audioCompleteCallbacks)
        return;
    channel.audioCompleteCallbacks.forEach(callback => {
        try {
            callback(audioInfo);
        }
        catch (error) {
            console.error('Error in audio complete callback:', error);
        }
    });
};
exports.emitAudioComplete = emitAudioComplete;
/**
 * Emits an audio pause event to all registered listeners for a specific channel
 * @param channelNumber - The channel number where audio was paused
 * @param audioInfo - Information about the audio that was paused
 * @param audioChannels - Array of audio channels
 * @example
 * ```typescript
 * emitAudioPause(0, audioInfo, audioChannels);
 * ```
 */
const emitAudioPause = (channelNumber, audioInfo, audioChannels) => {
    const channel = audioChannels[channelNumber];
    if (!channel || !channel.audioPauseCallbacks)
        return;
    channel.audioPauseCallbacks.forEach(callback => {
        try {
            callback(channelNumber, audioInfo);
        }
        catch (error) {
            console.error('Error in audio pause callback:', error);
        }
    });
};
exports.emitAudioPause = emitAudioPause;
/**
 * Emits an audio resume event to all registered listeners for a specific channel
 * @param channelNumber - The channel number where audio was resumed
 * @param audioInfo - Information about the audio that was resumed
 * @param audioChannels - Array of audio channels
 * @example
 * ```typescript
 * emitAudioResume(0, audioInfo, audioChannels);
 * ```
 */
const emitAudioResume = (channelNumber, audioInfo, audioChannels) => {
    const channel = audioChannels[channelNumber];
    if (!channel || !channel.audioResumeCallbacks)
        return;
    channel.audioResumeCallbacks.forEach(callback => {
        try {
            callback(channelNumber, audioInfo);
        }
        catch (error) {
            console.error('Error in audio resume callback:', error);
        }
    });
};
exports.emitAudioResume = emitAudioResume;
// Store listener functions for cleanup
const progressListeners = new WeakMap();
/**
 * Sets up comprehensive progress tracking for an audio element
 * @param audio - The HTML audio element to track
 * @param channelNumber - The channel number this audio belongs to
 * @param audioChannels - Array of audio channels
 * @example
 * ```typescript
 * const audioElement = new Audio('song.mp3');
 * setupProgressTracking(audioElement, 0, audioChannels);
 * ```
 */
const setupProgressTracking = (audio, channelNumber, audioChannels) => {
    const channel = audioChannels[channelNumber];
    if (!channel)
        return;
    if (!channel.progressCallbacks) {
        channel.progressCallbacks = new Map();
    }
    // Don't set up tracking if already exists
    if (progressListeners.has(audio))
        return;
    const updateProgress = () => {
        var _a, _b;
        // Get callbacks for this specific audio element AND the channel-wide callbacks
        const audioCallbacks = ((_a = channel.progressCallbacks) === null || _a === void 0 ? void 0 : _a.get(audio)) || new Set();
        const channelCallbacks = ((_b = channel.progressCallbacks) === null || _b === void 0 ? void 0 : _b.get(null)) || new Set();
        // Combine both sets of callbacks
        const allCallbacks = new Set([...audioCallbacks, ...channelCallbacks]);
        if (allCallbacks.size === 0)
            return;
        const info = (0, utils_1.getAudioInfoFromElement)(audio, channelNumber, audioChannels);
        if (info) {
            allCallbacks.forEach((callback) => {
                try {
                    callback(info);
                }
                catch (error) {
                    console.error('Error in progress callback:', error);
                }
            });
        }
    };
    // Store the listener function for cleanup
    progressListeners.set(audio, updateProgress);
    // Set up comprehensive event listeners for progress tracking
    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('loadedmetadata', updateProgress);
    audio.addEventListener('play', updateProgress);
    audio.addEventListener('pause', updateProgress);
    audio.addEventListener('ended', updateProgress);
};
exports.setupProgressTracking = setupProgressTracking;
/**
 * Cleans up progress tracking for an audio element to prevent memory leaks
 * @param audio - The HTML audio element to clean up
 * @param channelNumber - The channel number this audio belongs to
 * @param audioChannels - Array of audio channels
 * @example
 * ```typescript
 * cleanupProgressTracking(audioElement, 0, audioChannels);
 * ```
 */
const cleanupProgressTracking = (audio, channelNumber, audioChannels) => {
    const channel = audioChannels[channelNumber];
    if (!channel || !channel.progressCallbacks)
        return;
    // Remove event listeners
    const updateProgress = progressListeners.get(audio);
    if (updateProgress) {
        audio.removeEventListener('timeupdate', updateProgress);
        audio.removeEventListener('loadedmetadata', updateProgress);
        audio.removeEventListener('play', updateProgress);
        audio.removeEventListener('pause', updateProgress);
        audio.removeEventListener('ended', updateProgress);
        progressListeners.delete(audio);
    }
    channel.progressCallbacks.delete(audio);
};
exports.cleanupProgressTracking = cleanupProgressTracking;
