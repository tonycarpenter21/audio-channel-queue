"use strict";
/**
 * @fileoverview Main entry point for the audio-channel-queue package
 * Exports all public functions and types for audio queue management, pause/resume controls,
 * volume management with ducking, progress tracking, and comprehensive event system
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.transitionVolume = exports.setVolumeDucking = exports.setGlobalVolume = exports.setChannelVolume = exports.setAllChannelsVolume = exports.getGlobalVolume = exports.getFadeConfig = exports.getChannelVolume = exports.getAllChannelsVolume = exports.clearVolumeDucking = exports.cancelVolumeTransition = exports.cancelAllVolumeTransitions = exports.togglePauseWithFade = exports.togglePauseChannel = exports.togglePauseAllWithFade = exports.togglePauseAllChannels = exports.resumeWithFade = exports.resumeChannel = exports.resumeAllWithFade = exports.resumeAllChannels = exports.pauseWithFade = exports.pauseChannel = exports.pauseAllWithFade = exports.pauseAllChannels = exports.isChannelPaused = exports.getAllChannelsPauseState = exports.setRetryConfig = exports.setErrorRecovery = exports.retryFailedAudio = exports.onAudioError = exports.offAudioError = exports.getRetryConfig = exports.getErrorRecovery = exports.swapQueueItems = exports.reorderQueue = exports.removeQueuedItem = exports.getQueueLength = exports.getQueueItemInfo = exports.clearQueueAfterCurrent = exports.setChannelQueueLimit = exports.getQueueConfig = exports.setQueueConfig = exports.destroyAllChannels = exports.destroyChannel = exports.playAudioQueue = exports.stopAllAudio = exports.stopAllAudioInChannel = exports.stopCurrentAudioInChannel = exports.queueAudioPriority = exports.queueAudio = void 0;
exports.GLOBAL_PROGRESS_KEY = exports.TimerType = exports.MAX_CHANNELS = exports.FadeType = exports.EasingType = exports.AudioErrorType = exports.validateAudioUrl = exports.sanitizeForDisplay = exports.getAudioInfoFromElement = exports.extractFileName = exports.createQueueSnapshot = exports.cleanWebpackFilename = exports.audioChannels = exports.onQueueChange = exports.onAudioStart = exports.onAudioResume = exports.onAudioProgress = exports.onAudioPause = exports.onAudioComplete = exports.offQueueChange = exports.offAudioStart = exports.offAudioResume = exports.offAudioProgress = exports.offAudioPause = exports.offAudioComplete = exports.getQueueSnapshot = exports.getCurrentAudioInfo = exports.getAllChannelsInfo = exports.shouldUseWebAudio = exports.setWebAudioVolume = exports.setWebAudioConfig = exports.resumeAudioContext = exports.isWebAudioSupported = exports.isIOSDevice = exports.getWebAudioVolume = exports.getWebAudioSupport = exports.getWebAudioConfig = exports.getAudioContext = exports.createWebAudioNodes = exports.cleanupWebAudioNodes = void 0;
// Core queue management functions
var core_1 = require("./core");
Object.defineProperty(exports, "queueAudio", { enumerable: true, get: function () { return core_1.queueAudio; } });
Object.defineProperty(exports, "queueAudioPriority", { enumerable: true, get: function () { return core_1.queueAudioPriority; } });
Object.defineProperty(exports, "stopCurrentAudioInChannel", { enumerable: true, get: function () { return core_1.stopCurrentAudioInChannel; } });
Object.defineProperty(exports, "stopAllAudioInChannel", { enumerable: true, get: function () { return core_1.stopAllAudioInChannel; } });
Object.defineProperty(exports, "stopAllAudio", { enumerable: true, get: function () { return core_1.stopAllAudio; } });
Object.defineProperty(exports, "playAudioQueue", { enumerable: true, get: function () { return core_1.playAudioQueue; } });
Object.defineProperty(exports, "destroyChannel", { enumerable: true, get: function () { return core_1.destroyChannel; } });
Object.defineProperty(exports, "destroyAllChannels", { enumerable: true, get: function () { return core_1.destroyAllChannels; } });
Object.defineProperty(exports, "setQueueConfig", { enumerable: true, get: function () { return core_1.setQueueConfig; } });
Object.defineProperty(exports, "getQueueConfig", { enumerable: true, get: function () { return core_1.getQueueConfig; } });
Object.defineProperty(exports, "setChannelQueueLimit", { enumerable: true, get: function () { return core_1.setChannelQueueLimit; } });
// Queue manipulation functions
var queue_manipulation_1 = require("./queue-manipulation");
Object.defineProperty(exports, "clearQueueAfterCurrent", { enumerable: true, get: function () { return queue_manipulation_1.clearQueueAfterCurrent; } });
Object.defineProperty(exports, "getQueueItemInfo", { enumerable: true, get: function () { return queue_manipulation_1.getQueueItemInfo; } });
Object.defineProperty(exports, "getQueueLength", { enumerable: true, get: function () { return queue_manipulation_1.getQueueLength; } });
Object.defineProperty(exports, "removeQueuedItem", { enumerable: true, get: function () { return queue_manipulation_1.removeQueuedItem; } });
Object.defineProperty(exports, "reorderQueue", { enumerable: true, get: function () { return queue_manipulation_1.reorderQueue; } });
Object.defineProperty(exports, "swapQueueItems", { enumerable: true, get: function () { return queue_manipulation_1.swapQueueItems; } });
// Error handling and recovery functions
var errors_1 = require("./errors");
Object.defineProperty(exports, "getErrorRecovery", { enumerable: true, get: function () { return errors_1.getErrorRecovery; } });
Object.defineProperty(exports, "getRetryConfig", { enumerable: true, get: function () { return errors_1.getRetryConfig; } });
Object.defineProperty(exports, "offAudioError", { enumerable: true, get: function () { return errors_1.offAudioError; } });
Object.defineProperty(exports, "onAudioError", { enumerable: true, get: function () { return errors_1.onAudioError; } });
Object.defineProperty(exports, "retryFailedAudio", { enumerable: true, get: function () { return errors_1.retryFailedAudio; } });
Object.defineProperty(exports, "setErrorRecovery", { enumerable: true, get: function () { return errors_1.setErrorRecovery; } });
Object.defineProperty(exports, "setRetryConfig", { enumerable: true, get: function () { return errors_1.setRetryConfig; } });
// Pause and resume management functions
var pause_1 = require("./pause");
Object.defineProperty(exports, "getAllChannelsPauseState", { enumerable: true, get: function () { return pause_1.getAllChannelsPauseState; } });
Object.defineProperty(exports, "isChannelPaused", { enumerable: true, get: function () { return pause_1.isChannelPaused; } });
Object.defineProperty(exports, "pauseAllChannels", { enumerable: true, get: function () { return pause_1.pauseAllChannels; } });
Object.defineProperty(exports, "pauseAllWithFade", { enumerable: true, get: function () { return pause_1.pauseAllWithFade; } });
Object.defineProperty(exports, "pauseChannel", { enumerable: true, get: function () { return pause_1.pauseChannel; } });
Object.defineProperty(exports, "pauseWithFade", { enumerable: true, get: function () { return pause_1.pauseWithFade; } });
Object.defineProperty(exports, "resumeAllChannels", { enumerable: true, get: function () { return pause_1.resumeAllChannels; } });
Object.defineProperty(exports, "resumeAllWithFade", { enumerable: true, get: function () { return pause_1.resumeAllWithFade; } });
Object.defineProperty(exports, "resumeChannel", { enumerable: true, get: function () { return pause_1.resumeChannel; } });
Object.defineProperty(exports, "resumeWithFade", { enumerable: true, get: function () { return pause_1.resumeWithFade; } });
Object.defineProperty(exports, "togglePauseAllChannels", { enumerable: true, get: function () { return pause_1.togglePauseAllChannels; } });
Object.defineProperty(exports, "togglePauseAllWithFade", { enumerable: true, get: function () { return pause_1.togglePauseAllWithFade; } });
Object.defineProperty(exports, "togglePauseChannel", { enumerable: true, get: function () { return pause_1.togglePauseChannel; } });
Object.defineProperty(exports, "togglePauseWithFade", { enumerable: true, get: function () { return pause_1.togglePauseWithFade; } });
// Volume control and ducking functions
var volume_1 = require("./volume");
Object.defineProperty(exports, "cancelAllVolumeTransitions", { enumerable: true, get: function () { return volume_1.cancelAllVolumeTransitions; } });
Object.defineProperty(exports, "cancelVolumeTransition", { enumerable: true, get: function () { return volume_1.cancelVolumeTransition; } });
Object.defineProperty(exports, "clearVolumeDucking", { enumerable: true, get: function () { return volume_1.clearVolumeDucking; } });
Object.defineProperty(exports, "getAllChannelsVolume", { enumerable: true, get: function () { return volume_1.getAllChannelsVolume; } });
Object.defineProperty(exports, "getChannelVolume", { enumerable: true, get: function () { return volume_1.getChannelVolume; } });
Object.defineProperty(exports, "getFadeConfig", { enumerable: true, get: function () { return volume_1.getFadeConfig; } });
Object.defineProperty(exports, "getGlobalVolume", { enumerable: true, get: function () { return volume_1.getGlobalVolume; } });
Object.defineProperty(exports, "setAllChannelsVolume", { enumerable: true, get: function () { return volume_1.setAllChannelsVolume; } });
Object.defineProperty(exports, "setChannelVolume", { enumerable: true, get: function () { return volume_1.setChannelVolume; } });
Object.defineProperty(exports, "setGlobalVolume", { enumerable: true, get: function () { return volume_1.setGlobalVolume; } });
Object.defineProperty(exports, "setVolumeDucking", { enumerable: true, get: function () { return volume_1.setVolumeDucking; } });
Object.defineProperty(exports, "transitionVolume", { enumerable: true, get: function () { return volume_1.transitionVolume; } });
// Web Audio API support functions
var web_audio_1 = require("./web-audio");
Object.defineProperty(exports, "cleanupWebAudioNodes", { enumerable: true, get: function () { return web_audio_1.cleanupWebAudioNodes; } });
Object.defineProperty(exports, "createWebAudioNodes", { enumerable: true, get: function () { return web_audio_1.createWebAudioNodes; } });
Object.defineProperty(exports, "getAudioContext", { enumerable: true, get: function () { return web_audio_1.getAudioContext; } });
Object.defineProperty(exports, "getWebAudioConfig", { enumerable: true, get: function () { return web_audio_1.getWebAudioConfig; } });
Object.defineProperty(exports, "getWebAudioSupport", { enumerable: true, get: function () { return web_audio_1.getWebAudioSupport; } });
Object.defineProperty(exports, "getWebAudioVolume", { enumerable: true, get: function () { return web_audio_1.getWebAudioVolume; } });
Object.defineProperty(exports, "isIOSDevice", { enumerable: true, get: function () { return web_audio_1.isIOSDevice; } });
Object.defineProperty(exports, "isWebAudioSupported", { enumerable: true, get: function () { return web_audio_1.isWebAudioSupported; } });
Object.defineProperty(exports, "resumeAudioContext", { enumerable: true, get: function () { return web_audio_1.resumeAudioContext; } });
Object.defineProperty(exports, "setWebAudioConfig", { enumerable: true, get: function () { return web_audio_1.setWebAudioConfig; } });
Object.defineProperty(exports, "setWebAudioVolume", { enumerable: true, get: function () { return web_audio_1.setWebAudioVolume; } });
Object.defineProperty(exports, "shouldUseWebAudio", { enumerable: true, get: function () { return web_audio_1.shouldUseWebAudio; } });
// Audio information and progress tracking functions
var info_1 = require("./info");
Object.defineProperty(exports, "getAllChannelsInfo", { enumerable: true, get: function () { return info_1.getAllChannelsInfo; } });
Object.defineProperty(exports, "getCurrentAudioInfo", { enumerable: true, get: function () { return info_1.getCurrentAudioInfo; } });
Object.defineProperty(exports, "getQueueSnapshot", { enumerable: true, get: function () { return info_1.getQueueSnapshot; } });
Object.defineProperty(exports, "offAudioComplete", { enumerable: true, get: function () { return info_1.offAudioComplete; } });
Object.defineProperty(exports, "offAudioPause", { enumerable: true, get: function () { return info_1.offAudioPause; } });
Object.defineProperty(exports, "offAudioProgress", { enumerable: true, get: function () { return info_1.offAudioProgress; } });
Object.defineProperty(exports, "offAudioResume", { enumerable: true, get: function () { return info_1.offAudioResume; } });
Object.defineProperty(exports, "offAudioStart", { enumerable: true, get: function () { return info_1.offAudioStart; } });
Object.defineProperty(exports, "offQueueChange", { enumerable: true, get: function () { return info_1.offQueueChange; } });
Object.defineProperty(exports, "onAudioComplete", { enumerable: true, get: function () { return info_1.onAudioComplete; } });
Object.defineProperty(exports, "onAudioPause", { enumerable: true, get: function () { return info_1.onAudioPause; } });
Object.defineProperty(exports, "onAudioProgress", { enumerable: true, get: function () { return info_1.onAudioProgress; } });
Object.defineProperty(exports, "onAudioResume", { enumerable: true, get: function () { return info_1.onAudioResume; } });
Object.defineProperty(exports, "onAudioStart", { enumerable: true, get: function () { return info_1.onAudioStart; } });
Object.defineProperty(exports, "onQueueChange", { enumerable: true, get: function () { return info_1.onQueueChange; } });
// Core data access for legacy compatibility
var info_2 = require("./info");
Object.defineProperty(exports, "audioChannels", { enumerable: true, get: function () { return info_2.audioChannels; } });
// Utility helper functions
var utils_1 = require("./utils");
Object.defineProperty(exports, "cleanWebpackFilename", { enumerable: true, get: function () { return utils_1.cleanWebpackFilename; } });
Object.defineProperty(exports, "createQueueSnapshot", { enumerable: true, get: function () { return utils_1.createQueueSnapshot; } });
Object.defineProperty(exports, "extractFileName", { enumerable: true, get: function () { return utils_1.extractFileName; } });
Object.defineProperty(exports, "getAudioInfoFromElement", { enumerable: true, get: function () { return utils_1.getAudioInfoFromElement; } });
Object.defineProperty(exports, "sanitizeForDisplay", { enumerable: true, get: function () { return utils_1.sanitizeForDisplay; } });
Object.defineProperty(exports, "validateAudioUrl", { enumerable: true, get: function () { return utils_1.validateAudioUrl; } });
// Enums and constants
var types_1 = require("./types");
Object.defineProperty(exports, "AudioErrorType", { enumerable: true, get: function () { return types_1.AudioErrorType; } });
Object.defineProperty(exports, "EasingType", { enumerable: true, get: function () { return types_1.EasingType; } });
Object.defineProperty(exports, "FadeType", { enumerable: true, get: function () { return types_1.FadeType; } });
Object.defineProperty(exports, "MAX_CHANNELS", { enumerable: true, get: function () { return types_1.MAX_CHANNELS; } });
Object.defineProperty(exports, "TimerType", { enumerable: true, get: function () { return types_1.TimerType; } });
Object.defineProperty(exports, "GLOBAL_PROGRESS_KEY", { enumerable: true, get: function () { return types_1.GLOBAL_PROGRESS_KEY; } });
