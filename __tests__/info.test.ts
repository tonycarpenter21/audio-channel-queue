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
  audioChannels
} from '../src/info';
import { queueAudio } from '../src/core';
import { MockAudioElement, mockCallback, waitForPromises } from './setup';
import { 
  AudioInfo, 
  QueueSnapshot, 
  AudioStartInfo, 
  AudioCompleteInfo 
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
        queue: [],
        audioCompleteCallbacks: new Set(),
        audioStartCallbacks: new Set(),
        progressCallbacks: new Map(),
        queueChangeCallbacks: new Set()
      };
      
      const info = getCurrentAudioInfo(0);
      expect(info).toBeNull();
    });

    it('should return audio info for currently playing audio', async () => {
      await queueAudio('test-song.mp3');
      
      const mockAudio = audioChannels[0].queue[0] as unknown as MockAudioElement;
      mockAudio.duration = 180; // 3 minutes
      mockAudio.currentTime = 60; // 1 minute
      mockAudio.paused = false;
      
      const info = getCurrentAudioInfo(0);
      
      expect(info).toEqual({
        currentTime: 60000, // Converted to milliseconds
        duration: 180000, // Converted to milliseconds
        fileName: 'test-song.mp3',
        isPlaying: true,
        progress: 1/3, // 60/180
        src: 'test-song.mp3'
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
      
      const mockAudio = audioChannels[0].queue[0] as unknown as MockAudioElement;
      mockAudio.duration = NaN;
      mockAudio.currentTime = NaN;
      
      const info = getCurrentAudioInfo(0);
      
      expect(info?.duration).toBe(0);
      expect(info?.currentTime).toBe(0);
      expect(info?.progress).toBe(0);
    });
  });

  describe('getAllChannelsInfo', () => {
    it('should return empty array when no channels exist', () => {
      const allInfo = getAllChannelsInfo();
      expect(allInfo).toEqual([]);
    });

    it('should return array with nulls for empty channels and info for active channels', async () => {
      await queueAudio('test1.mp3', 0);
      await queueAudio('test2.mp3', 2);
      
      // Create empty channel 1
      audioChannels[1] = {
        queue: [],
        audioCompleteCallbacks: new Set(),
        audioStartCallbacks: new Set(),
        progressCallbacks: new Map(),
        queueChangeCallbacks: new Set()
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
        totalItems: 3,
        items: [
          {
            duration: 180000,
            fileName: 'song1.mp3',
            isCurrentlyPlaying: true,
            src: 'song1.mp3'
          },
          {
            duration: 240000,
            fileName: 'song2.mp3',
            isCurrentlyPlaying: false,
            src: 'song2.mp3'
          },
          {
            duration: 200000,
            fileName: 'song3.mp3',
            isCurrentlyPlaying: false,
            src: 'song3.mp3'
          }
        ]
      });
    });

    it('should handle empty queue', async () => {
      audioChannels[0] = {
        queue: [],
        audioCompleteCallbacks: new Set(),
        audioStartCallbacks: new Set(),
        progressCallbacks: new Map(),
        queueChangeCallbacks: new Set()
      };
      
      const snapshot = getQueueSnapshot(0);
      
      expect(snapshot).toEqual({
        channelNumber: 0,
        currentIndex: 0,
        totalItems: 0,
        items: []
      });
    });
  });
});

describe('Audio Progress Tracking', () => {
  describe('onAudioProgress', () => {
    it('should create channel if it doesn\'t exist', () => {
      const callback = mockCallback<(info: AudioInfo) => void>();
      
      onAudioProgress(0, callback);
      
      expect(audioChannels[0]).toBeDefined();
      expect(audioChannels[0].progressCallbacks).toBeDefined();
    });

    it('should add callback for current audio', async () => {
      await queueAudio('test.mp3');
      const callback = mockCallback<(info: AudioInfo) => void>();
      
      onAudioProgress(0, callback);
      
      const mockAudio = audioChannels[0].queue[0] as unknown as MockAudioElement;
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
      
      const mockAudio = audioChannels[0].queue[0] as unknown as MockAudioElement;
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
      
      const mockAudio = audioChannels[0].queue[0] as unknown as MockAudioElement;
      mockAudio.simulateTimeUpdate(15);
      
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('offAudioProgress', () => {
    it('should clear all progress callbacks for a channel', async () => {
      await queueAudio('test.mp3');
      const callback = mockCallback<(info: AudioInfo) => void>();
      
      onAudioProgress(0, callback);
      offAudioProgress(0);
      
      const mockAudio = audioChannels[0].queue[0] as unknown as MockAudioElement;
      mockAudio.simulateTimeUpdate(30);
      
      expect(callback).not.toHaveBeenCalled();
    });

    it('should handle non-existent channel gracefully', () => {
      expect(() => offAudioProgress(99)).not.toThrow();
    });
  });
});

describe('Queue Change Events', () => {
  describe('onQueueChange', () => {
    it('should create channel if it doesn\'t exist', () => {
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
  });
});

describe('Audio Lifecycle Events', () => {
  describe('onAudioStart', () => {
    it('should trigger callback when audio starts', async () => {
      const callback = mockCallback<(info: AudioStartInfo) => void>();
      onAudioStart(0, callback);
      
      await queueAudio('test-song.mp3');
      
      const mockAudio = audioChannels[0].queue[0] as unknown as MockAudioElement;
      mockAudio.simulateLoadedMetadata();
      
      expect(callback).toHaveBeenCalled();
      const startInfo = callback.mock.calls[0][0];
      expect(startInfo.fileName).toBe('test-song.mp3');
      expect(startInfo.channelNumber).toBe(0);
    });
  });

  describe('onAudioComplete', () => {
    it('should trigger callback when audio completes', async () => {
      const callback = mockCallback<(info: AudioCompleteInfo) => void>();
      onAudioComplete(0, callback);
      
      await queueAudio('test1.mp3');
      await queueAudio('test2.mp3');
      
      const mockAudio = audioChannels[0].queue[0] as unknown as MockAudioElement;
      mockAudio.simulateEnded();
      await waitForPromises();
      
      expect(callback).toHaveBeenCalled();
      const completeInfo = callback.mock.calls[0][0];
      expect(completeInfo.fileName).toBe('test1.mp3');
      expect(completeInfo.remainingInQueue).toBe(1);
    });
  });
}); 