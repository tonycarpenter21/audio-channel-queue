/**
 * @fileoverview Tests for pause and resume functionality
 */

import {
  pauseChannel,
  resumeChannel,
  togglePauseChannel,
  pauseAllChannels,
  resumeAllChannels,
  togglePauseAllChannels,
  isChannelPaused,
  getAllChannelsPauseState
} from '../src/pause';
import {
  onAudioPause,
  onAudioResume,
  audioChannels
} from '../src/info';
import { queueAudio } from '../src/core';
import { MockAudioElement, mockCallback, waitForPromises } from './setup';
import { AudioInfo } from '../src/types';

beforeEach(() => {
  jest.clearAllMocks();
  audioChannels.length = 0;
});

describe('Pause/Resume Functionality', () => {
  describe('pauseChannel', () => {
    it('should pause currently playing audio', async () => {
      await queueAudio('test.mp3', 0);
      const mockAudio = audioChannels[0].queue[0] as unknown as MockAudioElement;
      mockAudio.paused = false;

      await pauseChannel(0);

      expect(mockAudio.pause).toHaveBeenCalled();
      expect(audioChannels[0].isPaused).toBe(true);
    });

    it('should not pause already paused audio', async () => {
      await queueAudio('test.mp3', 0);
      const mockAudio = audioChannels[0].queue[0] as unknown as MockAudioElement;
      mockAudio.paused = true;

      await pauseChannel(0);

      expect(mockAudio.pause).not.toHaveBeenCalled();
    });

    it('should not pause ended audio', async () => {
      await queueAudio('test.mp3', 0);
      const mockAudio = audioChannels[0].queue[0] as unknown as MockAudioElement;
      mockAudio.paused = false;
      mockAudio.ended = true;

      await pauseChannel(0);

      expect(mockAudio.pause).not.toHaveBeenCalled();
    });

    it('should handle non-existent channel gracefully', async () => {
      await expect(pauseChannel(99)).resolves.not.toThrow();
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

      await expect(pauseChannel(0)).resolves.not.toThrow();
    });

    it('should emit pause event when pausing', async () => {
      const pauseCallback = mockCallback<(channelNumber: number, info: AudioInfo) => void>();
      onAudioPause(0, pauseCallback);

      await queueAudio('test.mp3', 0);
      const mockAudio = audioChannels[0].queue[0] as unknown as MockAudioElement;
      mockAudio.paused = false;
      mockAudio.duration = 120;
      mockAudio.currentTime = 30;

      await pauseChannel(0);

      expect(pauseCallback).toHaveBeenCalledWith(0, expect.objectContaining({
        fileName: 'test.mp3',
        isPaused: true,
        isPlaying: false
      }));
    });

    it('should use default channel when no channel specified', async () => {
      await queueAudio('test.mp3');
      const mockAudio = audioChannels[0].queue[0] as unknown as MockAudioElement;
      mockAudio.paused = false;

      await pauseChannel();

      expect(mockAudio.pause).toHaveBeenCalled();
      expect(audioChannels[0].isPaused).toBe(true);
    });
  });

  describe('resumeChannel', () => {
    it('should resume paused audio', async () => {
      await queueAudio('test.mp3', 0);
      const mockAudio = audioChannels[0].queue[0] as unknown as MockAudioElement;
      mockAudio.paused = true;
      audioChannels[0].isPaused = true;

      await resumeChannel(0);

      expect(mockAudio.play).toHaveBeenCalled();
      expect(audioChannels[0].isPaused).toBe(false);
    });

    it('should not resume already playing audio', async () => {
      await queueAudio('test.mp3', 0);
      
      // Wait for async playback to complete setup
      await waitForPromises(50);
      
      const mockAudio = audioChannels[0].queue[0] as unknown as MockAudioElement;
      
      // Set up the state: audio is already playing
      mockAudio.paused = false;
      audioChannels[0].isPaused = false;
      
      // NOW clear the play mock after all async operations are done
      mockAudio.play.mockClear();

      await resumeChannel(0);

      expect(mockAudio.play).not.toHaveBeenCalled();
    });

    it('should not resume ended audio', async () => {
      await queueAudio('test.mp3', 0);
      
      // Wait for async playback to complete setup
      await waitForPromises(50);
      
      const mockAudio = audioChannels[0].queue[0] as unknown as MockAudioElement;
      
      // Set up the state: audio has ended
      mockAudio.paused = true;
      mockAudio.ended = true;
      audioChannels[0].isPaused = true;
      
      // NOW clear the play mock after all async operations are done
      mockAudio.play.mockClear();

      await resumeChannel(0);

      expect(mockAudio.play).not.toHaveBeenCalled();
    });

    it('should handle non-existent channel gracefully', async () => {
      await expect(resumeChannel(99)).resolves.not.toThrow();
    });

    it('should emit resume event when resuming', async () => {
      const resumeCallback = mockCallback<(channelNumber: number, info: AudioInfo) => void>();
      onAudioResume(0, resumeCallback);

      await queueAudio('test.mp3', 0);
      const mockAudio = audioChannels[0].queue[0] as unknown as MockAudioElement;
      mockAudio.paused = true;
      mockAudio.duration = 120;
      mockAudio.currentTime = 30;
      audioChannels[0].isPaused = true;

      await resumeChannel(0);

      expect(resumeCallback).toHaveBeenCalledWith(0, expect.objectContaining({
        fileName: 'test.mp3',
        isPaused: false,
        isPlaying: true
      }));
    });

    it('should use default channel when no channel specified', async () => {
      await queueAudio('test.mp3');
      const mockAudio = audioChannels[0].queue[0] as unknown as MockAudioElement;
      mockAudio.paused = true;
      audioChannels[0].isPaused = true;

      await resumeChannel();

      expect(mockAudio.play).toHaveBeenCalled();
      expect(audioChannels[0].isPaused).toBe(false);
    });
  });

  describe('togglePauseChannel', () => {
    it('should pause playing audio', async () => {
      await queueAudio('test.mp3', 0);
      const mockAudio = audioChannels[0].queue[0] as unknown as MockAudioElement;
      mockAudio.paused = false;

      await togglePauseChannel(0);

      expect(mockAudio.pause).toHaveBeenCalled();
      expect(audioChannels[0].isPaused).toBe(true);
    });

    it('should resume paused audio', async () => {
      await queueAudio('test.mp3', 0);
      const mockAudio = audioChannels[0].queue[0] as unknown as MockAudioElement;
      mockAudio.paused = true;
      audioChannels[0].isPaused = true;

      await togglePauseChannel(0);

      expect(mockAudio.play).toHaveBeenCalled();
      expect(audioChannels[0].isPaused).toBe(false);
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

      await expect(togglePauseChannel(0)).resolves.not.toThrow();
    });
  });

  describe('pauseAllChannels', () => {
    it('should pause all playing channels', async () => {
      await queueAudio('test1.mp3', 0);
      await queueAudio('test2.mp3', 1);
      await queueAudio('test3.mp3', 2);

      const mockAudio0 = audioChannels[0].queue[0] as unknown as MockAudioElement;
      const mockAudio1 = audioChannels[1].queue[0] as unknown as MockAudioElement;
      const mockAudio2 = audioChannels[2].queue[0] as unknown as MockAudioElement;

      mockAudio0.paused = false;
      mockAudio1.paused = false;
      mockAudio2.paused = false;

      await pauseAllChannels();

      expect(mockAudio0.pause).toHaveBeenCalled();
      expect(mockAudio1.pause).toHaveBeenCalled();
      expect(mockAudio2.pause).toHaveBeenCalled();
      expect(audioChannels[0].isPaused).toBe(true);
      expect(audioChannels[1].isPaused).toBe(true);
      expect(audioChannels[2].isPaused).toBe(true);
    });

    it('should handle empty channels array gracefully', async () => {
      await expect(pauseAllChannels()).resolves.not.toThrow();
    });
  });

  describe('resumeAllChannels', () => {
    it('should resume all paused channels', async () => {
      await queueAudio('test1.mp3', 0);
      await queueAudio('test2.mp3', 1);

      const mockAudio0 = audioChannels[0].queue[0] as unknown as MockAudioElement;
      const mockAudio1 = audioChannels[1].queue[0] as unknown as MockAudioElement;

      mockAudio0.paused = true;
      mockAudio1.paused = true;
      audioChannels[0].isPaused = true;
      audioChannels[1].isPaused = true;

      await resumeAllChannels();

      expect(mockAudio0.play).toHaveBeenCalled();
      expect(mockAudio1.play).toHaveBeenCalled();
      expect(audioChannels[0].isPaused).toBe(false);
      expect(audioChannels[1].isPaused).toBe(false);
    });
  });

  describe('isChannelPaused', () => {
    it('should return true for paused channel', async () => {
      await queueAudio('test.mp3', 0);
      audioChannels[0].isPaused = true;

      expect(isChannelPaused(0)).toBe(true);
    });

    it('should return false for playing channel', async () => {
      await queueAudio('test.mp3', 0);
      audioChannels[0].isPaused = false;

      expect(isChannelPaused(0)).toBe(false);
    });

    it('should return false for non-existent channel', () => {
      expect(isChannelPaused(99)).toBe(false);
    });

    it('should use default channel when no channel specified', async () => {
      await queueAudio('test.mp3');
      audioChannels[0].isPaused = true;

      expect(isChannelPaused()).toBe(true);
    });
  });

  describe('getAllChannelsPauseState', () => {
    it('should return pause states for all channels', async () => {
      await queueAudio('test1.mp3', 0);
      await queueAudio('test2.mp3', 1);
      await queueAudio('test3.mp3', 2);

      audioChannels[0].isPaused = false;
      audioChannels[1].isPaused = true;
      audioChannels[2].isPaused = false;

      const pauseStates = getAllChannelsPauseState();

      expect(pauseStates).toEqual([false, true, false]);
    });

    it('should return empty array when no channels exist', () => {
      const pauseStates = getAllChannelsPauseState();
      expect(pauseStates).toEqual([]);
    });

    it('should handle channels with undefined isPaused', async () => {
      await queueAudio('test.mp3', 0);
      delete audioChannels[0].isPaused;

      const pauseStates = getAllChannelsPauseState();

      expect(pauseStates).toEqual([false]);
    });
  });

  describe('togglePauseAllChannels', () => {
    it('should pause all channels when any channel is playing', async () => {
      await queueAudio('test1.mp3', 0);
      await queueAudio('test2.mp3', 1);
      await queueAudio('test3.mp3', 2);
      
      // Wait for audio to start playing
      await waitForPromises(50);
      
      const mockAudio1 = audioChannels[0].queue[0] as unknown as MockAudioElement;
      const mockAudio2 = audioChannels[1].queue[0] as unknown as MockAudioElement;
      const mockAudio3 = audioChannels[2].queue[0] as unknown as MockAudioElement;
      
      // Ensure they are all playing
      mockAudio1.paused = false;
      mockAudio2.paused = false;
      mockAudio3.paused = false;
      audioChannels[0].isPaused = false;
      audioChannels[1].isPaused = false;
      audioChannels[2].isPaused = false;
      
      await togglePauseAllChannels();
      
      expect(mockAudio1.pause).toHaveBeenCalled();
      expect(mockAudio2.pause).toHaveBeenCalled();
      expect(mockAudio3.pause).toHaveBeenCalled();
      expect(audioChannels[0].isPaused).toBe(true);
      expect(audioChannels[1].isPaused).toBe(true);
      expect(audioChannels[2].isPaused).toBe(true);
    });

    it('should resume all channels when all channels are paused', async () => {
      await queueAudio('test1.mp3', 0);
      await queueAudio('test2.mp3', 1);
      
      // Wait for audio to start, then pause everything
      await waitForPromises(50);
      await pauseAllChannels();
      
      const mockAudio1 = audioChannels[0].queue[0] as unknown as MockAudioElement;
      const mockAudio2 = audioChannels[1].queue[0] as unknown as MockAudioElement;
      
      // Clear the pause calls so we can test resume calls
      mockAudio1.play.mockClear();
      mockAudio2.play.mockClear();
      
      await togglePauseAllChannels();
      
      expect(mockAudio1.play).toHaveBeenCalled();
      expect(mockAudio2.play).toHaveBeenCalled();
      expect(audioChannels[0].isPaused).toBe(false);
      expect(audioChannels[1].isPaused).toBe(false);
    });

    it('should handle mixed pause states correctly (pause all if any playing)', async () => {
      await queueAudio('test1.mp3', 0);
      await queueAudio('test2.mp3', 1);
      
      // Wait for audio to start
      await waitForPromises(50);
      
      // Pause only one channel
      await pauseChannel(0);
      
      const mockAudio1 = audioChannels[0].queue[0] as unknown as MockAudioElement;
      const mockAudio2 = audioChannels[1].queue[0] as unknown as MockAudioElement;
      
      // Clear previous pause calls
      mockAudio1.pause.mockClear();
      mockAudio2.pause.mockClear();
      
      // Channel 0 is paused, channel 1 is still playing
      // togglePauseAllChannels should pause everything
      await togglePauseAllChannels();
      
      // Channel 1 should be paused (channel 0 was already paused)
      expect(mockAudio2.pause).toHaveBeenCalled();
      expect(audioChannels[1].isPaused).toBe(true);
    });

    it('should handle empty channels gracefully', async () => {
      await expect(togglePauseAllChannels()).resolves.not.toThrow();
    });

    it('should handle channels with ended audio', async () => {
      await queueAudio('test.mp3', 0);
      
      const mockAudio = audioChannels[0].queue[0] as unknown as MockAudioElement;
      mockAudio.ended = true;
      mockAudio.paused = false; // Ended but not paused
      
      // Should not consider ended audio as "playing"
      await togglePauseAllChannels();
      
      // Since no audio is actually playing, this should try to resume
      expect(mockAudio.play).toHaveBeenCalled();
    });

    it('should work correctly with single channel', async () => {
      await queueAudio('test.mp3', 0);
      
      // Wait for audio to start
      await waitForPromises(50);
      
      const mockAudio = audioChannels[0].queue[0] as unknown as MockAudioElement;
      mockAudio.paused = false;
      audioChannels[0].isPaused = false;
      
      // First toggle should pause
      await togglePauseAllChannels();
      expect(audioChannels[0].isPaused).toBe(true);
      
      // Second toggle should resume
      mockAudio.play.mockClear();
      await togglePauseAllChannels();
      expect(mockAudio.play).toHaveBeenCalled();
      expect(audioChannels[0].isPaused).toBe(false);
    });
  });
}); 