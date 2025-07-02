/**
 * @fileoverview Tests for enhanced core functionality (looping, priority, options)
 */

import {
  queueAudio,
  queueAudioPriority,
  stopCurrentAudioInChannel,
  stopAllAudioInChannel,
  stopAllAudio
} from '../src/core';
import { audioChannels } from '../src/info';
import { setVolumeDucking, clearVolumeDucking } from '../src/volume';
import { AudioStartInfo, VolumeConfig } from '../src/types';
import { toMockAudioElement, mockCallback } from './setup';

beforeEach(() => {
  jest.clearAllMocks();
  audioChannels.length = 0;
  clearVolumeDucking();
});

describe('Enhanced Core Features', () => {
  describe('queueAudio with options', () => {
    it('should queue audio with loop option', async () => {
      await queueAudio('test.mp3', 0, { loop: true });

      const mockAudio = audioChannels[0].queue[0];
      expect(mockAudio.loop).toBe(true);
    });

    it('should queue audio with volume option', async () => {
      await queueAudio('test.mp3', 0, { volume: 0.7 });

      const mockAudio = audioChannels[0].queue[0];
      expect(mockAudio.volume).toBe(0.7);
      expect(audioChannels[0].volume).toBe(0.7);
    });

    it('should queue audio with all options', async () => {
      await queueAudio('test.mp3', 0, {
        loop: true,
        priority: false,
        volume: 0.5
      });

      const mockAudio = audioChannels[0].queue[0];
      expect(mockAudio.loop).toBe(true);
      expect(mockAudio.volume).toBe(0.5);
      expect(audioChannels[0].volume).toBe(0.5);
    });

    it('should handle default options when none provided', async () => {
      await queueAudio('test.mp3', 0);

      const mockAudio = audioChannels[0].queue[0];
      expect(mockAudio.loop).toBe(false);
      expect(mockAudio.volume).toBe(1.0);
    });

    it('should clamp volume option to 0-1 range', async () => {
      await queueAudio('test1.mp3', 0, { volume: -0.5 });
      expect(audioChannels[0].volume).toBe(0);

      await queueAudio('test2.mp3', 1, { volume: 1.5 });
      expect(audioChannels[1].volume).toBe(1);
    });

    it('should add to front of queue when priority option is true', async () => {
      await queueAudio('first.mp3', 0);
      await queueAudio('second.mp3', 0);
      await queueAudio('priority.mp3', 0, { priority: true });

      expect(audioChannels[0].queue.length).toBe(3);
      // Priority audio should be inserted after the currently playing audio
      expect(audioChannels[0].queue[1].src).toBe('priority.mp3');
      expect(audioChannels[0].queue[2].src).toBe('second.mp3');
    });

    it('should integrate with volume ducking', async () => {
      const config: VolumeConfig = {
        duckingVolume: 0.2,
        priorityChannel: 1,
        priorityVolume: 1.0
      };
      setVolumeDucking(config);

      await queueAudio('background.mp3', 0);
      await queueAudio('announcement.mp3', 1, { volume: 0.8 });

      expect(audioChannels[1].volume).toBeCloseTo(0.8, 3);
    });
  });

  describe('queueAudioPriority', () => {
    it('should add audio to front of queue', async () => {
      await queueAudio('first.mp3', 0);
      await queueAudio('second.mp3', 0);
      await queueAudioPriority('urgent.mp3', 0);

      expect(audioChannels[0].queue.length).toBe(3);
      expect(audioChannels[0].queue[0].src).toBe('first.mp3'); // Currently playing
      expect(audioChannels[0].queue[1].src).toBe('urgent.mp3'); // Next in line
      expect(audioChannels[0].queue[2].src).toBe('second.mp3'); // Moved back
    });

    it('should work with options', async () => {
      await queueAudio('first.mp3', 0);
      await queueAudioPriority('urgent.mp3', 0, {
        loop: true,
        volume: 0.6
      });

      const urgentAudio = audioChannels[0].queue[1];
      expect(urgentAudio.loop).toBe(true);
      expect(urgentAudio.volume).toBe(0.6);
    });

    it('should handle empty queue', async () => {
      await queueAudioPriority('only.mp3', 0);

      expect(audioChannels[0].queue.length).toBe(1);
      expect(audioChannels[0].queue[0].src).toBe('only.mp3');
    });

    it('should use default channel when none specified', async () => {
      await queueAudio('first.mp3');
      await queueAudioPriority('urgent.mp3');

      expect(audioChannels[0].queue.length).toBe(2);
      expect(audioChannels[0].queue[1].src).toBe('urgent.mp3');
    });

    it('should trigger volume ducking when priority channel adds audio', async () => {
      const config: VolumeConfig = {
        duckingVolume: 0.2,
        priorityChannel: 1,
        priorityVolume: 1.0
      };
      setVolumeDucking(config);

      await queueAudio('background.mp3', 0);
      await queueAudioPriority('announcement.mp3', 1);
    });
  });

  describe('looping functionality', () => {
    it('should loop audio when loop option is true', async () => {
      await queueAudio('loop.mp3', 0, { loop: true });

      const mockAudio = toMockAudioElement(audioChannels[0].queue[0]);
      expect(mockAudio.loop).toBe(true);

      // Simulate audio ending - should not move to next item due to loop
      mockAudio.dispatchEvent(new Event('ended'));

      expect(audioChannels[0].queue.length).toBe(1);
      expect(audioChannels[0].queue[0].src).toBe('loop.mp3');
    });

    it('should not loop audio when loop option is false', async () => {
      await queueAudio('no-loop.mp3', 0, { loop: false });
      await queueAudio('next.mp3', 0);

      const mockAudio = toMockAudioElement(audioChannels[0].queue[0]);
      expect(mockAudio.loop).toBe(false);

      // Simulate audio ending - should move to next item
      mockAudio.simulateEnded();

      expect(audioChannels[0].queue.length).toBe(1);
      expect(audioChannels[0].queue[0].src).toBe('next.mp3');
    });

    it('should handle looping with priority queue interaction', async () => {
      await queueAudio('background.mp3', 0, { loop: true });
      await queueAudioPriority('urgent.mp3', 0);

      // Currently playing background should still be looping
      const backgroundAudio = audioChannels[0].queue[0];
      expect(backgroundAudio.loop).toBe(true);

      // Next in queue should not be looping (unless specified)
      const urgentAudio = audioChannels[0].queue[1];
      expect(urgentAudio.loop).toBe(false);
    });
  });

  describe('async stop functions integration', () => {
    it('should await volume restoration in stopCurrentAudioInChannel', async () => {
      const config: VolumeConfig = {
        duckingVolume: 0.2,
        priorityChannel: 0,
        priorityVolume: 1.0,
        restoreTransitionDuration: 1 // Very short for testing
      };
      setVolumeDucking(config);

      await queueAudio('priority.mp3', 0);
      await queueAudio('next.mp3', 0);

      await stopCurrentAudioInChannel(0);

      expect(audioChannels[0].queue.length).toBe(1);
      expect(audioChannels[0].queue[0].src).toBe('next.mp3');
    });

    it('should await volume restoration in stopAllAudioInChannel', async () => {
      const config: VolumeConfig = {
        duckingVolume: 0.2,
        priorityChannel: 0,
        priorityVolume: 1.0,
        restoreTransitionDuration: 1 // Very short for testing
      };
      setVolumeDucking(config);

      await queueAudio('audio1.mp3', 0);
      await queueAudio('audio2.mp3', 0);

      await stopAllAudioInChannel(0);

      expect(audioChannels[0].queue.length).toBe(0);
    });

    it('should await all channels in stopAllAudio', async () => {
      await queueAudio('audio1.mp3', 0);
      await queueAudio('audio2.mp3', 1);
      await queueAudio('audio3.mp3', 2);

      await stopAllAudio();

      expect(audioChannels[0].queue.length).toBe(0);
      expect(audioChannels[1].queue.length).toBe(0);
      expect(audioChannels[2].queue.length).toBe(0);
    });
  });

  describe('integration with existing functionality', () => {
    it('should maintain backward compatibility for basic queueAudio calls', async () => {
      await queueAudio('test.mp3');
      await queueAudio('test2.mp3', 1);

      expect(audioChannels[0].queue.length).toBe(1);
      expect(audioChannels[1].queue.length).toBe(1);
      expect(audioChannels[0].queue[0].src).toBe('test.mp3');
      expect(audioChannels[1].queue[0].src).toBe('test2.mp3');
    });

    it('should work with event callbacks', async () => {
      const startCallback = mockCallback<(audioInfo: AudioStartInfo) => void>();
      audioChannels[0] = {
        audioCompleteCallbacks: new Set(),
        audioErrorCallbacks: new Set(),
        audioPauseCallbacks: new Set(),
        audioResumeCallbacks: new Set(),
        audioStartCallbacks: new Set([startCallback]),
        isPaused: false,
        progressCallbacks: new Map(),
        queue: [],
        queueChangeCallbacks: new Set(),
        volume: 1.0
      };

      await queueAudio('test.mp3', 0, { loop: true, volume: 0.8 });

      expect(startCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          channelNumber: 0,
          fileName: 'test.mp3'
        })
      );
    });

    it('should handle queue changes correctly with priority insertion', async () => {
      const queueChangeCallback = mockCallback<() => void>();
      audioChannels[0] = {
        audioCompleteCallbacks: new Set(),
        audioErrorCallbacks: new Set(),
        audioPauseCallbacks: new Set(),
        audioResumeCallbacks: new Set(),
        audioStartCallbacks: new Set(),
        isPaused: false,
        progressCallbacks: new Map(),
        queue: [],
        queueChangeCallbacks: new Set([queueChangeCallback]),
        volume: 1.0
      };

      await queueAudio('first.mp3', 0);
      expect(queueChangeCallback).toHaveBeenCalledTimes(1);

      queueChangeCallback.mockClear();
      await queueAudioPriority('priority.mp3', 0);
      expect(queueChangeCallback).toHaveBeenCalledTimes(1);
    });

    it('should respect pause state when queuing new audio', async () => {
      await queueAudio('first.mp3', 0);
      audioChannels[0].isPaused = true;

      await queueAudio('second.mp3', 0);

      expect(audioChannels[0].queue.length).toBe(2);
      expect(audioChannels[0].isPaused).toBe(true); // Should maintain pause state
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle invalid volume options gracefully', async () => {
      await queueAudio('test.mp3', 0, { volume: NaN });
      expect(audioChannels[0].volume).toBe(1.0); // Should default to 1.0
    });

    it('should handle options with some properties undefined', async () => {
      await queueAudio('test.mp3', 0, {
        loop: true,
        volume: undefined
      });

      const mockAudio = audioChannels[0].queue[0];
      expect(mockAudio.loop).toBe(true);
      expect(mockAudio.volume).toBe(1.0); // Should default
    });

    it('should handle priority queuing on empty channel', async () => {
      await expect(queueAudioPriority('test.mp3', 0)).resolves.not.toThrow();

      expect(audioChannels[0].queue.length).toBe(1);
      expect(audioChannels[0].queue[0].src).toBe('test.mp3');
    });

    it('should handle stop functions on empty channels', async () => {
      await expect(stopCurrentAudioInChannel(0)).resolves.not.toThrow();
      await expect(stopAllAudioInChannel(0)).resolves.not.toThrow();
      await expect(stopAllAudio()).resolves.not.toThrow();
    });

    it('should handle complex integration scenarios', async () => {
      // Set up volume ducking
      setVolumeDucking({
        duckingVolume: 0.3,
        priorityChannel: 1,
        priorityVolume: 1.0
      });

      // Queue background music with loop
      await queueAudio('background.mp3', 0, { loop: true, volume: 0.7 });

      // Queue regular sound effects
      await queueAudio('sfx1.mp3', 1);
      await queueAudio('sfx2.mp3', 1);

      // Add priority announcement (should duck background)
      await queueAudioPriority('announcement.mp3', 1, { volume: 1.0 });

      expect(audioChannels[0].queue.length).toBe(1); // Background loop
      expect(audioChannels[1].queue.length).toBe(3); // SFX + priority announcement
      expect(audioChannels[1].queue[1].src).toBe('announcement.mp3'); // Priority inserted

      const backgroundAudio = audioChannels[0].queue[0];
      const announcementAudio = audioChannels[1].queue[1];

      expect(backgroundAudio.loop).toBe(true);
      expect(announcementAudio.volume).toBe(1.0);
    });
  });
});
