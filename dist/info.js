"use strict";
/**
 * @fileoverview Audio information and progress tracking functions for the audio-channel-queue package
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.offAudioResume = exports.offAudioPause = exports.onAudioResume = exports.onAudioPause = exports.onAudioComplete = exports.onAudioStart = exports.offQueueChange = exports.onQueueChange = exports.offAudioProgress = exports.onAudioProgress = exports.getQueueSnapshot = exports.getAllChannelsInfo = exports.getCurrentAudioInfo = exports.audioChannels = void 0;
const utils_1 = require("./utils");
const events_1 = require("./events");
/**
 * Global array to store audio channels with their queues and callback management
 * Each channel maintains its own audio queue and event callback sets
 */
exports.audioChannels = [];
/**
 * Gets current audio information for a specific channel
 * @param channelNumber - The channel number (defaults to 0)
 * @returns AudioInfo object or null if no audio is playing
 * @example
 * ```typescript
 * const info = getCurrentAudioInfo(0);
 * if (info) {
 *   console.log(`Currently playing: ${info.fileName}`);
 *   console.log(`Progress: ${(info.progress * 100).toFixed(1)}%`);
 * }
 * ```
 */
const getCurrentAudioInfo = (channelNumber = 0) => {
    const channel = exports.audioChannels[channelNumber];
    if (!channel || channel.queue.length === 0) {
        return null;
    }
    const currentAudio = channel.queue[0];
    return (0, utils_1.getAudioInfoFromElement)(currentAudio, channelNumber, exports.audioChannels);
};
exports.getCurrentAudioInfo = getCurrentAudioInfo;
/**
 * Gets audio information for all channels
 * @returns Array of AudioInfo objects (null for channels with no audio)
 * @example
 * ```typescript
 * const allInfo = getAllChannelsInfo();
 * allInfo.forEach((info, channel) => {
 *   if (info) {
 *     console.log(`Channel ${channel}: ${info.fileName}`);
 *   }
 * });
 * ```
 */
const getAllChannelsInfo = () => {
    const allChannelsInfo = [];
    for (let i = 0; i < exports.audioChannels.length; i++) {
        allChannelsInfo.push((0, exports.getCurrentAudioInfo)(i));
    }
    return allChannelsInfo;
};
exports.getAllChannelsInfo = getAllChannelsInfo;
/**
 * Gets a complete snapshot of the queue state for a specific channel
 * @param channelNumber - The channel number
 * @returns QueueSnapshot object or null if channel doesn't exist
 * @example
 * ```typescript
 * const snapshot = getQueueSnapshot(0);
 * if (snapshot) {
 *   console.log(`Queue has ${snapshot.totalItems} items`);
 *   console.log(`Currently playing: ${snapshot.items[0]?.fileName}`);
 * }
 * ```
 */
const getQueueSnapshot = (channelNumber) => {
    return (0, utils_1.createQueueSnapshot)(channelNumber, exports.audioChannels);
};
exports.getQueueSnapshot = getQueueSnapshot;
/**
 * Subscribes to real-time progress updates for a specific channel
 * @param channelNumber - The channel number
 * @param callback - Function to call with audio info updates
 * @example
 * ```typescript
 * onAudioProgress(0, (info) => {
 *   updateProgressBar(info.progress);
 *   updateTimeDisplay(info.currentTime, info.duration);
 * });
 * ```
 */
const onAudioProgress = (channelNumber, callback) => {
    if (!exports.audioChannels[channelNumber]) {
        exports.audioChannels[channelNumber] = {
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
    const channel = exports.audioChannels[channelNumber];
    if (!channel.progressCallbacks) {
        channel.progressCallbacks = new Map();
    }
    // Add callback for current audio if exists
    if (channel.queue.length > 0) {
        const currentAudio = channel.queue[0];
        if (!channel.progressCallbacks.has(currentAudio)) {
            channel.progressCallbacks.set(currentAudio, new Set());
        }
        channel.progressCallbacks.get(currentAudio).add(callback);
        // Set up tracking if not already done
        (0, events_1.setupProgressTracking)(currentAudio, channelNumber, exports.audioChannels);
    }
    // Store callback for future audio elements in this channel
    if (!channel.progressCallbacks.has(null)) {
        channel.progressCallbacks.set(null, new Set());
    }
    channel.progressCallbacks.get(null).add(callback);
};
exports.onAudioProgress = onAudioProgress;
/**
 * Removes progress listeners for a specific channel
 * @param channelNumber - The channel number
 * @example
 * ```typescript
 * offAudioProgress(0); // Stop receiving progress updates for channel 0
 * ```
 */
const offAudioProgress = (channelNumber) => {
    const channel = exports.audioChannels[channelNumber];
    if (!channel || !channel.progressCallbacks)
        return;
    // Clean up event listeners for current audio if exists
    if (channel.queue.length > 0) {
        const currentAudio = channel.queue[0];
        (0, events_1.cleanupProgressTracking)(currentAudio, channelNumber, exports.audioChannels);
    }
    // Clear all callbacks for this channel
    channel.progressCallbacks.clear();
};
exports.offAudioProgress = offAudioProgress;
/**
 * Subscribes to queue change events for a specific channel
 * @param channelNumber - The channel number to monitor
 * @param callback - Function to call when queue changes
 * @example
 * ```typescript
 * onQueueChange(0, (snapshot) => {
 *   updateQueueDisplay(snapshot.items);
 *   updateQueueCount(snapshot.totalItems);
 * });
 * ```
 */
const onQueueChange = (channelNumber, callback) => {
    if (!exports.audioChannels[channelNumber]) {
        exports.audioChannels[channelNumber] = {
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
    const channel = exports.audioChannels[channelNumber];
    if (!channel.queueChangeCallbacks) {
        channel.queueChangeCallbacks = new Set();
    }
    channel.queueChangeCallbacks.add(callback);
};
exports.onQueueChange = onQueueChange;
/**
 * Removes queue change listeners for a specific channel
 * @param channelNumber - The channel number
 * @example
 * ```typescript
 * offQueueChange(0); // Stop receiving queue change notifications for channel 0
 * ```
 */
const offQueueChange = (channelNumber) => {
    const channel = exports.audioChannels[channelNumber];
    if (!channel || !channel.queueChangeCallbacks)
        return;
    channel.queueChangeCallbacks.clear();
};
exports.offQueueChange = offQueueChange;
/**
 * Subscribes to audio start events for a specific channel
 * @param channelNumber - The channel number to monitor
 * @param callback - Function to call when audio starts playing
 * @example
 * ```typescript
 * onAudioStart(0, (info) => {
 *   showNowPlaying(info.fileName);
 *   setTotalDuration(info.duration);
 * });
 * ```
 */
const onAudioStart = (channelNumber, callback) => {
    if (!exports.audioChannels[channelNumber]) {
        exports.audioChannels[channelNumber] = {
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
    const channel = exports.audioChannels[channelNumber];
    if (!channel.audioStartCallbacks) {
        channel.audioStartCallbacks = new Set();
    }
    channel.audioStartCallbacks.add(callback);
};
exports.onAudioStart = onAudioStart;
/**
 * Subscribes to audio complete events for a specific channel
 * @param channelNumber - The channel number to monitor
 * @param callback - Function to call when audio completes
 * @example
 * ```typescript
 * onAudioComplete(0, (info) => {
 *   logPlaybackComplete(info.fileName);
 *   if (info.remainingInQueue === 0) {
 *     showQueueComplete();
 *   }
 * });
 * ```
 */
const onAudioComplete = (channelNumber, callback) => {
    if (!exports.audioChannels[channelNumber]) {
        exports.audioChannels[channelNumber] = {
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
    const channel = exports.audioChannels[channelNumber];
    if (!channel.audioCompleteCallbacks) {
        channel.audioCompleteCallbacks = new Set();
    }
    channel.audioCompleteCallbacks.add(callback);
};
exports.onAudioComplete = onAudioComplete;
/**
 * Subscribes to audio pause events for a specific channel
 * @param channelNumber - The channel number to monitor
 * @param callback - Function to call when audio is paused
 * @example
 * ```typescript
 * onAudioPause(0, (channelNumber, info) => {
 *   showPauseIndicator();
 *   logPauseEvent(info.fileName, info.currentTime);
 * });
 * ```
 */
const onAudioPause = (channelNumber, callback) => {
    if (!exports.audioChannels[channelNumber]) {
        exports.audioChannels[channelNumber] = {
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
    const channel = exports.audioChannels[channelNumber];
    if (!channel.audioPauseCallbacks) {
        channel.audioPauseCallbacks = new Set();
    }
    channel.audioPauseCallbacks.add(callback);
};
exports.onAudioPause = onAudioPause;
/**
 * Subscribes to audio resume events for a specific channel
 * @param channelNumber - The channel number to monitor
 * @param callback - Function to call when audio is resumed
 * @example
 * ```typescript
 * onAudioResume(0, (channelNumber, info) => {
 *   hidePauseIndicator();
 *   logResumeEvent(info.fileName, info.currentTime);
 * });
 * ```
 */
const onAudioResume = (channelNumber, callback) => {
    if (!exports.audioChannels[channelNumber]) {
        exports.audioChannels[channelNumber] = {
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
    const channel = exports.audioChannels[channelNumber];
    if (!channel.audioResumeCallbacks) {
        channel.audioResumeCallbacks = new Set();
    }
    channel.audioResumeCallbacks.add(callback);
};
exports.onAudioResume = onAudioResume;
/**
 * Removes pause event listeners for a specific channel
 * @param channelNumber - The channel number
 * @example
 * ```typescript
 * offAudioPause(0); // Stop receiving pause notifications for channel 0
 * ```
 */
const offAudioPause = (channelNumber) => {
    const channel = exports.audioChannels[channelNumber];
    if (!channel || !channel.audioPauseCallbacks)
        return;
    channel.audioPauseCallbacks.clear();
};
exports.offAudioPause = offAudioPause;
/**
 * Removes resume event listeners for a specific channel
 * @param channelNumber - The channel number
 * @example
 * ```typescript
 * offAudioResume(0); // Stop receiving resume notifications for channel 0
 * ```
 */
const offAudioResume = (channelNumber) => {
    const channel = exports.audioChannels[channelNumber];
    if (!channel || !channel.audioResumeCallbacks)
        return;
    channel.audioResumeCallbacks.clear();
};
exports.offAudioResume = offAudioResume;
