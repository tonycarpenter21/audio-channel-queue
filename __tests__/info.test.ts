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
  offAudioStart,
  offAudioComplete,
  audioChannels,
  getWhitelistedChannelProperties,
  getNonWhitelistedChannelProperties
} from '../src/info';
import { queueAudio, setChannelQueueLimit } from '../src/core';
import { pauseWithFade } from '../src/pause';
import { setChannelVolume } from '../src/volume';
import { MockAudioElement, toMockAudioElement, mockCallback, getTestChannel } from './setup';
import {
  AudioInfo,
  QueueSnapshot,
  AudioStartInfo,
  AudioCompleteInfo,
  AudioPauseCallback,
  AudioResumeCallback,
  AudioStartCallback,
  AudioCompleteCallback,
  QueueChangeCallback,
  FadeType
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

      const mockAudio = toMockAudioElement(audioChannels[0].queue[0]);
      // Simulate that audio has started and then ended
      mockAudio.paused = false;
      mockAudio.ended = false;
      mockAudio.simulateEnded();

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

  describe('offAudioStart', () => {
    it('should clear all audio start callbacks for a channel', async () => {
      const callback = mockCallback<(info: AudioStartInfo) => void>();
      onAudioStart(0, callback);

      // Clear the callbacks before queueing audio
      offAudioStart(0);

      await queueAudio('test-song.mp3');

      // Callback should not be called since we cleared it
      expect(callback).not.toHaveBeenCalled();
    });

    it('should handle non-existent channel gracefully', () => {
      expect(() => offAudioStart(999)).not.toThrow();
    });

    it('should handle channel with no start callbacks', () => {
      // Create channel without start callbacks
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

      expect(() => offAudioStart(testChannel)).not.toThrow();
    });

    it('should only clear start callbacks without affecting other callbacks', async () => {
      const startCallback = mockCallback<(info: AudioStartInfo) => void>();
      const completeCallback = mockCallback<(info: AudioCompleteInfo) => void>();

      onAudioStart(0, startCallback);
      onAudioComplete(0, completeCallback);

      // Clear only start callbacks before queueing
      offAudioStart(0);

      await queueAudio('test1.mp3');
      await queueAudio('test2.mp3');

      const mockAudio = toMockAudioElement(audioChannels[0].queue[0]);
      mockAudio.paused = false;
      mockAudio.ended = false;
      mockAudio.simulateEnded();

      // Start callback should not be called, but complete callback should be
      expect(startCallback).not.toHaveBeenCalled();
      expect(completeCallback).toHaveBeenCalled();
    });
  });

  describe('offAudioComplete', () => {
    it('should clear all audio complete callbacks for a channel', async () => {
      const callback = mockCallback<(info: AudioCompleteInfo) => void>();
      onAudioComplete(0, callback);

      await queueAudio('test1.mp3');
      await queueAudio('test2.mp3');

      // Clear the callbacks
      offAudioComplete(0);

      const mockAudio = toMockAudioElement(audioChannels[0].queue[0]);
      mockAudio.paused = false;
      mockAudio.ended = false;
      mockAudio.simulateEnded();

      // Callback should not be called since we cleared it
      expect(callback).not.toHaveBeenCalled();
    });

    it('should handle non-existent channel gracefully', () => {
      expect(() => offAudioComplete(999)).not.toThrow();
    });

    it('should handle channel with no complete callbacks', () => {
      // Create channel without complete callbacks
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

      expect(() => offAudioComplete(testChannel)).not.toThrow();
    });

    it('should only clear complete callbacks without affecting other callbacks', async () => {
      const startCallback = mockCallback<(info: AudioStartInfo) => void>();
      const completeCallback = mockCallback<(info: AudioCompleteInfo) => void>();

      onAudioStart(0, startCallback);
      onAudioComplete(0, completeCallback);

      await queueAudio('test-song.mp3');

      // Clear only complete callbacks
      offAudioComplete(0);

      // Start callback should be called, but complete callback should not be after clearing
      expect(startCallback).toHaveBeenCalled();

      const mockAudio = toMockAudioElement(audioChannels[0].queue[0]);
      mockAudio.paused = false;
      mockAudio.ended = false;
      mockAudio.simulateEnded();

      expect(completeCallback).not.toHaveBeenCalled();
    });
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

describe('Channel Modification Warning System', () => {
  let originalConsoleWarn: typeof console.warn;
  let mockConsoleWarn: jest.Mock;

  beforeEach(() => {
    // Set up console.warn mock
    originalConsoleWarn = console.warn;
    mockConsoleWarn = jest.fn();
    console.warn = mockConsoleWarn;
  });

  afterEach(() => {
    // Restore original console.warn
    console.warn = originalConsoleWarn;
  });

  it('should NOT warn when legitimate API functions modify whitelisted properties', async () => {
    // Test various API functions that should modify channel properties without warnings

    // Test pause functions modifying fadeState and isPaused
    await queueAudio('test.mp3', 0);
    await pauseWithFade(FadeType.Gentle, 0);

    // Test volume functions modifying volume
    setChannelVolume(0, 0.5);

    // Test queue functions modifying queue
    await queueAudio('test2.mp3', 0);

    // Test event subscription functions modifying callback properties
    const mockCallback = jest.fn();
    onAudioStart(0, mockCallback);
    onAudioComplete(0, mockCallback);
    onAudioPause(0, mockCallback);
    onAudioResume(0, mockCallback);
    onQueueChange(0, mockCallback);
    onAudioProgress(0, mockCallback);

    // Test event unsubscription functions modifying callback properties
    offAudioStart(0);
    offAudioComplete(0);
    offAudioPause(0);
    offAudioResume(0);
    offQueueChange(0);
    offAudioProgress(0);

    // Test queue limit functions modifying maxQueueSize
    setChannelQueueLimit(0, 10);

    // Verify no warnings were triggered by legitimate API usage
    expect(mockConsoleWarn).not.toHaveBeenCalledWith(
      expect.stringContaining('Warning: Direct modification of channel.')
    );
  });

  it('should warn when properties are modified directly (not through API)', () => {
    // Ensure channel exists
    audioChannels[0] = audioChannels[0] || {
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

    // Test direct modification of a non-whitelisted property
    (audioChannels[0] as unknown as Record<string, unknown>).customProperty = 'test-value';

    // Verify warning was triggered
    const expectedWarning =
      'Warning: Direct modification of channel.customProperty detected. ' +
      'Use API functions for safer channel management.';
    expect(mockConsoleWarn).toHaveBeenCalledWith(expectedWarning);
  });

  describe('Automated Whitelist System', () => {
    it('should generate a reasonable whitelist automatically', () => {
      const whitelistedProperties = getWhitelistedChannelProperties();

      // Verify the whitelist is generated dynamically (not empty, not suspiciously large)
      expect(Array.isArray(whitelistedProperties)).toBe(true);
      expect(whitelistedProperties.length).toBeGreaterThan(5); // At least some core properties
      expect(whitelistedProperties.length).toBeLessThan(20); // Not suspiciously large

      // Verify it includes essential properties that must exist for the system to work
      expect(whitelistedProperties).toContain('queue'); // Core functionality
      expect(whitelistedProperties).toContain('volume'); // Core functionality
      expect(whitelistedProperties).toContain('isPaused'); // Core functionality
      expect(whitelistedProperties).toContain('fadeState'); // The original issue we fixed
    });

    it('should prevent warnings for all whitelisted properties automatically', () => {
      // Ensure channel exists
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

      mockConsoleWarn.mockClear();

      // Get the current whitelist dynamically
      const whitelistedProperties = getWhitelistedChannelProperties();

      // Test modification of each whitelisted property
      const channel = audioChannels[0] as unknown as Record<string, unknown>;
      whitelistedProperties.forEach((prop) => {
        channel[prop] = `test-value-for-${prop}`;
      });

      // Verify no warnings were triggered for any whitelisted property
      expect(mockConsoleWarn).not.toHaveBeenCalledWith(
        expect.stringContaining('Warning: Direct modification of channel.')
      );
    });

    it('should continue to warn for unknown/custom properties', () => {
      // Ensure channel exists
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

      mockConsoleWarn.mockClear();

      // Test a property that definitely isn't in the interface
      const testPropertyName = 'definitelyNotInInterface_' + Date.now();
      const channel = audioChannels[0] as unknown as Record<string, unknown>;

      // This property should NOT be whitelisted since it's completely custom
      channel[testPropertyName] = 'test-value';

      // Should trigger exactly one warning
      const warningStart = `Warning: Direct modification of channel.${testPropertyName} detected. `;
      const expectedWarning = warningStart + 'Use API functions for safer channel management.';
      expect(mockConsoleWarn).toHaveBeenCalledWith(expectedWarning);
      expect(mockConsoleWarn).toHaveBeenCalledTimes(1);
    });

    it('should work correctly when interface properties are added/modified', () => {
      // This test simulates what happens when the interface changes
      // The system should automatically adapt without requiring manual updates

      const whitelistedProperties = getWhitelistedChannelProperties();

      // Create a channel with some properties
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

      mockConsoleWarn.mockClear();

      // Test that any property currently in the whitelist doesn't trigger warnings
      const channel = audioChannels[0] as unknown as Record<string, unknown>;

      // Pick a few properties from the current whitelist and verify they don't warn
      const sampleProperties = whitelistedProperties.slice(0, 3);
      sampleProperties.forEach((prop) => {
        channel[prop] = 'test-value';
      });

      // Should not have triggered any warnings
      expect(mockConsoleWarn).not.toHaveBeenCalled();
    });
  });

  describe('getNonWhitelistedChannelProperties', () => {
    it('should correctly identify whitelisted vs non-whitelisted properties', () => {
      // Create a channel
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

      const channel = audioChannels[0] as unknown as Record<string, unknown>;
      const whitelistedProperties = getWhitelistedChannelProperties();

      // Dynamically add some properties that are guaranteed to NOT be in the whitelist
      const testNonWhitelistedProps = ['testProp_A', 'testProp_B', 'testProp_C'];
      testNonWhitelistedProps.forEach((prop) => {
        // Ensure these aren't accidentally whitelisted
        expect(whitelistedProperties).not.toContain(prop);
        channel[prop] = 'test-value';
      });

      mockConsoleWarn.mockClear();
      const nonWhitelistedProperties = getNonWhitelistedChannelProperties(0);

      // Test 1: Iterating through ALL whitelisted properties should produce no warnings
      whitelistedProperties.forEach((prop) => {
        channel[prop] = 'test-value';
      });
      expect(mockConsoleWarn).not.toHaveBeenCalled();

      // Test 2: Iterating through ALL non-whitelisted properties should produce warnings for each
      mockConsoleWarn.mockClear();
      nonWhitelistedProperties.forEach((prop) => {
        channel[prop] = 'test-value';
      });
      expect(mockConsoleWarn).toHaveBeenCalledTimes(nonWhitelistedProperties.length);

      // Verify our test properties were correctly categorized
      expect(nonWhitelistedProperties).toEqual(expect.arrayContaining(testNonWhitelistedProps));
    });

    it('should return empty array for non-existent channel and handle edge cases', () => {
      // Non-existent channel
      expect(getNonWhitelistedChannelProperties(999)).toEqual([]);

      // Default parameter (channel 0)
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

      const channel = audioChannels[0] as unknown as Record<string, unknown>;
      channel.testProp = 'test-value';

      expect(getNonWhitelistedChannelProperties()).toEqual(getNonWhitelistedChannelProperties(0));
      expect(getNonWhitelistedChannelProperties()).toContain('testProp');
    });
  });
});

describe('Off Functions Channel 0 Fallback', () => {
  beforeEach(() => {
    // Create channel 0 with callbacks
    audioChannels[0] = {
      audioCompleteCallbacks: new Set([jest.fn(), jest.fn()]),
      audioErrorCallbacks: new Set(),
      audioPauseCallbacks: new Set([jest.fn()]),
      audioResumeCallbacks: new Set([jest.fn()]),
      audioStartCallbacks: new Set([jest.fn()]),
      isPaused: false,
      progressCallbacks: new Map(),
      queue: [],
      queueChangeCallbacks: new Set([jest.fn()]),
      volume: 1.0
    };
  });

  describe('offQueueChange', () => {
    it('should use channel 0 as default when no parameter provided', () => {
      expect(audioChannels[0].queueChangeCallbacks.size).toBe(1);

      offQueueChange(); // No parameter - should default to channel 0

      expect(audioChannels[0].queueChangeCallbacks.size).toBe(0);
    });

    it('should work the same way when explicitly passing channel 0', () => {
      expect(audioChannels[0].queueChangeCallbacks.size).toBe(1);

      offQueueChange(0); // Explicit channel 0

      expect(audioChannels[0].queueChangeCallbacks.size).toBe(0);
    });

    it('should handle non-existent channel gracefully', () => {
      expect(() => offQueueChange(999)).not.toThrow();
    });
  });

  describe('offAudioStart', () => {
    it('should use channel 0 as default when no parameter provided', () => {
      expect(audioChannels[0].audioStartCallbacks.size).toBe(1);

      offAudioStart(); // No parameter - should default to channel 0

      expect(audioChannels[0].audioStartCallbacks.size).toBe(0);
    });

    it('should work the same way when explicitly passing channel 0', () => {
      expect(audioChannels[0].audioStartCallbacks.size).toBe(1);

      offAudioStart(0); // Explicit channel 0

      expect(audioChannels[0].audioStartCallbacks.size).toBe(0);
    });

    it('should handle non-existent channel gracefully', () => {
      expect(() => offAudioStart(999)).not.toThrow();
    });
  });

  describe('offAudioComplete', () => {
    it('should use channel 0 as default when no parameter provided', () => {
      expect(audioChannels[0].audioCompleteCallbacks.size).toBe(2);

      offAudioComplete(); // No parameter - should default to channel 0

      expect(audioChannels[0].audioCompleteCallbacks.size).toBe(0);
    });

    it('should work the same way when explicitly passing channel 0', () => {
      expect(audioChannels[0].audioCompleteCallbacks.size).toBe(2);

      offAudioComplete(0); // Explicit channel 0

      expect(audioChannels[0].audioCompleteCallbacks.size).toBe(0);
    });

    it('should handle non-existent channel gracefully', () => {
      expect(() => offAudioComplete(999)).not.toThrow();
    });
  });

  describe('offAudioPause', () => {
    it('should use channel 0 as default when no parameter provided', () => {
      expect(audioChannels[0].audioPauseCallbacks.size).toBe(1);

      offAudioPause(); // No parameter - should default to channel 0

      expect(audioChannels[0].audioPauseCallbacks.size).toBe(0);
    });

    it('should work the same way when explicitly passing channel 0', () => {
      expect(audioChannels[0].audioPauseCallbacks.size).toBe(1);

      offAudioPause(0); // Explicit channel 0

      expect(audioChannels[0].audioPauseCallbacks.size).toBe(0);
    });

    it('should handle non-existent channel gracefully', () => {
      expect(() => offAudioPause(999)).not.toThrow();
    });
  });

  describe('offAudioResume', () => {
    it('should use channel 0 as default when no parameter provided', () => {
      expect(audioChannels[0].audioResumeCallbacks.size).toBe(1);

      offAudioResume(); // No parameter - should default to channel 0

      expect(audioChannels[0].audioResumeCallbacks.size).toBe(0);
    });

    it('should work the same way when explicitly passing channel 0', () => {
      expect(audioChannels[0].audioResumeCallbacks.size).toBe(1);

      offAudioResume(0); // Explicit channel 0

      expect(audioChannels[0].audioResumeCallbacks.size).toBe(0);
    });

    it('should handle non-existent channel gracefully', () => {
      expect(() => offAudioResume(999)).not.toThrow();
    });
  });

  describe('Multi-channel behavior with fallback', () => {
    beforeEach(() => {
      // Create channel 1 with different callbacks
      audioChannels[1] = {
        audioCompleteCallbacks: new Set([jest.fn()]),
        audioErrorCallbacks: new Set(),
        audioPauseCallbacks: new Set([jest.fn()]),
        audioResumeCallbacks: new Set([jest.fn()]),
        audioStartCallbacks: new Set([jest.fn()]),
        isPaused: false,
        progressCallbacks: new Map(),
        queue: [],
        queueChangeCallbacks: new Set([jest.fn()]),
        volume: 1.0
      };
    });

    it('should not affect other channels when using default fallback', () => {
      // Verify initial state
      expect(audioChannels[0].audioStartCallbacks.size).toBe(1);
      expect(audioChannels[1].audioStartCallbacks.size).toBe(1);

      // Use default fallback (channel 0)
      offAudioStart();

      // Channel 0 should be cleared, channel 1 should be unchanged
      expect(audioChannels[0].audioStartCallbacks.size).toBe(0);
      expect(audioChannels[1].audioStartCallbacks.size).toBe(1);
    });

    it('should work correctly on specific channels while preserving channel 0', () => {
      // Verify initial state
      expect(audioChannels[0].audioStartCallbacks.size).toBe(1);
      expect(audioChannels[1].audioStartCallbacks.size).toBe(1);

      // Clear channel 1 explicitly
      offAudioStart(1);

      // Channel 0 should be unchanged, channel 1 should be cleared
      expect(audioChannels[0].audioStartCallbacks.size).toBe(1);
      expect(audioChannels[1].audioStartCallbacks.size).toBe(0);
    });
  });
});
