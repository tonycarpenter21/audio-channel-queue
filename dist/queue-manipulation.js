"use strict";
/**
 * @fileoverview Queue manipulation functions for the audioq package
 * Provides advanced queue management including item removal, reordering, and clearing
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.swapQueueItems = exports.getQueueLength = exports.getQueueItemInfo = exports.clearQueueAfterCurrent = exports.reorderQueue = exports.removeQueuedItem = void 0;
const info_1 = require("./info");
const events_1 = require("./events");
const events_2 = require("./events");
const utils_1 = require("./utils");
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
const removeQueuedItem = (queuedSlotNumber_1, ...args_1) => __awaiter(void 0, [queuedSlotNumber_1, ...args_1], void 0, function* (queuedSlotNumber, channelNumber = 0) {
    const channel = info_1.audioChannels[channelNumber];
    if (!channel) {
        return {
            error: `Channel ${channelNumber} does not exist`,
            success: false
        };
    }
    if (queuedSlotNumber < 0 || queuedSlotNumber >= channel.queue.length) {
        return {
            error: `Invalid slot number ${queuedSlotNumber}. Queue has ${channel.queue.length} items ` +
                `(indices 0-${channel.queue.length - 1})`,
            success: false
        };
    }
    if (queuedSlotNumber === 0) {
        return {
            error: 'Cannot remove currently playing item (index 0). ' +
                'Use stopCurrentAudioInChannel() instead',
            success: false
        };
    }
    // Remove the audio element from the queue
    const removedAudio = channel.queue.splice(queuedSlotNumber, 1)[0];
    // Clean up any progress tracking for the removed audio
    (0, events_2.cleanupProgressTracking)(removedAudio, channelNumber, info_1.audioChannels);
    // Emit queue change event
    (0, events_1.emitQueueChange)(channelNumber, info_1.audioChannels);
    const updatedQueue = (0, utils_1.createQueueSnapshot)(channelNumber, info_1.audioChannels);
    return {
        success: true,
        updatedQueue: updatedQueue !== null && updatedQueue !== void 0 ? updatedQueue : undefined
    };
});
exports.removeQueuedItem = removeQueuedItem;
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
const reorderQueue = (currentQueuedSlotNumber_1, newQueuedSlotNumber_1, ...args_1) => __awaiter(void 0, [currentQueuedSlotNumber_1, newQueuedSlotNumber_1, ...args_1], void 0, function* (currentQueuedSlotNumber, newQueuedSlotNumber, channelNumber = 0) {
    const channel = info_1.audioChannels[channelNumber];
    if (!channel) {
        return {
            error: `Channel ${channelNumber} does not exist`,
            success: false
        };
    }
    if (currentQueuedSlotNumber < 0 || currentQueuedSlotNumber >= channel.queue.length) {
        return {
            error: `Invalid current slot number ${currentQueuedSlotNumber}. Queue has ` +
                `${channel.queue.length} items (indices 0-${channel.queue.length - 1})`,
            success: false
        };
    }
    if (newQueuedSlotNumber < 0 || newQueuedSlotNumber >= channel.queue.length) {
        return {
            error: `Invalid new slot number ${newQueuedSlotNumber}. Queue has ` +
                `${channel.queue.length} items (indices 0-${channel.queue.length - 1})`,
            success: false
        };
    }
    if (currentQueuedSlotNumber === 0) {
        return {
            error: 'Cannot reorder currently playing item (index 0). ' + 'Stop current audio first if needed',
            success: false
        };
    }
    if (newQueuedSlotNumber === 0) {
        return {
            error: 'Cannot move item to currently playing position (index 0). ' +
                'Use queueAudioPriority() to add items to front of queue',
            success: false
        };
    }
    if (currentQueuedSlotNumber === newQueuedSlotNumber) {
        // No change needed, but return success
        const updatedQueue = (0, utils_1.createQueueSnapshot)(channelNumber, info_1.audioChannels);
        return {
            success: true,
            updatedQueue: updatedQueue !== null && updatedQueue !== void 0 ? updatedQueue : undefined
        };
    }
    // Remove the item from its current position
    const audioToMove = channel.queue.splice(currentQueuedSlotNumber, 1)[0];
    // Insert it at the new position
    channel.queue.splice(newQueuedSlotNumber, 0, audioToMove);
    // Emit queue change event
    (0, events_1.emitQueueChange)(channelNumber, info_1.audioChannels);
    const updatedQueue = (0, utils_1.createQueueSnapshot)(channelNumber, info_1.audioChannels);
    return {
        success: true,
        updatedQueue: updatedQueue !== null && updatedQueue !== void 0 ? updatedQueue : undefined
    };
});
exports.reorderQueue = reorderQueue;
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
const clearQueueAfterCurrent = (...args_1) => __awaiter(void 0, [...args_1], void 0, function* (channelNumber = 0) {
    const channel = info_1.audioChannels[channelNumber];
    if (!channel) {
        // For empty/non-existent channels, we can consider this a successful no-op
        // since there's nothing to clear anyway
        return {
            success: true,
            updatedQueue: {
                channelNumber,
                currentIndex: -1,
                isPaused: false,
                items: [],
                totalItems: 0,
                volume: 1.0
            }
        };
    }
    if (channel.queue.length <= 1) {
        // Nothing to clear - either empty queue or only current audio
        const updatedQueue = (0, utils_1.createQueueSnapshot)(channelNumber, info_1.audioChannels);
        return {
            success: true,
            updatedQueue: updatedQueue !== null && updatedQueue !== void 0 ? updatedQueue : undefined
        };
    }
    // Clean up progress tracking for all items except the current one
    for (let i = 1; i < channel.queue.length; i++) {
        (0, events_2.cleanupProgressTracking)(channel.queue[i], channelNumber, info_1.audioChannels);
    }
    // Keep only the currently playing audio (index 0)
    channel.queue = channel.queue.slice(0, 1);
    // Emit queue change event
    (0, events_1.emitQueueChange)(channelNumber, info_1.audioChannels);
    const updatedQueue = (0, utils_1.createQueueSnapshot)(channelNumber, info_1.audioChannels);
    return {
        success: true,
        updatedQueue: updatedQueue !== null && updatedQueue !== void 0 ? updatedQueue : undefined
    };
});
exports.clearQueueAfterCurrent = clearQueueAfterCurrent;
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
const getQueueItemInfo = (queueSlotNumber, channelNumber = 0) => {
    const channel = info_1.audioChannels[channelNumber];
    if (!channel || queueSlotNumber < 0 || queueSlotNumber >= channel.queue.length) {
        return null;
    }
    const audio = channel.queue[queueSlotNumber];
    const audioInfo = (0, utils_1.getAudioInfoFromElement)(audio, channelNumber, info_1.audioChannels);
    if (!audioInfo) {
        return null;
    }
    const { duration, fileName, isLooping, isPlaying, src, volume } = audioInfo;
    return {
        duration,
        fileName,
        isCurrentlyPlaying: queueSlotNumber === 0 && isPlaying,
        isLooping,
        src,
        volume
    };
};
exports.getQueueItemInfo = getQueueItemInfo;
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
const getQueueLength = (channelNumber = 0) => {
    const channel = info_1.audioChannels[channelNumber];
    return channel ? channel.queue.length : 0;
};
exports.getQueueLength = getQueueLength;
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
const swapQueueItems = (slotA_1, slotB_1, ...args_1) => __awaiter(void 0, [slotA_1, slotB_1, ...args_1], void 0, function* (slotA, slotB, channelNumber = 0) {
    const channel = info_1.audioChannels[channelNumber];
    if (!channel) {
        return {
            error: `Channel ${channelNumber} does not exist`,
            success: false
        };
    }
    if (slotA < 0 || slotA >= channel.queue.length) {
        return {
            error: `Invalid slot A ${slotA}. Queue has ${channel.queue.length} items ` +
                `(indices 0-${channel.queue.length - 1})`,
            success: false
        };
    }
    if (slotB < 0 || slotB >= channel.queue.length) {
        return {
            error: `Invalid slot B ${slotB}. Queue has ${channel.queue.length} items ` +
                `(indices 0-${channel.queue.length - 1})`,
            success: false
        };
    }
    if (slotA === 0 || slotB === 0) {
        return {
            error: 'Cannot swap with currently playing item (index 0)',
            success: false
        };
    }
    if (slotA === slotB) {
        // No change needed, but return success
        const updatedQueue = (0, utils_1.createQueueSnapshot)(channelNumber, info_1.audioChannels);
        return {
            success: true,
            updatedQueue: updatedQueue !== null && updatedQueue !== void 0 ? updatedQueue : undefined
        };
    }
    // Swap the audio elements
    const temp = channel.queue[slotA];
    channel.queue[slotA] = channel.queue[slotB];
    channel.queue[slotB] = temp;
    // Emit queue change event
    (0, events_1.emitQueueChange)(channelNumber, info_1.audioChannels);
    const updatedQueue = (0, utils_1.createQueueSnapshot)(channelNumber, info_1.audioChannels);
    return {
        success: true,
        updatedQueue: updatedQueue !== null && updatedQueue !== void 0 ? updatedQueue : undefined
    };
});
exports.swapQueueItems = swapQueueItems;
