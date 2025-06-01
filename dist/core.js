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
exports.stopAllAudio = exports.stopAllAudioInChannel = exports.stopCurrentAudioInChannel = exports.playAudioQueue = exports.queueAudio = void 0;
const info_1 = require("./info");
const utils_1 = require("./utils");
const events_1 = require("./events");
/**
 * Queues an audio file to a specific channel and starts playing if it's the first in queue
 * @param audioUrl - The URL of the audio file to queue
 * @param channelNumber - The channel number to queue the audio to (defaults to 0)
 * @returns Promise that resolves when the audio is queued and starts playing (if first in queue)
 * @example
 * ```typescript
 * await queueAudio('https://example.com/song.mp3', 0);
 * await queueAudio('./sounds/notification.wav'); // Uses default channel 0
 * ```
 */
const queueAudio = (audioUrl_1, ...args_1) => __awaiter(void 0, [audioUrl_1, ...args_1], void 0, function* (audioUrl, channelNumber = 0) {
    if (!info_1.audioChannels[channelNumber]) {
        info_1.audioChannels[channelNumber] = {
            audioCompleteCallbacks: new Set(),
            audioStartCallbacks: new Set(),
            progressCallbacks: new Map(),
            queue: [],
            queueChangeCallbacks: new Set()
        };
    }
    const audio = new Audio(audioUrl);
    info_1.audioChannels[channelNumber].queue.push(audio);
    (0, events_1.emitQueueChange)(channelNumber, info_1.audioChannels);
    if (info_1.audioChannels[channelNumber].queue.length === 1) {
        (0, exports.playAudioQueue)(channelNumber);
    }
});
exports.queueAudio = queueAudio;
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
    if (channel.queue.length === 0)
        return;
    const currentAudio = channel.queue[0];
    (0, events_1.setupProgressTracking)(currentAudio, channelNumber, info_1.audioChannels);
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
            // Clean up event listeners
            currentAudio.removeEventListener('loadedmetadata', handleLoadedMetadata);
            currentAudio.removeEventListener('play', handlePlay);
            currentAudio.removeEventListener('ended', handleEnded);
            (0, events_1.cleanupProgressTracking)(currentAudio, channelNumber, info_1.audioChannels);
            channel.queue.shift();
            // Emit queue change after completion
            setTimeout(() => (0, events_1.emitQueueChange)(channelNumber, info_1.audioChannels), 10);
            yield (0, exports.playAudioQueue)(channelNumber);
            resolve();
        });
        // Add event listeners
        currentAudio.addEventListener('loadedmetadata', handleLoadedMetadata);
        currentAudio.addEventListener('play', handlePlay);
        currentAudio.addEventListener('ended', handleEnded);
        // Check if metadata is already loaded (in case it loads before we add the listener)
        if (currentAudio.readyState >= 1) { // HAVE_METADATA or higher
            metadataLoaded = true;
        }
        currentAudio.play();
    });
});
exports.playAudioQueue = playAudioQueue;
/**
 * Stops the currently playing audio in a specific channel and plays the next audio in queue
 * @param channelNumber - The channel number (defaults to 0)
 * @example
 * ```typescript
 * stopCurrentAudioInChannel(0); // Stop current audio in channel 0
 * stopCurrentAudioInChannel(); // Stop current audio in default channel
 * ```
 */
const stopCurrentAudioInChannel = (channelNumber = 0) => {
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
        (0, events_1.emitQueueChange)(channelNumber, info_1.audioChannels);
        (0, exports.playAudioQueue)(channelNumber);
    }
};
exports.stopCurrentAudioInChannel = stopCurrentAudioInChannel;
/**
 * Stops all audio in a specific channel and clears the entire queue
 * @param channelNumber - The channel number (defaults to 0)
 * @example
 * ```typescript
 * stopAllAudioInChannel(0); // Clear all audio in channel 0
 * stopAllAudioInChannel(); // Clear all audio in default channel
 * ```
 */
const stopAllAudioInChannel = (channelNumber = 0) => {
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
            currentAudio.pause();
            (0, events_1.cleanupProgressTracking)(currentAudio, channelNumber, info_1.audioChannels);
        }
        // Clean up all progress tracking for this channel
        channel.queue.forEach(audio => (0, events_1.cleanupProgressTracking)(audio, channelNumber, info_1.audioChannels));
        channel.queue = [];
        (0, events_1.emitQueueChange)(channelNumber, info_1.audioChannels);
    }
};
exports.stopAllAudioInChannel = stopAllAudioInChannel;
/**
 * Stops all audio across all channels and clears all queues
 * @example
 * ```typescript
 * stopAllAudio(); // Emergency stop - clears everything
 * ```
 */
const stopAllAudio = () => {
    info_1.audioChannels.forEach((_channel, index) => {
        (0, exports.stopAllAudioInChannel)(index);
    });
};
exports.stopAllAudio = stopAllAudio;
