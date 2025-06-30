/**
 * @fileoverview Type definitions for the audio-channel-queue package
 */
/**
 * Maximum number of audio channels allowed to prevent memory exhaustion
 */
export declare const MAX_CHANNELS: number;
/**
 * Symbol used as a key for global (channel-wide) progress callbacks
 * This avoids the need for `null as any` type assertions
 */
export declare const GLOBAL_PROGRESS_KEY: unique symbol;
/**
 * Array of HTMLAudioElement objects representing an audio queue
 */
export type AudioQueue = HTMLAudioElement[];
/**
 * Basic audio queue channel structure
 */
export interface AudioQueueChannel {
    queue: AudioQueue;
}
/**
 * Volume ducking configuration for channels
 */
export interface VolumeConfig {
    /** The channel number that should have priority */
    priorityChannel: number;
    /** Volume level for the priority channel (0-1) */
    priorityVolume: number;
    /** Volume level for all other channels when priority channel is active (0-1) */
    duckingVolume: number;
    /** Duration in milliseconds for volume duck transition (defaults to 250ms) */
    duckTransitionDuration?: number;
    /** Duration in milliseconds for volume restore transition (defaults to 500ms) */
    restoreTransitionDuration?: number;
    /** Easing function for volume transitions (defaults to 'ease-out') */
    transitionEasing?: EasingType;
}
/**
 * Configuration options for queuing audio
 */
export interface AudioQueueOptions {
    /** Whether to add this audio to the front of the queue (after currently playing) */
    addToFront?: boolean;
    /** Whether the audio should loop when it finishes */
    loop?: boolean;
    /** Maximum number of items allowed in the queue (defaults to unlimited) */
    maxQueueSize?: number;
    /** @deprecated Use addToFront instead. Legacy support for priority queuing */
    priority?: boolean;
    /** Volume level for this specific audio (0-1) */
    volume?: number;
}
/**
 * Global queue configuration options
 */
export interface QueueConfig {
    /** Default maximum queue size across all channels (defaults to unlimited) */
    defaultMaxQueueSize?: number;
    /** Whether to drop oldest items when queue is full (defaults to false - reject new items) */
    dropOldestWhenFull?: boolean;
    /** Whether to show warnings when queue limits are reached (defaults to true) */
    showQueueWarnings?: boolean;
}
/**
 * Comprehensive audio information interface providing metadata about currently playing audio
 */
export interface AudioInfo {
    /** Current playback position in milliseconds */
    currentTime: number;
    /** Total audio duration in milliseconds */
    duration: number;
    /** Extracted filename from the source URL */
    fileName: string;
    /** Whether the audio is set to loop */
    isLooping: boolean;
    /** Whether the audio is currently paused */
    isPaused: boolean;
    /** Whether the audio is currently playing */
    isPlaying: boolean;
    /** Playback progress as a decimal (0-1) */
    progress: number;
    /** Number of audio files remaining in the queue after current */
    remainingInQueue: number;
    /** Audio file source URL */
    src: string;
    /** Current volume level (0-1) */
    volume: number;
}
/**
 * Information provided when an audio file completes playback
 */
export interface AudioCompleteInfo {
    /** Channel number where the audio completed */
    channelNumber: number;
    /** Extracted filename from the source URL */
    fileName: string;
    /** Number of audio files remaining in the queue after completion */
    remainingInQueue: number;
    /** Audio file source URL */
    src: string;
}
/**
 * Information provided when an audio file starts playing
 */
export interface AudioStartInfo {
    /** Channel number where the audio is starting */
    channelNumber: number;
    /** Total audio duration in milliseconds */
    duration: number;
    /** Extracted filename from the source URL */
    fileName: string;
    /** Audio file source URL */
    src: string;
}
/**
 * Information about a single item in an audio queue
 */
export interface QueueItem {
    /** Total audio duration in milliseconds */
    duration: number;
    /** Extracted filename from the source URL */
    fileName: string;
    /** Whether this item is currently playing */
    isCurrentlyPlaying: boolean;
    /** Whether this item is set to loop */
    isLooping: boolean;
    /** Audio file source URL */
    src: string;
    /** Volume level for this item (0-1) */
    volume: number;
}
/**
 * Complete snapshot of a queue's current state
 */
export interface QueueSnapshot {
    /** Channel number this snapshot represents */
    channelNumber: number;
    /** Zero-based index of the currently playing item */
    currentIndex: number;
    /** Whether the current audio is paused */
    isPaused: boolean;
    /** Array of audio items in the queue with their metadata */
    items: QueueItem[];
    /** Total number of items in the queue */
    totalItems: number;
    /** Current volume level for the channel (0-1) */
    volume: number;
}
/**
 * Information about a queue manipulation operation result
 */
export interface QueueManipulationResult {
    /** Error message if operation failed */
    error?: string;
    /** Whether the operation was successful */
    success: boolean;
    /** The queue snapshot after the operation (if successful) */
    updatedQueue?: QueueSnapshot;
}
/**
 * Callback function type for audio progress updates
 * @param info Current audio information
 */
export type ProgressCallback = (info: AudioInfo) => void;
/**
 * Callback function type for queue change notifications
 * @param queueSnapshot Current state of the queue
 */
export type QueueChangeCallback = (queueSnapshot: QueueSnapshot) => void;
/**
 * Callback function type for audio start notifications
 * @param audioInfo Information about the audio that started
 */
export type AudioStartCallback = (audioInfo: AudioStartInfo) => void;
/**
 * Callback function type for audio complete notifications
 * @param audioInfo Information about the audio that completed
 */
export type AudioCompleteCallback = (audioInfo: AudioCompleteInfo) => void;
/**
 * Callback function type for audio pause notifications
 * @param channelNumber Channel that was paused
 * @param audioInfo Information about the audio that was paused
 */
export type AudioPauseCallback = (channelNumber: number, audioInfo: AudioInfo) => void;
/**
 * Callback function type for audio resume notifications
 * @param channelNumber Channel that was resumed
 * @param audioInfo Information about the audio that was resumed
 */
export type AudioResumeCallback = (channelNumber: number, audioInfo: AudioInfo) => void;
/**
 * Information about an audio error that occurred
 */
export interface AudioErrorInfo {
    channelNumber: number;
    src: string;
    fileName: string;
    error: Error;
    errorType: 'network' | 'decode' | 'unsupported' | 'permission' | 'abort' | 'timeout' | 'unknown';
    timestamp: number;
    retryAttempt?: number;
    remainingInQueue: number;
}
/**
 * Configuration for automatic retry behavior when audio fails to load or play
 */
export interface RetryConfig {
    enabled: boolean;
    maxRetries: number;
    baseDelay: number;
    exponentialBackoff: boolean;
    timeoutMs: number;
    fallbackUrls?: string[];
    skipOnFailure: boolean;
}
/**
 * Configuration options for error recovery mechanisms
 */
export interface ErrorRecoveryOptions {
    autoRetry: boolean;
    showUserFeedback: boolean;
    logErrorsToAnalytics: boolean;
    preserveQueueOnError: boolean;
    fallbackToNextTrack: boolean;
}
/**
 * Callback function type for audio error events
 */
export type AudioErrorCallback = (errorInfo: AudioErrorInfo) => void;
/**
 * Extended audio channel with queue management and callback support
 */
export interface ExtendedAudioQueueChannel {
    audioCompleteCallbacks: Set<AudioCompleteCallback>;
    audioErrorCallbacks: Set<AudioErrorCallback>;
    audioPauseCallbacks: Set<AudioPauseCallback>;
    audioResumeCallbacks: Set<AudioResumeCallback>;
    audioStartCallbacks: Set<AudioStartCallback>;
    fadeState?: ChannelFadeState;
    isPaused: boolean;
    /** Active operation lock to prevent race conditions */
    isLocked?: boolean;
    /** Maximum allowed queue size for this channel */
    maxQueueSize?: number;
    progressCallbacks: Map<HTMLAudioElement | typeof GLOBAL_PROGRESS_KEY, Set<ProgressCallback>>;
    queue: HTMLAudioElement[];
    queueChangeCallbacks: Set<QueueChangeCallback>;
    retryConfig?: RetryConfig;
    volume: number;
}
/**
 * Easing function types for volume transitions
 */
export declare enum EasingType {
    Linear = "linear",
    EaseIn = "ease-in",
    EaseOut = "ease-out",
    EaseInOut = "ease-in-out"
}
/**
 * Fade type for pause/resume operations with integrated volume transitions
 */
export declare enum FadeType {
    Linear = "linear",
    Gentle = "gentle",
    Dramatic = "dramatic"
}
/**
 * Timer types for volume transitions to ensure proper cleanup
 */
export declare enum TimerType {
    RequestAnimationFrame = "raf",
    Timeout = "timeout"
}
/**
 * Configuration for fade transitions
 */
export interface FadeConfig {
    /** Duration in milliseconds for the fade transition */
    duration: number;
    /** Easing curve to use when pausing (fading out) */
    pauseCurve: EasingType;
    /** Easing curve to use when resuming (fading in) */
    resumeCurve: EasingType;
}
/**
 * Internal fade state tracking for pause/resume with fade functionality
 */
export interface ChannelFadeState {
    /** The original volume level before fading began */
    originalVolume: number;
    /** The type of fade being used */
    fadeType: FadeType;
    /** Whether the channel is currently paused due to fade */
    isPaused: boolean;
    /** Custom duration in milliseconds if specified (overrides fade type default) */
    customDuration?: number;
    /** Whether the channel is currently transitioning (during any fade operation) to prevent capturing intermediate volumes during rapid pause/resume toggles */
    isTransitioning?: boolean;
}
