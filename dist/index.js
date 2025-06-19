"use strict";
/**
 * @fileoverview Main entry point for the audio-channel-queue package
 * Exports all public functions and types for audio queue management, pause/resume controls,
 * volume management with ducking, progress tracking, and comprehensive event system
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAudioInfoFromElement = exports.extractFileName = exports.createQueueSnapshot = exports.cleanWebpackFilename = exports.audioChannels = exports.onQueueChange = exports.onAudioStart = exports.onAudioResume = exports.onAudioProgress = exports.onAudioPause = exports.onAudioComplete = exports.offQueueChange = exports.offAudioResume = exports.offAudioProgress = exports.offAudioPause = exports.getQueueSnapshot = exports.getCurrentAudioInfo = exports.getAllChannelsInfo = exports.setVolumeDucking = exports.setChannelVolume = exports.setAllChannelsVolume = exports.getChannelVolume = exports.getAllChannelsVolume = exports.clearVolumeDucking = exports.togglePauseChannel = exports.togglePauseAllChannels = exports.resumeChannel = exports.resumeAllChannels = exports.pauseChannel = exports.pauseAllChannels = exports.isChannelPaused = exports.getAllChannelsPauseState = exports.setRetryConfig = exports.setErrorRecovery = exports.retryFailedAudio = exports.onAudioError = exports.offAudioError = exports.getRetryConfig = exports.getErrorRecovery = exports.playAudioQueue = exports.stopAllAudio = exports.stopAllAudioInChannel = exports.stopCurrentAudioInChannel = exports.queueAudioPriority = exports.queueAudio = void 0;
// Core queue management functions
var core_1 = require("./core");
Object.defineProperty(exports, "queueAudio", { enumerable: true, get: function () { return core_1.queueAudio; } });
Object.defineProperty(exports, "queueAudioPriority", { enumerable: true, get: function () { return core_1.queueAudioPriority; } });
Object.defineProperty(exports, "stopCurrentAudioInChannel", { enumerable: true, get: function () { return core_1.stopCurrentAudioInChannel; } });
Object.defineProperty(exports, "stopAllAudioInChannel", { enumerable: true, get: function () { return core_1.stopAllAudioInChannel; } });
Object.defineProperty(exports, "stopAllAudio", { enumerable: true, get: function () { return core_1.stopAllAudio; } });
Object.defineProperty(exports, "playAudioQueue", { enumerable: true, get: function () { return core_1.playAudioQueue; } });
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
Object.defineProperty(exports, "pauseChannel", { enumerable: true, get: function () { return pause_1.pauseChannel; } });
Object.defineProperty(exports, "resumeAllChannels", { enumerable: true, get: function () { return pause_1.resumeAllChannels; } });
Object.defineProperty(exports, "resumeChannel", { enumerable: true, get: function () { return pause_1.resumeChannel; } });
Object.defineProperty(exports, "togglePauseAllChannels", { enumerable: true, get: function () { return pause_1.togglePauseAllChannels; } });
Object.defineProperty(exports, "togglePauseChannel", { enumerable: true, get: function () { return pause_1.togglePauseChannel; } });
// Volume control and ducking functions
var volume_1 = require("./volume");
Object.defineProperty(exports, "clearVolumeDucking", { enumerable: true, get: function () { return volume_1.clearVolumeDucking; } });
Object.defineProperty(exports, "getAllChannelsVolume", { enumerable: true, get: function () { return volume_1.getAllChannelsVolume; } });
Object.defineProperty(exports, "getChannelVolume", { enumerable: true, get: function () { return volume_1.getChannelVolume; } });
Object.defineProperty(exports, "setAllChannelsVolume", { enumerable: true, get: function () { return volume_1.setAllChannelsVolume; } });
Object.defineProperty(exports, "setChannelVolume", { enumerable: true, get: function () { return volume_1.setChannelVolume; } });
Object.defineProperty(exports, "setVolumeDucking", { enumerable: true, get: function () { return volume_1.setVolumeDucking; } });
// Audio information and progress tracking functions
var info_1 = require("./info");
Object.defineProperty(exports, "getAllChannelsInfo", { enumerable: true, get: function () { return info_1.getAllChannelsInfo; } });
Object.defineProperty(exports, "getCurrentAudioInfo", { enumerable: true, get: function () { return info_1.getCurrentAudioInfo; } });
Object.defineProperty(exports, "getQueueSnapshot", { enumerable: true, get: function () { return info_1.getQueueSnapshot; } });
Object.defineProperty(exports, "offAudioPause", { enumerable: true, get: function () { return info_1.offAudioPause; } });
Object.defineProperty(exports, "offAudioProgress", { enumerable: true, get: function () { return info_1.offAudioProgress; } });
Object.defineProperty(exports, "offAudioResume", { enumerable: true, get: function () { return info_1.offAudioResume; } });
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
