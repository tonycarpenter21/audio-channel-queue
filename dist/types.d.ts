/**
 * @fileoverview Type definitions for the audio-channel-queue package
 */
/**
 * Array of HTMLAudioElement objects representing an audio queue
 */
export type AudioQueue = HTMLAudioElement[];
/**
 * Basic audio queue channel structure
 */
export type AudioQueueChannel = {
    queue: AudioQueue;
};
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
    /** Whether the audio is currently playing */
    isPlaying: boolean;
    /** Playback progress as a decimal (0-1) */
    progress: number;
    /** Audio file source URL */
    src: string;
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
    /** Audio file source URL */
    src: string;
}
/**
 * Complete snapshot of a queue's current state
 */
export interface QueueSnapshot {
    /** Channel number this snapshot represents */
    channelNumber: number;
    /** Zero-based index of the currently playing item */
    currentIndex: number;
    /** Array of audio items in the queue with their metadata */
    items: QueueItem[];
    /** Total number of items in the queue */
    totalItems: number;
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
 * Extended audio queue channel with event callback management
 */
export type ExtendedAudioQueueChannel = AudioQueueChannel & {
    /** Set of callbacks for audio completion events */
    audioCompleteCallbacks?: Set<AudioCompleteCallback>;
    /** Set of callbacks for audio start events */
    audioStartCallbacks?: Set<AudioStartCallback>;
    /** Map of audio elements to their progress callback sets */
    progressCallbacks?: Map<HTMLAudioElement, Set<ProgressCallback>>;
    /** Set of callbacks for queue change events */
    queueChangeCallbacks?: Set<QueueChangeCallback>;
};
