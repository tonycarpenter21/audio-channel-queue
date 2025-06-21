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
import { queueAudio } from '../src/core';
import { MockAudioElement, waitForPromises, expectVolumeToBeCloseTo } from './setup';
import { VolumeConfig, EasingType } from '../src/types';

beforeEach(() => {
  jest.clearAllMocks();
  audioChannels.length = 0;
});

// Mock performance.now for consistent timing in tests
const mockPerformanceNow = jest.fn();
(global as any).performance = { now: mockPerformanceNow };

describe('Volume Control', () => {
  describe('setChannelVolume', () => {
    it('should set volume for existing channel', async () => {
      await queueAudio('test.mp3', 0);
      const mockAudio = audioChannels[0].queue[0] as unknown as MockAudioElement;

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
      const mockAudio = audioChannels[0].queue[0] as unknown as MockAudioElement;
      mockAudio.volume = 1.0;
      audioChannels[0].volume = 1.0;

      let timeStep = 0;
      mockPerformanceNow.mockImplementation(() => timeStep);

      const transitionPromise = setChannelVolume(0, 0.5, 100);

      // Simulate progression through transition
      timeStep = 0; // Start
      await waitForPromises();

      timeStep = 50; // Halfway
      await waitForPromises();

      timeStep = 100; // Complete
      await waitForPromises();

      await transitionPromise;

      expect(audioChannels[0].volume).toBe(0.5);
      expect(mockAudio.volume).toBe(0.5);
    });

    it('should handle instant changes when no duration specified', async () => {
      await queueAudio('test.mp3', 0);
      const mockAudio = audioChannels[0].queue[0] as unknown as MockAudioElement;

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
      delete audioChannels[0].volume;

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
      delete audioChannels[0].volume;

      const volumes = getAllChannelsVolume();

      expect(volumes).toEqual([1.0]);
    });
  });

  describe('transitionVolume', () => {
    it('should smoothly transition volume over time', async () => {
      await queueAudio('test.mp3', 0);
      const mockAudio = audioChannels[0].queue[0] as unknown as MockAudioElement;
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
        queue: [],
        audioCompleteCallbacks: new Set(),
        audioErrorCallbacks: new Set(),
        audioPauseCallbacks: new Set(),
        audioResumeCallbacks: new Set(),
        audioStartCallbacks: new Set(),
        isPaused: false,
        progressCallbacks: new Map(),
        queueChangeCallbacks: new Set(),
        volume: 1.0
      };

      await expect(transitionVolume(0, 0.5, 100)).resolves.not.toThrow();
    });
  });
});

describe('Volume Ducking', () => {
  describe('setVolumeDucking', () => {
    it('should configure volume ducking for all channels', async () => {
      await queueAudio('test1.mp3', 0);
      await queueAudio('test2.mp3', 1);

      const config: VolumeConfig = {
        priorityChannel: 1,
        priorityVolume: 1.0,
        duckingVolume: 0.2,
        duckTransitionDuration: 300,
        restoreTransitionDuration: 500,
        transitionEasing: EasingType.EaseOut
      };

      setVolumeDucking(config);

      expect(audioChannels[0].volumeConfig).toEqual(config);
      expect(audioChannels[1].volumeConfig).toEqual(config);
    });

    it('should create channels if they do not exist', () => {
      const config: VolumeConfig = {
        priorityChannel: 0,
        priorityVolume: 1.0,
        duckingVolume: 0.3
      };

      setVolumeDucking(config);

      expect(audioChannels[0]).toBeDefined();
      expect(audioChannels[0].volumeConfig).toEqual(config);
    });
  });

  describe('clearVolumeDucking', () => {
    it('should remove volume ducking configuration from all channels', async () => {
      await queueAudio('test1.mp3', 0);
      await queueAudio('test2.mp3', 1);

      const config: VolumeConfig = {
        priorityChannel: 1,
        priorityVolume: 1.0,
        duckingVolume: 0.2
      };

      setVolumeDucking(config);
      clearVolumeDucking();

      expect(audioChannels[0].volumeConfig).toBeUndefined();
      expect(audioChannels[1].volumeConfig).toBeUndefined();
    });

    it('should handle empty channels array gracefully', () => {
      expect(() => clearVolumeDucking()).not.toThrow();
    });
  });

  describe('applyVolumeDucking', () => {
    it('should duck other channels when priority channel starts', async () => {
      await queueAudio('background.mp3', 0);
      await queueAudio('announcement.mp3', 1);

      const mockAudio0 = audioChannels[0].queue[0] as unknown as MockAudioElement;
      const mockAudio1 = audioChannels[1].queue[0] as unknown as MockAudioElement;

      mockAudio0.volume = 1.0;
      mockAudio1.volume = 1.0;
      audioChannels[0].volume = 1.0;
      audioChannels[1].volume = 1.0;

      const config: VolumeConfig = {
        priorityChannel: 1,
        priorityVolume: 1.0,
        duckingVolume: 0.2,
        duckTransitionDuration: 1 // Very short for testing
      };

      setVolumeDucking(config);

      await applyVolumeDucking(1);

      expectVolumeToBeCloseTo(audioChannels[0].volume!, 0.2); // Background ducked
      expect(audioChannels[1].volume).toBe(1.0); // Announcement at full volume
    });

    it('should not duck when non-priority channel starts', async () => {
      await queueAudio('background.mp3', 0);
      await queueAudio('sfx.mp3', 1);

      audioChannels[0].volume = 1.0;
      audioChannels[1].volume = 1.0;

      const config: VolumeConfig = {
        priorityChannel: 2, // Different priority channel
        priorityVolume: 1.0,
        duckingVolume: 0.2
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
    it('should restore normal volumes when priority channel stops', async () => {
      await queueAudio('background.mp3', 0);
      await queueAudio('announcement.mp3', 1);

      const mockAudio0 = audioChannels[0].queue[0] as unknown as MockAudioElement;

      // Set up initial state
      mockAudio0.volume = 0.2; // Currently ducked
      audioChannels[0].volume = 0.8; // Original volume
      audioChannels[1].volume = 1.0;

      const config: VolumeConfig = {
        priorityChannel: 1,
        priorityVolume: 1.0,
        duckingVolume: 0.2,
        restoreTransitionDuration: 1 // Very short for testing
      };

      setVolumeDucking(config);

      await restoreVolumeLevels(1);

      expect(audioChannels[0].volume).toBe(0.8); // Restored to original
      expect(audioChannels[1].volume).toBe(1.0); // Unchanged
    });

    it('should not restore when non-priority channel stops', async () => {
      await queueAudio('background.mp3', 0);
      await queueAudio('sfx.mp3', 1);

      audioChannels[0].volume = 0.2; // Currently ducked
      audioChannels[1].volume = 1.0;

      const config: VolumeConfig = {
        priorityChannel: 2, // Different priority channel
        priorityVolume: 1.0,
        duckingVolume: 0.2
      };

      setVolumeDucking(config);

      await restoreVolumeLevels(1); // Stop channel 1, not priority

      expect(audioChannels[0].volume).toBe(0.2); // No change
      expect(audioChannels[1].volume).toBe(1.0); // No change
    });

    it('should handle channels without ducking configuration', async () => {
      await queueAudio('test.mp3', 0);

      await expect(restoreVolumeLevels(0)).resolves.not.toThrow();
    });
  });

  describe('easing functions integration', () => {
    it('should apply different easing functions', async () => {
      await queueAudio('test.mp3', 0);
      const mockAudio = audioChannels[0].queue[0] as unknown as MockAudioElement;
      mockAudio.volume = 1.0;
      audioChannels[0].volume = 1.0;

      // Test linear easing with very short duration
      await setChannelVolume(0, 0.5, 1, EasingType.Linear);
      expect(audioChannels[0].volume).toBe(0.5);
    });
  });
});
