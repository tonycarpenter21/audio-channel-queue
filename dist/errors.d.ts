/**
 * @fileoverview Error handling, retry logic, and recovery mechanisms for the audioq package
 */
import { AudioErrorInfo, AudioErrorCallback, AudioErrorType, RetryConfig, ErrorRecoveryOptions, ExtendedAudioQueueChannel } from './types';
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
export declare const onAudioError: (channelNumber: number | undefined, callback: AudioErrorCallback) => void;
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
export declare const offAudioError: (channelNumber?: number, callback?: AudioErrorCallback) => void;
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
export declare const setRetryConfig: (config: Partial<RetryConfig>) => void;
/**
 * Gets the current global retry configuration
 * @returns Current retry configuration
 * @example
 * ```typescript
 * const config = getRetryConfig();
 * console.log(`Max retries: ${config.maxRetries}`);
 * ```
 */
export declare const getRetryConfig: () => RetryConfig;
/**
 * Sets the global error recovery configuration
 * @param options - Error recovery options
 * @example
 * ```typescript
 * setErrorRecovery({
 *   autoRetry: true,
 *   fallbackToNextTrack: true,
 *   logErrorsToAnalytics: true,
 *   preserveQueueOnError: true,
 *   showUserFeedback: true
 * });
 * ```
 */
export declare const setErrorRecovery: (options: Partial<ErrorRecoveryOptions>) => void;
/**
 * Gets the current global error recovery configuration
 * @returns Current error recovery configuration
 * @example
 * ```typescript
 * const recovery = getErrorRecovery();
 * console.log(`Auto retry enabled: ${recovery.autoRetry}`);
 * ```
 */
export declare const getErrorRecovery: () => ErrorRecoveryOptions;
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
export declare const retryFailedAudio: (channelNumber?: number) => Promise<boolean>;
/**
 * Emits an audio error event to all registered listeners for a specific channel
 * @param channelNumber - The channel number where the error occurred
 * @param errorInfo - Information about the error
 * @param audioChannels - Array of audio channels
 * @internal
 */
export declare const emitAudioError: (channelNumber: number, errorInfo: AudioErrorInfo, audioChannels: ExtendedAudioQueueChannel[]) => void;
/**
 * Determines the error type based on the error object and context
 * @param error - The error that occurred
 * @param audio - The audio element that failed
 * @returns The categorized error type
 * @internal
 */
export declare const categorizeError: (error: Error, audio: HTMLAudioElement) => AudioErrorType;
/**
 * Sets up comprehensive error handling for an audio element
 * @param audio - The audio element to set up error handling for
 * @param channelNumber - The channel number this audio belongs to
 * @param originalUrl - The original URL that was requested
 * @param onError - Callback for when an error occurs
 * @internal
 */
export declare const setupAudioErrorHandling: (audio: HTMLAudioElement, channelNumber: number, originalUrl: string, onError?: (error: Error) => Promise<void>) => void;
/**
 * Handles audio errors with retry logic and recovery mechanisms
 * @param audio - The audio element that failed
 * @param channelNumber - The channel number
 * @param originalUrl - The original URL that was requested
 * @param error - The error that occurred
 * @internal
 */
export declare const handleAudioError: (audio: HTMLAudioElement, channelNumber: number, originalUrl: string, error: Error) => Promise<void>;
/**
 * Creates a timeout-protected audio element with comprehensive error handling
 * @param url - The audio URL to load
 * @param channelNumber - The channel number this audio belongs to
 * @returns Promise that resolves to the configured audio element
 * @internal
 */
export declare const createProtectedAudioElement: (url: string, channelNumber: number) => Promise<HTMLAudioElement>;
