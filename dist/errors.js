"use strict";
/**
 * @fileoverview Error handling, retry logic, and recovery mechanisms for the audio-channel-queue package
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
exports.createProtectedAudioElement = exports.handleAudioError = exports.setupAudioErrorHandling = exports.categorizeError = exports.emitAudioError = exports.retryFailedAudio = exports.getErrorRecovery = exports.setErrorRecovery = exports.getRetryConfig = exports.setRetryConfig = exports.offAudioError = exports.onAudioError = void 0;
const info_1 = require("./info");
const utils_1 = require("./utils");
let globalRetryConfig = {
    enabled: true,
    maxRetries: 3,
    baseDelay: 1000,
    exponentialBackoff: true,
    timeoutMs: 10000,
    skipOnFailure: false
};
let globalErrorRecovery = {
    autoRetry: true,
    showUserFeedback: false,
    logErrorsToAnalytics: false,
    preserveQueueOnError: true,
    fallbackToNextTrack: true
};
const retryAttempts = new WeakMap();
const loadTimeouts = new WeakMap();
/**
 * Subscribes to audio error events for a specific channel
 * @param channelNumber - The channel number to listen to (defaults to 0)
 * @param callback - Function to call when an audio error occurs
 * @example
 * ```typescript
 * onAudioError(0, (errorInfo) => {
 *   console.log(`Audio error: ${errorInfo.error.message}`);
 *   console.log(`Error type: ${errorInfo.errorType}`);
 * });
 * ```
 */
const onAudioError = (channelNumber = 0, callback) => {
    // Ensure channel exists
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
    if (!channel.audioErrorCallbacks) {
        channel.audioErrorCallbacks = new Set();
    }
    channel.audioErrorCallbacks.add(callback);
};
exports.onAudioError = onAudioError;
/**
 * Unsubscribes from audio error events for a specific channel
 * @param channelNumber - The channel number to stop listening to (defaults to 0)
 * @param callback - The specific callback to remove (optional - if not provided, removes all)
 * @example
 * ```typescript
 * offAudioError(0); // Remove all error callbacks for channel 0
 * offAudioError(0, specificCallback); // Remove specific callback
 * ```
 */
const offAudioError = (channelNumber = 0, callback) => {
    const channel = info_1.audioChannels[channelNumber];
    if (!(channel === null || channel === void 0 ? void 0 : channel.audioErrorCallbacks))
        return;
    if (callback) {
        channel.audioErrorCallbacks.delete(callback);
    }
    else {
        channel.audioErrorCallbacks.clear();
    }
};
exports.offAudioError = offAudioError;
/**
 * Sets the global retry configuration for audio loading failures
 * @param config - Retry configuration options
 * @example
 * ```typescript
 * setRetryConfig({
 *   enabled: true,
 *   maxRetries: 5,
 *   baseDelay: 1000,
 *   exponentialBackoff: true,
 *   timeoutMs: 15000,
 *   fallbackUrls: ['https://cdn.backup.com/audio/'],
 *   skipOnFailure: true
 * });
 * ```
 */
const setRetryConfig = (config) => {
    globalRetryConfig = Object.assign(Object.assign({}, globalRetryConfig), config);
};
exports.setRetryConfig = setRetryConfig;
/**
 * Gets the current global retry configuration
 * @returns Current retry configuration
 * @example
 * ```typescript
 * const config = getRetryConfig();
 * console.log(`Max retries: ${config.maxRetries}`);
 * ```
 */
const getRetryConfig = () => {
    return Object.assign({}, globalRetryConfig);
};
exports.getRetryConfig = getRetryConfig;
/**
 * Sets the global error recovery configuration
 * @param options - Error recovery options
 * @example
 * ```typescript
 * setErrorRecovery({
 *   autoRetry: true,
 *   showUserFeedback: true,
 *   logErrorsToAnalytics: true,
 *   preserveQueueOnError: true,
 *   fallbackToNextTrack: true
 * });
 * ```
 */
const setErrorRecovery = (options) => {
    globalErrorRecovery = Object.assign(Object.assign({}, globalErrorRecovery), options);
};
exports.setErrorRecovery = setErrorRecovery;
/**
 * Gets the current global error recovery configuration
 * @returns Current error recovery configuration
 * @example
 * ```typescript
 * const recovery = getErrorRecovery();
 * console.log(`Auto retry enabled: ${recovery.autoRetry}`);
 * ```
 */
const getErrorRecovery = () => {
    return Object.assign({}, globalErrorRecovery);
};
exports.getErrorRecovery = getErrorRecovery;
/**
 * Manually retries loading failed audio for a specific channel
 * @param channelNumber - The channel number to retry (defaults to 0)
 * @returns Promise that resolves to true if retry was successful, false otherwise
 * @example
 * ```typescript
 * const success = await retryFailedAudio(0);
 * if (success) {
 *   console.log('Audio retry successful');
 * } else {
 *   console.log('Audio retry failed');
 * }
 * ```
 */
const retryFailedAudio = (...args_1) => __awaiter(void 0, [...args_1], void 0, function* (channelNumber = 0) {
    const channel = info_1.audioChannels[channelNumber];
    if (!channel || channel.queue.length === 0)
        return false;
    const currentAudio = channel.queue[0];
    const currentAttempts = retryAttempts.get(currentAudio) || 0;
    if (currentAttempts >= globalRetryConfig.maxRetries) {
        return false;
    }
    try {
        // Reset the audio element
        currentAudio.currentTime = 0;
        yield currentAudio.play();
        // Reset retry counter on successful play
        retryAttempts.delete(currentAudio);
        return true;
    }
    catch (error) {
        // Increment retry counter
        retryAttempts.set(currentAudio, currentAttempts + 1);
        return false;
    }
});
exports.retryFailedAudio = retryFailedAudio;
/**
 * Emits an audio error event to all registered listeners for a specific channel
 * @param channelNumber - The channel number where the error occurred
 * @param errorInfo - Information about the error
 * @param audioChannels - Array of audio channels
 * @internal
 */
const emitAudioError = (channelNumber, errorInfo, audioChannels) => {
    const channel = audioChannels[channelNumber];
    if (!(channel === null || channel === void 0 ? void 0 : channel.audioErrorCallbacks))
        return;
    // Log to analytics if enabled
    if (globalErrorRecovery.logErrorsToAnalytics) {
        console.warn('Audio Error Analytics:', errorInfo);
    }
    channel.audioErrorCallbacks.forEach(callback => {
        try {
            callback(errorInfo);
        }
        catch (error) {
            console.error('Error in audio error callback:', error);
        }
    });
};
exports.emitAudioError = emitAudioError;
/**
 * Determines the error type based on the error object and context
 * @param error - The error that occurred
 * @param audio - The audio element that failed
 * @returns The categorized error type
 * @internal
 */
const categorizeError = (error, audio) => {
    const errorMessage = error.message.toLowerCase();
    if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        return 'network';
    }
    // Check for unsupported format first (more specific than decode)
    if (errorMessage.includes('not supported') || errorMessage.includes('unsupported') ||
        errorMessage.includes('format not supported')) {
        return 'unsupported';
    }
    if (errorMessage.includes('decode') || errorMessage.includes('format')) {
        return 'decode';
    }
    if (errorMessage.includes('permission') || errorMessage.includes('blocked')) {
        return 'permission';
    }
    if (errorMessage.includes('abort')) {
        return 'abort';
    }
    if (errorMessage.includes('timeout')) {
        return 'timeout';
    }
    // Check audio element network state for more context
    if (audio.networkState === HTMLMediaElement.NETWORK_NO_SOURCE) {
        return 'network';
    }
    if (audio.networkState === HTMLMediaElement.NETWORK_LOADING) {
        return 'timeout';
    }
    return 'unknown';
};
exports.categorizeError = categorizeError;
/**
 * Sets up comprehensive error handling for an audio element
 * @param audio - The audio element to set up error handling for
 * @param channelNumber - The channel number this audio belongs to
 * @param originalUrl - The original URL that was requested
 * @param onError - Callback for when an error occurs
 * @internal
 */
const setupAudioErrorHandling = (audio, channelNumber, originalUrl, onError) => {
    const channel = info_1.audioChannels[channelNumber];
    if (!channel)
        return;
    // Set up loading timeout with test environment compatibility
    let timeoutId;
    if (typeof setTimeout !== 'undefined') {
        timeoutId = setTimeout(() => {
            if (audio.networkState === HTMLMediaElement.NETWORK_LOADING) {
                const timeoutError = new Error(`Audio loading timeout after ${globalRetryConfig.timeoutMs}ms`);
                (0, exports.handleAudioError)(audio, channelNumber, originalUrl, timeoutError);
            }
        }, globalRetryConfig.timeoutMs);
        loadTimeouts.set(audio, timeoutId);
    }
    // Clear timeout when metadata loads successfully
    const handleLoadSuccess = () => {
        if (typeof setTimeout !== 'undefined') {
            const timeoutId = loadTimeouts.get(audio);
            if (timeoutId) {
                clearTimeout(timeoutId);
                loadTimeouts.delete(audio);
            }
        }
    };
    // Handle various error events
    const handleError = (event) => {
        var _a;
        if (typeof setTimeout !== 'undefined') {
            const timeoutId = loadTimeouts.get(audio);
            if (timeoutId) {
                clearTimeout(timeoutId);
                loadTimeouts.delete(audio);
            }
        }
        const error = new Error(`Audio loading failed: ${((_a = audio.error) === null || _a === void 0 ? void 0 : _a.message) || 'Unknown error'}`);
        (0, exports.handleAudioError)(audio, channelNumber, originalUrl, error);
    };
    const handleAbort = () => {
        const error = new Error('Audio loading was aborted');
        (0, exports.handleAudioError)(audio, channelNumber, originalUrl, error);
    };
    const handleStall = () => {
        const error = new Error('Audio loading stalled');
        (0, exports.handleAudioError)(audio, channelNumber, originalUrl, error);
    };
    // Add event listeners
    audio.addEventListener('error', handleError);
    audio.addEventListener('abort', handleAbort);
    audio.addEventListener('stalled', handleStall);
    audio.addEventListener('loadedmetadata', handleLoadSuccess);
    audio.addEventListener('canplay', handleLoadSuccess);
    // Custom play error handling
    if (onError) {
        const originalPlay = audio.play.bind(audio);
        const wrappedPlay = () => __awaiter(void 0, void 0, void 0, function* () {
            try {
                yield originalPlay();
            }
            catch (error) {
                yield onError(error);
                throw error;
            }
        });
        audio.play = wrappedPlay;
    }
};
exports.setupAudioErrorHandling = setupAudioErrorHandling;
/**
 * Handles audio errors with retry logic and recovery mechanisms
 * @param audio - The audio element that failed
 * @param channelNumber - The channel number
 * @param originalUrl - The original URL that was requested
 * @param error - The error that occurred
 * @internal
 */
const handleAudioError = (audio, channelNumber, originalUrl, error) => __awaiter(void 0, void 0, void 0, function* () {
    const channel = info_1.audioChannels[channelNumber];
    if (!channel)
        return;
    const currentAttempts = retryAttempts.get(audio) || 0;
    const retryConfig = channel.retryConfig || globalRetryConfig;
    const errorInfo = {
        channelNumber,
        src: originalUrl,
        fileName: (0, utils_1.extractFileName)(originalUrl),
        error,
        errorType: (0, exports.categorizeError)(error, audio),
        timestamp: Date.now(),
        retryAttempt: currentAttempts,
        remainingInQueue: channel.queue.length - 1
    };
    // Emit error event
    (0, exports.emitAudioError)(channelNumber, errorInfo, info_1.audioChannels);
    // Attempt retry if enabled and within limits
    if (retryConfig.enabled && currentAttempts < retryConfig.maxRetries && globalErrorRecovery.autoRetry) {
        const delay = retryConfig.exponentialBackoff
            ? retryConfig.baseDelay * Math.pow(2, currentAttempts)
            : retryConfig.baseDelay;
        retryAttempts.set(audio, currentAttempts + 1);
        const retryFunction = () => __awaiter(void 0, void 0, void 0, function* () {
            try {
                // Try fallback URLs if available
                if (retryConfig.fallbackUrls && retryConfig.fallbackUrls.length > 0) {
                    const fallbackIndex = currentAttempts % retryConfig.fallbackUrls.length;
                    const fallbackUrl = retryConfig.fallbackUrls[fallbackIndex] + (0, utils_1.extractFileName)(originalUrl);
                    audio.src = fallbackUrl;
                }
                yield audio.load();
                yield audio.play();
                // Reset retry counter on success
                retryAttempts.delete(audio);
            }
            catch (retryError) {
                yield (0, exports.handleAudioError)(audio, channelNumber, originalUrl, retryError);
            }
        });
        setTimeout(retryFunction, delay);
    }
    else {
        // Max retries reached or retry disabled
        if (retryConfig.skipOnFailure || globalErrorRecovery.fallbackToNextTrack) {
            // Skip to next track in queue
            channel.queue.shift();
            // Import and use playAudioQueue to continue with next track
            const { playAudioQueue } = yield Promise.resolve().then(() => __importStar(require('./core')));
            playAudioQueue(channelNumber).catch(console.error);
        }
        else if (!globalErrorRecovery.preserveQueueOnError) {
            // Clear the entire queue on failure
            channel.queue = [];
        }
    }
});
exports.handleAudioError = handleAudioError;
/**
 * Creates a timeout-protected audio element with comprehensive error handling
 * @param url - The audio URL to load
 * @param channelNumber - The channel number this audio belongs to
 * @returns Promise that resolves to the configured audio element
 * @internal
 */
const createProtectedAudioElement = (url, channelNumber) => __awaiter(void 0, void 0, void 0, function* () {
    const audio = new Audio();
    return new Promise((resolve, reject) => {
        const cleanup = () => {
            const timeoutId = loadTimeouts.get(audio);
            if (timeoutId) {
                clearTimeout(timeoutId);
                loadTimeouts.delete(audio);
            }
        };
        const handleSuccess = () => {
            cleanup();
            resolve(audio);
        };
        const handleError = (error) => {
            cleanup();
            reject(error);
        };
        // Set up error handling
        (0, exports.setupAudioErrorHandling)(audio, channelNumber, url, (error) => __awaiter(void 0, void 0, void 0, function* () {
            handleError(error);
        }));
        // Set up success handlers
        audio.addEventListener('canplay', handleSuccess, { once: true });
        audio.addEventListener('loadedmetadata', handleSuccess, { once: true });
        // Start loading
        audio.src = url;
        audio.load();
    });
});
exports.createProtectedAudioElement = createProtectedAudioElement;
