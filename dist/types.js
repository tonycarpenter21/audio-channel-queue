"use strict";
/**
 * @fileoverview Type definitions for the audioq package
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TimerType = exports.FadeType = exports.EasingType = exports.AudioErrorType = exports.GLOBAL_PROGRESS_KEY = exports.MAX_CHANNELS = void 0;
/**
 * Maximum number of audio channels allowed to prevent memory exhaustion
 */
exports.MAX_CHANNELS = 64;
/**
 * Symbol used as a key for global (channel-wide) progress callbacks
 * This avoids the need for `null as any` type assertions
 */
exports.GLOBAL_PROGRESS_KEY = Symbol('global-progress-callbacks');
/**
 * Types of audio errors that can occur during playback
 */
var AudioErrorType;
(function (AudioErrorType) {
    AudioErrorType["Abort"] = "abort";
    AudioErrorType["Decode"] = "decode";
    AudioErrorType["Network"] = "network";
    AudioErrorType["Permission"] = "permission";
    AudioErrorType["Timeout"] = "timeout";
    AudioErrorType["Unknown"] = "unknown";
    AudioErrorType["Unsupported"] = "unsupported";
})(AudioErrorType || (exports.AudioErrorType = AudioErrorType = {}));
/**
 * Easing function types for smooth volume transitions and animations
 */
var EasingType;
(function (EasingType) {
    EasingType["Linear"] = "linear";
    EasingType["EaseIn"] = "ease-in";
    EasingType["EaseOut"] = "ease-out";
    EasingType["EaseInOut"] = "ease-in-out";
})(EasingType || (exports.EasingType = EasingType = {}));
/**
 * Predefined fade types for pause/resume operations with different transition characteristics
 */
var FadeType;
(function (FadeType) {
    FadeType["Linear"] = "linear";
    FadeType["Gentle"] = "gentle";
    FadeType["Dramatic"] = "dramatic";
})(FadeType || (exports.FadeType = FadeType = {}));
/**
 * Timer implementation types used for volume transitions to ensure proper cleanup
 */
var TimerType;
(function (TimerType) {
    TimerType["RequestAnimationFrame"] = "raf";
    TimerType["Timeout"] = "timeout";
})(TimerType || (exports.TimerType = TimerType = {}));
