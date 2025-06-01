"use strict";
/**
 * @fileoverview Main entry point for the audio-channel-queue package
 *
 * A comprehensive audio queue management system with real-time progress tracking,
 * multi-channel support, and extensive event handling capabilities.
 *
 * @example Basic Usage
 * ```typescript
 * import { queueAudio, onAudioProgress } from 'audio-channel-queue';
 *
 * // Queue an audio file
 * await queueAudio('song.mp3');
 *
 * // Track progress
 * onAudioProgress(0, (info) => {
 *   console.log(`Progress: ${info.progress * 100}%`);
 * });
 * ```
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAudioInfoFromElement = exports.extractFileName = exports.createQueueSnapshot = exports.cleanWebpackFilename = exports.offQueueChange = exports.onQueueChange = exports.onAudioStart = exports.onAudioProgress = exports.onAudioComplete = exports.offAudioProgress = exports.getQueueSnapshot = exports.getCurrentAudioInfo = exports.getAllChannelsInfo = exports.audioChannels = exports.stopCurrentAudioInChannel = exports.stopAllAudioInChannel = exports.stopAllAudio = exports.queueAudio = exports.playAudioQueue = void 0;
// Export core queue management functions
var core_1 = require("./core");
Object.defineProperty(exports, "playAudioQueue", { enumerable: true, get: function () { return core_1.playAudioQueue; } });
Object.defineProperty(exports, "queueAudio", { enumerable: true, get: function () { return core_1.queueAudio; } });
Object.defineProperty(exports, "stopAllAudio", { enumerable: true, get: function () { return core_1.stopAllAudio; } });
Object.defineProperty(exports, "stopAllAudioInChannel", { enumerable: true, get: function () { return core_1.stopAllAudioInChannel; } });
Object.defineProperty(exports, "stopCurrentAudioInChannel", { enumerable: true, get: function () { return core_1.stopCurrentAudioInChannel; } });
// Export audio information and progress tracking functions
var info_1 = require("./info");
Object.defineProperty(exports, "audioChannels", { enumerable: true, get: function () { return info_1.audioChannels; } });
Object.defineProperty(exports, "getAllChannelsInfo", { enumerable: true, get: function () { return info_1.getAllChannelsInfo; } });
Object.defineProperty(exports, "getCurrentAudioInfo", { enumerable: true, get: function () { return info_1.getCurrentAudioInfo; } });
Object.defineProperty(exports, "getQueueSnapshot", { enumerable: true, get: function () { return info_1.getQueueSnapshot; } });
Object.defineProperty(exports, "offAudioProgress", { enumerable: true, get: function () { return info_1.offAudioProgress; } });
Object.defineProperty(exports, "onAudioComplete", { enumerable: true, get: function () { return info_1.onAudioComplete; } });
Object.defineProperty(exports, "onAudioProgress", { enumerable: true, get: function () { return info_1.onAudioProgress; } });
Object.defineProperty(exports, "onAudioStart", { enumerable: true, get: function () { return info_1.onAudioStart; } });
Object.defineProperty(exports, "onQueueChange", { enumerable: true, get: function () { return info_1.onQueueChange; } });
Object.defineProperty(exports, "offQueueChange", { enumerable: true, get: function () { return info_1.offQueueChange; } });
// Export utility functions (for advanced usage)
var utils_1 = require("./utils");
Object.defineProperty(exports, "cleanWebpackFilename", { enumerable: true, get: function () { return utils_1.cleanWebpackFilename; } });
Object.defineProperty(exports, "createQueueSnapshot", { enumerable: true, get: function () { return utils_1.createQueueSnapshot; } });
Object.defineProperty(exports, "extractFileName", { enumerable: true, get: function () { return utils_1.extractFileName; } });
Object.defineProperty(exports, "getAudioInfoFromElement", { enumerable: true, get: function () { return utils_1.getAudioInfoFromElement; } });
