"use strict";
/**
 * @fileoverview Audio information and progress tracking functions for the audioq package
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.offAudioComplete = exports.offAudioStart = exports.offAudioResume = exports.offAudioPause = exports.onAudioResume = exports.onAudioPause = exports.onAudioComplete = exports.onAudioStart = exports.offQueueChange = exports.onQueueChange = exports.onAudioProgress = exports.getQueueSnapshot = exports.getAllChannelsInfo = exports.getCurrentAudioInfo = exports.audioChannels = exports.getNonWhitelistedChannelProperties = exports.getWhitelistedChannelProperties = void 0;
exports.offAudioProgress = offAudioProgress;
const types_1 = require("./types");
const utils_1 = require("./utils");
const events_1 = require("./events");
/**
 * Gets the current list of whitelisted channel properties
 * This is automatically derived from the ExtendedAudioQueueChannel interface
 * @returns Array of whitelisted property names
 * @internal
 */
const getWhitelistedChannelProperties = () => {
    // Create a sample channel object to extract property names
    const sampleChannel = {
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
    // Get all property names from the interface (including optional ones)
    const propertyNames = [
        ...Object.getOwnPropertyNames(sampleChannel),
        // Add optional properties that might not be present on the sample
        'fadeState',
        'isLocked',
        'maxQueueSize',
        'retryConfig',
        'volumeConfig', // Legacy property that might still be used
        'webAudioContext', // Web Audio API context
        'webAudioNodes' // Web Audio API nodes map
    ];
    return [...new Set(propertyNames)]; // Remove duplicates
};
exports.getWhitelistedChannelProperties = getWhitelistedChannelProperties;
/**
 * Returns the list of non-whitelisted properties found on a specific channel
 * These are properties that will trigger warnings when modified directly
 * @param channelNumber - The channel number to inspect (defaults to 0)
 * @returns Array of property names that are not in the whitelist, or empty array if channel doesn't exist
 * @example
 * ```typescript
 * // Add some custom property to a channel
 * (audioChannels[0] as any).customProperty = 'test';
 *
 * const nonWhitelisted = getNonWhitelistedChannelProperties(0);
 * console.log(nonWhitelisted); // ['customProperty']
 * ```
 * @internal
 */
const getNonWhitelistedChannelProperties = (channelNumber = 0) => {
    const channel = exports.audioChannels[channelNumber];
    if (!channel) {
        return [];
    }
    const whitelistedProperties = (0, exports.getWhitelistedChannelProperties)();
    const allChannelProperties = Object.getOwnPropertyNames(channel);
    // Filter out properties that are in the whitelist
    const nonWhitelistedProperties = allChannelProperties.filter((property) => !whitelistedProperties.includes(property));
    return nonWhitelistedProperties;
};
exports.getNonWhitelistedChannelProperties = getNonWhitelistedChannelProperties;
/**
 * Global array to store audio channels with their queues and callback management
 * Each channel maintains its own audio queue and event callback sets
 *
 * Note: While you can inspect this array for debugging, direct modification is discouraged.
 * Use the provided API functions for safe channel management.
 */
exports.audioChannels = new Proxy([], {
    deleteProperty(target, prop) {
        if (typeof prop === 'string' && !isNaN(Number(prop))) {
            // eslint-disable-next-line no-console
            console.warn('Warning: Direct deletion from audioChannels detected. ' +
                'Consider using stopAllAudioInChannel() for proper cleanup.');
        }
        delete target[prop];
        return true;
    },
    get(target, prop) {
        const value = target[prop];
        // Return channel objects with warnings on modification attempts
        if (typeof value === 'object' &&
            value !== null &&
            typeof prop === 'string' &&
            !isNaN(Number(prop))) {
            return new Proxy(value, {
                set(channelTarget, channelProp, channelValue) {
                    // Allow internal modifications but warn about direct property changes
                    // Use the automatically-derived whitelist from the interface
                    const whitelistedProperties = (0, exports.getWhitelistedChannelProperties)();
                    if (typeof channelProp === 'string' && !whitelistedProperties.includes(channelProp)) {
                        // eslint-disable-next-line no-console
                        console.warn(`Warning: Direct modification of channel.${channelProp} detected. ` +
                            'Use API functions for safer channel management.');
                    }
                    const key = typeof channelProp === 'symbol' ? channelProp.toString() : channelProp;
                    channelTarget[key] = channelValue;
                    return true;
                }
            });
        }
        return value;
    },
    set(target, prop, value) {
        // Allow normal array operations
        const key = typeof prop === 'symbol' ? prop.toString() : prop;
        target[key] = value;
        return true;
    }
});
/**
 * Validates a channel number against MAX_CHANNELS limit
 * @param channelNumber - The channel number to validate
 * @throws Error if the channel number is invalid
 * @internal
 */
const validateChannelNumber = (channelNumber) => {
    if (channelNumber < 0) {
        throw new Error('Channel number must be non-negative');
    }
    if (channelNumber >= types_1.MAX_CHANNELS) {
        throw new Error(`Channel number ${channelNumber} exceeds maximum allowed channels (${types_1.MAX_CHANNELS})`);
    }
};
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
 * @param channelNumber - The channel number (defaults to 0)
 * @returns QueueSnapshot object or null if channel doesn't exist
 * @example
 * ```typescript
 * const snapshot = getQueueSnapshot();
 * if (snapshot) {
 *   console.log(`Queue has ${snapshot.totalItems} items`);
 *   console.log(`Currently playing: ${snapshot.items[0]?.fileName}`);
 * }
 * const channelSnapshot = getQueueSnapshot(2);
 * ```
 */
const getQueueSnapshot = (channelNumber = 0) => {
    return (0, utils_1.createQueueSnapshot)(channelNumber, exports.audioChannels);
};
exports.getQueueSnapshot = getQueueSnapshot;
/**
 * Subscribes to real-time progress updates for a specific channel
 * @param channelNumber - The channel number
 * @param callback - Function to call with audio info updates
 * @throws Error if the channel number exceeds the maximum allowed channels
 * @example
 * ```typescript
 * onAudioProgress(0, (info) => {
 *   updateProgressBar(info.progress);
 *   updateTimeDisplay(info.currentTime, info.duration);
 * });
 * ```
 */
const onAudioProgress = (channelNumber, callback) => {
    validateChannelNumber(channelNumber);
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
    if (!channel.progressCallbacks.has(types_1.GLOBAL_PROGRESS_KEY)) {
        channel.progressCallbacks.set(types_1.GLOBAL_PROGRESS_KEY, new Set());
    }
    channel.progressCallbacks.get(types_1.GLOBAL_PROGRESS_KEY).add(callback);
};
exports.onAudioProgress = onAudioProgress;
/**
 * Removes progress listeners for a specific channel
 * @param channelNumber - The channel number (defaults to 0)
 * @example
 * ```typescript
 * offAudioProgress();
 * offAudioProgress(1); // Stop receiving progress updates for channel 1
 * ```
 */
function offAudioProgress(channelNumber = 0) {
    const channel = exports.audioChannels[channelNumber];
    if (!(channel === null || channel === void 0 ? void 0 : channel.progressCallbacks))
        return;
    // Clean up event listeners for current audio if exists
    if (channel.queue.length > 0) {
        const currentAudio = channel.queue[0];
        (0, events_1.cleanupProgressTracking)(currentAudio, channelNumber, exports.audioChannels);
    }
    // Clear all callbacks for this channel
    channel.progressCallbacks.clear();
}
/**
 * Subscribes to queue change events for a specific channel
 * @param channelNumber - The channel number to monitor
 * @param callback - Function to call when queue changes
 * @throws Error if the channel number exceeds the maximum allowed channels
 * @example
 * ```typescript
 * onQueueChange(0, (snapshot) => {
 *   updateQueueDisplay(snapshot.items);
 *   updateQueueCount(snapshot.totalItems);
 * });
 * ```
 */
const onQueueChange = (channelNumber, callback) => {
    validateChannelNumber(channelNumber);
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
 * @param channelNumber - The channel number (defaults to 0)
 * @example
 * ```typescript
 * offQueueChange(); // Stop receiving queue change notifications for default channel (0)
 * offQueueChange(1); // Stop receiving queue change notifications for channel 1
 * ```
 */
const offQueueChange = (channelNumber = 0) => {
    const channel = exports.audioChannels[channelNumber];
    if (!(channel === null || channel === void 0 ? void 0 : channel.queueChangeCallbacks))
        return;
    channel.queueChangeCallbacks.clear();
};
exports.offQueueChange = offQueueChange;
/**
 * Subscribes to audio start events for a specific channel
 * @param channelNumber - The channel number to monitor
 * @param callback - Function to call when audio starts playing
 * @throws Error if the channel number exceeds the maximum allowed channels
 * @example
 * ```typescript
 * onAudioStart(0, (info) => {
 *   showNowPlaying(info.fileName);
 *   setTotalDuration(info.duration);
 * });
 * ```
 */
const onAudioStart = (channelNumber, callback) => {
    validateChannelNumber(channelNumber);
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
 * @throws Error if the channel number exceeds the maximum allowed channels
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
    validateChannelNumber(channelNumber);
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
 * @throws Error if the channel number exceeds the maximum allowed channels
 * @example
 * ```typescript
 * onAudioPause(0, (channelNumber, info) => {
 *   showPauseIndicator();
 *   logPauseEvent(info.fileName, info.currentTime);
 * });
 * ```
 */
const onAudioPause = (channelNumber, callback) => {
    validateChannelNumber(channelNumber);
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
 * @throws Error if the channel number exceeds the maximum allowed channels
 * @example
 * ```typescript
 * onAudioResume(0, (channelNumber, info) => {
 *   hidePauseIndicator();
 *   logResumeEvent(info.fileName, info.currentTime);
 * });
 * ```
 */
const onAudioResume = (channelNumber, callback) => {
    validateChannelNumber(channelNumber);
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
 * @param channelNumber - The channel number (defaults to 0)
 * @example
 * ```typescript
 * offAudioPause(); // Stop receiving pause notifications for default channel (0)
 * offAudioPause(1); // Stop receiving pause notifications for channel 1
 * ```
 */
const offAudioPause = (channelNumber = 0) => {
    const channel = exports.audioChannels[channelNumber];
    if (!(channel === null || channel === void 0 ? void 0 : channel.audioPauseCallbacks))
        return;
    channel.audioPauseCallbacks.clear();
};
exports.offAudioPause = offAudioPause;
/**
 * Removes resume event listeners for a specific channel
 * @param channelNumber - The channel number (defaults to 0)
 * @example
 * ```typescript
 * offAudioResume(); // Stop receiving resume notifications for default channel (0)
 * offAudioResume(1); // Stop receiving resume notifications for channel 1
 * ```
 */
const offAudioResume = (channelNumber = 0) => {
    const channel = exports.audioChannels[channelNumber];
    if (!(channel === null || channel === void 0 ? void 0 : channel.audioResumeCallbacks))
        return;
    channel.audioResumeCallbacks.clear();
};
exports.offAudioResume = offAudioResume;
/**
 * Removes audio start event listeners for a specific channel
 * @param channelNumber - The channel number (defaults to 0)
 * @example
 * ```typescript
 * offAudioStart(); // Stop receiving start notifications for default channel (0)
 * offAudioStart(1); // Stop receiving start notifications for channel 1
 * ```
 */
const offAudioStart = (channelNumber = 0) => {
    const channel = exports.audioChannels[channelNumber];
    if (!(channel === null || channel === void 0 ? void 0 : channel.audioStartCallbacks))
        return;
    channel.audioStartCallbacks.clear();
};
exports.offAudioStart = offAudioStart;
/**
 * Removes audio complete event listeners for a specific channel
 * @param channelNumber - The channel number (defaults to 0)
 * @example
 * ```typescript
 * offAudioComplete(); // Stop receiving completion notifications for default channel (0)
 * offAudioComplete(1); // Stop receiving completion notifications for channel 1
 * ```
 */
const offAudioComplete = (channelNumber = 0) => {
    const channel = exports.audioChannels[channelNumber];
    if (!(channel === null || channel === void 0 ? void 0 : channel.audioCompleteCallbacks))
        return;
    channel.audioCompleteCallbacks.clear();
};
exports.offAudioComplete = offAudioComplete;
