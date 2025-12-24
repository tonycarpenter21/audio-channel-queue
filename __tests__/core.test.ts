/**
 * @fileoverview Tests for core queue management functions
 */

import {
  destroyAllChannels,
  destroyChannel,
  getQueueConfig,
  playAudioQueue,
  queueAudio,
  queueAudioPriority,
  setChannelQueueLimit,
  setQueueConfig,
  stopAllAudio,
  stopAllAudioInChannel,
  stopCurrentAudioInChannel
} from '../src/core';
import { getQueueLength } from '../src/queue-manipulation';
import {
  audioChannels,
  getQueueSnapshot,
  onAudioComplete,
  onAudioStart,
  onAudioProgress,
  onQueueChange,
  onAudioPause,
  onAudioResume
} from '../src/info';
import { onAudioError } from '../src/errors';
import { toMockAudioElement } from './setup';

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

      const originalSecondAudio = toMockAudioElement(audioChannels[0].queue[1]);

      // Verify initial state
      expect(audioChannels[0].queue.length).toBe(2);

      // Use stopCurrentAudioInChannel which should trigger next audio
      await stopCurrentAudioInChannel(0);

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

      // Simulate audio ending
      mockAudio.simulateEnded();

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

      global.Audio = originalAudio;
    });
  });

  describe('queueAudioPriority', () => {
    it('should add priority audio to second position in queue', async () => {
      await queueAudio('https://example.com/test1.mp3', 0);
      await queueAudio('https://example.com/test2.mp3', 0);

      // Add priority item
      await queueAudioPriority('https://example.com/priority.mp3', 0);

      const queueInfo = getQueueSnapshot(0);
      expect(queueInfo?.totalItems).toBe(3);

      // Priority item should be second (after currently playing)
      const urls = queueInfo?.items.map((item) => item.src) ?? [];
      expect(urls[1]).toBe('https://example.com/priority.mp3');
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

  it('should enforce MAX_CHANNELS in all callback functions', () => {
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

  it('should allow valid channel numbers in all functions', () => {
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
    // Set up a channel with audio
    await queueAudio('https://example.com/test1.mp3', 1);
    await queueAudio('https://example.com/test2.mp3', 1);

    // Verify channel exists and has audio
    expect(getQueueLength(1)).toBe(2);
    expect(getQueueSnapshot(1)).not.toBeNull();
    expect(getQueueSnapshot(1)?.items).toHaveLength(2);

    // Destroy the channel
    await destroyChannel(1);

    // Verify channel is completely removed using public APIs
    expect(getQueueLength(1)).toBe(0);
    expect(getQueueSnapshot(1)).toBeNull();
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

describe('Queue Size Limits', () => {
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

  it('should drop oldest queued items when dropOldestWhenFull is enabled', async () => {
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

    // Configure to drop oldest when full
    setQueueConfig({
      defaultMaxQueueSize: 3,
      dropOldestWhenFull: true,
      showQueueWarnings: true
    });

    await queueAudio('https://example.com/test1.mp3', 0);
    await queueAudio('https://example.com/test2.mp3', 0);
    await queueAudio('https://example.com/test3.mp3', 0);

    // This should drop the oldest queued item (test2) and add test4
    await queueAudio('https://example.com/test4.mp3', 0);

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Queue limit reached for channel 0')
    );
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Dropped oldest queued item')
    );

    const queueLength = getQueueLength();
    expect(queueLength).toBe(3);
    expect(audioChannels[0].queue[0].src).toBe('https://example.com/test1.mp3'); // Currently playing - not dropped
    expect(audioChannels[0].queue[1].src).toBe('https://example.com/test3.mp3'); // test2 was dropped
    expect(audioChannels[0].queue[2].src).toBe('https://example.com/test4.mp3'); // New item added
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

  it('should handle unlimited queue when no limits are set', async () => {
    // Clear all limits
    setQueueConfig({ defaultMaxQueueSize: undefined });
    setChannelQueueLimit(0, undefined);

    // Should be able to add many items
    for (let i = 0; i < 10; i++) {
      await queueAudio(`https://example.com/test${i}.mp3`, 0);
    }

    const queueLength = getQueueLength();
    expect(queueLength).toBe(10);
  });

  it('should validate channel number limits', () => {
    expect(() => setChannelQueueLimit(-1, 10)).toThrow('Channel number must be non-negative');
    expect(() => setChannelQueueLimit(1000, 10)).toThrow('exceeds maximum allowed channels');
  });
});

describe('Audio Element Lifecycle', () => {
  it('should handle audio element creation and setup', async () => {
    await queueAudio('https://example.com/test.mp3', 0);

    const mockAudio = toMockAudioElement(audioChannels[0].queue[0]);

    // Mock addEventListener to track event setup
    const addEventListenerSpy = jest.spyOn(mockAudio, 'addEventListener');

    // The audio element should have event listeners set up
    expect(mockAudio.addEventListener).toHaveBeenCalled();

    addEventListenerSpy.mockRestore();
  });

  it('should handle audio start event firing', async () => {
    let startEventFired = false;

    onAudioStart(0, () => {
      startEventFired = true;
    });

    await queueAudio('https://example.com/test.mp3', 0);

    // Simulate play event
    const audio = audioChannels[0].queue[0];
    audio.dispatchEvent(new Event('play'));

    expect(startEventFired).toBe(true);
  });

  it('should handle ended event and continue to next track', async () => {
    let completeEventFired = false;

    onAudioComplete(0, () => {
      completeEventFired = true;
    });

    await queueAudio('https://example.com/test1.mp3', 0);
    await queueAudio('https://example.com/test2.mp3', 0);

    const audio = audioChannels[0].queue[0];

    // Simulate ended event
    audio.dispatchEvent(new Event('ended'));

    // Wait for async operations
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(completeEventFired).toBe(true);
  });
});

describe('Operation Lock Management', () => {
  beforeEach(() => {
    audioChannels.length = 0;
    // Clear any queue limits that might interfere
    setQueueConfig({
      defaultMaxQueueSize: undefined,
      dropOldestWhenFull: false,
      showQueueWarnings: false
    });
    setChannelQueueLimit(0, undefined);
  });

  it('should handle operation lock contention gracefully', async () => {
    await queueAudio('https://example.com/test.mp3', 0);

    // Test that operations complete even with potential lock contention
    await expect(queueAudio('https://example.com/test2.mp3', 0)).resolves.not.toThrow();

    // Verify the queue has both items
    const queueLength = getQueueLength();
    expect(queueLength).toBe(2);
  });

  it('should handle concurrent operations with lock contention', async () => {
    await queueAudio('https://example.com/test1.mp3', 0);

    // Start multiple operations concurrently
    const promises: Promise<void>[] = [];
    for (let i = 0; i < 5; i++) {
      promises.push(queueAudio(`https://example.com/test${i}.mp3`, 0));
    }

    // All should complete successfully
    await Promise.all(promises);

    const queueLength = getQueueLength();
    expect(queueLength).toBeGreaterThan(0);
  });
});

describe('Configuration Management', () => {
  it('should handle queue configuration changes', () => {
    const originalConfig = getQueueConfig();

    setQueueConfig({
      defaultMaxQueueSize: 25,
      dropOldestWhenFull: false,
      showQueueWarnings: false
    });

    const newConfig = getQueueConfig();
    expect(newConfig.defaultMaxQueueSize).toBe(25);
    expect(newConfig.dropOldestWhenFull).toBe(false);
    expect(newConfig.showQueueWarnings).toBe(false);

    // Restore original
    setQueueConfig(originalConfig);
  });

  it('should handle partial configuration updates', () => {
    const originalConfig = getQueueConfig();

    setQueueConfig({ defaultMaxQueueSize: 15 });

    const newConfig = getQueueConfig();
    expect(newConfig.defaultMaxQueueSize).toBe(15);
    // Other properties should remain unchanged
    expect(newConfig.dropOldestWhenFull).toBe(originalConfig.dropOldestWhenFull);
    expect(newConfig.showQueueWarnings).toBe(originalConfig.showQueueWarnings);
  });
});
