/**
 * @fileoverview Error handling, retry logic, and recovery mechanisms for the audio-channel-queue package
 */

import {
  AudioErrorInfo,
  AudioErrorCallback,
  RetryConfig,
  ErrorRecoveryOptions,
  ExtendedAudioQueueChannel,
  MAX_CHANNELS
} from './types';
import { audioChannels } from './info';
import { extractFileName } from './utils';

let globalRetryConfig: RetryConfig = {
  baseDelay: 1000,
  enabled: true,
  exponentialBackoff: true,
  maxRetries: 3,
  skipOnFailure: false,
  timeoutMs: 10000
};

let globalErrorRecovery: ErrorRecoveryOptions = {
  autoRetry: true,
  fallbackToNextTrack: true,
  logErrorsToAnalytics: false,
  preserveQueueOnError: true,
  showUserFeedback: false
};

const retryAttempts: WeakMap<HTMLAudioElement, number> = new WeakMap();

const loadTimeouts: WeakMap<HTMLAudioElement, number> = new WeakMap();

/**
 * Subscribes to audio error events for a specific channel
 * @param channelNumber - The channel number to listen to (defaults to 0)
 * @param callback - Function to call when an audio error occurs
 * @throws Error if the channel number exceeds the maximum allowed channels
 * @example
 * ```typescript
 * onAudioError(0, (errorInfo) => {
 *   console.log(`Audio error: ${errorInfo.error.message}`);
 *   console.log(`Error type: ${errorInfo.errorType}`);
 * });
 * ```
 */
export const onAudioError = (channelNumber: number = 0, callback: AudioErrorCallback): void => {
  // Validate channel number limits BEFORE creating any channels
  if (channelNumber < 0) {
    throw new Error('Channel number must be non-negative');
  }
  if (channelNumber >= MAX_CHANNELS) {
    throw new Error(
      `Channel number ${channelNumber} exceeds maximum allowed channels (${MAX_CHANNELS})`
    );
  }

  // Ensure channel exists (now safe because we validated the limit above)
  while (audioChannels.length <= channelNumber) {
    audioChannels.push({
      audioCompleteCallbacks: new Set(),
      audioErrorCallbacks: new Set(),
      audioPauseCallbacks: new Set(),
      audioResumeCallbacks: new Set(),
      audioStartCallbacks: new Set(),
      isPaused: false,
      progressCallbacks: new Map(),
      queue: [],
      queueChangeCallbacks: new Set(),
      volume: 1.0
    });
  }

  const channel: ExtendedAudioQueueChannel = audioChannels[channelNumber];
  if (!channel.audioErrorCallbacks) {
    channel.audioErrorCallbacks = new Set();
  }

  channel.audioErrorCallbacks.add(callback);
};

/**
 * Unsubscribes from audio error events for a specific channel
 * @param channelNumber - The channel number to stop listening to (defaults to 0)
 * @param callback - The specific callback to remove (optional - if not provided, removes all)
 * @example
 * ```typescript
 * offAudioError(0); // Remove all error callbacks for channel 0
 * offAudioError(0, specificCallback); // Remove specific callback
 * ```
 */
export const offAudioError = (channelNumber: number = 0, callback?: AudioErrorCallback): void => {
  const channel: ExtendedAudioQueueChannel = audioChannels[channelNumber];
  if (!channel?.audioErrorCallbacks) return;

  if (callback) {
    channel.audioErrorCallbacks.delete(callback);
  } else {
    channel.audioErrorCallbacks.clear();
  }
};

/**
 * Sets the global retry configuration for audio loading failures
 * @param config - Retry configuration options
 * @example
 * ```typescript
 * setRetryConfig({
 *   enabled: true,
 *   maxRetries: 5,
 *   baseDelay: 1000,
 *   exponentialBackoff: true,
 *   timeoutMs: 15000,
 *   fallbackUrls: ['https://cdn.backup.com/audio/'],
 *   skipOnFailure: true
 * });
 * ```
 */
export const setRetryConfig = (config: Partial<RetryConfig>): void => {
  globalRetryConfig = { ...globalRetryConfig, ...config };
};

/**
 * Gets the current global retry configuration
 * @returns Current retry configuration
 * @example
 * ```typescript
 * const config = getRetryConfig();
 * console.log(`Max retries: ${config.maxRetries}`);
 * ```
 */
export const getRetryConfig = (): RetryConfig => {
  return { ...globalRetryConfig };
};

/**
 * Sets the global error recovery configuration
 * @param options - Error recovery options
 * @example
 * ```typescript
 * setErrorRecovery({
 *   autoRetry: true,
 *   showUserFeedback: true,
 *   logErrorsToAnalytics: true,
 *   preserveQueueOnError: true,
 *   fallbackToNextTrack: true
 * });
 * ```
 */
export const setErrorRecovery = (options: Partial<ErrorRecoveryOptions>): void => {
  globalErrorRecovery = { ...globalErrorRecovery, ...options };
};

/**
 * Gets the current global error recovery configuration
 * @returns Current error recovery configuration
 * @example
 * ```typescript
 * const recovery = getErrorRecovery();
 * console.log(`Auto retry enabled: ${recovery.autoRetry}`);
 * ```
 */
export const getErrorRecovery = (): ErrorRecoveryOptions => {
  return { ...globalErrorRecovery };
};

/**
 * Manually retries loading failed audio for a specific channel
 * @param channelNumber - The channel number to retry (defaults to 0)
 * @returns Promise that resolves to true if retry was successful, false otherwise
 * @example
 * ```typescript
 * const success = await retryFailedAudio(0);
 * if (success) {
 *   console.log('Audio retry successful');
 * } else {
 *   console.log('Audio retry failed');
 * }
 * ```
 */
export const retryFailedAudio = async (channelNumber: number = 0): Promise<boolean> => {
  const channel: ExtendedAudioQueueChannel = audioChannels[channelNumber];
  if (!channel || channel.queue.length === 0) return false;

  const currentAudio: HTMLAudioElement = channel.queue[0];
  const currentAttempts = retryAttempts.get(currentAudio) ?? 0;

  if (currentAttempts >= globalRetryConfig.maxRetries) {
    return false;
  }

  try {
    // Reset the audio element
    currentAudio.currentTime = 0;
    await currentAudio.play();

    // Reset retry counter on successful play
    retryAttempts.delete(currentAudio);
    return true;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`Error in retryFailedAudio: ${error}`);
    // Increment retry counter
    retryAttempts.set(currentAudio, currentAttempts + 1);
    return false;
  }
};

/**
 * Emits an audio error event to all registered listeners for a specific channel
 * @param channelNumber - The channel number where the error occurred
 * @param errorInfo - Information about the error
 * @param audioChannels - Array of audio channels
 * @internal
 */
export const emitAudioError = (
  channelNumber: number,
  errorInfo: AudioErrorInfo,
  audioChannels: ExtendedAudioQueueChannel[]
): void => {
  const channel: ExtendedAudioQueueChannel = audioChannels[channelNumber];
  if (!channel?.audioErrorCallbacks) return;

  // Log to analytics if enabled
  if (globalErrorRecovery.logErrorsToAnalytics) {
    // eslint-disable-next-line no-console
    console.warn('Audio Error Analytics:', errorInfo);
  }

  channel.audioErrorCallbacks.forEach((callback) => {
    try {
      callback(errorInfo);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error in audio error callback:', error);
    }
  });
};

/**
 * Determines the error type based on the error object and context
 * @param error - The error that occurred
 * @param audio - The audio element that failed
 * @returns The categorized error type
 * @internal
 */
export const categorizeError = (
  error: Error,
  audio: HTMLAudioElement
): AudioErrorInfo['errorType'] => {
  const errorMessage = error.message.toLowerCase();

  if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
    return 'network';
  }

  // Check for unsupported format first (more specific than decode)
  if (
    errorMessage.includes('not supported') ||
    errorMessage.includes('unsupported') ||
    errorMessage.includes('format not supported')
  ) {
    return 'unsupported';
  }

  if (errorMessage.includes('decode') || errorMessage.includes('format')) {
    return 'decode';
  }

  if (errorMessage.includes('permission') || errorMessage.includes('blocked')) {
    return 'permission';
  }

  if (errorMessage.includes('abort')) {
    return 'abort';
  }

  if (errorMessage.includes('timeout')) {
    return 'timeout';
  }

  // Check audio element network state for more context
  if (audio.networkState === HTMLMediaElement.NETWORK_NO_SOURCE) {
    return 'network';
  }

  if (audio.networkState === HTMLMediaElement.NETWORK_LOADING) {
    return 'timeout';
  }

  return 'unknown';
};

/**
 * Sets up comprehensive error handling for an audio element
 * @param audio - The audio element to set up error handling for
 * @param channelNumber - The channel number this audio belongs to
 * @param originalUrl - The original URL that was requested
 * @param onError - Callback for when an error occurs
 * @internal
 */
export const setupAudioErrorHandling = (
  audio: HTMLAudioElement,
  channelNumber: number,
  originalUrl: string,
  onError?: (error: Error) => Promise<void>
): void => {
  const channel: ExtendedAudioQueueChannel = audioChannels[channelNumber];
  if (!channel) return;

  // Set up loading timeout with test environment compatibility
  let timeoutId: number;
  if (typeof setTimeout !== 'undefined') {
    timeoutId = setTimeout(() => {
      if (audio.networkState === HTMLMediaElement.NETWORK_LOADING) {
        const timeoutError = new Error(
          `Audio loading timeout after ${globalRetryConfig.timeoutMs}ms`
        );
        handleAudioError(audio, channelNumber, originalUrl, timeoutError);
      }
    }, globalRetryConfig.timeoutMs) as unknown as number;

    loadTimeouts.set(audio, timeoutId);
  }

  // Clear timeout when metadata loads successfully
  const handleLoadSuccess = (): void => {
    if (typeof setTimeout !== 'undefined') {
      const timeoutId = loadTimeouts.get(audio);
      if (timeoutId) {
        clearTimeout(timeoutId);
        loadTimeouts.delete(audio);
      }
    }
  };

  // Handle various error events
  const handleError = (_event: Event): void => {
    if (typeof setTimeout !== 'undefined') {
      const timeoutId = loadTimeouts.get(audio);
      if (timeoutId) {
        clearTimeout(timeoutId);
        loadTimeouts.delete(audio);
      }
    }

    const error = new Error(`Audio loading failed: ${audio.error?.message || 'Unknown error'}`);
    handleAudioError(audio, channelNumber, originalUrl, error);
  };

  const handleAbort = (): void => {
    const error = new Error('Audio loading was aborted');
    handleAudioError(audio, channelNumber, originalUrl, error);
  };

  const handleStall = (): void => {
    const error = new Error('Audio loading stalled');
    handleAudioError(audio, channelNumber, originalUrl, error);
  };

  // Add event listeners
  audio.addEventListener('error', handleError);
  audio.addEventListener('abort', handleAbort);
  audio.addEventListener('stalled', handleStall);
  audio.addEventListener('loadedmetadata', handleLoadSuccess);
  audio.addEventListener('canplay', handleLoadSuccess);

  // Custom play error handling
  if (onError) {
    const originalPlay = audio.play.bind(audio);
    const wrappedPlay = async (): Promise<void> => {
      try {
        await originalPlay();
      } catch (error) {
        await onError(error as Error);
        throw error;
      }
    };

    audio.play = wrappedPlay;
  }
};

/**
 * Handles audio errors with retry logic and recovery mechanisms
 * @param audio - The audio element that failed
 * @param channelNumber - The channel number
 * @param originalUrl - The original URL that was requested
 * @param error - The error that occurred
 * @internal
 */
export const handleAudioError = async (
  audio: HTMLAudioElement,
  channelNumber: number,
  originalUrl: string,
  error: Error
): Promise<void> => {
  const channel: ExtendedAudioQueueChannel = audioChannels[channelNumber];
  if (!channel) return;

  const currentAttempts = retryAttempts.get(audio) ?? 0;
  const retryConfig = channel.retryConfig ?? globalRetryConfig;

  const errorInfo: AudioErrorInfo = {
    channelNumber,
    error,
    errorType: categorizeError(error, audio),
    fileName: extractFileName(originalUrl),
    remainingInQueue: channel.queue.length - 1,
    retryAttempt: currentAttempts,
    src: originalUrl,
    timestamp: Date.now()
  };

  // Emit error event
  emitAudioError(channelNumber, errorInfo, audioChannels);

  // Attempt retry if enabled and within limits
  if (
    retryConfig.enabled &&
    currentAttempts < retryConfig.maxRetries &&
    globalErrorRecovery.autoRetry
  ) {
    const delay = retryConfig.exponentialBackoff
      ? retryConfig.baseDelay * Math.pow(2, currentAttempts)
      : retryConfig.baseDelay;

    retryAttempts.set(audio, currentAttempts + 1);

    const retryFunction = async (): Promise<void> => {
      try {
        // Try fallback URLs if available
        if (retryConfig.fallbackUrls && retryConfig.fallbackUrls.length > 0) {
          const fallbackIndex = currentAttempts % retryConfig.fallbackUrls.length;
          const fallbackUrl =
            retryConfig.fallbackUrls[fallbackIndex] + extractFileName(originalUrl);
          audio.src = fallbackUrl;
        }

        await audio.load();
        await audio.play();

        // Reset retry counter on success
        retryAttempts.delete(audio);
      } catch (retryError) {
        await handleAudioError(audio, channelNumber, originalUrl, retryError as Error);
      }
    };

    setTimeout(retryFunction, delay);
  } else {
    // Max retries reached or retry disabled
    if (retryConfig.skipOnFailure || globalErrorRecovery.fallbackToNextTrack) {
      // Skip to next track in queue
      channel.queue.shift();

      // Import and use playAudioQueue to continue with next track
      const { playAudioQueue } = await import('./core');
      // eslint-disable-next-line no-console
      playAudioQueue(channelNumber).catch(console.error);
    } else if (!globalErrorRecovery.preserveQueueOnError) {
      // Clear the entire queue on failure
      channel.queue = [];
    }
  }
};

/**
 * Creates a timeout-protected audio element with comprehensive error handling
 * @param url - The audio URL to load
 * @param channelNumber - The channel number this audio belongs to
 * @returns Promise that resolves to the configured audio element
 * @internal
 */
export const createProtectedAudioElement = async (
  url: string,
  channelNumber: number
): Promise<HTMLAudioElement> => {
  const audio = new Audio();

  return new Promise((resolve, reject) => {
    const cleanup = (): void => {
      const timeoutId = loadTimeouts.get(audio);
      if (timeoutId) {
        clearTimeout(timeoutId);
        loadTimeouts.delete(audio);
      }
    };

    const handleSuccess = (): void => {
      cleanup();
      resolve(audio);
    };

    const handleError = (error: Error): void => {
      cleanup();
      reject(error);
    };

    // Set up error handling
    setupAudioErrorHandling(audio, channelNumber, url, async (error: Error) => {
      handleError(error);
    });

    // Set up success handlers
    audio.addEventListener('canplay', handleSuccess, { once: true });
    audio.addEventListener('loadedmetadata', handleSuccess, { once: true });

    // Start loading
    audio.src = url;
    audio.load();
  });
};
