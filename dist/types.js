"use strict";
/**
 * @fileoverview Type definitions for the audio-channel-queue package
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FadeType = exports.EasingType = exports.GLOBAL_PROGRESS_KEY = void 0;
/**
 * Symbol used as a key for global (channel-wide) progress callbacks
 * This avoids the need for `null as any` type assertions
 */
exports.GLOBAL_PROGRESS_KEY = Symbol('global-progress-callbacks');
/**
 * Easing function types for volume transitions
 */
var EasingType;
(function (EasingType) {
    EasingType["Linear"] = "linear";
    EasingType["EaseIn"] = "ease-in";
    EasingType["EaseOut"] = "ease-out";
    EasingType["EaseInOut"] = "ease-in-out";
})(EasingType || (exports.EasingType = EasingType = {}));
/**
 * Fade type for pause/resume operations with integrated volume transitions
 */
var FadeType;
(function (FadeType) {
    FadeType["Linear"] = "linear";
    FadeType["Gentle"] = "gentle";
    FadeType["Dramatic"] = "dramatic";
})(FadeType || (exports.FadeType = FadeType = {}));
