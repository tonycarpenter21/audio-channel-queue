/**
 * @fileoverview Queue manipulation functions for the audioq package
 * Provides advanced queue management including item removal, reordering, and clearing
 */
import { QueueManipulationResult, QueueItem } from './types';
/**
 * Removes a specific item from the queue by its slot number (0-based index)
 * Cannot remove the currently playing item (index 0) - use stopCurrentAudioInChannel instead
 * @param queuedSlotNumber - Zero-based index of the item to remove (must be > 0)
 * @param channelNumber - The channel number (defaults to 0)
 * @returns Promise resolving to operation result with success status and updated queue
 * @throws Error if trying to remove currently playing item or invalid slot number
 * @example
 * ```typescript
 * // Remove the second item in queue (index 1)
 * const result = await removeQueuedItem(1, 0);
 * if (result.success) {
 *   console.log(`Removed item, queue now has ${result.updatedQueue.totalItems} items`);
 * }
 *
 * // Remove the third item from channel 1
 * await removeQueuedItem(2, 1);
 * ```
 */
export declare const removeQueuedItem: (queuedSlotNumber: number, channelNumber?: number) => Promise<QueueManipulationResult>;
/**
 * Reorders a queue item by moving it from one position to another
 * Cannot reorder the currently playing item (index 0)
 * @param currentQueuedSlotNumber - Current zero-based index of the item to move (must be > 0)
 * @param newQueuedSlotNumber - New zero-based index where the item should be placed (must be > 0)
 * @param channelNumber - The channel number (defaults to 0)
 * @returns Promise resolving to operation result with success status and updated queue
 * @throws Error if trying to reorder currently playing item or invalid slot numbers
 * @example
 * ```typescript
 * // Move item from position 2 to position 1 (make it play next)
 * const result = await reorderQueue(2, 1, 0);
 * if (result.success) {
 *   console.log('Item moved successfully');
 * }
 *
 * // Move item from position 1 to end of queue
 * await reorderQueue(1, 4, 0); // Assuming queue has 5+ items
 * ```
 */
export declare const reorderQueue: (currentQueuedSlotNumber: number, newQueuedSlotNumber: number, channelNumber?: number) => Promise<QueueManipulationResult>;
/**
 * Clears all queued audio items after the currently playing item
 * The current audio will continue playing but nothing will follow it
 * @param channelNumber - The channel number (defaults to 0)
 * @returns Promise resolving to operation result with success status and updated queue
 * @example
 * ```typescript
 * // Let current song finish but clear everything after it
 * const result = await clearQueueAfterCurrent(0);
 * if (result.success) {
 *   console.log(`Cleared queue, current audio will be the last to play`);
 * }
 * ```
 */
export declare const clearQueueAfterCurrent: (channelNumber?: number) => Promise<QueueManipulationResult>;
/**
 * Gets information about a specific queue item by its slot number
 * @param queueSlotNumber - Zero-based index of the queue item
 * @param channelNumber - The channel number (defaults to 0)
 * @returns QueueItem information or null if slot doesn't exist
 * @example
 * ```typescript
 * const itemInfo = getQueueItemInfo(1, 0);
 * if (itemInfo) {
 *   console.log(`Next to play: ${itemInfo.fileName}`);
 *   console.log(`Duration: ${itemInfo.duration}ms`);
 * }
 * ```
 */
export declare const getQueueItemInfo: (queueSlotNumber: number, channelNumber?: number) => QueueItem | null;
/**
 * Gets the current queue length for a specific channel
 * @param channelNumber - The channel number (defaults to 0)
 * @returns Number of items in the queue, or 0 if channel doesn't exist
 * @example
 * ```typescript
 * const queueSize = getQueueLength(0);
 * console.log(`Channel 0 has ${queueSize} items in queue`);
 * ```
 */
export declare const getQueueLength: (channelNumber?: number) => number;
/**
 * Swaps the positions of two queue items
 * Cannot swap with the currently playing item (index 0)
 * @param slotA - Zero-based index of first item to swap (must be > 0)
 * @param slotB - Zero-based index of second item to swap (must be > 0)
 * @param channelNumber - The channel number (defaults to 0)
 * @returns Promise resolving to operation result with success status and updated queue
 * @example
 * ```typescript
 * // Swap the second and third items in queue
 * const result = await swapQueueItems(1, 2, 0);
 * if (result.success) {
 *   console.log('Items swapped successfully');
 * }
 * ```
 */
export declare const swapQueueItems: (slotA: number, slotB: number, channelNumber?: number) => Promise<QueueManipulationResult>;
