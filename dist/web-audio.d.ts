/**
 * @fileoverview Web Audio API support for enhanced volume control on iOS and other platforms
 */
import { WebAudioConfig, WebAudioSupport, WebAudioNodeSet } from './types';
/**
 * Detects if the current device is iOS
 * @returns True if the device is iOS, false otherwise
 * @example
 * ```typescript
 * if (isIOSDevice()) {
 *   console.log('Running on iOS device');
 * }
 * ```
 */
export declare const isIOSDevice: () => boolean;
/**
 * Checks if Web Audio API is available in the current environment
 * @returns True if Web Audio API is supported, false otherwise
 * @example
 * ```typescript
 * if (isWebAudioSupported()) {
 *   console.log('Web Audio API is available');
 * }
 * ```
 */
export declare const isWebAudioSupported: () => boolean;
/**
 * Determines if Web Audio API should be used based on configuration and device detection
 * @returns True if Web Audio API should be used, false otherwise
 * @example
 * ```typescript
 * if (shouldUseWebAudio()) {
 *   // Use Web Audio API for volume control
 * }
 * ```
 */
export declare const shouldUseWebAudio: () => boolean;
/**
 * Gets information about Web Audio API support and usage
 * @returns Object containing Web Audio API support information
 * @example
 * ```typescript
 * const support = getWebAudioSupport();
 * console.log(`Using Web Audio: ${support.usingWebAudio}`);
 * console.log(`Reason: ${support.reason}`);
 * ```
 */
export declare const getWebAudioSupport: () => WebAudioSupport;
/**
 * Configures Web Audio API usage
 * @param config - Configuration options for Web Audio API
 * @example
 * ```typescript
 * // Force Web Audio API usage on all devices
 * setWebAudioConfig({ forceWebAudio: true });
 *
 * // Disable Web Audio API entirely
 * setWebAudioConfig({ enabled: false });
 * ```
 */
export declare const setWebAudioConfig: (config: Partial<WebAudioConfig>) => void;
/**
 * Gets the current Web Audio API configuration
 * @returns Current Web Audio API configuration
 * @example
 * ```typescript
 * const config = getWebAudioConfig();
 * console.log(`Web Audio enabled: ${config.enabled}`);
 * ```
 */
export declare const getWebAudioConfig: () => WebAudioConfig;
/**
 * Creates or gets an AudioContext for Web Audio API operations
 * @returns AudioContext instance or null if not supported
 * @example
 * ```typescript
 * const context = getAudioContext();
 * if (context) {
 *   console.log('Audio context created successfully');
 * }
 * ```
 */
export declare const getAudioContext: () => AudioContext | null;
/**
 * Creates Web Audio API nodes for an audio element
 * @param audioElement - The HTML audio element to create nodes for
 * @param audioContext - The AudioContext to use
 * @returns Web Audio API node set or null if creation fails
 * @example
 * ```typescript
 * const audio = new Audio('song.mp3');
 * const context = getAudioContext();
 * if (context) {
 *   const nodes = createWebAudioNodes(audio, context);
 *   if (nodes) {
 *     nodes.gainNode.gain.value = 0.5; // Set volume to 50%
 *   }
 * }
 * ```
 */
export declare const createWebAudioNodes: (audioElement: HTMLAudioElement, audioContext: AudioContext) => WebAudioNodeSet | null;
/**
 * Sets volume using Web Audio API gain node
 * @param gainNode - The gain node to set volume on
 * @param volume - Volume level (0-1)
 * @param transitionDuration - Optional transition duration in milliseconds
 * @example
 * ```typescript
 * const nodes = createWebAudioNodes(audio, context);
 * if (nodes) {
 *   setWebAudioVolume(nodes.gainNode, 0.5); // Set to 50% volume
 *   setWebAudioVolume(nodes.gainNode, 0.2, 300); // Fade to 20% over 300ms
 * }
 * ```
 */
export declare const setWebAudioVolume: (gainNode: GainNode, volume: number, transitionDuration?: number) => void;
/**
 * Gets the current volume from a Web Audio API gain node
 * @param gainNode - The gain node to get volume from
 * @returns Current volume level (0-1)
 * @example
 * ```typescript
 * const nodes = createWebAudioNodes(audio, context);
 * if (nodes) {
 *   const volume = getWebAudioVolume(nodes.gainNode);
 *   console.log(`Current volume: ${volume * 100}%`);
 * }
 * ```
 */
export declare const getWebAudioVolume: (gainNode: GainNode) => number;
/**
 * Resumes an AudioContext if it's in suspended state (required for autoplay policy)
 * @param audioContext - The AudioContext to resume
 * @returns Promise that resolves when context is resumed
 * @example
 * ```typescript
 * const context = getAudioContext();
 * if (context) {
 *   await resumeAudioContext(context);
 * }
 * ```
 */
export declare const resumeAudioContext: (audioContext: AudioContext) => Promise<void>;
/**
 * Cleans up Web Audio API nodes and connections
 * @param nodes - The Web Audio API node set to clean up
 * @example
 * ```typescript
 * const nodes = createWebAudioNodes(audio, context);
 * if (nodes) {
 *   // Use nodes...
 *   cleanupWebAudioNodes(nodes); // Clean up when done
 * }
 * ```
 */
export declare const cleanupWebAudioNodes: (nodes: WebAudioNodeSet) => void;
