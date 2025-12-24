/**
 * @fileoverview Tests for volume control and ducking functionality
 */

import {
  setChannelVolume,
  getChannelVolume,
  setAllChannelsVolume,
  getAllChannelsVolume,
  setGlobalVolume,
  getGlobalVolume,
  setVolumeDucking,
  clearVolumeDucking,
  transitionVolume,
  applyVolumeDucking,
  restoreVolumeLevels,
  cancelVolumeTransition,
  cancelAllVolumeTransitions,
  cleanupWebAudioForAudio,
  initializeWebAudioForAudio
} from '../src/volume';
import { audioChannels } from '../src/info';
import { queueAudio, stopCurrentAudioInChannel } from '../src/core';
import { pauseChannel, resumeChannel } from '../src/pause';
import {
  expectVolumeToBeCloseTo,
  toMockAudioElement,
  toHTMLAudioElement,
  createMockAudio
} from './setup';
import { VolumeConfig, EasingType } from '../src/types';

beforeEach(async () => {
  jest.clearAllMocks();
  audioChannels.length = 0;
  // Reset global volume to default
  await setGlobalVolume(1.0);
});

// Mock performance.now for consistent timing in tests
const mockPerformanceNow = jest.fn<number, []>();
interface MockPerformance {
  performance: { now: jest.MockedFunction<() => number> };
}
(global as unknown as MockPerformance).performance = { now: mockPerformanceNow };

describe('Volume Control', () => {
  describe('setChannelVolume', () => {
    it('should set volume for existing channel', async () => {
      await queueAudio('test.mp3', 0);
      const mockAudio = audioChannels[0].queue[0];

      await setChannelVolume(0, 0.5);

      expect(audioChannels[0].volume).toBe(0.5);
      expect(mockAudio.volume).toBe(0.5);
    });

    it('should create channel if it does not exist', async () => {
      await setChannelVolume(0, 0.7);

      expect(audioChannels[0]).toBeDefined();
      expect(audioChannels[0].volume).toBe(0.7);
    });

    it('should clamp volume to 0-1 range', async () => {
      await queueAudio('test.mp3', 0);

      await setChannelVolume(0, -0.5);
      expect(audioChannels[0].volume).toBe(0);

      await setChannelVolume(0, 1.5);
      expect(audioChannels[0].volume).toBe(1);
    });

    it('should handle smooth transitions when duration specified', async () => {
      await queueAudio('test.mp3', 0);
      const mockAudio = audioChannels[0].queue[0];
      mockAudio.volume = 1.0;
      audioChannels[0].volume = 1.0;

      let timeStep = 0;
      mockPerformanceNow.mockImplementation(() => timeStep);

      const transitionPromise = setChannelVolume(0, 0.5, 100);

      // Simulate progression through transition
      timeStep = 0; // Start

      timeStep = 50; // Halfway

      timeStep = 100; // Complete

      await transitionPromise;

      expect(audioChannels[0].volume).toBe(0.5);
      expect(mockAudio.volume).toBe(0.5);
    });

    it('should handle instant changes when no duration specified', async () => {
      await queueAudio('test.mp3', 0);
      const mockAudio = audioChannels[0].queue[0];

      await setChannelVolume(0, 0.3);

      expect(audioChannels[0].volume).toBe(0.3);
      expect(mockAudio.volume).toBe(0.3);
    });

    it('should handle setting channel volume to same value (early return)', async () => {
      await queueAudio('https://example.com/test.mp3', 0);
      const audio = audioChannels[0].queue[0];

      // Set initial volume
      audio.volume = 0.5;
      audioChannels[0].volume = 0.5;

      // Transition to same volume
      await setChannelVolume(0, 0.5, 100);

      expect(audio.volume).toBe(0.5);
    });

    it('should handle volume clamping during transitions', async () => {
      await queueAudio('https://example.com/test.mp3', 0);
      const audio = audioChannels[0].queue[0];

      // Set initial volume
      audio.volume = 0.5;
      audioChannels[0].volume = 0.5;

      // Test volume clamping
      await setChannelVolume(0, 1.5, 0); // Should clamp to 1.0
      expect(getChannelVolume(0)).toBe(1.0);

      await setChannelVolume(0, -0.5, 0); // Should clamp to 0.0
      expect(getChannelVolume(0)).toBe(0.0);
    });

    describe('Channel Volume Error Handling', () => {
      it('should throw error for negative channel number', async () => {
        await expect(setChannelVolume(-1, 0.5)).rejects.toThrow(
          'Channel number must be non-negative'
        );
      });

      it('should throw error for channel number exceeding MAX_CHANNELS', async () => {
        await expect(setChannelVolume(65, 0.5)).rejects.toThrow(
          'Channel number 65 exceeds maximum allowed channels (64)'
        );
      });
    });
  });

  describe('getChannelVolume', () => {
    it('should return volume for existing channel', async () => {
      await queueAudio('test.mp3', 0);
      audioChannels[0].volume = 0.6;

      const volume = getChannelVolume(0);

      expect(volume).toBe(0.6);
    });

    it('should return 1.0 for non-existent channel', () => {
      const volume = getChannelVolume(99);
      expect(volume).toBe(1.0);
    });

    it('should return 1.0 for channel with undefined volume', async () => {
      await queueAudio('test.mp3', 0);
      (audioChannels[0] as unknown as { volume: undefined }).volume = undefined;

      const volume = getChannelVolume(0);
      expect(volume).toBe(1.0);
    });

    it('should get volume for default channel 0 when no channel specified', async () => {
      await setChannelVolume(0, 0.7);

      const volume = getChannelVolume(); // No channel parameter
      expect(volume).toBe(0.7);
    });

    it('should return 1.0 for non-existent default channel', () => {
      const volume = getChannelVolume(99);
      expect(volume).toBe(1.0);
    });
  });

  describe('setAllChannelsVolume', () => {
    it('should set volume for all existing channels', async () => {
      await queueAudio('test1.mp3', 0);
      await queueAudio('test2.mp3', 1);
      await queueAudio('test3.mp3', 2);

      await setAllChannelsVolume(0.4);

      expect(audioChannels[0].volume).toBe(0.4);
      expect(audioChannels[1].volume).toBe(0.4);
      expect(audioChannels[2].volume).toBe(0.4);
    });

    it('should handle empty channels array gracefully', async () => {
      await expect(setAllChannelsVolume(0.5)).resolves.not.toThrow();
    });

    describe('Global Volume (Volume Multiplier)', () => {
      it('should act as global multiplier, not override individual channel volumes', async () => {
        // Set up channels with different volumes
        await queueAudio('test1.mp3', 0);
        await queueAudio('test2.mp3', 1);
        await queueAudio('test3.mp3', 2);

        // Set individual channel volumes
        await setChannelVolume(0, 0.2); // 20%
        await setChannelVolume(1, 0.8); // 80%
        await setChannelVolume(2, 0.5); // 50%

        // Apply global volume of 50%
        await setGlobalVolume(0.5);

        // Expected: global volume should multiply with channel volumes
        // Channel 0: 20% * 50% = 10% (0.1)
        expect(audioChannels[0].queue[0].volume).toBeCloseTo(0.1, 5);
        // Channel 1: 80% * 50% = 40% (0.4)
        expect(audioChannels[1].queue[0].volume).toBeCloseTo(0.4, 5);
        // Channel 2: 50% * 50% = 25% (0.25)
        expect(audioChannels[2].queue[0].volume).toBeCloseTo(0.25, 5);

        // Channel volume (desired volume) should be preserved
        expect(audioChannels[0].volume).toBe(0.2);
        expect(audioChannels[1].volume).toBe(0.8);
        expect(audioChannels[2].volume).toBe(0.5);
      });

      it('should preserve channel volume ratios when global volume changes', async () => {
        await queueAudio('sfx.mp3', 0);
        await queueAudio('music.mp3', 1);

        // Set different volumes for different audio types
        await setChannelVolume(0, 0.3); // SFX at 30%
        await setChannelVolume(1, 0.7); // Music at 70%

        // User sets global volume to 60%
        await setGlobalVolume(0.6);

        // Playback volumes should be: channel * global
        expect(audioChannels[0].queue[0].volume).toBeCloseTo(0.18, 5); // 30% * 60%
        expect(audioChannels[1].queue[0].volume).toBeCloseTo(0.42, 5); // 70% * 60%

        // Now user changes global volume to 80%
        await setGlobalVolume(0.8);

        // Playback volumes should update proportionally
        expect(audioChannels[0].queue[0].volume).toBeCloseTo(0.24, 5); // 30% * 80%
        expect(audioChannels[1].queue[0].volume).toBeCloseTo(0.56, 5); // 70% * 80%

        // Channel volumes should remain unchanged
        expect(audioChannels[0].volume).toBe(0.3);
        expect(audioChannels[1].volume).toBe(0.7);
      });

      it('should handle global volume of 0 (mute all)', async () => {
        await queueAudio('test1.mp3', 0);
        await queueAudio('test2.mp3', 1);

        await setChannelVolume(0, 0.5);
        await setChannelVolume(1, 0.8);

        // Mute everything with global volume
        await setGlobalVolume(0);

        // All playback should be muted
        expect(audioChannels[0].queue[0].volume).toBe(0);
        expect(audioChannels[1].queue[0].volume).toBe(0);

        // But channel volumes should be preserved
        expect(audioChannels[0].volume).toBe(0.5);
        expect(audioChannels[1].volume).toBe(0.8);
      });

      it('should handle global volume of 1 (full volume)', async () => {
        await queueAudio('test1.mp3', 0);
        await queueAudio('test2.mp3', 1);

        await setChannelVolume(0, 0.4);
        await setChannelVolume(1, 0.6);

        // Set global volume to full
        await setGlobalVolume(1.0);

        // Playback volumes should match channel volumes (no attenuation)
        expect(audioChannels[0].queue[0].volume).toBe(0.4);
        expect(audioChannels[1].queue[0].volume).toBe(0.6);

        expect(audioChannels[0].volume).toBe(0.4);
        expect(audioChannels[1].volume).toBe(0.6);
      });

      it('should return current global volume', async () => {
        // Default should be 1.0 (100%)
        expect(getGlobalVolume()).toBe(1.0);

        await setGlobalVolume(0.75);
        expect(getGlobalVolume()).toBe(0.75);

        await setGlobalVolume(0.3);
        expect(getGlobalVolume()).toBe(0.3);
      });

      it('should apply global volume to newly queued audio on existing channels', async () => {
        await queueAudio('test1.mp3', 0);

        // Set channel and global volume
        await setChannelVolume(0, 0.5); // 50%
        await setGlobalVolume(0.4); // Global 40%

        // First audio should have global volume applied
        expect(audioChannels[0].queue[0].volume).toBeCloseTo(0.2, 5); // 50% * 40%

        // Queue new audio on same channel
        await queueAudio('test2.mp3', 0);

        // Channel volume should be preserved
        expect(audioChannels[0].volume).toBe(0.5);
      });

      it('should apply global volume to new channels after global volume is set', async () => {
        // Set global volume first
        await setGlobalVolume(0.5);

        // Create first channel with volume
        await queueAudio('test1.mp3', 0);
        await setChannelVolume(0, 0.3);

        // Create new channel
        await queueAudio('test2.mp3', 1);
        await setChannelVolume(1, 0.8);

        // Both channels should have global volume applied
        expect(audioChannels[0].queue[0].volume).toBeCloseTo(0.15, 5); // 30% * 50%
        expect(audioChannels[1].queue[0].volume).toBeCloseTo(0.4, 5); // 80% * 50%

        expect(audioChannels[0].volume).toBe(0.3);
        expect(audioChannels[1].volume).toBe(0.8);
      });

      it('should apply global volume to newly started audio automatically', async () => {
        // Set global volume to 50% BEFORE any audio exists
        await setGlobalVolume(0.5);

        // Queue first audio - it should start playing at 50% volume immediately
        await queueAudio('test1.mp3', 0);

        // The audio element should have global volume applied (channel default 1.0 * global 0.5 = 0.5)
        expect(audioChannels[0].queue[0].volume).toBeCloseTo(0.5, 5);

        // Now queue a second audio to the queue (won't play yet)
        await queueAudio('test2.mp3', 0);

        // Stop the first audio so the second starts playing
        await stopCurrentAudioInChannel(0);

        // Wait for the next audio to start
        await new Promise((resolve) => setTimeout(resolve, 50));

        // The second audio should ALSO have global volume applied without calling setGlobalVolume again
        expect(audioChannels[0].queue[0].volume).toBeCloseTo(0.5, 5);
      });

      it('should work correctly with volume ducking and global volume', async () => {
        await queueAudio('background.mp3', 0);
        await queueAudio('voice.mp3', 1);

        // Set channel volumes
        await setChannelVolume(0, 0.6); // Background at 60%
        await setChannelVolume(1, 0.9); // Voice at 90%

        // Set global volume
        await setGlobalVolume(0.5); // Global at 50%

        // Configure ducking
        setVolumeDucking({
          duckingVolume: 0.2,
          priorityChannel: 1,
          priorityVolume: 1.0
        });

        // Apply ducking
        await applyVolumeDucking(1);

        // Background should be ducked to: duckingVolume (0.2) * global (0.5) = 0.1
        expect(audioChannels[0].queue[0].volume).toBeCloseTo(0.1, 5);

        // Voice priority channel: priorityVolume (1.0) * global (0.5) = 0.5
        // Note: Ducking overrides the channel volume and applies priorityVolume directly
        expect(audioChannels[1].queue[0].volume).toBeCloseTo(0.5, 5);

        // Channel volumes should remain unchanged
        expect(audioChannels[0].volume).toBe(0.6);
        expect(audioChannels[1].volume).toBe(0.9);
      });

      it('should clamp global volume to 0-1 range', async () => {
        await setGlobalVolume(1.5); // Over max
        expect(getGlobalVolume()).toBe(1.0);

        await setGlobalVolume(-0.5); // Under min
        expect(getGlobalVolume()).toBe(0);
      });
    });
  });

  describe('getAllChannelsVolume', () => {
    it('should return volumes for all channels', async () => {
      await queueAudio('test1.mp3', 0);
      await queueAudio('test2.mp3', 1);
      await queueAudio('test3.mp3', 2);

      audioChannels[0].volume = 0.3;
      audioChannels[1].volume = 0.7;
      audioChannels[2].volume = 1.0;

      const volumes = getAllChannelsVolume();

      expect(volumes).toEqual([0.3, 0.7, 1.0]);
    });

    it('should return empty array when no channels exist', () => {
      const volumes = getAllChannelsVolume();
      expect(volumes).toEqual([]);
    });

    it('should handle channels with undefined volume', async () => {
      await queueAudio('test.mp3', 0);
      (audioChannels[0] as unknown as { volume: undefined }).volume = undefined;

      const volumes = getAllChannelsVolume();

      expect(volumes).toEqual([1.0]);
    });

    it('should handle sparse channel arrays', async () => {
      // Create channels 0 and 2, skip channel 1
      await queueAudio('test1.mp3', 0);
      await queueAudio('test2.mp3', 2);
      audioChannels[0].volume = 0.3;
      audioChannels[2].volume = 0.7;

      const volumes = getAllChannelsVolume();

      expect(volumes).toEqual([0.3, 1.0, 0.7]); // Channel 1 defaults to 1.0
    });
  });

  describe('transitionVolume', () => {
    it('should smoothly transition volume over time', async () => {
      await queueAudio('test.mp3', 0);
      const mockAudio = audioChannels[0].queue[0];
      mockAudio.volume = 1.0;
      audioChannels[0].volume = 1.0;

      // Test with very short duration to avoid timeout
      await transitionVolume(0, 0.5, 1);

      expect(audioChannels[0].volume).toBe(0.5);
      expect(mockAudio.volume).toBe(0.5);
    });

    it('should resolve immediately if no volume change needed', async () => {
      await queueAudio('test.mp3', 0);
      audioChannels[0].volume = 0.5;

      const result = await transitionVolume(0, 0.5, 100);

      expect(result).toBeUndefined();
      expect(audioChannels[0].volume).toBe(0.5);
    });

    it('should handle rapid volume changes', async () => {
      await queueAudio('https://example.com/test.mp3', 0);

      // Initial volume should be 1.0
      expect(getChannelVolume(0)).toBe(1.0);

      // Rapid instant volume changes: 0.0, 0.1, 0.2, ..., 0.9
      const promises: Promise<void>[] = [];
      for (let i = 0; i < 10; i++) {
        promises.push(setChannelVolume(0, i / 10, 0)); // Use instant transitions (duration 0)
      }

      await Promise.all(promises);

      // After all rapid changes, final volume should be the last value set (0.9)
      const finalVolume = getChannelVolume(0);
      expect(finalVolume).toBeDefined();
      expect(finalVolume).toBeCloseTo(0.9, 1); // Allow small margin due to rapid transitions

      // Volume should be in valid range
      expect(finalVolume).toBeGreaterThanOrEqual(0);
      expect(finalVolume).toBeLessThanOrEqual(1.0);
    });

    it('should handle volume transition with very small delta', async () => {
      await queueAudio('https://example.com/test.mp3', 0);

      // Set initial volume
      audioChannels[0].volume = 0.5;
      audioChannels[0].queue[0].volume = 0.5;

      // Transition to almost the same volume (should resolve immediately)
      await transitionVolume(0, 0.5005, 100); // Delta < 0.001

      // Should resolve immediately due to small delta
      expect(audioChannels[0].volume).toBe(0.5005);
    });

    it('should handle volume transitions with different easing functions', async () => {
      await queueAudio('https://example.com/test.mp3', 0);

      // Test different easing functions
      await setChannelVolume(0, 0.3, 50, EasingType.Linear);
      await setChannelVolume(0, 0.7, 50, EasingType.EaseIn);
      await setChannelVolume(0, 0.5, 50, EasingType.EaseOut);
      await setChannelVolume(0, 0.8, 50, EasingType.EaseInOut);

      expect(getChannelVolume(0)).toBe(0.8);
    });

    it('should preserve volume during pause/resume cycles', async () => {
      await queueAudio('https://example.com/test.mp3', 0);

      // Set custom volume
      await setChannelVolume(0, 0.6);
      expect(getChannelVolume(0)).toBe(0.6);

      // Pause and resume
      await pauseChannel(0);
      await resumeChannel(0);

      // Volume should be preserved
      expect(getChannelVolume(0)).toBe(0.6);
    });

    it('should handle non-existent channel gracefully', async () => {
      await expect(transitionVolume(99, 0.5, 100)).resolves.not.toThrow();
    });

    it('should handle empty queue gracefully', async () => {
      audioChannels[0] = {
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
      };

      await expect(transitionVolume(0, 0.5, 100)).resolves.not.toThrow();
    });

    it('should handle zero duration gracefully', async () => {
      await queueAudio('test.mp3', 0);
      const mockAudio = audioChannels[0].queue[0];
      mockAudio.volume = 1.0;
      audioChannels[0].volume = 1.0;

      await transitionVolume(0, 0.5, 0);

      expect(audioChannels[0].volume).toBe(0.5);
      expect(mockAudio.volume).toBe(0.5);
    });

    it('should handle negative duration gracefully', async () => {
      await queueAudio('test.mp3', 0);
      const mockAudio = audioChannels[0].queue[0];
      mockAudio.volume = 1.0;
      audioChannels[0].volume = 1.0;

      // Test that negative duration is handled gracefully (should act like instant change)
      await transitionVolume(0, 0.5, -100);

      expect(audioChannels[0].volume).toBe(0.5);
      expect(mockAudio.volume).toBe(0.5);
    });

    it('should handle channel with no audio elements', async () => {
      audioChannels[0] = {
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
      };

      // transitionVolume exits early if no audio in queue, so use setChannelVolume instead
      await setChannelVolume(0, 0.5);

      expect(audioChannels[0].volume).toBe(0.5);
    });

    it('should handle volume bounds during transition', async () => {
      await queueAudio('test.mp3', 0);
      const mockAudio = audioChannels[0].queue[0];
      mockAudio.volume = 0.5;
      audioChannels[0].volume = 0.5;

      // Try to transition beyond bounds
      await transitionVolume(0, 2.0, 1);

      expect(audioChannels[0].volume).toBe(1.0); // Should be clamped
      expect(mockAudio.volume).toBe(1.0);
    });

    it('should handle multiple transitions on same channel', async () => {
      await queueAudio('test.mp3', 0);
      const mockAudio = audioChannels[0].queue[0];
      mockAudio.volume = 1.0;
      audioChannels[0].volume = 1.0;

      // Start two transitions rapidly with instant durations
      const transition1 = transitionVolume(0, 0.5, 0);
      const transition2 = transitionVolume(0, 0.2, 0);

      await Promise.all([transition1, transition2]);

      // Last transition should win
      expect(audioChannels[0].volume).toBe(0.2);
      expect(mockAudio.volume).toBe(0.2);
    });

    it('should use EaseInOut easing function correctly', async () => {
      await queueAudio('test.mp3', 0);
      const mockAudio = toMockAudioElement(audioChannels[0].queue[0]);
      mockAudio.volume = 0.5;

      // Test EaseInOut easing with instant duration
      await transitionVolume(0, 1.0, 0, EasingType.EaseInOut);

      // Volume should have transitioned
      expect(mockAudio.volume).toBe(1.0);
    });

    it('should use setTimeout when requestAnimationFrame is not available', async () => {
      // Save original requestAnimationFrame
      const originalRAF = (
        global as NodeJS.Global & {
          requestAnimationFrame?: typeof requestAnimationFrame;
        }
      ).requestAnimationFrame;

      // Remove requestAnimationFrame to force setTimeout path
      delete (
        global as NodeJS.Global & {
          requestAnimationFrame?: typeof requestAnimationFrame;
        }
      ).requestAnimationFrame;

      await queueAudio('test.mp3', 0);
      const mockAudio = toMockAudioElement(audioChannels[0].queue[0]);
      mockAudio.volume = 0.0;

      // Use instant duration for deterministic testing
      await transitionVolume(0, 1.0, 0);

      expect(mockAudio.volume).toBe(1.0);

      // Restore requestAnimationFrame
      (
        global as NodeJS.Global & {
          requestAnimationFrame?: typeof requestAnimationFrame;
        }
      ).requestAnimationFrame = originalRAF;
    });

    it('should handle requestAnimationFrame when available', async () => {
      const mockRequestAnimationFrame = jest.fn((callback) => {
        setTimeout(callback, 16);
        return 123;
      });
      const mockCancelAnimationFrame = jest.fn();

      // Mock requestAnimationFrame as available
      const globalWithRAF = global as unknown as { requestAnimationFrame: jest.Mock };
      const globalWithCAF = global as unknown as { cancelAnimationFrame: jest.Mock };
      globalWithRAF.requestAnimationFrame = mockRequestAnimationFrame;
      globalWithCAF.cancelAnimationFrame = mockCancelAnimationFrame;

      await queueAudio('https://example.com/test.mp3', 0);

      // Start a volume transition
      const transitionPromise = setChannelVolume(0, 0.5, 100);

      // Let it run a bit
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Cancel the transition
      cancelVolumeTransition(0);

      await transitionPromise;

      expect(mockRequestAnimationFrame).toHaveBeenCalled();
      expect(mockCancelAnimationFrame).toHaveBeenCalledWith(123);

      // Cleanup
      delete (global as unknown as Record<string, unknown>).requestAnimationFrame;
      delete (global as unknown as Record<string, unknown>).cancelAnimationFrame;
    });

    it('should fall back to setTimeout when requestAnimationFrame is not available', async () => {
      // Ensure requestAnimationFrame is not available
      delete (global as Record<string, unknown>).requestAnimationFrame;

      await queueAudio('https://example.com/test.mp3', 0);

      // Use instant transition to avoid timing complexity
      await setChannelVolume(0, 0.5, 0);

      // Verify the volume was set correctly
      expect(getChannelVolume(0)).toBe(0.5);
    });

    it('should handle volume transitions with requestAnimationFrame path', async () => {
      // Mock requestAnimationFrame to be available
      const originalRAF = (global as Record<string, unknown>).requestAnimationFrame;
      const mockRAF = jest.fn((callback: FrameRequestCallback) => {
        setTimeout(callback, 16);
        return 123;
      });

      (global as Record<string, unknown>).requestAnimationFrame = mockRAF;

      await queueAudio('https://example.com/test.mp3', 0);

      // This should use the requestAnimationFrame path
      await setChannelVolume(0, 0.5, 50);

      expect(getChannelVolume(0)).toBe(0.5);
      expect(mockRAF).toHaveBeenCalled();

      // Restore original
      (global as Record<string, unknown>).requestAnimationFrame = originalRAF;
    });

    it('should handle volume transitions with setTimeout path', async () => {
      // Remove requestAnimationFrame to force setTimeout path
      const originalRAF = (global as Record<string, unknown>).requestAnimationFrame;
      const originalSetTimeout = global.setTimeout;
      const mockSetTimeout = jest.fn(originalSetTimeout);
      global.setTimeout = mockSetTimeout as unknown as typeof setTimeout;

      delete (global as Record<string, unknown>).requestAnimationFrame;

      await queueAudio('https://example.com/test.mp3', 0);

      // This should use the setTimeout path
      await setChannelVolume(0, 0.3, 50);

      expect(getChannelVolume(0)).toBeCloseTo(0.3);
      expect(mockSetTimeout).toHaveBeenCalled();

      // Restore originals
      (global as Record<string, unknown>).requestAnimationFrame = originalRAF;
      global.setTimeout = originalSetTimeout;
    });

    describe('Volume Transition Cancellation', () => {
      it('should handle cancelAllVolumeTransitions with no active transitions', async () => {
        // Should not throw when no active transitions exist
        expect(() => cancelAllVolumeTransitions()).not.toThrow();
      });

      it('should handle cancelAllVolumeTransitions across multiple channels', async () => {
        await queueAudio('https://example.com/test1.mp3', 0);
        await queueAudio('https://example.com/test2.mp3', 1);
        await queueAudio('https://example.com/test3.mp3', 2);

        // Start transitions on multiple channels (don't await them)
        setChannelVolume(0, 0.3, 200);
        setChannelVolume(1, 0.7, 200);
        setChannelVolume(2, 0.9, 200);

        // Let transitions start
        await new Promise((resolve) => setTimeout(resolve, 50));

        // Get volumes before cancellation (should have started transitioning)
        const volumeBefore0 = getChannelVolume(0);
        const volumeBefore1 = getChannelVolume(1);
        const volumeBefore2 = getChannelVolume(2);

        // Cancel all transitions
        cancelAllVolumeTransitions();

        // Wait a bit to ensure cancellation has taken effect
        await new Promise((resolve) => setTimeout(resolve, 50));

        // Verify volumes are stable after cancellation (not continuing to transition)
        const volumeAfter0 = getChannelVolume(0);
        const volumeAfter1 = getChannelVolume(1);
        const volumeAfter2 = getChannelVolume(2);

        // All channels should exist and have valid volumes
        expect(volumeAfter0).toBeDefined();
        expect(volumeAfter1).toBeDefined();
        expect(volumeAfter2).toBeDefined();

        // Volumes should remain stable after cancellation
        expect(volumeAfter0).toBe(volumeBefore0);
        expect(volumeAfter1).toBe(volumeBefore1);
        expect(volumeAfter2).toBe(volumeBefore2);

        // All volumes should be in valid range
        expect(volumeAfter0).toBeGreaterThanOrEqual(0);
        expect(volumeAfter0).toBeLessThanOrEqual(1.0);
        expect(volumeAfter1).toBeGreaterThanOrEqual(0);
        expect(volumeAfter1).toBeLessThanOrEqual(1.0);
        expect(volumeAfter2).toBeGreaterThanOrEqual(0);
        expect(volumeAfter2).toBeLessThanOrEqual(1.0);
      });

      it('should cancel volume transitions using requestAnimationFrame', async () => {
        // Mock requestAnimationFrame
        const mockRAF = jest.fn((callback) => {
          setTimeout(callback, 16);
          return 123;
        });
        const mockCAF = jest.fn();

        (global as unknown as Record<string, unknown>).requestAnimationFrame = mockRAF;
        (global as unknown as Record<string, unknown>).cancelAnimationFrame = mockCAF;

        await queueAudio('https://example.com/test.mp3', 0);

        // Start a transition
        const transitionPromise = setChannelVolume(0, 0.5, 100);

        // Let transition start
        await new Promise((resolve) => setTimeout(resolve, 10));

        // Cancel the transition
        cancelVolumeTransition(0);

        await transitionPromise;

        // Verify cancelAnimationFrame was called with the correct ID
        expect(mockCAF).toHaveBeenCalledWith(123);

        // Verify volume is in valid range
        const volume = getChannelVolume(0);
        expect(volume).toBeGreaterThanOrEqual(0);
        expect(volume).toBeLessThanOrEqual(1.0);

        // Cleanup
        delete (global as unknown as Record<string, unknown>).requestAnimationFrame;
        delete (global as unknown as Record<string, unknown>).cancelAnimationFrame;
      });

      it('should cancel volume transitions using setTimeout', async () => {
        // Remove requestAnimationFrame to force setTimeout
        const originalRAF = (global as unknown as Record<string, unknown>).requestAnimationFrame;
        delete (global as unknown as Record<string, unknown>).requestAnimationFrame;

        await queueAudio('https://example.com/test.mp3', 0);

        // Start a transition
        const transitionPromise = setChannelVolume(0, 0.5, 100);

        // Let transition start
        await new Promise((resolve) => setTimeout(resolve, 10));

        // Cancel the transition
        cancelVolumeTransition(0);

        // Wait for promise to complete (should complete without hanging)
        await expect(transitionPromise).resolves.not.toThrow();

        // Verify volume is in valid range after cancellation
        const volume = getChannelVolume(0);
        expect(volume).toBeGreaterThanOrEqual(0);
        expect(volume).toBeLessThanOrEqual(1.0);

        // Restore requestAnimationFrame
        (global as unknown as Record<string, unknown>).requestAnimationFrame = originalRAF;
      });

      it('should handle cancelVolumeTransition with no active transitions', async () => {
        // Should not throw when canceling non-existent transition
        expect(() => cancelVolumeTransition(999)).not.toThrow();
      });

      it('should cancel transitions without valid timer ID', async () => {
        await queueAudio('https://example.com/test.mp3', 0);

        // This should handle the case where transitionId is undefined
        expect(() => cancelVolumeTransition(0)).not.toThrow();
      });
    });

    describe('Volume Transition Error Handling', () => {
      it('should propagate errors when volume setting fails', async () => {
        await queueAudio('https://example.com/test.mp3', 0);

        // Get the audio element from the queue
        const audio = audioChannels[0].queue[0];
        const mockAudio = toMockAudioElement(audio);

        // Mock volume setter to throw error
        Object.defineProperty(mockAudio, 'volume', {
          configurable: true,
          get: jest.fn(() => 1.0),
          set: jest.fn(() => {
            throw new Error('Volume setting failed');
          })
        });

        // The function should propagate the error (current behavior)
        await expect(setChannelVolume(0, 0.5, 0)).rejects.toThrow('Volume setting failed');

        // Verify the volume setter was called
        const volumeSetter = Object.getOwnPropertyDescriptor(mockAudio, 'volume')?.set as jest.Mock;
        expect(volumeSetter).toHaveBeenCalled();
      });
    });
  });
});

describe('Volume Ducking', () => {
  describe('setVolumeDucking', () => {
    it('should configure volume ducking for all channels', async () => {
      await queueAudio('test1.mp3', 0);
      await queueAudio('test2.mp3', 1);

      const config: VolumeConfig = {
        duckTransitionDuration: 300,
        duckingVolume: 0.2,
        priorityChannel: 1,
        priorityVolume: 1.0,
        restoreTransitionDuration: 500,
        transitionEasing: EasingType.EaseOut
      };

      setVolumeDucking(config);

      // Configuration is stored globally, verify it works by testing the behavior
      expect(audioChannels[0]).toBeDefined();
      expect(audioChannels[1]).toBeDefined();
    });

    it('should create channels if they do not exist', () => {
      const config: VolumeConfig = {
        duckingVolume: 0.3,
        priorityChannel: 0,
        priorityVolume: 1.0
      };

      setVolumeDucking(config);

      expect(audioChannels[0]).toBeDefined();
    });
  });

  describe('clearVolumeDucking', () => {
    it('should remove volume ducking configuration from all channels', async () => {
      await queueAudio('test1.mp3', 0);
      await queueAudio('test2.mp3', 1);

      const config: VolumeConfig = {
        duckingVolume: 0.2,
        priorityChannel: 1,
        priorityVolume: 1.0
      };

      setVolumeDucking(config);
      clearVolumeDucking();

      // Configuration is cleared globally, verify channels still exist
      expect(audioChannels[0]).toBeDefined();
      expect(audioChannels[1]).toBeDefined();
    });

    it('should handle empty channels array gracefully', () => {
      expect(() => clearVolumeDucking()).not.toThrow();
    });
  });

  describe('applyVolumeDucking', () => {
    it('should duck other channels when priority channel starts', async () => {
      await queueAudio('background.mp3', 0);
      await queueAudio('announcement.mp3', 1);

      const mockAudio0 = toMockAudioElement(audioChannels[0].queue[0]);
      const mockAudio1 = audioChannels[1].queue[0];

      mockAudio0.volume = 1.0;
      mockAudio1.volume = 1.0;
      audioChannels[0].volume = 1.0;
      audioChannels[1].volume = 1.0;

      const config: VolumeConfig = {
        duckTransitionDuration: 1, // Very short for testing
        duckingVolume: 0.2,
        priorityChannel: 1,
        priorityVolume: 1.0
      };

      setVolumeDucking(config);

      await applyVolumeDucking(1);

      // With the fix: channel.volume stays at desired level, audio.volume gets ducked
      expect(audioChannels[0].volume).toBe(1.0); // Channel volume unchanged (desired level)
      expectVolumeToBeCloseTo(mockAudio0.volume, 0.2); // Audio element ducked
      expect(audioChannels[1].volume).toBe(1.0); // Priority channel at full volume
      expect(mockAudio1.volume).toBe(1.0);
    });

    it('should not duck when non-priority channel starts', async () => {
      await queueAudio('background.mp3', 0);
      await queueAudio('sfx.mp3', 1);

      audioChannels[0].volume = 1.0;
      audioChannels[1].volume = 1.0;

      const config: VolumeConfig = {
        duckingVolume: 0.2,
        priorityChannel: 2, // Different priority channel
        priorityVolume: 1.0
      };

      setVolumeDucking(config);

      await applyVolumeDucking(1); // Start channel 1, not priority

      expect(audioChannels[0].volume).toBe(1.0); // No change
      expect(audioChannels[1].volume).toBe(1.0); // No change
    });

    it('should handle channels without ducking configuration', async () => {
      await queueAudio('test.mp3', 0);

      await expect(applyVolumeDucking(0)).resolves.not.toThrow();
    });
  });

  describe('restoreVolumeLevels', () => {
    it('should restore volume levels when priority channel stops', async () => {
      // Set up channels with volume ducking
      await queueAudio('priority.mp3', 0);
      await queueAudio('background.mp3', 1);

      const backgroundAudio = toMockAudioElement(audioChannels[1].queue[0]);

      // Set initial volumes
      backgroundAudio.volume = 1.0;
      audioChannels[1].volume = 1.0;

      // Configure volume ducking with instant transitions for testing
      setVolumeDucking({
        duckTransitionDuration: 0, // Instant
        duckingVolume: 0.2,
        priorityChannel: 0,
        priorityVolume: 1.0,
        restoreTransitionDuration: 0 // Instant
      });

      // Apply ducking - should instantly reduce audio element volume
      await applyVolumeDucking(0);
      expectVolumeToBeCloseTo(backgroundAudio.volume, 0.2); // Audio element ducked
      expect(audioChannels[1].volume).toBe(1.0); // Channel volume unchanged (desired level)

      // Simulate priority channel queue becoming empty
      audioChannels[0].queue.shift(); // Remove the priority audio

      // Now restore when priority channel queue is empty
      await restoreVolumeLevels(0);

      // Background channel should be restored to the desired volume
      expectVolumeToBeCloseTo(backgroundAudio.volume, 1.0); // Audio element restored
      expect(audioChannels[1].volume).toBe(1.0); // Channel volume unchanged
    });

    it('should handle channels without ducking configuration', async () => {
      await queueAudio('test.mp3', 0);

      await expect(restoreVolumeLevels(0)).resolves.not.toThrow();
    });
  });

  describe('Volume ducking restoration', () => {
    it('should restore channel volumes when priority channel queue becomes empty', async () => {
      const { getQueueSnapshot } = await import('../src/info');

      // Step 1: Set up ducking with priority channel 1 and ducking volume 0.25
      setVolumeDucking({
        duckTransitionDuration: 0, // Instant for testing
        duckingVolume: 0.25,
        priorityChannel: 1,
        priorityVolume: 1.0,
        restoreTransitionDuration: 0 // Instant for testing
      });

      // Step 2: Start background audio on channel 0 with loop
      await queueAudio('background.mp3', 0, { loop: true });

      const backgroundAudio = toMockAudioElement(audioChannels[0].queue[0]);
      backgroundAudio.volume = 1.0;
      audioChannels[0].volume = 1.0;

      // Verify initial state
      let snapshot = getQueueSnapshot(0);
      expect(snapshot!.volume).toBe(1.0); // Should be 100%
      expect(backgroundAudio.volume).toBe(1.0);

      // Step 3: Start voice audio on priority channel 1 (should duck channel 0 to 25%)
      await queueAudio('voice.mp3', 1);

      const priorityAudio = toMockAudioElement(audioChannels[1].queue[0]);

      // Apply ducking manually since we're not actually playing
      await applyVolumeDucking(1);

      // Verify ducking occurred
      snapshot = getQueueSnapshot(0);
      expect(audioChannels[0].volume).toBe(1.0); // Channel volume stays at desired level
      expect(snapshot!.volume).toBe(1.0); // channel.volume stays at desired level
      expectVolumeToBeCloseTo(backgroundAudio.volume, 0.25); // Audio element ducked
      expect(audioChannels[1].volume).toBe(1.0); // Priority channel at full volume
      expect(priorityAudio.volume).toBe(1.0);

      // Step 4: Voice completes and queue becomes empty
      await stopCurrentAudioInChannel(1); // Simulate voice completion

      // Step 5: Verify restoration worked correctly
      snapshot = getQueueSnapshot(0);
      expect(audioChannels[0].volume).toBe(1.0); // Channel volume unchanged (desired level)
      expectVolumeToBeCloseTo(backgroundAudio.volume, 1.0); // Audio element restored
      expect(snapshot?.volume).toBe(1.0); // Should be 1.0, not 0.25

      // Test that the configuration persists and works correctly
      setVolumeDucking({
        duckingVolume: 0.5,
        priorityChannel: 1,
        priorityVolume: 1.0
      });
      // Configuration is stored globally, test behavior by applying ducking
      await applyVolumeDucking(1);
      expectVolumeToBeCloseTo(backgroundAudio.volume, 0.5);
    });

    it('should NOT restore when priority channel still has items in queue', async () => {
      // Set up ducking
      const config: VolumeConfig = {
        duckTransitionDuration: 0,
        duckingVolume: 0.3,
        priorityChannel: 1,
        priorityVolume: 1.0,
        restoreTransitionDuration: 0
      };
      setVolumeDucking(config);

      // Start background audio
      await queueAudio('background.mp3', 0);
      const backgroundAudio = toMockAudioElement(audioChannels[0].queue[0]);
      backgroundAudio.volume = 1.0;
      audioChannels[0].volume = 1.0;

      // Start priority audio with multiple items
      await queueAudio('priority1.mp3', 1);
      await queueAudio('priority2.mp3', 1);

      // Apply ducking
      await applyVolumeDucking(1);
      expectVolumeToBeCloseTo(backgroundAudio.volume, 0.3); // Ducked

      // Simulate first priority audio finishing (but queue still has items)
      audioChannels[1].queue.shift(); // Remove first item, second item remains
      expect(audioChannels[1].queue.length).toBe(1); // Still has audio queued

      // Try to restore (should NOT restore since queue not empty)
      await restoreVolumeLevels(1);

      // Should still be ducked since priority channel has more audio
      expectVolumeToBeCloseTo(backgroundAudio.volume, 0.3); // Still ducked
      expect(audioChannels[0].volume).toBe(1.0); // Channel volume unchanged

      // Now simulate the last priority audio finishing
      audioChannels[1].queue.shift(); // Remove last item
      expect(audioChannels[1].queue.length).toBe(0); // Queue now empty

      // Now restoration should happen
      await restoreVolumeLevels(1);
      expectVolumeToBeCloseTo(backgroundAudio.volume, 1.0); // Now restored
    });
  });

  describe('Volume Ducking Error Handling', () => {
    it('should throw error for negative priority channel', () => {
      expect(() =>
        setVolumeDucking({
          duckingVolume: 0.2,
          priorityChannel: -1,
          priorityVolume: 1.0
        })
      ).toThrow('Priority channel number must be non-negative');
    });

    it('should throw error for priority channel exceeding MAX_CHANNELS', () => {
      expect(() =>
        setVolumeDucking({
          duckingVolume: 0.2,
          priorityChannel: 65, // MAX_CHANNELS is 64
          priorityVolume: 1.0
        })
      ).toThrow('Priority channel 65 exceeds maximum allowed channels (64)');
    });
  });
});

describe('Web Audio API Integration Tests', () => {
  let mockAudioContext: {
    createGain: jest.Mock;
    createMediaElementSource: jest.Mock;
    currentTime: number;
    destination: Record<string, unknown>;
    resume: jest.Mock;
    state: string;
  };

  let mockGainNode: {
    connect: jest.Mock;
    context: Record<string, unknown>;
    disconnect: jest.Mock;
    gain: {
      cancelScheduledValues: jest.Mock;
      linearRampToValueAtTime: jest.Mock;
      setValueAtTime: jest.Mock;
      value: number;
    };
  };

  let mockSourceNode: {
    connect: jest.Mock;
    disconnect: jest.Mock;
  };

  beforeEach(() => {
    // Setup Web Audio API mocks
    mockAudioContext = {
      createGain: jest.fn(),
      createMediaElementSource: jest.fn(),
      currentTime: 0,
      destination: {},
      resume: jest.fn().mockResolvedValue(undefined),
      state: 'running'
    };

    mockGainNode = {
      connect: jest.fn(),
      context: mockAudioContext,
      disconnect: jest.fn(),
      gain: {
        cancelScheduledValues: jest.fn(),
        linearRampToValueAtTime: jest.fn(),
        setValueAtTime: jest.fn(),
        value: 1.0
      }
    };

    mockSourceNode = {
      connect: jest.fn(),
      disconnect: jest.fn()
    };

    mockAudioContext.createGain.mockReturnValue(mockGainNode);
    mockAudioContext.createMediaElementSource.mockReturnValue(mockSourceNode);
  });

  it('should use Web Audio API when available and initialized', async () => {
    await queueAudio('https://example.com/test.mp3', 0);
    const audio = audioChannels[0].queue[0];

    // Manually set up Web Audio context and nodes to simulate initialized state
    audioChannels[0].webAudioContext = mockAudioContext as unknown as AudioContext;
    audioChannels[0].webAudioNodes = new Map();
    const sourceNode = mockSourceNode as unknown as MediaElementAudioSourceNode;
    const gainNode = mockGainNode as unknown as GainNode;
    audioChannels[0].webAudioNodes.set(audio, { gainNode, sourceNode });

    // Set volume should use Web Audio API (instant change, no transition duration)
    await setChannelVolume(0, 0.7);

    // Verify Web Audio volume was set
    expect(mockGainNode.gain.value).toBe(0.7);
    // cancelScheduledValues is still called to clear any pending transitions
    expect(mockGainNode.gain.cancelScheduledValues).toHaveBeenCalled();
  });

  it('should fallback to standard volume when Web Audio nodes not found', async () => {
    await queueAudio('https://example.com/test.mp3', 0);
    const audio = audioChannels[0].queue[0];

    // Set up Web Audio context but no nodes for this audio
    audioChannels[0].webAudioContext = mockAudioContext as unknown as AudioContext;
    audioChannels[0].webAudioNodes = new Map();

    // Set volume should fallback to standard method
    await setChannelVolume(0, 0.6);

    // Verify standard volume was set
    expect(audio.volume).toBe(0.6);
  });

  it('should handle Web Audio volume setting with transition duration', async () => {
    await queueAudio('https://example.com/test.mp3', 0);
    const audio = audioChannels[0].queue[0];

    // Manually set up Web Audio context and nodes
    audioChannels[0].webAudioContext = mockAudioContext as unknown as AudioContext;
    audioChannels[0].webAudioNodes = new Map();
    const sourceNode = mockSourceNode as unknown as MediaElementAudioSourceNode;
    const gainNode = mockGainNode as unknown as GainNode;
    audioChannels[0].webAudioNodes.set(audio, { gainNode, sourceNode });

    // Set volume with transition - this will use the higher-level transition logic
    // which calls setVolumeForAudio multiple times during the transition
    await setChannelVolume(0, 0.4, 100);

    // Verify Web Audio gain node was updated
    expect(mockGainNode.gain.value).toBeCloseTo(0.4, 1);
    expect(mockGainNode.gain.cancelScheduledValues).toHaveBeenCalled();
  });

  it('should handle volume transitions with Web Audio API', async () => {
    await queueAudio('https://example.com/test.mp3', 0);
    const audio = audioChannels[0].queue[0];

    // Manually set up Web Audio context and nodes
    audioChannels[0].webAudioContext = mockAudioContext as unknown as AudioContext;
    audioChannels[0].webAudioNodes = new Map();
    const sourceNode = mockSourceNode as unknown as MediaElementAudioSourceNode;
    const gainNode = mockGainNode as unknown as GainNode;
    audioChannels[0].webAudioNodes.set(audio, { gainNode, sourceNode });

    // Perform volume transition
    await transitionVolume(0, 0.3, 100);

    // Verify Web Audio volume was set during transition
    expect(mockGainNode.gain.value).toBeCloseTo(0.3, 1);
  });

  it('should handle volume ducking with Web Audio API', async () => {
    await queueAudio('https://example.com/test1.mp3', 0);
    await queueAudio('https://example.com/test2.mp3', 1);

    // Set up Web Audio for both channels
    audioChannels[0].webAudioContext = mockAudioContext as unknown as AudioContext;
    audioChannels[0].webAudioNodes = new Map();
    audioChannels[1].webAudioContext = mockAudioContext as unknown as AudioContext;
    audioChannels[1].webAudioNodes = new Map();

    const sourceNode = mockSourceNode as unknown as MediaElementAudioSourceNode;
    const gainNode = mockGainNode as unknown as GainNode;
    audioChannels[0].webAudioNodes.set(audioChannels[0].queue[0], { gainNode, sourceNode });
    audioChannels[1].webAudioNodes.set(audioChannels[1].queue[0], { gainNode, sourceNode });

    // Set up volume ducking
    setVolumeDucking({
      duckTransitionDuration: 100,
      duckingVolume: 0.2,
      priorityChannel: 0,
      priorityVolume: 1.0
    });

    // Apply ducking
    await applyVolumeDucking(0);

    // Verify that ducking was applied (check audio element volumes, not channel volumes)
    // Volume ducking modifies audio.volume while preserving channel.volume as desired state
    expect(audioChannels[1].queue[0].volume).toBeCloseTo(0.2, 5); // Audio element should be ducked
    expect(audioChannels[0].queue[0].volume).toBeCloseTo(1.0, 5); // Priority audio should remain at full volume

    // Channel volumes should remain unchanged (they represent desired state)
    expect(audioChannels[1].volume).toBe(1.0); // Channel volume unchanged
    expect(audioChannels[0].volume).toBe(1.0); // Channel volume unchanged
  });

  it('should handle cleanup of Web Audio nodes properly', async () => {
    await queueAudio('https://example.com/test.mp3', 0);
    const audio = audioChannels[0].queue[0];

    // Set up Web Audio context and nodes
    audioChannels[0].webAudioContext = mockAudioContext as unknown as AudioContext;
    audioChannels[0].webAudioNodes = new Map();
    const sourceNode = mockSourceNode as unknown as MediaElementAudioSourceNode;
    const gainNode = mockGainNode as unknown as GainNode;
    audioChannels[0].webAudioNodes.set(audio, { gainNode, sourceNode });

    // Cleanup Web Audio nodes
    cleanupWebAudioForAudio(audio, 0);

    // Verify cleanup was called
    expect(mockSourceNode.disconnect).toHaveBeenCalled();
    expect(mockGainNode.disconnect).toHaveBeenCalled();

    // Verify nodes were removed from the map
    if (audioChannels[0].webAudioNodes) {
      expect(audioChannels[0].webAudioNodes.has(audio)).toBe(false);
    }
  });

  describe('Web Audio API Error Handling', () => {
    it('should handle Web Audio API functions without errors', async () => {
      // Test that Web Audio API functions can be called without throwing errors
      const audio = toHTMLAudioElement(createMockAudio('test.mp3'));

      // These should not throw errors
      await expect(initializeWebAudioForAudio(audio, 0)).resolves.not.toThrow();
      expect(() => cleanupWebAudioForAudio(audio, 0)).not.toThrow();
    });

    it('should handle missing channel gracefully in Web Audio functions', async () => {
      const audio = toHTMLAudioElement(createMockAudio('test.mp3'));

      // Try to initialize Web Audio for non-existent channel
      await expect(initializeWebAudioForAudio(audio, 999)).resolves.not.toThrow();

      // Try to cleanup Web Audio for non-existent channel
      expect(() => cleanupWebAudioForAudio(audio, 999)).not.toThrow();
    });

    it('should handle Web Audio API initialization with existing context', async () => {
      await queueAudio('https://example.com/test.mp3', 0);
      const audio = toHTMLAudioElement(createMockAudio('test.mp3'));

      // Initialize once
      await expect(initializeWebAudioForAudio(audio, 0)).resolves.not.toThrow();

      // Initialize again - should handle existing context without errors
      await expect(initializeWebAudioForAudio(audio, 0)).resolves.not.toThrow();
    });

    it('should handle Web Audio API when getAudioContext returns null', async () => {
      // Mock getAudioContext to return null
      jest.doMock('../src/web-audio', () => ({
        ...jest.requireActual('../src/web-audio'),
        createWebAudioNodes: jest.fn(() => null),
        getAudioContext: jest.fn(() => null),
        resumeAudioContext: jest.fn(),
        shouldUseWebAudio: jest.fn(() => true)
      }));

      // Re-import volume module with mocked web-audio
      const { initializeWebAudioForAudio: initWebAudio1 } = await import('../src/volume');

      await queueAudio('https://example.com/test.mp3', 0);
      const audio = toHTMLAudioElement(createMockAudio('test.mp3'));

      // Should handle when audio context creation fails without throwing
      await expect(initWebAudio1(audio, 0)).resolves.not.toThrow();

      // Cleanup
      jest.unmock('../src/web-audio');
    });

    it('should handle Web Audio API when createWebAudioNodes returns null', async () => {
      // Mock createWebAudioNodes to return null
      jest.doMock('../src/web-audio', () => ({
        ...jest.requireActual('../src/web-audio'),
        createWebAudioNodes: jest.fn(() => null),
        getAudioContext: jest.fn(() => ({ resume: jest.fn() })),
        resumeAudioContext: jest.fn(),
        shouldUseWebAudio: jest.fn(() => true)
      }));

      // Re-import volume module with mocked web-audio
      const { initializeWebAudioForAudio: initWebAudio2 } = await import('../src/volume');

      await queueAudio('https://example.com/test.mp3', 0);
      const audio = toHTMLAudioElement(createMockAudio('test.mp3'));

      // Should handle when node creation fails without throwing
      await expect(initWebAudio2(audio, 0)).resolves.not.toThrow();

      // Cleanup
      jest.unmock('../src/web-audio');
    });

    it('should handle cleanup when channel has no webAudioNodes', async () => {
      await queueAudio('https://example.com/test.mp3', 0);
      const audio = toHTMLAudioElement(createMockAudio('test.mp3'));

      // Remove webAudioNodes from channel
      if (audioChannels[0]) {
        audioChannels[0].webAudioNodes = undefined;
      }

      // Should handle cleanup when webAudioNodes is undefined
      expect(() => cleanupWebAudioForAudio(audio, 0)).not.toThrow();
    });

    it('should handle volume setting and getting with Web Audio API fallback', async () => {
      await queueAudio('https://example.com/test.mp3', 0);
      const audio = audioChannels[0].queue[0];

      // Ensure Web Audio API is NOT being used (no context or nodes)
      audioChannels[0].webAudioContext = undefined;
      audioChannels[0].webAudioNodes = undefined;

      // Set volume using the public API - should fall back to audio.volume property
      await setChannelVolume(0, 0.8);

      // Verify volume was set correctly via fallback path
      expect(audioChannels[0].volume).toBe(0.8);
      expect(audio.volume).toBe(0.8);

      // Verify getting volume also works via fallback path
      const volume = getChannelVolume(0);
      expect(volume).toBe(0.8);
    });
  });
});
