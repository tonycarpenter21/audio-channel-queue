"use strict";
/**
 * @fileoverview Core queue management functions for the audioq package
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
exports.destroyAllChannels = exports.destroyChannel = exports.stopAllAudio = exports.stopAllAudioInChannel = exports.stopCurrentAudioInChannel = exports.playAudioQueue = exports.queueAudioPriority = exports.queueAudio = exports.setChannelQueueLimit = exports.getQueueConfig = exports.setQueueConfig = void 0;
const types_1 = require("./types");
const info_1 = require("./info");
const utils_1 = require("./utils");
const events_1 = require("./events");
const volume_1 = require("./volume");
const errors_1 = require("./errors");
/**
 * Global queue configuration
 */
let globalQueueConfig = {
    defaultMaxQueueSize: undefined, // unlimited by default
    dropOldestWhenFull: false,
    showQueueWarnings: true
};
/**
 * Operation lock timeout in milliseconds
 */
const OPERATION_LOCK_TIMEOUT = 100;
/**
 * Acquires an operation lock for a channel to prevent race conditions
 * @param channelNumber - The channel number to lock
 * @param operationName - Name of the operation for debugging
 * @returns Promise that resolves when lock is acquired
 * @internal
 */
const acquireChannelLock = (channelNumber, operationName) => __awaiter(void 0, void 0, void 0, function* () {
    const channel = info_1.audioChannels[channelNumber];
    if (!channel)
        return;
    const startTime = Date.now();
    // Wait for any existing lock to be released
    while (channel.isLocked) {
        // Prevent infinite waiting with timeout
        if (Date.now() - startTime > OPERATION_LOCK_TIMEOUT) {
            // eslint-disable-next-line no-console
            console.warn(`Operation lock timeout for channel ${channelNumber} during ${operationName}. ` +
                `Forcibly acquiring lock.`);
            break;
        }
        // Small delay to prevent tight polling
        yield new Promise((resolve) => setTimeout(resolve, 10));
    }
    channel.isLocked = true;
});
/**
 * Releases an operation lock for a channel
 * @param channelNumber - The channel number to unlock
 * @internal
 */
const releaseChannelLock = (channelNumber) => {
    const channel = info_1.audioChannels[channelNumber];
    if (channel) {
        channel.isLocked = false;
    }
};
/**
 * Executes an operation with channel lock protection
 * @param channelNumber - The channel number to operate on
 * @param operationName - Name of the operation for debugging
 * @param operation - The operation to execute
 * @returns Promise that resolves with the operation result
 * @internal
 */
const withChannelLock = (channelNumber, operationName, operation) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield acquireChannelLock(channelNumber, operationName);
        return yield operation();
    }
    finally {
        releaseChannelLock(channelNumber);
    }
});
/**
 * Sets the global queue configuration
 * @param config - Queue configuration options
 * @example
 * ```typescript
 * setQueueConfig({
 *   defaultMaxQueueSize: 50,
 *   dropOldestWhenFull: true,
 *   showQueueWarnings: true
 * });
 * ```
 */
const setQueueConfig = (config) => {
    globalQueueConfig = Object.assign(Object.assign({}, globalQueueConfig), config);
};
exports.setQueueConfig = setQueueConfig;
/**
 * Gets the current global queue configuration
 * @returns Current queue configuration
 * @example
 * ```typescript
 * const config = getQueueConfig();
 * console.log(`Default max queue size: ${config.defaultMaxQueueSize}`);
 * ```
 */
const getQueueConfig = () => {
    return Object.assign({}, globalQueueConfig);
};
exports.getQueueConfig = getQueueConfig;
/**
 * Sets the maximum queue size for a specific channel
 * @param channelNumber - The channel number to configure
 * @param maxSize - Maximum queue size (undefined for unlimited)
 * @throws Error if the channel number exceeds the maximum allowed channels
 * @example
 * ```typescript
 * setChannelQueueLimit(0, 25); // Limit channel 0 to 25 items
 * setChannelQueueLimit(1, undefined); // Remove limit for channel 1
 * ```
 */
const setChannelQueueLimit = (channelNumber, maxSize) => {
    // Validate channel number limits BEFORE creating any channels
    if (channelNumber < 0) {
        throw new Error('Channel number must be non-negative');
    }
    if (channelNumber >= types_1.MAX_CHANNELS) {
        throw new Error(`Channel number ${channelNumber} exceeds maximum allowed channels (${types_1.MAX_CHANNELS})`);
    }
    // Ensure channel exists (now safe because we validated the limit above)
    while (info_1.audioChannels.length <= channelNumber) {
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
    const channel = info_1.audioChannels[channelNumber];
    channel.maxQueueSize = maxSize;
};
exports.setChannelQueueLimit = setChannelQueueLimit;
/**
 * Checks if adding an item to the queue would exceed limits and handles the situation
 * @param channel - The channel to check
 * @param channelNumber - The channel number for logging
 * @param maxQueueSize - Override max queue size from options
 * @returns true if the item can be added, false otherwise
 * @internal
 */
const checkQueueLimit = (channel, channelNumber, maxQueueSize) => {
    var _a;
    // Determine the effective queue limit
    const effectiveLimit = (_a = maxQueueSize !== null && maxQueueSize !== void 0 ? maxQueueSize : channel.maxQueueSize) !== null && _a !== void 0 ? _a : globalQueueConfig.defaultMaxQueueSize;
    if (effectiveLimit === undefined) {
        return true; // No limit set
    }
    if (channel.queue.length < effectiveLimit) {
        return true; // Within limits
    }
    // Queue is at or over the limit
    if (globalQueueConfig.showQueueWarnings) {
        // eslint-disable-next-line no-console
        console.warn(`Queue limit reached for channel ${channelNumber}. ` +
            `Current size: ${channel.queue.length}, Limit: ${effectiveLimit}`);
    }
    if (globalQueueConfig.dropOldestWhenFull) {
        // Remove oldest item (but not currently playing)
        if (channel.queue.length > 1) {
            const removedAudio = channel.queue.splice(1, 1)[0];
            (0, events_1.cleanupProgressTracking)(removedAudio, channelNumber, info_1.audioChannels);
            if (globalQueueConfig.showQueueWarnings) {
                // eslint-disable-next-line no-console
                console.warn(`Dropped oldest queued item to make room for new audio`);
            }
            return true;
        }
    }
    // Cannot add - queue is full and not dropping oldest
    return false;
};
/**
 * Queues an audio file to a specific channel and starts playing if it's the first in queue
 * @param audioUrl - The URL of the audio file to queue
 * @param channelNumber - The channel number to queue the audio to (defaults to 0)
 * @param options - Optional configuration for the audio file
 * @returns Promise that resolves when the audio is queued and starts playing (if first in queue)
 * @throws Error if the audio URL is invalid or potentially malicious
 * @throws Error if the channel number exceeds the maximum allowed channels
 * @throws Error if the queue size limit would be exceeded
 * @example
 * ```typescript
 * await queueAudio('https://example.com/song.mp3', 0);
 * await queueAudio('./sounds/notification.wav'); // Uses default channel 0
 * await queueAudio('./music/loop.mp3', 1, { loop: true }); // Loop the audio
 * await queueAudio('./urgent.wav', 0, { addToFront: true }); // Add to front of queue
 * await queueAudio('./limited.mp3', 0, { maxQueueSize: 10 }); // Limit this queue to 10 items
 * ```
 */
const queueAudio = (audioUrl_1, ...args_1) => __awaiter(void 0, [audioUrl_1, ...args_1], void 0, function* (audioUrl, channelNumber = 0, options) {
    // Validate the URL for security
    const validatedUrl = (0, utils_1.validateAudioUrl)(audioUrl);
    // Check channel number limits
    if (channelNumber < 0) {
        throw new Error('Channel number must be non-negative');
    }
    if (channelNumber >= types_1.MAX_CHANNELS) {
        throw new Error(`Channel number ${channelNumber} exceeds maximum allowed channels (${types_1.MAX_CHANNELS})`);
    }
    // Ensure the channel exists
    while (info_1.audioChannels.length <= channelNumber) {
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
    const channel = info_1.audioChannels[channelNumber];
    // Check queue size limits before creating audio element
    if (!checkQueueLimit(channel, channelNumber, options === null || options === void 0 ? void 0 : options.maxQueueSize)) {
        throw new Error(`Queue size limit exceeded for channel ${channelNumber}`);
    }
    const audio = new Audio(validatedUrl);
    // Set up comprehensive error handling
    (0, errors_1.setupAudioErrorHandling)(audio, channelNumber, validatedUrl, (error) => __awaiter(void 0, void 0, void 0, function* () {
        yield (0, errors_1.handleAudioError)(audio, channelNumber, validatedUrl, error);
    }));
    // Initialize Web Audio API support if needed
    yield (0, volume_1.initializeWebAudioForAudio)(audio, channelNumber);
    // Apply options if provided
    if (options) {
        if (typeof options.loop === 'boolean') {
            audio.loop = options.loop;
        }
        if (typeof options.volume === 'number' && !isNaN(options.volume)) {
            const clampedVolume = Math.max(0, Math.min(1, options.volume));
            audio.volume = clampedVolume;
            // Set channel volume to match the audio volume
            channel.volume = clampedVolume;
        }
        // Set channel-specific queue limit if provided
        if (typeof options.maxQueueSize === 'number') {
            channel.maxQueueSize = options.maxQueueSize;
        }
    }
    // Handle addToFront option
    const shouldAddToFront = options === null || options === void 0 ? void 0 : options.addToFront;
    // Add to queue based on addToFront option
    if (shouldAddToFront && channel.queue.length > 0) {
        // Insert after currently playing track (at index 1)
        channel.queue.splice(1, 0, audio);
    }
    else if (shouldAddToFront) {
        // If queue is empty, add to front
        channel.queue.unshift(audio);
    }
    else {
        // Add to back of queue
        channel.queue.push(audio);
    }
    // Emit queue change event
    (0, events_1.emitQueueChange)(channelNumber, info_1.audioChannels);
    // Start playing if this is the first item and channel isn't paused
    if (channel.queue.length === 1 && !channel.isPaused) {
        // Await the audio setup to complete before resolving queueAudio
        yield (0, exports.playAudioQueue)(channelNumber);
    }
});
exports.queueAudio = queueAudio;
/**
 * Adds an audio file to the front of the queue in a specific channel
 * This is a convenience function that places the audio right after the currently playing track
 * @param audioUrl - The URL of the audio file to queue
 * @param channelNumber - The channel number to queue the audio to (defaults to 0)
 * @param options - Optional configuration for the audio file
 * @returns Promise that resolves when the audio is queued
 * @example
 * ```typescript
 * await queueAudioPriority('./urgent-announcement.wav', 0);
 * await queueAudioPriority('./priority-sound.mp3', 1, { loop: true });
 * ```
 */
const queueAudioPriority = (audioUrl_1, ...args_1) => __awaiter(void 0, [audioUrl_1, ...args_1], void 0, function* (audioUrl, channelNumber = 0, options) {
    const priorityOptions = Object.assign(Object.assign({}, options), { addToFront: true });
    return (0, exports.queueAudio)(audioUrl, channelNumber, priorityOptions);
});
exports.queueAudioPriority = queueAudioPriority;
/**
 * Plays the audio queue for a specific channel
 * @param channelNumber - The channel number to play
 * @returns Promise that resolves when the audio starts playing (setup complete)
 * @example
 * ```typescript
 * await playAudioQueue(0); // Start playing queue for channel 0
 * ```
 */
const playAudioQueue = (channelNumber) => __awaiter(void 0, void 0, void 0, function* () {
    const channel = info_1.audioChannels[channelNumber];
    if (!channel || channel.queue.length === 0)
        return;
    const currentAudio = channel.queue[0];
    // Apply channel volume with global volume multiplier if not already set
    if (currentAudio.volume === 1.0 && channel.volume !== undefined) {
        const globalVolume = (0, volume_1.getGlobalVolume)();
        currentAudio.volume = channel.volume * globalVolume;
    }
    (0, events_1.setupProgressTracking)(currentAudio, channelNumber, info_1.audioChannels);
    // Apply volume ducking when audio starts
    yield (0, volume_1.applyVolumeDucking)(channelNumber);
    return new Promise((resolve) => {
        let hasStarted = false;
        let metadataLoaded = false;
        let playStarted = false;
        let setupComplete = false;
        // Check if we should fire onAudioStart (both conditions met)
        const tryFireAudioStart = () => {
            if (!hasStarted && metadataLoaded && playStarted) {
                hasStarted = true;
                (0, events_1.emitAudioStart)(channelNumber, {
                    channelNumber,
                    duration: currentAudio.duration * 1000,
                    fileName: (0, utils_1.extractFileName)(currentAudio.src),
                    src: currentAudio.src
                }, info_1.audioChannels);
                // Resolve setup promise when audio start event is fired
                if (!setupComplete) {
                    setupComplete = true;
                    resolve();
                }
            }
        };
        // Event handler for when metadata loads (duration becomes available)
        const handleLoadedMetadata = () => {
            metadataLoaded = true;
            tryFireAudioStart();
        };
        // Event handler for when audio actually starts playing
        const handlePlay = () => {
            playStarted = true;
            tryFireAudioStart();
        };
        // Event handler for when audio ends
        const handleEnded = () => __awaiter(void 0, void 0, void 0, function* () {
            (0, events_1.emitAudioComplete)(channelNumber, {
                channelNumber,
                fileName: (0, utils_1.extractFileName)(currentAudio.src),
                remainingInQueue: channel.queue.length - 1,
                src: currentAudio.src
            }, info_1.audioChannels);
            // Handle looping vs non-looping audio
            if (currentAudio.loop) {
                // For looping audio, keep in queue and try to restart playback
                currentAudio.currentTime = 0;
                try {
                    yield currentAudio.play();
                }
                catch (error) {
                    yield (0, errors_1.handleAudioError)(currentAudio, channelNumber, currentAudio.src, error);
                }
            }
            else {
                // For non-looping audio, remove from queue and play next
                currentAudio.pause();
                (0, events_1.cleanupProgressTracking)(currentAudio, channelNumber, info_1.audioChannels);
                (0, volume_1.cleanupWebAudioForAudio)(currentAudio, channelNumber);
                channel.queue.shift();
                channel.isPaused = false; // Reset pause state
                // Restore volume levels AFTER removing audio from queue
                yield (0, volume_1.restoreVolumeLevels)(channelNumber);
                (0, events_1.emitQueueChange)(channelNumber, info_1.audioChannels);
                // Play next audio immediately if there's more in queue
                yield (0, exports.playAudioQueue)(channelNumber);
            }
        });
        // Add event listeners
        currentAudio.addEventListener('loadedmetadata', handleLoadedMetadata);
        currentAudio.addEventListener('play', handlePlay);
        currentAudio.addEventListener('ended', handleEnded);
        // Check if metadata is already loaded (in case it loads before we add the listener)
        if (currentAudio.readyState >= 1) {
            metadataLoaded = true;
        }
        // Enhanced play with error handling
        currentAudio.play().catch((error) => __awaiter(void 0, void 0, void 0, function* () {
            yield (0, errors_1.handleAudioError)(currentAudio, channelNumber, currentAudio.src, error);
            if (!setupComplete) {
                setupComplete = true;
                resolve(); // Resolve gracefully instead of rejecting
            }
        }));
    });
});
exports.playAudioQueue = playAudioQueue;
/**
 * Stops the currently playing audio in a specific channel and plays the next audio in queue
 * @param channelNumber - The channel number (defaults to 0)
 * @example
 * ```typescript
 * await stopCurrentAudioInChannel(); // Stop current audio in default channel (0)
 * await stopCurrentAudioInChannel(1); // Stop current audio in channel 1
 * ```
 */
const stopCurrentAudioInChannel = (...args_1) => __awaiter(void 0, [...args_1], void 0, function* (channelNumber = 0) {
    const channel = info_1.audioChannels[channelNumber];
    if (channel && channel.queue.length > 0) {
        const currentAudio = channel.queue[0];
        (0, events_1.emitAudioComplete)(channelNumber, {
            channelNumber,
            fileName: (0, utils_1.extractFileName)(currentAudio.src),
            remainingInQueue: channel.queue.length - 1,
            src: currentAudio.src
        }, info_1.audioChannels);
        currentAudio.pause();
        (0, events_1.cleanupProgressTracking)(currentAudio, channelNumber, info_1.audioChannels);
        channel.queue.shift();
        channel.isPaused = false; // Reset pause state
        // Restore volume levels AFTER removing from queue (so queue.length check works correctly)
        yield (0, volume_1.restoreVolumeLevels)(channelNumber);
        (0, events_1.emitQueueChange)(channelNumber, info_1.audioChannels);
        // Start next audio immediately if there's more in queue
        if (channel.queue.length > 0) {
            // eslint-disable-next-line no-console
            (0, exports.playAudioQueue)(channelNumber).catch(console.error);
        }
    }
});
exports.stopCurrentAudioInChannel = stopCurrentAudioInChannel;
/**
 * Stops all audio in a specific channel and clears the entire queue
 * @param channelNumber - The channel number (defaults to 0)
 * @example
 * ```typescript
 * await stopAllAudioInChannel(); // Clear all audio in default channel (0)
 * await stopAllAudioInChannel(1); // Clear all audio in channel 1
 * ```
 */
const stopAllAudioInChannel = (...args_1) => __awaiter(void 0, [...args_1], void 0, function* (channelNumber = 0) {
    return withChannelLock(channelNumber, 'stopAllAudioInChannel', () => __awaiter(void 0, void 0, void 0, function* () {
        const channel = info_1.audioChannels[channelNumber];
        if (channel) {
            if (channel.queue.length > 0) {
                const currentAudio = channel.queue[0];
                (0, events_1.emitAudioComplete)(channelNumber, {
                    channelNumber,
                    fileName: (0, utils_1.extractFileName)(currentAudio.src),
                    remainingInQueue: 0, // Will be 0 since we're clearing the queue
                    src: currentAudio.src
                }, info_1.audioChannels);
                // Restore volume levels when stopping
                yield (0, volume_1.restoreVolumeLevels)(channelNumber);
                currentAudio.pause();
                (0, events_1.cleanupProgressTracking)(currentAudio, channelNumber, info_1.audioChannels);
            }
            // Clean up all progress tracking for this channel
            channel.queue.forEach((audio) => (0, events_1.cleanupProgressTracking)(audio, channelNumber, info_1.audioChannels));
            channel.queue = [];
            channel.isPaused = false; // Reset pause state
            (0, events_1.emitQueueChange)(channelNumber, info_1.audioChannels);
        }
    }));
});
exports.stopAllAudioInChannel = stopAllAudioInChannel;
/**
 * Stops all audio across all channels and clears all queues
 * @example
 * ```typescript
 * await stopAllAudio(); // Emergency stop - clears everything
 * ```
 */
const stopAllAudio = () => __awaiter(void 0, void 0, void 0, function* () {
    const stopPromises = [];
    info_1.audioChannels.forEach((_channel, index) => {
        stopPromises.push((0, exports.stopAllAudioInChannel)(index));
    });
    yield Promise.all(stopPromises);
});
exports.stopAllAudio = stopAllAudio;
/**
 * Completely destroys a channel and cleans up all associated resources
 * This stops all audio, cancels transitions, clears callbacks, and removes the channel
 * @param channelNumber - The channel number to destroy (defaults to 0)
 * @example
 * ```typescript
 * await destroyChannel(1); // Completely removes channel 1 and cleans up resources
 * ```
 */
const destroyChannel = (...args_1) => __awaiter(void 0, [...args_1], void 0, function* (channelNumber = 0) {
    const channel = info_1.audioChannels[channelNumber];
    if (!channel)
        return;
    // Comprehensive cleanup of all audio elements in the queue
    if (channel.queue && channel.queue.length > 0) {
        channel.queue.forEach((audio) => {
            // Properly clean up each audio element
            const cleanAudio = audio;
            cleanAudio.pause();
            cleanAudio.currentTime = 0;
            // Remove all event listeners if possible
            if (cleanAudio.parentNode) {
                cleanAudio.parentNode.removeChild(cleanAudio);
            }
            // Clean up audio attributes
            cleanAudio.removeAttribute('src');
            // Reset audio element state
            if (cleanAudio.src) {
                // Copy essential properties
                cleanAudio.src = '';
                try {
                    cleanAudio.load();
                }
                catch (_a) {
                    // Ignore load errors in tests (jsdom limitation)
                }
            }
        });
    }
    // Stop all audio in the channel (this handles additional cleanup)
    yield (0, exports.stopAllAudioInChannel)(channelNumber);
    // Cancel any active volume transitions
    (0, volume_1.cancelVolumeTransition)(channelNumber);
    // Clear all callback sets completely
    const callbackProperties = [
        'audioCompleteCallbacks',
        'audioErrorCallbacks',
        'audioPauseCallbacks',
        'audioResumeCallbacks',
        'audioStartCallbacks',
        'queueChangeCallbacks',
        'progressCallbacks'
    ];
    callbackProperties.forEach((prop) => {
        if (channel[prop]) {
            channel[prop].clear();
        }
    });
    // Remove optional channel configuration
    delete channel.fadeState;
    delete channel.retryConfig;
    // Reset required properties to clean state
    channel.isPaused = false;
    channel.volume = 1.0;
    channel.queue = [];
    // Remove the channel completely
    delete info_1.audioChannels[channelNumber];
});
exports.destroyChannel = destroyChannel;
/**
 * Destroys all channels and cleans up all resources
 * This is useful for complete cleanup when the audio system is no longer needed
 * @example
 * ```typescript
 * await destroyAllChannels(); // Complete cleanup - removes all channels
 * ```
 */
const destroyAllChannels = () => __awaiter(void 0, void 0, void 0, function* () {
    const destroyPromises = [];
    // Collect indices of existing channels
    const channelIndices = [];
    info_1.audioChannels.forEach((_channel, index) => {
        if (info_1.audioChannels[index]) {
            channelIndices.push(index);
        }
    });
    // Destroy all channels in parallel
    channelIndices.forEach((index) => {
        destroyPromises.push((0, exports.destroyChannel)(index));
    });
    yield Promise.all(destroyPromises);
    // Clear the entire array
    info_1.audioChannels.length = 0;
});
exports.destroyAllChannels = destroyAllChannels;
