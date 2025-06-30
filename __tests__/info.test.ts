/**
 * @fileoverview Tests for audio information and progress tracking functions
 */

import {
  getCurrentAudioInfo,
  getAllChannelsInfo,
  getQueueSnapshot,
  onAudioProgress,
  offAudioProgress,
  onQueueChange,
  offQueueChange,
  onAudioStart,
  onAudioComplete,
  onAudioPause,
  onAudioResume,
  offAudioPause,
  offAudioResume,
  audioChannels
} from '../src/info';
import { queueAudio } from '../src/core';
import {
  MockAudioElement,
  toMockAudioElement,
  mockCallback,
  waitForPromises,
  getTestChannel
} from './setup';
import {
  AudioInfo,
  QueueSnapshot,
  AudioStartInfo,
  AudioCompleteInfo,
  AudioPauseCallback,
  AudioResumeCallback,
  AudioStartCallback,
  AudioCompleteCallback,
  QueueChangeCallback
} from '../src/types';

beforeEach(() => {
  jest.clearAllMocks();
  audioChannels.length = 0;
});

describe('Audio Information Functions', () => {
  describe('getCurrentAudioInfo', () => {
    it('should return null if no channel exists', () => {
      const info = getCurrentAudioInfo(0);
      expect(info).toBeNull();
    });

    it('should return null if channel exists but queue is empty', async () => {
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

      const info = getCurrentAudioInfo(0);
      expect(info).toBeNull();
    });

    it('should return audio info for currently playing audio', async () => {
      await queueAudio('test-song.mp3');

      const mockAudio = toMockAudioElement(audioChannels[0].queue[0]);
      mockAudio.duration = 180; // 3 minutes
      mockAudio.currentTime = 60; // 1 minute
      mockAudio.paused = false;

      const info = getCurrentAudioInfo(0);

      expect(info).toEqual({
        currentTime: 60000, // Converted to milliseconds
        duration: 180000, // Converted to milliseconds
        fileName: 'test-song.mp3',
        isLooping: false,
        isPaused: false,
        isPlaying: true,
        progress: 0.3333333333333333,
        remainingInQueue: 0,
        src: 'test-song.mp3',
        volume: 1
      });
    });

    it('should use default channel 0 when no channel specified', async () => {
      await queueAudio('test.mp3');

      const infoDefault = getCurrentAudioInfo();
      const infoExplicit = getCurrentAudioInfo(0);

      expect(infoDefault).toEqual(infoExplicit);
    });

    it('should handle NaN duration and currentTime gracefully', async () => {
      await queueAudio('test.mp3');

      const mockAudio = toMockAudioElement(audioChannels[0].queue[0]);
      mockAudio.duration = NaN;
      mockAudio.currentTime = NaN;

      const info = getCurrentAudioInfo(0);

      expect(info?.duration).toBe(0);
      expect(info?.currentTime).toBe(0);
      expect(info?.progress).toBe(0);
    });

    it('should handle zero duration gracefully', async () => {
      await queueAudio('test.mp3');

      const mockAudio = toMockAudioElement(audioChannels[0].queue[0]);
      mockAudio.duration = 0;
      mockAudio.currentTime = 10;

      const info = getCurrentAudioInfo(0);

      expect(info?.duration).toBe(0);
      expect(info?.currentTime).toBe(10000);
      expect(info?.progress).toBe(0);
    });

    it('should handle negative values gracefully', async () => {
      await queueAudio('test.mp3');

      const mockAudio = toMockAudioElement(audioChannels[0].queue[0]);
      mockAudio.duration = -5;
      mockAudio.currentTime = -2;

      const info = getCurrentAudioInfo(0);

      // Note: The actual implementation doesn't clamp negative values, it returns them as-is
      expect(info?.duration).toBe(-5000); // Converted to milliseconds
      expect(info?.currentTime).toBe(-2000); // Converted to milliseconds
      expect(info?.progress).toBe(0);
    });

    it('should handle looping audio correctly', async () => {
      await queueAudio('test.mp3');

      const mockAudio = toMockAudioElement(audioChannels[0].queue[0]);
      mockAudio.duration = 100;
      mockAudio.currentTime = 30;
      mockAudio.loop = true;

      const info = getCurrentAudioInfo(0);

      expect(info?.isLooping).toBe(true);
      expect(info?.progress).toBe(0.3);
    });
  });

  describe('getAllChannelsInfo', () => {
    it('should return empty array when no channels exist', () => {
      const allInfo = getAllChannelsInfo();
      expect(allInfo).toEqual([]);
    });

    it('should return array with nulls for empty channels and info for active ones', async () => {
      await queueAudio('test1.mp3', 0);
      await queueAudio('test2.mp3', 2);

      // Create empty channel 1
      audioChannels[1] = {
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

      const allInfo = getAllChannelsInfo();

      expect(allInfo).toHaveLength(3);
      expect(allInfo[0]).not.toBeNull();
      expect(allInfo[0]?.fileName).toBe('test1.mp3');
      expect(allInfo[1]).toBeNull();
      expect(allInfo[2]).not.toBeNull();
      expect(allInfo[2]?.fileName).toBe('test2.mp3');
    });
  });

  describe('getQueueSnapshot', () => {
    it('should return null for non-existent channel', () => {
      const snapshot = getQueueSnapshot(0);
      expect(snapshot).toBeNull();
    });

    it('should return complete queue snapshot', async () => {
      await queueAudio('song1.mp3');
      await queueAudio('song2.mp3');
      await queueAudio('song3.mp3');

      // Set up mock audio durations
      const mockAudios = audioChannels[0].queue as unknown as MockAudioElement[];
      mockAudios[0].duration = 180;
      mockAudios[1].duration = 240;
      mockAudios[2].duration = 200;
      mockAudios[0].paused = false; // First one is playing

      const snapshot = getQueueSnapshot(0);

      expect(snapshot).toEqual({
        channelNumber: 0,
        currentIndex: 0,
        isPaused: false,
        items: [
          {
            duration: 180000,
            fileName: 'song1.mp3',
            isCurrentlyPlaying: true,
            isLooping: false,
            src: 'song1.mp3',
            volume: 1.0
          },
          {
            duration: 240000,
            fileName: 'song2.mp3',
            isCurrentlyPlaying: false,
            isLooping: false,
            src: 'song2.mp3',
            volume: 1.0
          },
          {
            duration: 200000,
            fileName: 'song3.mp3',
            isCurrentlyPlaying: false,
            isLooping: false,
            src: 'song3.mp3',
            volume: 1.0
          }
        ],
        totalItems: 3,
        volume: 1.0
      });
    });

    it('should handle empty queue', async () => {
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

      const snapshot = getQueueSnapshot(0);

      expect(snapshot).toEqual({
        channelNumber: 0,
        currentIndex: 0,
        isPaused: false,
        items: [],
        totalItems: 0,
        volume: 1.0
      });
    });

    it('should use default channel 0 when no channel specified', async () => {
      await queueAudio('test-audio.mp3');

      // Set up mock audio duration
      const mockAudio = toMockAudioElement(audioChannels[0].queue[0]);
      mockAudio.duration = 120;
      mockAudio.paused = false;

      // Test calling with no parameters (should default to channel 0)
      const snapshot = getQueueSnapshot();

      expect(snapshot).not.toBeNull();
      expect(snapshot!.channelNumber).toBe(0);
      expect(snapshot!.totalItems).toBe(1);
      expect(snapshot!.items[0].fileName).toBe('test-audio.mp3');
      expect(snapshot!.items[0].duration).toBe(120000);
    });
  });
});

describe('Audio Progress Tracking', () => {
  describe('onAudioProgress', () => {
    it("should create channel if it doesn't exist", () => {
      const callback = mockCallback<(info: AudioInfo) => void>();

      onAudioProgress(0, callback);

      expect(audioChannels[0]).toBeDefined();
      expect(audioChannels[0].progressCallbacks).toBeDefined();
    });

    it('should add callback for current audio', async () => {
      await queueAudio('test.mp3');
      const callback = mockCallback<(info: AudioInfo) => void>();

      onAudioProgress(0, callback);

      const mockAudio = toMockAudioElement(audioChannels[0].queue[0]);
      mockAudio.simulateTimeUpdate(30);

      expect(callback).toHaveBeenCalled();
      const callArg = callback.mock.calls[0][0];
      expect(callArg.currentTime).toBe(30000);
    });

    it('should handle multiple callbacks', async () => {
      await queueAudio('test.mp3');
      const callback1 = mockCallback<(info: AudioInfo) => void>();
      const callback2 = mockCallback<(info: AudioInfo) => void>();

      onAudioProgress(0, callback1);
      onAudioProgress(0, callback2);

      const mockAudio = toMockAudioElement(audioChannels[0].queue[0]);
      mockAudio.simulateTimeUpdate(45);

      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });

    it('should handle errors in callbacks gracefully', async () => {
      await queueAudio('test.mp3');
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const errorCallback = jest.fn().mockImplementation(() => {
        throw new Error('Callback error');
      });

      onAudioProgress(0, errorCallback);

      const mockAudio = toMockAudioElement(audioChannels[0].queue[0]);
      mockAudio.simulateTimeUpdate(15);

      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    describe('onAudioProgress edge cases', () => {
      it('should handle when progressCallbacks exists but audio is not in map', async () => {
        await queueAudio('test.mp3');

        // First call creates the callbacks
        const callback1 = jest.fn();
        onAudioProgress(0, callback1);

        // Second call with same channel but callback map already exists
        const callback2 = jest.fn();
        onAudioProgress(0, callback2);

        const mockAudio = toMockAudioElement(audioChannels[0].queue[0]);
        mockAudio.simulateTimeUpdate(30);

        // Both callbacks should be called
        expect(callback1).toHaveBeenCalled();
        expect(callback2).toHaveBeenCalled();
      });

      it('should handle channel with progressCallbacks set to undefined', async () => {
        // Create a channel with a valid number
        const channelNumber: number = getTestChannel();

        // Setup a minimal channel with progressCallbacks
        audioChannels[channelNumber] = {
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

        // Break the progressCallbacks by setting to undefined
        (
          audioChannels[channelNumber] as unknown as { progressCallbacks: undefined }
        ).progressCallbacks = undefined;

        expect(() => onAudioProgress(channelNumber, jest.fn())).not.toThrow();
        expect(audioChannels[channelNumber].progressCallbacks).toBeDefined();
      });
    });
  });

  describe('offAudioProgress', () => {
    it('should clear all progress callbacks for a channel', async () => {
      await queueAudio('test.mp3');
      const callback = mockCallback<(info: AudioInfo) => void>();

      onAudioProgress(0, callback);
      offAudioProgress(0);

      const mockAudio = toMockAudioElement(audioChannels[0].queue[0]);
      mockAudio.simulateTimeUpdate(30);

      expect(callback).not.toHaveBeenCalled();
    });

    it('should handle non-existent channel gracefully', () => {
      expect(() => offAudioProgress(99)).not.toThrow();
    });

    it('should use default channel 0 when no channel specified', async () => {
      await queueAudio('test.mp3');
      const callback = mockCallback<(info: AudioInfo) => void>();

      // Set up callback on channel 0
      onAudioProgress(0, callback);

      // Clear callbacks using default parameter (should clear channel 0)
      offAudioProgress();

      const mockAudio = toMockAudioElement(audioChannels[0].queue[0]);
      mockAudio.simulateTimeUpdate(30);

      // Callback should not be called since we cleared it
      expect(callback).not.toHaveBeenCalled();
    });
  });
});

describe('Queue Change Events', () => {
  describe('onQueueChange', () => {
    it("should create channel if it doesn't exist", () => {
      const callback = mockCallback<(snapshot: QueueSnapshot) => void>();

      onQueueChange(0, callback);

      expect(audioChannels[0]).toBeDefined();
      expect(audioChannels[0].queueChangeCallbacks).toBeDefined();
    });

    it('should trigger callback when audio is queued', async () => {
      const callback = mockCallback<(snapshot: QueueSnapshot) => void>();
      onQueueChange(0, callback);

      await queueAudio('test.mp3');

      expect(callback).toHaveBeenCalled();
      const snapshot = callback.mock.calls[0][0];
      expect(snapshot.totalItems).toBe(1);
      expect(snapshot.items[0].fileName).toBe('test.mp3');
    });
  });

  describe('offQueueChange', () => {
    it('should clear all queue change callbacks', async () => {
      const callback = mockCallback<(snapshot: QueueSnapshot) => void>();
      onQueueChange(0, callback);

      offQueueChange(0);

      await queueAudio('test.mp3');

      expect(callback).not.toHaveBeenCalled();
    });

    describe('offQueueChange edge cases', () => {
      it('should handle channel with queueChangeCallbacks set to undefined', () => {
        // Create channel with undefined queueChangeCallbacks
        const testChannel = getTestChannel();
        audioChannels[testChannel] = {
          audioCompleteCallbacks: new Set(),
          audioErrorCallbacks: new Set(),
          audioPauseCallbacks: new Set(),
          audioResumeCallbacks: new Set(),
          audioStartCallbacks: new Set(),
          isPaused: false,
          progressCallbacks: new Map(),
          queue: [],
          queueChangeCallbacks: undefined as unknown as Set<QueueChangeCallback>,
          volume: 1.0
        };

        // Should not throw
        expect(() => offQueueChange(testChannel)).not.toThrow();
      });
    });
  });
});

describe('Audio Lifecycle Events', () => {
  describe('onAudioStart', () => {
    it('should trigger callback when audio starts', async () => {
      const callback = mockCallback<(info: AudioStartInfo) => void>();
      onAudioStart(0, callback);

      await queueAudio('test-song.mp3');

      // Wait for async playback to start - this should trigger both events
      await waitForPromises(50);

      expect(callback).toHaveBeenCalled();
      const startInfo = callback.mock.calls[0][0];
      expect(startInfo.fileName).toBe('test-song.mp3');
      expect(startInfo.channelNumber).toBe(0);
    });

    describe('onAudioStart edge cases', () => {
      it('should handle channel with audioStartCallbacks set to undefined', () => {
        // Create channel with undefined audioStartCallbacks
        const testChannel = getTestChannel();
        audioChannels[testChannel] = {
          audioCompleteCallbacks: new Set(),
          audioErrorCallbacks: new Set(),
          audioPauseCallbacks: new Set(),
          audioResumeCallbacks: new Set(),
          audioStartCallbacks: undefined as unknown as Set<AudioStartCallback>,
          isPaused: false,
          progressCallbacks: new Map(),
          queue: [],
          queueChangeCallbacks: new Set(),
          volume: 1.0
        };

        const callback = jest.fn();

        // This should create the audioStartCallbacks set
        onAudioStart(testChannel, callback);

        expect(audioChannels[testChannel].audioStartCallbacks).toBeDefined();
        expect(audioChannels[testChannel].audioStartCallbacks.has(callback)).toBe(true);
      });
    });
  });

  describe('onAudioComplete', () => {
    it('should trigger callback when audio completes', async () => {
      const callback = mockCallback<(info: AudioCompleteInfo) => void>();
      onAudioComplete(0, callback);

      await queueAudio('test1.mp3');
      await queueAudio('test2.mp3');

      // Wait for audio to start playing first
      await waitForPromises(50);

      const mockAudio = toMockAudioElement(audioChannels[0].queue[0]);
      // Simulate that audio has started and then ended
      mockAudio.paused = false;
      mockAudio.ended = false;
      mockAudio.simulateEnded();

      // Wait for the event to be processed
      await waitForPromises(50);

      expect(callback).toHaveBeenCalled();
      const completeInfo = callback.mock.calls[0][0];
      expect(completeInfo.fileName).toBe('test1.mp3');
      expect(completeInfo.remainingInQueue).toBe(1);
    });

    it('should initialize channel when calling onAudioComplete on non-existent channel', () => {
      const callback = jest.fn();
      const testChannel = getTestChannel();

      // Call onAudioComplete on channel that doesn't exist
      onAudioComplete(testChannel, callback);

      // Verify channel was created
      expect(audioChannels[testChannel]).toBeDefined();
      expect(audioChannels[testChannel].audioCompleteCallbacks).toBeDefined();
      expect(audioChannels[testChannel].audioCompleteCallbacks.has(callback)).toBe(true);
    });

    describe('onAudioComplete edge cases', () => {
      it('should handle channel with audioCompleteCallbacks set to undefined', () => {
        // Create channel with undefined audioCompleteCallbacks
        const testChannel = getTestChannel();
        audioChannels[testChannel] = {
          audioCompleteCallbacks: undefined as unknown as Set<AudioCompleteCallback>,
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

        const callback = jest.fn();

        // This should create the audioCompleteCallbacks set
        onAudioComplete(testChannel, callback);

        expect(audioChannels[testChannel].audioCompleteCallbacks).toBeDefined();
        expect(audioChannels[testChannel].audioCompleteCallbacks.has(callback)).toBe(true);
      });
    });
  });

  it('should initialize channel when calling onAudioPause on non-existent channel', () => {
    const callback = jest.fn();
    const testChannel = getTestChannel();

    // Call onAudioPause on channel that doesn't exist
    onAudioPause(testChannel, callback);

    // Verify channel was created
    expect(audioChannels[testChannel]).toBeDefined();
    expect(audioChannels[testChannel].audioPauseCallbacks).toBeDefined();
    expect(audioChannels[testChannel].audioPauseCallbacks.has(callback)).toBe(true);
  });

  it('should initialize channel when calling onAudioResume on non-existent channel', () => {
    const callback = jest.fn();
    const testChannel = getTestChannel();

    // Call onAudioResume on channel that doesn't exist
    onAudioResume(testChannel, callback);

    // Verify channel was created
    expect(audioChannels[testChannel]).toBeDefined();
    expect(audioChannels[testChannel].audioResumeCallbacks).toBeDefined();
    expect(audioChannels[testChannel].audioResumeCallbacks.has(callback)).toBe(true);
  });

  it('should handle offAudioPause with non-existent channel', () => {
    // Try to remove callbacks from non-existent channel
    expect(() => offAudioPause(999)).not.toThrow();
  });

  it('should handle offAudioPause with channel that has no pause callbacks', () => {
    // Create channel without pause callbacks
    const testChannel = getTestChannel();
    audioChannels[testChannel] = {
      audioCompleteCallbacks: new Set(),
      audioErrorCallbacks: new Set(),
      audioPauseCallbacks: undefined as unknown as Set<AudioPauseCallback>,
      audioResumeCallbacks: new Set(),
      audioStartCallbacks: new Set(),
      isPaused: false,
      progressCallbacks: new Map(),
      queue: [],
      queueChangeCallbacks: new Set(),
      volume: 1.0
    };

    expect(() => offAudioPause(testChannel)).not.toThrow();
  });

  it('should handle offAudioResume with non-existent channel', () => {
    // Try to remove callbacks from non-existent channel
    expect(() => offAudioResume(999)).not.toThrow();
  });

  it('should handle offAudioResume with channel that has no resume callbacks', () => {
    // Create channel without resume callbacks
    const testChannel = getTestChannel();
    audioChannels[testChannel] = {
      audioCompleteCallbacks: new Set(),
      audioErrorCallbacks: new Set(),
      audioPauseCallbacks: new Set(),
      audioResumeCallbacks: undefined as unknown as Set<AudioResumeCallback>,
      audioStartCallbacks: new Set(),
      isPaused: false,
      progressCallbacks: new Map(),
      queue: [],
      queueChangeCallbacks: new Set(),
      volume: 1.0
    };

    expect(() => offAudioResume(testChannel)).not.toThrow();
  });
});

describe('onAudioPause edge cases', () => {
  it('should handle channel with audioPauseCallbacks set to undefined', () => {
    // Create channel with undefined audioPauseCallbacks
    const testChannel = getTestChannel();
    audioChannels[testChannel] = {
      audioCompleteCallbacks: new Set(),
      audioErrorCallbacks: new Set(),
      audioPauseCallbacks: undefined as unknown as Set<AudioPauseCallback>,
      audioResumeCallbacks: new Set(),
      audioStartCallbacks: new Set(),
      isPaused: false,
      progressCallbacks: new Map(),
      queue: [],
      queueChangeCallbacks: new Set(),
      volume: 1.0
    };

    const callback = jest.fn();

    // This should create the audioPauseCallbacks set
    onAudioPause(testChannel, callback);

    expect(audioChannels[testChannel].audioPauseCallbacks).toBeDefined();
    expect(audioChannels[testChannel].audioPauseCallbacks.has(callback)).toBe(true);
  });
});

describe('onAudioResume edge cases', () => {
  it('should handle channel with audioResumeCallbacks set to undefined', () => {
    // Create channel with undefined audioResumeCallbacks
    const testChannel = getTestChannel();
    audioChannels[testChannel] = {
      audioCompleteCallbacks: new Set(),
      audioErrorCallbacks: new Set(),
      audioPauseCallbacks: new Set(),
      audioResumeCallbacks: undefined as unknown as Set<AudioResumeCallback>,
      audioStartCallbacks: new Set(),
      isPaused: false,
      progressCallbacks: new Map(),
      queue: [],
      queueChangeCallbacks: new Set(),
      volume: 1.0
    };

    const callback = jest.fn();

    // This should create the audioResumeCallbacks set
    onAudioResume(testChannel, callback);

    expect(audioChannels[testChannel].audioResumeCallbacks).toBeDefined();
    expect(audioChannels[testChannel].audioResumeCallbacks.has(callback)).toBe(true);
  });
});
