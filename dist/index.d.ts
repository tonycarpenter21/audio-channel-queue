/**
 * @fileoverview Main entry point for the audio-channel-queue package
 * Exports all public functions and types for audio queue management, pause/resume controls,
 * volume management with ducking, progress tracking, and comprehensive event system
 */
export { queueAudio, queueAudioPriority, stopCurrentAudioInChannel, stopAllAudioInChannel, stopAllAudio, playAudioQueue, destroyChannel, destroyAllChannels, setQueueConfig, getQueueConfig, setChannelQueueLimit } from './core';
export { clearQueueAfterCurrent, getQueueItemInfo, getQueueLength, removeQueuedItem, reorderQueue, swapQueueItems } from './queue-manipulation';
export { getErrorRecovery, getRetryConfig, offAudioError, onAudioError, retryFailedAudio, setErrorRecovery, setRetryConfig } from './errors';
export { getAllChannelsPauseState, isChannelPaused, pauseAllChannels, pauseAllWithFade, pauseChannel, pauseWithFade, resumeAllChannels, resumeAllWithFade, resumeChannel, resumeWithFade, togglePauseAllChannels, togglePauseAllWithFade, togglePauseChannel, togglePauseWithFade } from './pause';
export { cancelAllVolumeTransitions, cancelVolumeTransition, clearVolumeDucking, getAllChannelsVolume, getChannelVolume, getFadeConfig, getGlobalVolume, setAllChannelsVolume, setChannelVolume, setGlobalVolume, setVolumeDucking, transitionVolume } from './volume';
export { cleanupWebAudioNodes, createWebAudioNodes, getAudioContext, getWebAudioConfig, getWebAudioSupport, getWebAudioVolume, isIOSDevice, isWebAudioSupported, resumeAudioContext, setWebAudioConfig, setWebAudioVolume, shouldUseWebAudio } from './web-audio';
export { getAllChannelsInfo, getCurrentAudioInfo, getQueueSnapshot, offAudioComplete, offAudioPause, offAudioProgress, offAudioResume, offAudioStart, offQueueChange, onAudioComplete, onAudioPause, onAudioProgress, onAudioResume, onAudioStart, onQueueChange } from './info';
export { audioChannels } from './info';
export { cleanWebpackFilename, createQueueSnapshot, extractFileName, getAudioInfoFromElement, sanitizeForDisplay, validateAudioUrl } from './utils';
export type { AudioCompleteCallback, AudioCompleteInfo, AudioErrorCallback, AudioErrorInfo, AudioInfo, AudioPauseCallback, AudioQueueOptions, AudioResumeCallback, AudioStartCallback, AudioStartInfo, ChannelFadeState, ErrorRecoveryOptions, ExtendedAudioQueueChannel, FadeConfig, ProgressCallback, QueueChangeCallback, QueueConfig, QueueItem, QueueManipulationResult, QueueSnapshot, RetryConfig, VolumeConfig, WebAudioConfig, WebAudioNodeSet, WebAudioSupport } from './types';
export { AudioErrorType, EasingType, FadeType, MAX_CHANNELS, TimerType, GLOBAL_PROGRESS_KEY } from './types';
