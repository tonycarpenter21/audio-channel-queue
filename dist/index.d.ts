/**
 * @fileoverview Main entry point for the audio-channel-queue package
 * Exports all public functions and types for audio queue management, pause/resume controls,
 * volume management with ducking, progress tracking, and comprehensive event system
 */
export { queueAudio, queueAudioPriority, stopCurrentAudioInChannel, stopAllAudioInChannel, stopAllAudio, playAudioQueue } from './core';
export { getErrorRecovery, getRetryConfig, offAudioError, onAudioError, retryFailedAudio, setErrorRecovery, setRetryConfig } from './errors';
export { getAllChannelsPauseState, isChannelPaused, pauseAllChannels, pauseAllWithFade, pauseChannel, pauseWithFade, resumeAllChannels, resumeAllWithFade, resumeChannel, resumeWithFade, togglePauseAllChannels, togglePauseAllWithFade, togglePauseChannel, togglePauseWithFade } from './pause';
export { clearVolumeDucking, fadeVolume, getAllChannelsVolume, getChannelVolume, getFadeConfig, setAllChannelsVolume, setChannelVolume, setVolumeDucking, transitionVolume } from './volume';
export { getAllChannelsInfo, getCurrentAudioInfo, getQueueSnapshot, offAudioPause, offAudioProgress, offAudioResume, offQueueChange, onAudioComplete, onAudioPause, onAudioProgress, onAudioResume, onAudioStart, onQueueChange } from './info';
export { audioChannels } from './info';
export { cleanWebpackFilename, createQueueSnapshot, extractFileName, getAudioInfoFromElement } from './utils';
export type { AudioCompleteCallback, AudioCompleteInfo, AudioErrorCallback, AudioErrorInfo, AudioInfo, AudioPauseCallback, AudioQueueOptions, AudioResumeCallback, AudioStartCallback, AudioStartInfo, ChannelFadeState, ErrorRecoveryOptions, ExtendedAudioQueueChannel, FadeConfig, ProgressCallback, QueueChangeCallback, QueueItem, QueueSnapshot, RetryConfig, VolumeConfig } from './types';
export { EasingType, FadeType, GLOBAL_PROGRESS_KEY } from './types';
