"use strict";
/**
 * @fileoverview Main entry point for the audio-channel-queue package
 *
 * A comprehensive audio queue management system with real-time progress tracking,
 * multi-channel support, pause/resume functionality, volume control with ducking,
 * looping capabilities, and extensive event handling.
 *
 * @example Basic Usage
 * ```typescript
 * import { queueAudio, onAudioProgress, pauseChannel } from 'audio-channel-queue';
 *
 * // Queue an audio file
 * await queueAudio('song.mp3');
 *
 * // Track progress
 * onAudioProgress(0, (info) => {
 *   console.log(`Progress: ${info.progress * 100}%`);
 * });
 *
 * // Pause playback
 * await pauseChannel(0);
 * ```
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAudioInfoFromElement = exports.extractFileName = exports.createQueueSnapshot = exports.cleanWebpackFilename = exports.onQueueChange = exports.onAudioStart = exports.onAudioResume = exports.onAudioProgress = exports.onAudioPause = exports.onAudioComplete = exports.offQueueChange = exports.offAudioResume = exports.offAudioProgress = exports.offAudioPause = exports.getQueueSnapshot = exports.getCurrentAudioInfo = exports.getAllChannelsInfo = exports.audioChannels = exports.transitionVolume = exports.setVolumeDucking = exports.setChannelVolume = exports.setAllChannelsVolume = exports.restoreVolumeLevels = exports.getChannelVolume = exports.getAllChannelsVolume = exports.clearVolumeDucking = exports.applyVolumeDucking = exports.togglePauseChannel = exports.togglePauseAllChannels = exports.resumeChannel = exports.resumeAllChannels = exports.pauseChannel = exports.pauseAllChannels = exports.isChannelPaused = exports.getAllChannelsPauseState = exports.stopCurrentAudioInChannel = exports.stopAllAudioInChannel = exports.stopAllAudio = exports.queueAudioPriority = exports.queueAudio = exports.playAudioQueue = void 0;
// Export core queue management functions
var core_1 = require("./core");
Object.defineProperty(exports, "playAudioQueue", { enumerable: true, get: function () { return core_1.playAudioQueue; } });
Object.defineProperty(exports, "queueAudio", { enumerable: true, get: function () { return core_1.queueAudio; } });
Object.defineProperty(exports, "queueAudioPriority", { enumerable: true, get: function () { return core_1.queueAudioPriority; } });
Object.defineProperty(exports, "stopAllAudio", { enumerable: true, get: function () { return core_1.stopAllAudio; } });
Object.defineProperty(exports, "stopAllAudioInChannel", { enumerable: true, get: function () { return core_1.stopAllAudioInChannel; } });
Object.defineProperty(exports, "stopCurrentAudioInChannel", { enumerable: true, get: function () { return core_1.stopCurrentAudioInChannel; } });
// Export pause and resume functionality
var pause_1 = require("./pause");
Object.defineProperty(exports, "getAllChannelsPauseState", { enumerable: true, get: function () { return pause_1.getAllChannelsPauseState; } });
Object.defineProperty(exports, "isChannelPaused", { enumerable: true, get: function () { return pause_1.isChannelPaused; } });
Object.defineProperty(exports, "pauseAllChannels", { enumerable: true, get: function () { return pause_1.pauseAllChannels; } });
Object.defineProperty(exports, "pauseChannel", { enumerable: true, get: function () { return pause_1.pauseChannel; } });
Object.defineProperty(exports, "resumeAllChannels", { enumerable: true, get: function () { return pause_1.resumeAllChannels; } });
Object.defineProperty(exports, "resumeChannel", { enumerable: true, get: function () { return pause_1.resumeChannel; } });
Object.defineProperty(exports, "togglePauseAllChannels", { enumerable: true, get: function () { return pause_1.togglePauseAllChannels; } });
Object.defineProperty(exports, "togglePauseChannel", { enumerable: true, get: function () { return pause_1.togglePauseChannel; } });
// Export volume control functions
var volume_1 = require("./volume");
Object.defineProperty(exports, "applyVolumeDucking", { enumerable: true, get: function () { return volume_1.applyVolumeDucking; } });
Object.defineProperty(exports, "clearVolumeDucking", { enumerable: true, get: function () { return volume_1.clearVolumeDucking; } });
Object.defineProperty(exports, "getAllChannelsVolume", { enumerable: true, get: function () { return volume_1.getAllChannelsVolume; } });
Object.defineProperty(exports, "getChannelVolume", { enumerable: true, get: function () { return volume_1.getChannelVolume; } });
Object.defineProperty(exports, "restoreVolumeLevels", { enumerable: true, get: function () { return volume_1.restoreVolumeLevels; } });
Object.defineProperty(exports, "setAllChannelsVolume", { enumerable: true, get: function () { return volume_1.setAllChannelsVolume; } });
Object.defineProperty(exports, "setChannelVolume", { enumerable: true, get: function () { return volume_1.setChannelVolume; } });
Object.defineProperty(exports, "setVolumeDucking", { enumerable: true, get: function () { return volume_1.setVolumeDucking; } });
Object.defineProperty(exports, "transitionVolume", { enumerable: true, get: function () { return volume_1.transitionVolume; } });
// Export audio information and progress tracking functions
var info_1 = require("./info");
Object.defineProperty(exports, "audioChannels", { enumerable: true, get: function () { return info_1.audioChannels; } });
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
// Export utility functions (for advanced usage)
var utils_1 = require("./utils");
Object.defineProperty(exports, "cleanWebpackFilename", { enumerable: true, get: function () { return utils_1.cleanWebpackFilename; } });
Object.defineProperty(exports, "createQueueSnapshot", { enumerable: true, get: function () { return utils_1.createQueueSnapshot; } });
Object.defineProperty(exports, "extractFileName", { enumerable: true, get: function () { return utils_1.extractFileName; } });
Object.defineProperty(exports, "getAudioInfoFromElement", { enumerable: true, get: function () { return utils_1.getAudioInfoFromElement; } });
