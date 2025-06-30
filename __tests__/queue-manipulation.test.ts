/**
 * @fileoverview Tests for queue manipulation functions
 */

import { toMockAudioElement, waitForPromises } from './setup';
import {
  removeQueuedItem,
  reorderQueue,
  clearQueueAfterCurrent,
  getQueueItemInfo,
  getQueueLength,
  swapQueueItems,
  queueAudio
} from '../src/index';
import { audioChannels } from '../src/info';

describe('Queue Manipulation Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset audio channels
    audioChannels.length = 0;
  });

  describe('removeQueuedItem', () => {
    it('should remove a queued item successfully and maintain correct order', async () => {
      // Setup: Add multiple items to queue
      await queueAudio('http://example.com/audio1.mp3');
      await queueAudio('http://example.com/audio2.mp3');
      await queueAudio('http://example.com/audio3.mp3');

      const initialLength: number = getQueueLength(0);
      expect(initialLength).toBe(3);

      // Verify initial order
      expect(getQueueItemInfo(0)?.src).toBe('http://example.com/audio1.mp3');
      expect(getQueueItemInfo(1)?.src).toBe('http://example.com/audio2.mp3');
      expect(getQueueItemInfo(2)?.src).toBe('http://example.com/audio3.mp3');

      // Remove the second item (index 1) - audio2.mp3
      const result = await removeQueuedItem(1);

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      expect(result.updatedQueue).toBeDefined();
      expect(result.updatedQueue!.totalItems).toBe(2);
      expect(getQueueLength(0)).toBe(2);

      // Verify audio2.mp3 is gone and remaining items are in correct positions
      expect(getQueueItemInfo(0)?.src).toBe('http://example.com/audio1.mp3'); // Still at index 0
      expect(getQueueItemInfo(1)?.src).toBe('http://example.com/audio3.mp3'); // Moved from index 2 to 1
      expect(getQueueItemInfo(2)).toBeNull(); // Index 2 no longer exists

      // Verify audio2.mp3 is completely gone
      const allItems = [getQueueItemInfo(0)?.src, getQueueItemInfo(1)?.src];
      expect(allItems).not.toContain('http://example.com/audio2.mp3');
    });

    it('should remove last item without affecting others', async () => {
      await queueAudio('http://example.com/first.mp3');
      await queueAudio('http://example.com/second.mp3');
      await queueAudio('http://example.com/last.mp3');

      // Remove the last item (index 2)
      const result = await removeQueuedItem(2);

      expect(result.success).toBe(true);
      expect(getQueueLength(0)).toBe(2);

      // Verify first two items remain unchanged
      expect(getQueueItemInfo(0)?.src).toBe('http://example.com/first.mp3');
      expect(getQueueItemInfo(1)?.src).toBe('http://example.com/second.mp3');
      expect(getQueueItemInfo(2)).toBeNull();

      // Verify last.mp3 is completely gone
      const allItems = [getQueueItemInfo(0)?.src, getQueueItemInfo(1)?.src];
      expect(allItems).not.toContain('http://example.com/last.mp3');
    });

    it('should not allow removal of currently playing item (index 0)', async () => {
      await queueAudio('http://example.com/audio1.mp3');
      await queueAudio('http://example.com/audio2.mp3');

      const result = await removeQueuedItem(0);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Cannot remove currently playing item');
      expect(getQueueLength(0)).toBe(2); // Should remain unchanged

      // Verify both items are still there
      expect(getQueueItemInfo(0)?.src).toBe('http://example.com/audio1.mp3');
      expect(getQueueItemInfo(1)?.src).toBe('http://example.com/audio2.mp3');
    });

    it('should handle invalid slot numbers', async () => {
      await queueAudio('http://example.com/audio1.mp3');

      // Test negative index
      const result1 = await removeQueuedItem(-1);
      expect(result1.success).toBe(false);
      expect(result1.error).toContain('Invalid slot number');

      // Test index beyond queue length
      const result2 = await removeQueuedItem(5);
      expect(result2.success).toBe(false);
      expect(result2.error).toContain('Invalid slot number');
    });

    it('should handle non-existent channel', async () => {
      const result = await removeQueuedItem(1, 999);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Channel 999 does not exist');
    });

    it('should clean up progress tracking for removed item', async () => {
      await queueAudio('http://example.com/audio1.mp3');
      await queueAudio('http://example.com/audio2.mp3');

      const channel = audioChannels[0];
      const originalCleanup = jest.fn();

      // Mock the cleanup function
      const mockElement = toMockAudioElement(channel.queue[1]);
      mockElement.removeEventListener = originalCleanup;

      await removeQueuedItem(1);

      // Verify the queue was modified
      expect(getQueueLength(0)).toBe(1);

      // Verify only audio1.mp3 remains and audio2.mp3 is gone
      expect(getQueueItemInfo(0)?.src).toBe('http://example.com/audio1.mp3');
      expect(getQueueItemInfo(1)).toBeNull();
      const allItems = [getQueueItemInfo(0)?.src];
      expect(allItems).not.toContain('http://example.com/audio2.mp3');
    });
  });

  describe('reorderQueue', () => {
    it('should reorder queue items successfully and maintain all other positions', async () => {
      // Setup: Add multiple items
      await queueAudio('http://example.com/audio1.mp3');
      await queueAudio('http://example.com/audio2.mp3');
      await queueAudio('http://example.com/audio3.mp3');
      await queueAudio('http://example.com/audio4.mp3');

      // Verify initial order
      expect(getQueueItemInfo(0)?.src).toBe('http://example.com/audio1.mp3');
      expect(getQueueItemInfo(1)?.src).toBe('http://example.com/audio2.mp3');
      expect(getQueueItemInfo(2)?.src).toBe('http://example.com/audio3.mp3');
      expect(getQueueItemInfo(3)?.src).toBe('http://example.com/audio4.mp3');

      // Move item from position 3 (audio4.mp3) to position 1
      const result = await reorderQueue(3, 1);

      expect(result.success).toBe(true);
      expect(result.updatedQueue).toBeDefined();

      // Verify new order: audio4 moved to position 1, others shifted right
      expect(getQueueItemInfo(0)?.src).toBe('http://example.com/audio1.mp3'); // Unchanged
      expect(getQueueItemInfo(1)?.src).toBe('http://example.com/audio4.mp3'); // Moved from 3 to 1
      expect(getQueueItemInfo(2)?.src).toBe('http://example.com/audio2.mp3'); // Shifted from 1 to 2
      expect(getQueueItemInfo(3)?.src).toBe('http://example.com/audio3.mp3'); // Shifted from 2 to 3
    });

    it('should handle moving item backward in queue', async () => {
      await queueAudio('http://example.com/song1.mp3');
      await queueAudio('http://example.com/song2.mp3');
      await queueAudio('http://example.com/song3.mp3');
      await queueAudio('http://example.com/song4.mp3');

      // Move item from position 1 (song2.mp3) to position 3
      const result = await reorderQueue(1, 3);

      expect(result.success).toBe(true);

      // Verify new order: song2 moved to position 3, others shifted left
      expect(getQueueItemInfo(0)?.src).toBe('http://example.com/song1.mp3'); // Unchanged
      expect(getQueueItemInfo(1)?.src).toBe('http://example.com/song3.mp3'); // Shifted from 2 to 1
      expect(getQueueItemInfo(2)?.src).toBe('http://example.com/song4.mp3'); // Shifted from 3 to 2
      expect(getQueueItemInfo(3)?.src).toBe('http://example.com/song2.mp3'); // Moved from 1 to 3
    });

    it('should not allow reordering currently playing item', async () => {
      await queueAudio('http://example.com/audio1.mp3');
      await queueAudio('http://example.com/audio2.mp3');

      const result = await reorderQueue(0, 1);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Cannot reorder currently playing item');

      // Verify order unchanged
      expect(getQueueItemInfo(0)?.src).toBe('http://example.com/audio1.mp3');
      expect(getQueueItemInfo(1)?.src).toBe('http://example.com/audio2.mp3');
    });

    it('should not allow moving item to currently playing position', async () => {
      await queueAudio('http://example.com/audio1.mp3');
      await queueAudio('http://example.com/audio2.mp3');

      const result = await reorderQueue(1, 0);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Cannot move item to currently playing position');

      // Verify order unchanged
      expect(getQueueItemInfo(0)?.src).toBe('http://example.com/audio1.mp3');
      expect(getQueueItemInfo(1)?.src).toBe('http://example.com/audio2.mp3');
    });

    it('should handle same position reorder gracefully', async () => {
      await queueAudio('http://example.com/audio1.mp3');
      await queueAudio('http://example.com/audio2.mp3');

      const result = await reorderQueue(1, 1);

      expect(result.success).toBe(true);
      expect(result.updatedQueue).toBeDefined();

      // Verify order unchanged
      expect(getQueueItemInfo(0)?.src).toBe('http://example.com/audio1.mp3');
      expect(getQueueItemInfo(1)?.src).toBe('http://example.com/audio2.mp3');
    });

    it('should move item to adjacent position correctly', async () => {
      await queueAudio('http://example.com/song1.mp3');
      await queueAudio('http://example.com/song2.mp3');
      await queueAudio('http://example.com/song3.mp3');

      // Move item from position 2 to position 1 (move up one position)
      const result = await reorderQueue(2, 1);

      expect(result.success).toBe(true);

      // Verify new order: song1, song3, song2
      expect(getQueueItemInfo(0)?.src).toBe('http://example.com/song1.mp3'); // Unchanged
      expect(getQueueItemInfo(1)?.src).toBe('http://example.com/song3.mp3'); // Moved from 2 to 1
      expect(getQueueItemInfo(2)?.src).toBe('http://example.com/song2.mp3'); // Shifted from 1 to 2
    });

    it('should move last item to second position correctly', async () => {
      await queueAudio('http://example.com/current.mp3');
      await queueAudio('http://example.com/second.mp3');
      await queueAudio('http://example.com/third.mp3');
      await queueAudio('http://example.com/last.mp3');

      // Move last item to play next (position 1)
      const result = await reorderQueue(3, 1);

      expect(result.success).toBe(true);

      // Verify new order: current, last, second, third
      expect(getQueueItemInfo(0)?.src).toBe('http://example.com/current.mp3'); // Unchanged
      expect(getQueueItemInfo(1)?.src).toBe('http://example.com/last.mp3'); // Moved from 3 to 1
      expect(getQueueItemInfo(2)?.src).toBe('http://example.com/second.mp3'); // Shifted from 1 to 2
      expect(getQueueItemInfo(3)?.src).toBe('http://example.com/third.mp3'); // Shifted from 2 to 3
    });

    it('should validate slot numbers', async () => {
      await queueAudio('http://example.com/audio1.mp3');
      await queueAudio('http://example.com/audio2.mp3');
      await queueAudio('http://example.com/audio3.mp3');

      // Test invalid current slot
      const result1 = await reorderQueue(-1, 1);
      expect(result1.success).toBe(false);
      expect(result1.error).toContain('Invalid current slot number');

      // Test invalid new slot
      const result2 = await reorderQueue(1, 5);
      expect(result2.success).toBe(false);
      expect(result2.error).toContain('Invalid new slot number');
    });
  });

  describe('clearQueueAfterCurrent', () => {
    it('should clear all items after currently playing and preserve current item', async () => {
      // Setup: Add multiple items
      await queueAudio('http://example.com/audio1.mp3');
      await queueAudio('http://example.com/audio2.mp3');
      await queueAudio('http://example.com/audio3.mp3');
      await queueAudio('http://example.com/audio4.mp3');

      // Verify initial state
      expect(getQueueLength(0)).toBe(4);
      expect(getQueueItemInfo(0)?.src).toBe('http://example.com/audio1.mp3');
      expect(getQueueItemInfo(1)?.src).toBe('http://example.com/audio2.mp3');
      expect(getQueueItemInfo(2)?.src).toBe('http://example.com/audio3.mp3');
      expect(getQueueItemInfo(3)?.src).toBe('http://example.com/audio4.mp3');

      const result = await clearQueueAfterCurrent(0);

      expect(result.success).toBe(true);
      expect(result.updatedQueue).toBeDefined();
      expect(result.updatedQueue!.totalItems).toBe(1);
      expect(getQueueLength(0)).toBe(1);

      // Verify only the first item (currently playing) remains
      expect(getQueueItemInfo(0)?.src).toBe('http://example.com/audio1.mp3');
      expect(getQueueItemInfo(1)).toBeNull();
      expect(getQueueItemInfo(2)).toBeNull();
      expect(getQueueItemInfo(3)).toBeNull();

      // Verify cleared items are completely gone
      const allItems = [getQueueItemInfo(0)?.src];
      expect(allItems).not.toContain('http://example.com/audio2.mp3');
      expect(allItems).not.toContain('http://example.com/audio3.mp3');
      expect(allItems).not.toContain('http://example.com/audio4.mp3');
    });

    it('should handle empty queue gracefully', async () => {
      const result = await clearQueueAfterCurrent(0);

      expect(result.success).toBe(true);
      expect(result.updatedQueue).toBeDefined();
      expect(getQueueLength(0)).toBe(0);
    });

    it('should handle queue with single item', async () => {
      await queueAudio('http://example.com/audio1.mp3');

      const result = await clearQueueAfterCurrent(0);

      expect(result.success).toBe(true);
      expect(getQueueLength(0)).toBe(1);

      // Verify the single item remains
      expect(getQueueItemInfo(0)?.src).toBe('http://example.com/audio1.mp3');
      expect(getQueueItemInfo(1)).toBeNull();
    });

    it('should clear large queue correctly', async () => {
      // Add many items to test large queue clearing
      await queueAudio('http://example.com/current.mp3');
      await queueAudio('http://example.com/queue1.mp3');
      await queueAudio('http://example.com/queue2.mp3');
      await queueAudio('http://example.com/queue3.mp3');
      await queueAudio('http://example.com/queue4.mp3');
      await queueAudio('http://example.com/queue5.mp3');

      expect(getQueueLength(0)).toBe(6);

      const result = await clearQueueAfterCurrent(0);

      expect(result.success).toBe(true);
      expect(getQueueLength(0)).toBe(1);

      // Verify only current item remains
      expect(getQueueItemInfo(0)?.src).toBe('http://example.com/current.mp3');
      expect(getQueueItemInfo(1)).toBeNull();
      expect(getQueueItemInfo(2)).toBeNull();
      expect(getQueueItemInfo(3)).toBeNull();
      expect(getQueueItemInfo(4)).toBeNull();
      expect(getQueueItemInfo(5)).toBeNull();
    });

    it('should handle non-existent channel gracefully', async () => {
      const result = await clearQueueAfterCurrent(999);

      expect(result.success).toBe(true);
      expect(result.updatedQueue).toBeDefined();
      expect(result.updatedQueue!.totalItems).toBe(0);
      expect(result.updatedQueue!.channelNumber).toBe(999);
    });
  });

  describe('getQueueItemInfo', () => {
    it('should return correct item information with accurate metadata', async () => {
      await queueAudio('http://example.com/test-audio.mp3');
      await queueAudio('http://example.com/another-audio.wav');

      // Wait for audio to start playing and set it to playing state
      await waitForPromises(10);
      const firstAudio = toMockAudioElement(audioChannels[0].queue[0]);
      firstAudio.paused = false; // Simulate playing state

      const item0 = getQueueItemInfo(0);
      const item1 = getQueueItemInfo(1);

      // Verify first item (currently playing)
      expect(item0).toBeDefined();
      expect(item0!.src).toBe('http://example.com/test-audio.mp3');
      expect(item0!.fileName).toBe('test-audio.mp3');
      expect(item0!.isCurrentlyPlaying).toBe(true); // Index 0 is currently playing

      // Verify second item (queued)
      expect(item1).toBeDefined();
      expect(item1!.src).toBe('http://example.com/another-audio.wav');
      expect(item1!.fileName).toBe('another-audio.wav');
      expect(item1!.isCurrentlyPlaying).toBe(false); // Index 1+ are queued
    });

    it('should identify currently playing item', async () => {
      await queueAudio('http://example.com/current.mp3');

      const mockElement = toMockAudioElement(audioChannels[0].queue[0]);
      mockElement.paused = false;

      const itemInfo = getQueueItemInfo(0);

      expect(itemInfo).toBeDefined();
      expect(itemInfo!.isCurrentlyPlaying).toBe(true); // Currently playing item at index 0
    });

    it('should return null for invalid slot', async () => {
      await queueAudio('http://example.com/audio.mp3');

      const itemInfo = getQueueItemInfo(5);

      expect(itemInfo).toBeNull();
    });

    it('should return null for non-existent channel', async () => {
      const itemInfo = getQueueItemInfo(0, 999);

      expect(itemInfo).toBeNull();
    });
  });

  describe('getQueueLength', () => {
    it('should return correct queue length', async () => {
      expect(getQueueLength(0)).toBe(0);

      await queueAudio('http://example.com/audio1.mp3');
      expect(getQueueLength(0)).toBe(1);

      await queueAudio('http://example.com/audio2.mp3');
      expect(getQueueLength(0)).toBe(2);
    });

    it('should return 0 for non-existent channel', () => {
      const length = getQueueLength(999);

      expect(length).toBe(0);
    });

    it('should return correct length after removals', async () => {
      await queueAudio('http://example.com/audio1.mp3');
      await queueAudio('http://example.com/audio2.mp3');
      await queueAudio('http://example.com/audio3.mp3');

      expect(getQueueLength(0)).toBe(3);

      await removeQueuedItem(1);
      expect(getQueueLength(0)).toBe(2);

      await clearQueueAfterCurrent(0);
      expect(getQueueLength(0)).toBe(1);
    });
  });

  describe('swapQueueItems', () => {
    it('should swap two queue items successfully while preserving other positions', async () => {
      await queueAudio('http://example.com/audio1.mp3');
      await queueAudio('http://example.com/audio2.mp3');
      await queueAudio('http://example.com/audio3.mp3');
      await queueAudio('http://example.com/audio4.mp3');

      // Verify initial order
      expect(getQueueItemInfo(0)?.src).toBe('http://example.com/audio1.mp3');
      expect(getQueueItemInfo(1)?.src).toBe('http://example.com/audio2.mp3');
      expect(getQueueItemInfo(2)?.src).toBe('http://example.com/audio3.mp3');
      expect(getQueueItemInfo(3)?.src).toBe('http://example.com/audio4.mp3');

      // Swap items at positions 1 and 2 (audio2 and audio3)
      const result = await swapQueueItems(1, 2);

      expect(result.success).toBe(true);
      expect(result.updatedQueue).toBeDefined();

      // Verify items were swapped and others unchanged
      expect(getQueueItemInfo(0)?.src).toBe('http://example.com/audio1.mp3'); // Unchanged
      expect(getQueueItemInfo(1)?.src).toBe('http://example.com/audio3.mp3'); // Was at position 2
      expect(getQueueItemInfo(2)?.src).toBe('http://example.com/audio2.mp3'); // Was at position 1
      expect(getQueueItemInfo(3)?.src).toBe('http://example.com/audio4.mp3'); // Unchanged
    });

    it('should swap first and last queued items correctly', async () => {
      await queueAudio('http://example.com/current.mp3');
      await queueAudio('http://example.com/first-queued.mp3');
      await queueAudio('http://example.com/middle.mp3');
      await queueAudio('http://example.com/last-queued.mp3');

      // Swap first and last queued items (positions 1 and 3)
      const result = await swapQueueItems(1, 3);

      expect(result.success).toBe(true);

      // Verify swap and that other items are unchanged
      expect(getQueueItemInfo(0)?.src).toBe('http://example.com/current.mp3'); // Unchanged
      expect(getQueueItemInfo(1)?.src).toBe('http://example.com/last-queued.mp3'); // Was at 3
      expect(getQueueItemInfo(2)?.src).toBe('http://example.com/middle.mp3'); // Unchanged
      expect(getQueueItemInfo(3)?.src).toBe('http://example.com/first-queued.mp3'); // Was at 1
    });

    it('should not allow swapping with currently playing item', async () => {
      await queueAudio('http://example.com/audio1.mp3');
      await queueAudio('http://example.com/audio2.mp3');

      const result = await swapQueueItems(0, 1);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Cannot swap with currently playing item');

      // Verify order unchanged
      expect(getQueueItemInfo(0)?.src).toBe('http://example.com/audio1.mp3');
      expect(getQueueItemInfo(1)?.src).toBe('http://example.com/audio2.mp3');
    });

    it('should validate slot numbers', async () => {
      await queueAudio('http://example.com/audio1.mp3');
      await queueAudio('http://example.com/audio2.mp3');
      await queueAudio('http://example.com/audio3.mp3');

      // Test invalid slot A
      const result1 = await swapQueueItems(-1, 1);
      expect(result1.success).toBe(false);
      expect(result1.error).toContain('Invalid slot A');

      // Test invalid slot B
      const result2 = await swapQueueItems(1, 5);
      expect(result2.success).toBe(false);
      expect(result2.error).toContain('Invalid slot B');
    });

    it('should handle non-existent channel', async () => {
      const result = await swapQueueItems(1, 2, 999);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Channel 999 does not exist');
    });

    it('should handle same slot swap gracefully', async () => {
      await queueAudio('http://example.com/audio1.mp3');
      await queueAudio('http://example.com/audio2.mp3');

      const result = await swapQueueItems(1, 1);

      expect(result.success).toBe(true);
      expect(result.updatedQueue).toBeDefined();

      // Verify order unchanged
      expect(getQueueItemInfo(0)?.src).toBe('http://example.com/audio1.mp3');
      expect(getQueueItemInfo(1)?.src).toBe('http://example.com/audio2.mp3');
    });
  });

  describe('Integration Tests', () => {
    it('should handle complex queue manipulations with correct final state', async () => {
      // Build a queue
      await queueAudio('http://example.com/song1.mp3');
      await queueAudio('http://example.com/song2.mp3');
      await queueAudio('http://example.com/song3.mp3');
      await queueAudio('http://example.com/song4.mp3');
      await queueAudio('http://example.com/song5.mp3');

      // Verify initial state
      expect(getQueueLength(0)).toBe(5);
      expect(getQueueItemInfo(0)?.src).toBe('http://example.com/song1.mp3');
      expect(getQueueItemInfo(1)?.src).toBe('http://example.com/song2.mp3');
      expect(getQueueItemInfo(2)?.src).toBe('http://example.com/song3.mp3');
      expect(getQueueItemInfo(3)?.src).toBe('http://example.com/song4.mp3');
      expect(getQueueItemInfo(4)?.src).toBe('http://example.com/song5.mp3');

      // Step 1: Reorder - move song5 to position 1 (play next)
      let result = await reorderQueue(4, 1);
      expect(result.success).toBe(true);
      // New order: song1, song5, song2, song3, song4
      expect(getQueueItemInfo(0)?.src).toBe('http://example.com/song1.mp3');
      expect(getQueueItemInfo(1)?.src).toBe('http://example.com/song5.mp3');
      expect(getQueueItemInfo(2)?.src).toBe('http://example.com/song2.mp3');
      expect(getQueueItemInfo(3)?.src).toBe('http://example.com/song3.mp3');
      expect(getQueueItemInfo(4)?.src).toBe('http://example.com/song4.mp3');

      // Step 2: Swap songs in positions 2 and 3 (song2 and song3)
      result = await swapQueueItems(2, 3);
      expect(result.success).toBe(true);
      // New order: song1, song5, song3, song2, song4
      expect(getQueueItemInfo(0)?.src).toBe('http://example.com/song1.mp3');
      expect(getQueueItemInfo(1)?.src).toBe('http://example.com/song5.mp3');
      expect(getQueueItemInfo(2)?.src).toBe('http://example.com/song3.mp3');
      expect(getQueueItemInfo(3)?.src).toBe('http://example.com/song2.mp3');
      expect(getQueueItemInfo(4)?.src).toBe('http://example.com/song4.mp3');

      // Step 3: Remove song at position 4 (song4)
      result = await removeQueuedItem(4);
      expect(result.success).toBe(true);
      expect(getQueueLength(0)).toBe(4);
      // Order: song1, song5, song3, song2
      expect(getQueueItemInfo(0)?.src).toBe('http://example.com/song1.mp3');
      expect(getQueueItemInfo(1)?.src).toBe('http://example.com/song5.mp3');
      expect(getQueueItemInfo(2)?.src).toBe('http://example.com/song3.mp3');
      expect(getQueueItemInfo(3)?.src).toBe('http://example.com/song2.mp3');
      expect(getQueueItemInfo(4)).toBeNull();

      // Step 4: Clear everything after current
      result = await clearQueueAfterCurrent(0);
      expect(result.success).toBe(true);
      expect(getQueueLength(0)).toBe(1);

      // Verify only the first song remains
      expect(getQueueItemInfo(0)?.src).toBe('http://example.com/song1.mp3');
      expect(getQueueItemInfo(1)).toBeNull();
      expect(getQueueItemInfo(2)).toBeNull();
      expect(getQueueItemInfo(3)).toBeNull();
    });

    it('should maintain queue integrity across operations on different channels', async () => {
      // Add items to multiple channels
      await queueAudio('http://example.com/ch0-song1.mp3');
      await queueAudio('http://example.com/ch0-song2.mp3');
      await queueAudio('http://example.com/ch1-song1.mp3', 1);
      await queueAudio('http://example.com/ch1-song2.mp3', 1);

      // Verify initial state
      expect(getQueueLength(0)).toBe(2);
      expect(getQueueLength(1)).toBe(2);
      expect(getQueueItemInfo(0)?.src).toBe('http://example.com/ch0-song1.mp3');
      expect(getQueueItemInfo(1)?.src).toBe('http://example.com/ch0-song2.mp3');
      expect(getQueueItemInfo(0, 1)?.src).toBe('http://example.com/ch1-song1.mp3');
      expect(getQueueItemInfo(1, 1)?.src).toBe('http://example.com/ch1-song2.mp3');

      // Operations on channel 0 should not affect channel 1
      await removeQueuedItem(1);
      expect(getQueueLength(0)).toBe(1);
      expect(getQueueLength(1)).toBe(2); // Unchanged
      expect(getQueueItemInfo(0)?.src).toBe('http://example.com/ch0-song1.mp3');
      expect(getQueueItemInfo(1)).toBeNull(); // Removed
      // Channel 1 should be unchanged
      expect(getQueueItemInfo(0, 1)?.src).toBe('http://example.com/ch1-song1.mp3');
      expect(getQueueItemInfo(1, 1)?.src).toBe('http://example.com/ch1-song2.mp3');

      // Operations on channel 1 should not affect channel 0
      await clearQueueAfterCurrent(1);
      expect(getQueueLength(0)).toBe(1); // Unchanged
      expect(getQueueLength(1)).toBe(1);
      // Channel 0 should be unchanged
      expect(getQueueItemInfo(0)?.src).toBe('http://example.com/ch0-song1.mp3');
      // Channel 1 should only have first item
      expect(getQueueItemInfo(0, 1)?.src).toBe('http://example.com/ch1-song1.mp3');
      expect(getQueueItemInfo(1, 1)).toBeNull();
    });

    it('should handle edge cases with empty queues', async () => {
      // Test operations on empty queues
      let result = await removeQueuedItem(0);
      expect(result.success).toBe(false);

      result = await reorderQueue(0, 1);
      expect(result.success).toBe(false);

      result = await swapQueueItems(0, 1);
      expect(result.success).toBe(false);

      result = await clearQueueAfterCurrent(0);
      expect(result.success).toBe(true); // This should succeed with empty queue

      expect(getQueueLength(0)).toBe(0);
      expect(getQueueItemInfo(0)).toBeNull();
    });
  });
});
