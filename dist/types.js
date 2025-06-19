"use strict";
/**
 * @fileoverview Type definitions for the audio-channel-queue package
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FadeType = exports.EasingType = void 0;
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
