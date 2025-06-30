/**
 * @fileoverview Tests for core queue management functions
 */

import {
  queueAudio,
  playAudioQueue,
  stopCurrentAudioInChannel,
  stopAllAudioInChannel,
  stopAllAudio,
  destroyChannel,
  destroyAllChannels,
  setChannelQueueLimit,
  setQueueConfig
} from '../src/core';
import { audioChannels } from '../src/info';
import { toMockAudioElement, waitForPromises } from './setup';

// Clear modules before each test to reset state
beforeEach(() => {
  // Clear all channels before each test
  audioChannels.length = 0;
});

describe('Core Queue Management', () => {
  describe('queueAudio', () => {
    it("should create a new audio channel if it doesn't exist", async () => {
      await queueAudio('test.mp3');

      expect(audioChannels[0]).toBeDefined();
      expect(audioChannels[0].queue.length).toBe(1);
    });

    it('should add audio to an existing channel', async () => {
      await queueAudio('test1.mp3');
      await queueAudio('test2.mp3');

      expect(audioChannels[0].queue.length).toBe(2);
    });

    it('should use the specified channel number', async () => {
      await queueAudio('test.mp3', 1);

      expect(audioChannels[1]).toBeDefined();
      expect(audioChannels[1].queue.length).toBe(1);
    });

    it("should start playing if it's the first audio in the queue", async () => {
      await queueAudio('test.mp3');

      // Wait for async playback to start
      await waitForPromises(50);

      const audioElement = toMockAudioElement(audioChannels[0].queue[0]);
      expect(audioElement.play).toHaveBeenCalled();
    });

    it("should not start playing if it's not the first audio in the queue", async () => {
      await queueAudio('test1.mp3');
      await queueAudio('test2.mp3');

      const secondAudio = toMockAudioElement(audioChannels[0].queue[1]);
      expect(secondAudio.play).not.toHaveBeenCalled();
    });

    it('should initialize all callback sets for new channels', async () => {
      await queueAudio('test.mp3');

      const channel = audioChannels[0];
      expect(channel.audioCompleteCallbacks).toBeDefined();
      expect(channel.audioStartCallbacks).toBeDefined();
      expect(channel.progressCallbacks).toBeDefined();
      expect(channel.queueChangeCallbacks).toBeDefined();
    });
  });

  describe('playAudioQueue', () => {
    it('should play the current audio in the queue', async () => {
      await queueAudio('test.mp3');

      // Wait for async playback to start
      await waitForPromises(50);

      const audioElement = toMockAudioElement(audioChannels[0].queue[0]);
      expect(audioElement.play).toHaveBeenCalled();
    });

    it('should do nothing if queue is empty', async () => {
      await playAudioQueue(0);
      // Should not throw or do anything
    });

    it('should automatically play next audio when current ends', async () => {
      await queueAudio('test1.mp3');
      await queueAudio('test2.mp3');

      // Wait for first audio to start
      await waitForPromises(50);

      const originalSecondAudio = toMockAudioElement(audioChannels[0].queue[1]);

      // Verify initial state
      expect(audioChannels[0].queue.length).toBe(2);

      // Use stopCurrentAudioInChannel which should trigger next audio
      await stopCurrentAudioInChannel(0);

      // Wait for async operations
      await waitForPromises(20);

      // After stopping current, check the state
      const currentAudio = toMockAudioElement(audioChannels[0].queue[0]);

      expect(audioChannels[0].queue.length).toBe(1);
      expect(currentAudio === originalSecondAudio).toBe(true);
      expect(currentAudio.play).toHaveBeenCalled();
    });
  });

  describe('stopCurrentAudioInChannel', () => {
    it('should pause the current audio and remove it from the queue', async () => {
      await queueAudio('test1.mp3');
      await queueAudio('test2.mp3');

      const firstAudio = toMockAudioElement(audioChannels[0].queue[0]);
      const secondAudio = toMockAudioElement(audioChannels[0].queue[1]);

      await stopCurrentAudioInChannel(0);

      expect(firstAudio.pause).toHaveBeenCalled();
      expect(audioChannels[0].queue).toHaveLength(1);
      expect(audioChannels[0].queue[0]).toBe(secondAudio);
    });

    it('should start playing the next audio after stopping current', async () => {
      await queueAudio('test1.mp3');
      await queueAudio('test2.mp3');

      const secondAudio = toMockAudioElement(audioChannels[0].queue[1]);

      await stopCurrentAudioInChannel(0);

      // Wait for async playback to start
      await waitForPromises(20);

      expect(secondAudio.play).toHaveBeenCalled();
    });

    it('should do nothing if the channel is empty', async () => {
      await expect(stopCurrentAudioInChannel(0)).resolves.not.toThrow();
    });

    it('should work with default channel parameter', async () => {
      await queueAudio('test.mp3');

      const audio = toMockAudioElement(audioChannels[0].queue[0]);

      await stopCurrentAudioInChannel(); // No channel specified, should default to 0

      expect(audio.pause).toHaveBeenCalled();
      expect(audioChannels[0].queue).toHaveLength(0);
    });
  });

  describe('stopAllAudioInChannel', () => {
    it('should pause the current audio and clear the entire queue', async () => {
      await queueAudio('test1.mp3');
      await queueAudio('test2.mp3');

      const firstAudio = toMockAudioElement(audioChannels[0].queue[0]);

      await stopAllAudioInChannel(0);

      expect(firstAudio.pause).toHaveBeenCalled();
      expect(audioChannels[0].queue).toHaveLength(0);
    });

    it('should do nothing if the channel is empty', async () => {
      await expect(stopAllAudioInChannel(0)).resolves.not.toThrow();
    });

    it('should work with default channel parameter', async () => {
      await queueAudio('test.mp3');

      const audio = toMockAudioElement(audioChannels[0].queue[0]);

      await stopAllAudioInChannel(); // No channel specified, should default to 0

      expect(audio.pause).toHaveBeenCalled();
      expect(audioChannels[0].queue).toHaveLength(0);
    });
  });

  describe('stopAllAudio', () => {
    it('should stop all audio in all channels', async () => {
      await queueAudio('test1.mp3', 0);
      await queueAudio('test2.mp3', 1);
      await queueAudio('test3.mp3', 2);

      const audio1 = toMockAudioElement(audioChannels[0].queue[0]);
      const audio2 = toMockAudioElement(audioChannels[1].queue[0]);
      const audio3 = toMockAudioElement(audioChannels[2].queue[0]);

      await stopAllAudio();

      expect(audio1.pause).toHaveBeenCalled();
      expect(audio2.pause).toHaveBeenCalled();
      expect(audio3.pause).toHaveBeenCalled();
      expect(audioChannels[0].queue).toHaveLength(0);
      expect(audioChannels[1].queue).toHaveLength(0);
      expect(audioChannels[2].queue).toHaveLength(0);
    });

    it('should handle channels with multiple items in queue', async () => {
      await queueAudio('test1.mp3', 0);
      await queueAudio('test2.mp3', 0);
      await queueAudio('test3.mp3', 1);

      await stopAllAudio();

      expect(audioChannels[0].queue).toHaveLength(0);
      expect(audioChannels[1].queue).toHaveLength(0);
    });

    it('should do nothing if all channels are empty', async () => {
      await expect(stopAllAudio()).resolves.not.toThrow();
    });

    it('should handle all channels with sparse array', async () => {
      await queueAudio('test1.mp3', 0);
      await queueAudio('test2.mp3', 2); // Skip channel 1

      await stopAllAudio();

      expect(audioChannels[0].queue.length).toBe(0);
      expect(audioChannels[2].queue.length).toBe(0);
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle play error when starting queue', async () => {
      const mockAudio = new Audio();
      const playError = new Error('Play failed');
      mockAudio.play = jest.fn().mockRejectedValue(playError);

      // Mock the Audio constructor to return our mock
      const originalAudio = global.Audio;
      global.Audio = jest.fn().mockImplementation(() => mockAudio) as unknown as typeof Audio;

      // handleAudioError should be called when play fails
      await queueAudio('test.mp3', 0);

      // Wait for async play to happen
      await waitForPromises(50);

      // Restore original Audio constructor
      global.Audio = originalAudio;
    });

    it('should handle metadata already loaded scenario', async () => {
      const mockAudio = new Audio();
      // Set readyState to indicate metadata is already loaded
      Object.defineProperty(mockAudio, 'readyState', {
        value: 1, // HAVE_METADATA
        writable: true
      });

      // Mock the Audio constructor
      const originalAudio = global.Audio;
      global.Audio = jest.fn().mockImplementation(() => mockAudio) as unknown as typeof Audio;

      await queueAudio('test.mp3', 0);

      // The metadataLoaded flag should be set immediately
      await waitForPromises(50);

      global.Audio = originalAudio;
    });

    it('should handle error when looping audio fails to replay', async () => {
      await queueAudio('loop.mp3', 0, { loop: true });
      const mockAudio = toMockAudioElement(audioChannels[0].queue[0]);

      // Mock play to fail on second call (after loop)
      let playCallCount = 0;
      mockAudio.play = jest.fn().mockImplementation(async () => {
        playCallCount++;
        if (playCallCount === 1) {
          // First play succeeds
          mockAudio.paused = false;
          mockAudio.ended = false;
          setTimeout(() => {
            mockAudio.triggerEvent('loadedmetadata');
            mockAudio.triggerEvent('play');
          }, 0);
          return Promise.resolve();
        } else {
          // Second play (after loop) fails
          throw new Error('Play failed after loop');
        }
      });

      // Wait for initial play
      await waitForPromises(50);

      // Simulate audio ending
      mockAudio.simulateEnded();

      // Wait for loop attempt
      await waitForPromises(50);

      // Audio should still be in queue (loop doesn't remove it)
      expect(audioChannels[0].queue.length).toBe(1);
    });

    it('should handle error in playAudioQueue catch block', async () => {
      // Queue audio when channel is paused
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

      const mockAudio = new Audio();
      const playError = new Error('Play failed in queue');
      mockAudio.play = jest.fn().mockRejectedValue(playError);

      // Mock the Audio constructor
      const originalAudio = global.Audio;
      global.Audio = jest.fn().mockImplementation(() => mockAudio) as unknown as typeof Audio;

      await queueAudio('test.mp3', 0);

      // Wait for the error to be handled
      await waitForPromises(50);

      global.Audio = originalAudio;
    });
  });
});

describe('Channel limits and security', () => {
  beforeEach(() => {
    audioChannels.length = 0;
  });

  it('should enforce maximum channel limit', async () => {
    // Should allow channels up to 63 (0-63 = 64 total)
    await expect(queueAudio('test.mp3', 63)).resolves.not.toThrow();

    // Should reject channel 64 and above
    await expect(queueAudio('test.mp3', 64)).rejects.toThrow(
      'Channel number 64 exceeds maximum allowed channels (64)'
    );

    await expect(queueAudio('test.mp3', 100)).rejects.toThrow(
      'Channel number 100 exceeds maximum allowed channels (64)'
    );
  });

  it('should reject negative channel numbers', async () => {
    await expect(queueAudio('test.mp3', -1)).rejects.toThrow('Channel number must be non-negative');
  });

  it('should reject malicious URLs', async () => {
    await expect(queueAudio('javascript:alert("XSS")')).rejects.toThrow(
      'Invalid audio URL: dangerous protocol "javascript:" is not allowed'
    );

    await expect(queueAudio('data:text/html,<script>alert("XSS")</script>')).rejects.toThrow(
      'Invalid audio URL: dangerous protocol "data:" is not allowed'
    );
  });

  it('should enforce MAX_CHANNELS in setChannelQueueLimit', () => {
    // Should allow valid channels
    expect(() => setChannelQueueLimit(63, 10)).not.toThrow();

    // Should reject channels exceeding limit
    expect(() => setChannelQueueLimit(64, 10)).toThrow(
      'Channel number 64 exceeds maximum allowed channels (64)'
    );

    expect(() => setChannelQueueLimit(-1, 10)).toThrow('Channel number must be non-negative');
  });

  it('should enforce MAX_CHANNELS in all callback functions', async () => {
    const { onAudioError } = await import('../src/errors');

    const {
      onAudioProgress,
      onQueueChange,
      onAudioStart,
      onAudioComplete,
      onAudioPause,
      onAudioResume
    } = await import('../src/info');

    const mockCallback = jest.fn();

    // All callback functions should enforce MAX_CHANNELS limit
    expect(() => onAudioError(64, mockCallback)).toThrow(
      'Channel number 64 exceeds maximum allowed channels (64)'
    );

    expect(() => onAudioProgress(64, mockCallback)).toThrow(
      'Channel number 64 exceeds maximum allowed channels (64)'
    );

    expect(() => onQueueChange(64, mockCallback)).toThrow(
      'Channel number 64 exceeds maximum allowed channels (64)'
    );

    expect(() => onAudioStart(64, mockCallback)).toThrow(
      'Channel number 64 exceeds maximum allowed channels (64)'
    );

    expect(() => onAudioComplete(64, mockCallback)).toThrow(
      'Channel number 64 exceeds maximum allowed channels (64)'
    );

    expect(() => onAudioPause(64, mockCallback)).toThrow(
      'Channel number 64 exceeds maximum allowed channels (64)'
    );

    expect(() => onAudioResume(64, mockCallback)).toThrow(
      'Channel number 64 exceeds maximum allowed channels (64)'
    );

    // All should also reject negative channels
    expect(() => onAudioError(-1, mockCallback)).toThrow('Channel number must be non-negative');

    expect(() => onAudioProgress(-1, mockCallback)).toThrow('Channel number must be non-negative');
  });

  it('should allow valid channel numbers in all functions', async () => {
    const { onAudioError } = await import('../src/errors');
    const {
      onAudioProgress,
      onQueueChange,
      onAudioStart,
      onAudioComplete,
      onAudioPause,
      onAudioResume
    } = await import('../src/info');

    const mockCallback = jest.fn();

    // All functions should accept valid channel numbers (0-63)
    expect(() => onAudioError(0, mockCallback)).not.toThrow();
    expect(() => onAudioError(63, mockCallback)).not.toThrow();

    expect(() => onAudioProgress(0, mockCallback)).not.toThrow();
    expect(() => onAudioProgress(63, mockCallback)).not.toThrow();

    expect(() => onQueueChange(0, mockCallback)).not.toThrow();
    expect(() => onQueueChange(63, mockCallback)).not.toThrow();

    expect(() => onAudioStart(0, mockCallback)).not.toThrow();
    expect(() => onAudioStart(63, mockCallback)).not.toThrow();

    expect(() => onAudioComplete(0, mockCallback)).not.toThrow();
    expect(() => onAudioComplete(63, mockCallback)).not.toThrow();

    expect(() => onAudioPause(0, mockCallback)).not.toThrow();
    expect(() => onAudioPause(63, mockCallback)).not.toThrow();

    expect(() => onAudioResume(0, mockCallback)).not.toThrow();
    expect(() => onAudioResume(63, mockCallback)).not.toThrow();
  });
});

describe('Channel destruction', () => {
  beforeEach(() => {
    audioChannels.length = 0;
  });

  it('should completely destroy a channel and clean up resources', async () => {
    // Set up a channel with audio and callbacks
    await queueAudio('test1.mp3', 1);
    await queueAudio('test2.mp3', 1);

    expect(audioChannels[1]).toBeDefined();
    expect(audioChannels[1].queue).toHaveLength(2);

    // Destroy the channel
    await destroyChannel(1);

    // Channel should be completely removed
    expect(audioChannels[1]).toBeUndefined();
  });

  it('should handle destroying non-existent channels gracefully', async () => {
    await expect(destroyChannel(999)).resolves.not.toThrow();
  });

  it('should destroy all channels at once', async () => {
    // Set up multiple channels
    await queueAudio('test1.mp3', 0);
    await queueAudio('test2.mp3', 1);
    await queueAudio('test3.mp3', 2);

    expect(audioChannels.length).toBeGreaterThan(0);

    // Destroy all channels
    await destroyAllChannels();

    // All channels should be removed
    expect(audioChannels.length).toBe(0);
  });
});

describe('Queue size limits', () => {
  beforeEach(() => {
    audioChannels.length = 0;
    // Reset global queue config
    setQueueConfig({
      defaultMaxQueueSize: undefined,
      dropOldestWhenFull: false,
      showQueueWarnings: false // Disable warnings in tests
    });
  });

  it('should respect global default queue size limit', async () => {
    setQueueConfig({ defaultMaxQueueSize: 2 });

    // Should allow first two items
    await expect(queueAudio('test1.mp3', 0)).resolves.not.toThrow();
    await expect(queueAudio('test2.mp3', 0)).resolves.not.toThrow();

    // Should reject third item
    await expect(queueAudio('test3.mp3', 0)).rejects.toThrow(
      'Queue size limit exceeded for channel 0'
    );

    expect(audioChannels[0].queue.length).toBe(2);
  });

  it('should respect channel-specific queue size limit', async () => {
    setChannelQueueLimit(0, 3);

    // Should allow first three items
    await expect(queueAudio('test1.mp3', 0)).resolves.not.toThrow();
    await expect(queueAudio('test2.mp3', 0)).resolves.not.toThrow();
    await expect(queueAudio('test3.mp3', 0)).resolves.not.toThrow();

    // Should reject fourth item
    await expect(queueAudio('test4.mp3', 0)).rejects.toThrow(
      'Queue size limit exceeded for channel 0'
    );

    expect(audioChannels[0].queue.length).toBe(3);
  });

  it('should respect options maxQueueSize override', async () => {
    // Channel has higher limit, but option overrides to lower
    setChannelQueueLimit(0, 10);

    await expect(queueAudio('test1.mp3', 0, { maxQueueSize: 1 })).resolves.not.toThrow();
    await expect(queueAudio('test2.mp3', 0, { maxQueueSize: 1 })).rejects.toThrow(
      'Queue size limit exceeded for channel 0'
    );

    expect(audioChannels[0].queue.length).toBe(1);
  });

  it('should drop oldest when configured', async () => {
    setQueueConfig({
      defaultMaxQueueSize: 2,
      dropOldestWhenFull: true,
      showQueueWarnings: false
    });

    await queueAudio('test1.mp3', 0);
    await queueAudio('test2.mp3', 0);

    // This should drop test1.mp3 and add test3.mp3
    await expect(queueAudio('test3.mp3', 0)).resolves.not.toThrow();

    expect(audioChannels[0].queue.length).toBe(2);
    expect(audioChannels[0].queue[0].src).toBe('test1.mp3'); // Currently playing - not dropped
    expect(audioChannels[0].queue[1].src).toBe('test3.mp3'); // test2.mp3 was dropped
  });

  it('should not drop currently playing audio', async () => {
    setQueueConfig({
      defaultMaxQueueSize: 1,
      dropOldestWhenFull: true,
      showQueueWarnings: false
    });

    await queueAudio('test1.mp3', 0);

    // Cannot add when queue only has room for 1 and it's currently playing
    await expect(queueAudio('test2.mp3', 0)).rejects.toThrow(
      'Queue size limit exceeded for channel 0'
    );

    expect(audioChannels[0].queue.length).toBe(1);
  });
});
