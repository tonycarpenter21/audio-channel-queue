/**
 * @fileoverview Web Audio API support for enhanced volume control on iOS and other platforms
 */

import { WebAudioConfig, WebAudioSupport, WebAudioNodeSet } from './types';

/**
 * Global Web Audio API configuration
 */
let webAudioConfig: WebAudioConfig = {
  autoDetectIOS: true,
  enabled: true,
  forceWebAudio: false
};

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
export const isIOSDevice = (): boolean => {
  if (typeof navigator === 'undefined') return false;

  // Modern approach using User-Agent Client Hints API
  const navWithUA = navigator as unknown as { userAgentData?: { platform: string } };
  if ('userAgentData' in navigator && navWithUA.userAgentData) {
    return navWithUA.userAgentData.platform === 'iOS';
  }

  // Fallback to userAgent string parsing
  const userAgent = navigator.userAgent || '';
  const isIOS = /iPad|iPhone|iPod/.test(userAgent);

  // Additional check for modern iPads that report as Mac
  const isMacWithTouch =
    /Macintosh/.test(userAgent) && 'maxTouchPoints' in navigator && navigator.maxTouchPoints > 1;

  return isIOS || isMacWithTouch;
};

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
export const isWebAudioSupported = (): boolean => {
  if (typeof window === 'undefined') {
    // In Node.js environment (tests), check if Web Audio API globals are available
    const globalThis = global as unknown as {
      AudioContext?: unknown;
      webkitAudioContext?: unknown;
    };
    return (
      typeof globalThis.AudioContext !== 'undefined' ||
      typeof globalThis.webkitAudioContext !== 'undefined'
    );
  }
  const windowWithWebkit = window as unknown as { webkitAudioContext?: unknown };
  return (
    typeof AudioContext !== 'undefined' ||
    typeof windowWithWebkit.webkitAudioContext !== 'undefined'
  );
};

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
export const shouldUseWebAudio = (): boolean => {
  if (!webAudioConfig.enabled) return false;
  if (!isWebAudioSupported()) return false;
  if (webAudioConfig.forceWebAudio) return true;
  if (webAudioConfig.autoDetectIOS && isIOSDevice()) return true;
  return false;
};

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
export const getWebAudioSupport = (): WebAudioSupport => {
  const available = isWebAudioSupported();
  const isIOS = isIOSDevice();
  const usingWebAudio = shouldUseWebAudio();

  let reason = '';
  if (!webAudioConfig.enabled) {
    reason = 'Web Audio API disabled in configuration';
  } else if (!available) {
    reason = 'Web Audio API not supported in this environment';
  } else if (webAudioConfig.forceWebAudio) {
    reason = 'Web Audio API forced via configuration';
  } else if (isIOS && webAudioConfig.autoDetectIOS) {
    reason = 'iOS device detected - using Web Audio API for volume control';
  } else {
    reason = 'Using standard HTMLAudioElement volume control';
  }

  return {
    available,
    isIOS,
    reason,
    usingWebAudio
  };
};

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
export const setWebAudioConfig = (config: Partial<WebAudioConfig>): void => {
  webAudioConfig = { ...webAudioConfig, ...config };
};

/**
 * Gets the current Web Audio API configuration
 * @returns Current Web Audio API configuration
 * @example
 * ```typescript
 * const config = getWebAudioConfig();
 * console.log(`Web Audio enabled: ${config.enabled}`);
 * ```
 */
export const getWebAudioConfig = (): WebAudioConfig => {
  return { ...webAudioConfig };
};

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
export const getAudioContext = (): AudioContext | null => {
  if (!isWebAudioSupported()) return null;

  try {
    // In Node.js environment (tests), return null to allow mocking
    if (typeof window === 'undefined') {
      return null;
    }

    // Use existing AudioContext or create new one
    const windowWithWebkit = window as unknown as { webkitAudioContext?: typeof AudioContext };
    const AudioContextClass = window.AudioContext || windowWithWebkit.webkitAudioContext;
    return new AudioContextClass();
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to create AudioContext:', error);
    return null;
  }
};

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
export const createWebAudioNodes = (
  audioElement: HTMLAudioElement,
  audioContext: AudioContext
): WebAudioNodeSet | null => {
  try {
    // Create media element source node
    const sourceNode = audioContext.createMediaElementSource(audioElement);

    // Create gain node for volume control
    const gainNode = audioContext.createGain();

    // Connect source to gain node
    sourceNode.connect(gainNode);

    // Connect gain node to destination (speakers)
    gainNode.connect(audioContext.destination);

    return {
      gainNode,
      sourceNode
    };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to create Web Audio nodes:', error);
    return null;
  }
};

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
export const setWebAudioVolume = (
  gainNode: GainNode,
  volume: number,
  transitionDuration?: number
): void => {
  const clampedVolume = Math.max(0, Math.min(1, volume));
  const currentTime = gainNode.context.currentTime;

  if (transitionDuration && transitionDuration > 0) {
    // Smooth transition using Web Audio API's built-in scheduling
    gainNode.gain.cancelScheduledValues(currentTime);
    gainNode.gain.setValueAtTime(gainNode.gain.value, currentTime);
    gainNode.gain.linearRampToValueAtTime(clampedVolume, currentTime + transitionDuration / 1000);
  } else {
    // Instant change
    gainNode.gain.cancelScheduledValues(currentTime);
    gainNode.gain.value = clampedVolume;
  }
};

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
export const getWebAudioVolume = (gainNode: GainNode): number => {
  return gainNode.gain.value;
};

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
export const resumeAudioContext = async (audioContext: AudioContext): Promise<void> => {
  if (audioContext.state === 'suspended') {
    try {
      await audioContext.resume();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to resume AudioContext:', error);
      // Don't throw - handle gracefully and continue
    }
  }
};

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
export const cleanupWebAudioNodes = (nodes: WebAudioNodeSet): void => {
  try {
    // Disconnect all nodes
    nodes.sourceNode.disconnect();
    nodes.gainNode.disconnect();
  } catch (error) {
    // Ignore errors during cleanup
    // eslint-disable-next-line no-console
    console.error('Error during Web Audio cleanup:', error);
  }
};
