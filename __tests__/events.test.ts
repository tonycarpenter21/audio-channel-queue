/**
 * @fileoverview Tests for event handling and emission functionality
 */

import {
  setupProgressTracking,
  emitQueueChange,
  cleanupProgressTracking,
  emitAudioStart,
  emitAudioComplete,
  emitAudioPause,
  emitAudioResume
} from '../src/events';
import { audioChannels } from '../src/info';
import { queueAudio } from '../src/core';
import { createMockAudio, toHTMLAudioElement } from './setup';
import { AudioStartInfo, AudioCompleteInfo, AudioInfo } from '../src/types';

beforeEach(() => {
  jest.clearAllMocks();
  audioChannels.length = 0;
});

describe('Event System', () => {
  describe('setupProgressTracking', () => {
    it('should set up progress tracking for audio element', async () => {
      await queueAudio('test.mp3', 0);
      const mockAudio = audioChannels[0].queue[0];

      setupProgressTracking(mockAudio, 0, audioChannels);

      expect(mockAudio.addEventListener).toHaveBeenCalledWith('timeupdate', expect.any(Function));
    });

    it('should handle audio element without errors', async () => {
      await queueAudio('test.mp3', 0);
      const mockAudio = audioChannels[0].queue[0];

      expect(() => {
        setupProgressTracking(mockAudio, 0, audioChannels);
      }).not.toThrow();
    });

    it('should handle non-existent channel gracefully', () => {
      const mockAudio = new Audio();

      expect(() => {
        setupProgressTracking(mockAudio, 99, audioChannels);
      }).not.toThrow();
    });
  });

  describe('emitQueueChange', () => {
    it('should handle missing channel gracefully', () => {
      expect(() => emitQueueChange(99, audioChannels)).not.toThrow();
    });

    it('should work with existing channels', async () => {
      await queueAudio('test.mp3', 0);
      expect(() => emitQueueChange(0, audioChannels)).not.toThrow();
    });
  });

  describe('cleanupProgressTracking', () => {
    it('should handle cleanup with valid parameters', async () => {
      await queueAudio('test.mp3', 0);
      const mockAudio = audioChannels[0].queue[0];

      expect(() => {
        cleanupProgressTracking(mockAudio, 0, audioChannels);
      }).not.toThrow();
    });

    it('should handle cleanup with non-existent channel', () => {
      const mockAudio = new Audio();

      expect(() => {
        cleanupProgressTracking(mockAudio, 99, audioChannels);
      }).not.toThrow();
    });
  });

  describe('Error handling in event callbacks', () => {
    it('should handle errors in queue change callbacks', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const errorCallback = jest.fn().mockImplementation(() => {
        throw new Error('Queue change callback error');
      });
      const workingCallback = jest.fn();

      audioChannels[0] = {
        audioCompleteCallbacks: new Set(),
        audioErrorCallbacks: new Set(),
        audioPauseCallbacks: new Set(),
        audioResumeCallbacks: new Set(),
        audioStartCallbacks: new Set(),
        isPaused: false,
        progressCallbacks: new Map(),
        queue: [],
        queueChangeCallbacks: new Set([errorCallback, workingCallback]),
        volume: 1.0
      };

      emitQueueChange(0, audioChannels);

      expect(errorCallback).toHaveBeenCalled();
      expect(workingCallback).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error in queue change callback:',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });

    it('should handle errors in audio start callbacks', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const errorCallback = jest.fn().mockImplementation(() => {
        throw new Error('Audio start callback error');
      });
      const workingCallback = jest.fn();

      audioChannels[0] = {
        audioCompleteCallbacks: new Set(),
        audioErrorCallbacks: new Set(),
        audioPauseCallbacks: new Set(),
        audioResumeCallbacks: new Set(),
        audioStartCallbacks: new Set([errorCallback, workingCallback]),
        isPaused: false,
        progressCallbacks: new Map(),
        queue: [],
        queueChangeCallbacks: new Set(),
        volume: 1.0
      };

      const audioInfo: AudioStartInfo = {
        channelNumber: 0,
        duration: 180000,
        fileName: 'test.mp3',
        src: 'test.mp3'
      };

      emitAudioStart(0, audioInfo, audioChannels);

      expect(errorCallback).toHaveBeenCalled();
      expect(workingCallback).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error in audio start callback:',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });

    it('should handle errors in audio complete callbacks', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const errorCallback = jest.fn().mockImplementation(() => {
        throw new Error('Audio complete callback error');
      });
      const workingCallback = jest.fn();

      audioChannels[0] = {
        audioCompleteCallbacks: new Set([errorCallback, workingCallback]),
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

      const audioInfo: AudioCompleteInfo = {
        channelNumber: 0,
        fileName: 'test.mp3',
        remainingInQueue: 0,
        src: 'test.mp3'
      };

      emitAudioComplete(0, audioInfo, audioChannels);

      expect(errorCallback).toHaveBeenCalled();
      expect(workingCallback).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error in audio complete callback:',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });

    it('should handle errors in audio pause callbacks', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const errorCallback = jest.fn().mockImplementation(() => {
        throw new Error('Audio pause callback error');
      });
      const workingCallback = jest.fn();

      audioChannels[0] = {
        audioCompleteCallbacks: new Set(),
        audioErrorCallbacks: new Set(),
        audioPauseCallbacks: new Set([errorCallback, workingCallback]),
        audioResumeCallbacks: new Set(),
        audioStartCallbacks: new Set(),
        isPaused: false,
        progressCallbacks: new Map(),
        queue: [],
        queueChangeCallbacks: new Set(),
        volume: 1.0
      };

      const audioInfo: AudioInfo = {
        currentTime: 30000,
        duration: 180000,
        fileName: 'test.mp3',
        isLooping: false,
        isPaused: true,
        isPlaying: false,
        progress: 0.167,
        remainingInQueue: 0,
        src: 'test.mp3',
        volume: 1.0
      };

      emitAudioPause(0, audioInfo, audioChannels);

      expect(errorCallback).toHaveBeenCalled();
      expect(workingCallback).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error in audio pause callback:',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });

    it('should handle errors in audio resume callbacks', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const errorCallback = jest.fn().mockImplementation(() => {
        throw new Error('Audio resume callback error');
      });
      const workingCallback = jest.fn();

      audioChannels[0] = {
        audioCompleteCallbacks: new Set(),
        audioErrorCallbacks: new Set(),
        audioPauseCallbacks: new Set(),
        audioResumeCallbacks: new Set([errorCallback, workingCallback]),
        audioStartCallbacks: new Set(),
        isPaused: false,
        progressCallbacks: new Map(),
        queue: [],
        queueChangeCallbacks: new Set(),
        volume: 1.0
      };

      const audioInfo: AudioInfo = {
        currentTime: 30000,
        duration: 180000,
        fileName: 'test.mp3',
        isLooping: false,
        isPaused: false,
        isPlaying: true,
        progress: 0.167,
        remainingInQueue: 0,
        src: 'test.mp3',
        volume: 1.0
      };

      emitAudioResume(0, audioInfo, audioChannels);

      expect(errorCallback).toHaveBeenCalled();
      expect(workingCallback).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error in audio resume callback:',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('setupProgressTracking edge cases', () => {
    it('should not set up tracking if already exists', () => {
      const mockAudio = toHTMLAudioElement(createMockAudio('test.mp3'));

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

      // Set up tracking first time
      setupProgressTracking(mockAudio, 0, audioChannels);

      // Clear the mock to check second call doesn't add listeners
      jest.clearAllMocks();

      // Try to set up again - should return early
      setupProgressTracking(mockAudio, 0, audioChannels);

      // Should not add more listeners since tracking already exists
      expect(mockAudio.addEventListener).not.toHaveBeenCalled();
    });
  });
});
