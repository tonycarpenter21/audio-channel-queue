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
  transitionEasing?: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
}

/**
 * Audio file configuration for queueing
 */
export interface AudioQueueOptions {
  /** Whether to add the audio to the front of the queue (defaults to false) */
  addToFront?: boolean;
  /** Whether the audio should loop when it finishes */
  loop?: boolean;
  /** Whether to add the audio with priority (same as addToFront) */
  priority?: boolean;
  /** Volume level for this specific audio file (0-1, defaults to channel volume) */
  volume?: number;
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
 * Extended audio queue channel with event callback management and additional features
 */
export type ExtendedAudioQueueChannel = AudioQueueChannel & {
  /** Set of callbacks for audio completion events */
  audioCompleteCallbacks?: Set<AudioCompleteCallback>;
  /** Set of callbacks for audio pause events */
  audioPauseCallbacks?: Set<AudioPauseCallback>;
  /** Set of callbacks for audio resume events */
  audioResumeCallbacks?: Set<AudioResumeCallback>;
  /** Set of callbacks for audio start events */
  audioStartCallbacks?: Set<AudioStartCallback>;
  /** Whether the current audio in this channel is paused */
  isPaused?: boolean;
  /** Map of audio elements to their progress callback sets */
  progressCallbacks?: Map<HTMLAudioElement, Set<ProgressCallback>>;
  /** Set of callbacks for queue change events */
  queueChangeCallbacks?: Set<QueueChangeCallback>;
  /** Current volume level for this channel (0-1) */
  volume?: number;
  /** Volume ducking configuration for this channel */
  volumeConfig?: VolumeConfig;
} 