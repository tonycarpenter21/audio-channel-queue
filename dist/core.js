"use strict";
/**
 * @fileoverview Core queue management functions for the audio-channel-queue package
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
exports.stopAllAudio = exports.stopAllAudioInChannel = exports.stopCurrentAudioInChannel = exports.playAudioQueue = exports.queueAudioPriority = exports.queueAudio = void 0;
const info_1 = require("./info");
const utils_1 = require("./utils");
const events_1 = require("./events");
const volume_1 = require("./volume");
const errors_1 = require("./errors");
/**
 * Queues an audio file to a specific channel and starts playing if it's the first in queue
 * @param audioUrl - The URL of the audio file to queue
 * @param channelNumber - The channel number to queue the audio to (defaults to 0)
 * @param options - Optional configuration for the audio file
 * @returns Promise that resolves when the audio is queued and starts playing (if first in queue)
 * @example
 * ```typescript
 * await queueAudio('https://example.com/song.mp3', 0);
 * await queueAudio('./sounds/notification.wav'); // Uses default channel 0
 * await queueAudio('./music/loop.mp3', 1, { loop: true }); // Loop the audio
 * await queueAudio('./urgent.wav', 0, { addToFront: true }); // Add to front of queue
 * ```
 */
const queueAudio = (audioUrl_1, ...args_1) => __awaiter(void 0, [audioUrl_1, ...args_1], void 0, function* (audioUrl, channelNumber = 0, options) {
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
    const audio = new Audio(audioUrl);
    // Set up comprehensive error handling
    (0, errors_1.setupAudioErrorHandling)(audio, channelNumber, audioUrl, (error) => __awaiter(void 0, void 0, void 0, function* () {
        yield (0, errors_1.handleAudioError)(audio, channelNumber, audioUrl, error);
    }));
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
    }
    // Handle priority option (same as addToFront for backward compatibility)
    const shouldAddToFront = (options === null || options === void 0 ? void 0 : options.addToFront) || (options === null || options === void 0 ? void 0 : options.priority);
    // Add to queue based on priority/addToFront option
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
        // Use setTimeout to ensure the queue change event is emitted first
        setTimeout(() => {
            (0, exports.playAudioQueue)(channelNumber).catch((error) => {
                (0, errors_1.handleAudioError)(audio, channelNumber, audioUrl, error);
            });
        }, 0);
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
 * @returns Promise that resolves when the current audio finishes playing
 * @example
 * ```typescript
 * await playAudioQueue(0); // Play queue for channel 0
 * ```
 */
const playAudioQueue = (channelNumber) => __awaiter(void 0, void 0, void 0, function* () {
    const channel = info_1.audioChannels[channelNumber];
    if (!channel || channel.queue.length === 0)
        return;
    const currentAudio = channel.queue[0];
    // Apply channel volume if not already set
    if (currentAudio.volume === 1.0 && channel.volume !== undefined) {
        currentAudio.volume = channel.volume;
    }
    (0, events_1.setupProgressTracking)(currentAudio, channelNumber, info_1.audioChannels);
    // Apply volume ducking when audio starts
    yield (0, volume_1.applyVolumeDucking)(channelNumber);
    return new Promise((resolve) => {
        let hasStarted = false;
        let metadataLoaded = false;
        let playStarted = false;
        // Check if we should fire onAudioStart (both conditions met)
        const tryFireAudioStart = () => {
            if (!hasStarted && metadataLoaded && playStarted) {
                hasStarted = true;
                (0, events_1.emitAudioStart)(channelNumber, {
                    channelNumber,
                    duration: currentAudio.duration * 1000, // Now guaranteed to have valid duration
                    fileName: (0, utils_1.extractFileName)(currentAudio.src),
                    src: currentAudio.src
                }, info_1.audioChannels);
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
            // Restore volume levels when priority channel stops
            yield (0, volume_1.restoreVolumeLevels)(channelNumber);
            // Clean up event listeners
            currentAudio.removeEventListener('loadedmetadata', handleLoadedMetadata);
            currentAudio.removeEventListener('play', handlePlay);
            currentAudio.removeEventListener('ended', handleEnded);
            (0, events_1.cleanupProgressTracking)(currentAudio, channelNumber, info_1.audioChannels);
            // Handle looping vs non-looping audio
            if (currentAudio.loop) {
                // For looping audio, reset current time and continue playing
                currentAudio.currentTime = 0;
                try {
                    yield currentAudio.play();
                }
                catch (error) {
                    yield (0, errors_1.handleAudioError)(currentAudio, channelNumber, currentAudio.src, error);
                }
                resolve();
            }
            else {
                // For non-looping audio, remove from queue and play next
                channel.queue.shift();
                // Emit queue change after completion
                setTimeout(() => (0, events_1.emitQueueChange)(channelNumber, info_1.audioChannels), 10);
                yield (0, exports.playAudioQueue)(channelNumber);
                resolve();
            }
        });
        // Add event listeners
        currentAudio.addEventListener('loadedmetadata', handleLoadedMetadata);
        currentAudio.addEventListener('play', handlePlay);
        currentAudio.addEventListener('ended', handleEnded);
        // Check if metadata is already loaded (in case it loads before we add the listener)
        if (currentAudio.readyState >= 1) { // HAVE_METADATA or higher
            metadataLoaded = true;
        }
        // Enhanced play with error handling
        currentAudio.play().catch((error) => __awaiter(void 0, void 0, void 0, function* () {
            yield (0, errors_1.handleAudioError)(currentAudio, channelNumber, currentAudio.src, error);
            resolve(); // Resolve to prevent hanging
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
        // Restore volume levels when stopping
        yield (0, volume_1.restoreVolumeLevels)(channelNumber);
        currentAudio.pause();
        (0, events_1.cleanupProgressTracking)(currentAudio, channelNumber, info_1.audioChannels);
        channel.queue.shift();
        channel.isPaused = false; // Reset pause state
        (0, events_1.emitQueueChange)(channelNumber, info_1.audioChannels);
        // Start next audio without waiting for it to complete
        (0, exports.playAudioQueue)(channelNumber).catch(console.error);
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
        channel.queue.forEach(audio => (0, events_1.cleanupProgressTracking)(audio, channelNumber, info_1.audioChannels));
        channel.queue = [];
        channel.isPaused = false; // Reset pause state
        (0, events_1.emitQueueChange)(channelNumber, info_1.audioChannels);
    }
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
