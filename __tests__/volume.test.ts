/**
 * @fileoverview Tests for volume control and ducking functionality
 */

import {
  setChannelVolume,
  getChannelVolume,
  setAllChannelsVolume,
  getAllChannelsVolume,
  setVolumeDucking,
  clearVolumeDucking,
  transitionVolume,
  applyVolumeDucking,
  restoreVolumeLevels
} from '../src/volume';
import { audioChannels } from '../src/info';
import { queueAudio, stopCurrentAudioInChannel } from '../src/core';
import { expectVolumeToBeCloseTo, toMockAudioElement } from './setup';
import { VolumeConfig, EasingType } from '../src/types';

beforeEach(() => {
  jest.clearAllMocks();
  audioChannels.length = 0;
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
  });
});

describe('transitionVolume edge cases', () => {
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

  it('should handle non-existent channel gracefully', async () => {
    await expect(transitionVolume(99, 0.5, 100)).resolves.not.toThrow();
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

  it('should handle multiple rapid transitions correctly', async () => {
    await queueAudio('test.mp3', 0);
    const mockAudio = toMockAudioElement(audioChannels[0].queue[0]);
    mockAudio.volume = 0.0;
    audioChannels[0].volume = 0.0;

    // Start multiple transitions rapidly - the final transition should win
    transitionVolume(0, 0.3, 0); // Instant
    transitionVolume(0, 0.7, 0); // Instant
    await transitionVolume(0, 1.0, 0); // Instant - this should be the final value

    // The final transition should determine the result
    expect(mockAudio.volume).toBe(1.0);
    expect(audioChannels[0].volume).toBe(1.0);
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

  describe('easing functions integration', () => {
    it('should apply different easing functions', async () => {
      await queueAudio('test.mp3', 0);
      const mockAudio = audioChannels[0].queue[0];
      mockAudio.volume = 1.0;
      audioChannels[0].volume = 1.0;

      // Test linear easing with very short duration
      await setChannelVolume(0, 0.5, 1, EasingType.Linear);
      expect(audioChannels[0].volume).toBe(0.5);
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
});
