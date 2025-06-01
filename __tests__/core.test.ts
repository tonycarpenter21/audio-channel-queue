/**
 * @fileoverview Tests for core queue management functions
 */

import { 
  queueAudio, 
  playAudioQueue, 
  stopCurrentAudioInChannel,
  stopAllAudioInChannel,
  stopAllAudio
} from '../src/core';
import { audioChannels } from '../src/info';
import { MockAudioElement, waitForPromises } from './setup';

// Clear modules before each test to reset state
beforeEach(() => {
  jest.clearAllMocks();
  // Reset audio channels
  audioChannels.length = 0;
});

describe('Core Queue Management', () => {
  describe('queueAudio', () => {
    it('should create a new audio channel if it doesn\'t exist', async () => {
      await queueAudio('test.mp3');
      
      expect(audioChannels[0]).toBeDefined();
      expect(audioChannels[0].queue).toHaveLength(1);
      expect(audioChannels[0].queue[0].src).toBe('test.mp3');
    });

    it('should add audio to an existing channel', async () => {
      await queueAudio('test1.mp3');
      await queueAudio('test2.mp3');
      
      expect(audioChannels[0].queue).toHaveLength(2);
      expect(audioChannels[0].queue[0].src).toBe('test1.mp3');
      expect(audioChannels[0].queue[1].src).toBe('test2.mp3');
    });

    it('should use the specified channel number', async () => {
      await queueAudio('test.mp3', 1);
      
      expect(audioChannels[1]).toBeDefined();
      expect(audioChannels[1].queue).toHaveLength(1);
      expect(audioChannels[1].queue[0].src).toBe('test.mp3');
    });

    it('should start playing if it\'s the first audio in the queue', async () => {
      await queueAudio('test.mp3');
      
      const audioElement = audioChannels[0].queue[0] as unknown as MockAudioElement;
      expect(audioElement.play).toHaveBeenCalled();
    });

    it('should not start playing if it\'s not the first audio in the queue', async () => {
      await queueAudio('test1.mp3');
      await queueAudio('test2.mp3');
      
      const secondAudio = audioChannels[0].queue[1] as unknown as MockAudioElement;
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
      
      const audioElement = audioChannels[0].queue[0] as unknown as MockAudioElement;
      expect(audioElement.play).toHaveBeenCalled();
    });

    it('should do nothing if queue is empty', async () => {
      audioChannels[0] = { 
        queue: [],
        audioCompleteCallbacks: new Set(),
        audioStartCallbacks: new Set(),
        progressCallbacks: new Map(),
        queueChangeCallbacks: new Set()
      };
      
      await playAudioQueue(0);
      // Should not throw and should complete normally
    });

    it('should automatically play next audio when current ends', async () => {
      await queueAudio('test1.mp3');
      await queueAudio('test2.mp3');
      
      const firstAudio = audioChannels[0].queue[0] as unknown as MockAudioElement;
      const secondAudio = audioChannels[0].queue[1] as unknown as MockAudioElement;
      
      // Simulate first audio ending
      firstAudio.simulateEnded();
      await waitForPromises();
      
      expect(audioChannels[0].queue).toHaveLength(1);
      expect(audioChannels[0].queue[0]).toBe(secondAudio);
      expect(secondAudio.play).toHaveBeenCalled();
    });
  });

  describe('stopCurrentAudioInChannel', () => {
    it('should pause the current audio and remove it from the queue', async () => {
      await queueAudio('test1.mp3');
      await queueAudio('test2.mp3');
      
      const firstAudio = audioChannels[0].queue[0] as unknown as MockAudioElement;
      const secondAudio = audioChannels[0].queue[1] as unknown as MockAudioElement;
      
      stopCurrentAudioInChannel(0);
      
      expect(firstAudio.pause).toHaveBeenCalled();
      expect(audioChannels[0].queue).toHaveLength(1);
      expect(audioChannels[0].queue[0]).toBe(secondAudio);
    });

    it('should start playing the next audio after stopping current', async () => {
      await queueAudio('test1.mp3');
      await queueAudio('test2.mp3');
      
      const secondAudio = audioChannels[0].queue[1] as unknown as MockAudioElement;
      jest.clearAllMocks(); // Clear the initial play calls
      
      stopCurrentAudioInChannel(0);
      
      expect(secondAudio.play).toHaveBeenCalled();
    });

    it('should do nothing if the channel is empty', () => {
      expect(() => stopCurrentAudioInChannel(0)).not.toThrow();
    });

    it('should work with default channel parameter', async () => {
      await queueAudio('test.mp3');
      
      const audio = audioChannels[0].queue[0] as unknown as MockAudioElement;
      
      stopCurrentAudioInChannel(); // No channel specified, should default to 0
      
      expect(audio.pause).toHaveBeenCalled();
      expect(audioChannels[0].queue).toHaveLength(0);
    });
  });

  describe('stopAllAudioInChannel', () => {
    it('should pause the current audio and clear the entire queue', async () => {
      await queueAudio('test1.mp3');
      await queueAudio('test2.mp3');
      await queueAudio('test3.mp3');
      
      const firstAudio = audioChannels[0].queue[0] as unknown as MockAudioElement;
      
      stopAllAudioInChannel(0);
      
      expect(firstAudio.pause).toHaveBeenCalled();
      expect(audioChannels[0].queue).toHaveLength(0);
    });

    it('should do nothing if the channel is empty', () => {
      expect(() => stopAllAudioInChannel(0)).not.toThrow();
    });

    it('should work with default channel parameter', async () => {
      await queueAudio('test.mp3');
      
      const audio = audioChannels[0].queue[0] as unknown as MockAudioElement;
      
      stopAllAudioInChannel(); // No channel specified, should default to 0
      
      expect(audio.pause).toHaveBeenCalled();
      expect(audioChannels[0].queue).toHaveLength(0);
    });
  });

  describe('stopAllAudio', () => {
    it('should stop all audio in all channels', async () => {
      await queueAudio('test1.mp3', 0);
      await queueAudio('test2.mp3', 1);
      await queueAudio('test3.mp3', 2);
      
      const audio1 = audioChannels[0].queue[0] as unknown as MockAudioElement;
      const audio2 = audioChannels[1].queue[0] as unknown as MockAudioElement;
      const audio3 = audioChannels[2].queue[0] as unknown as MockAudioElement;
      
      stopAllAudio();
      
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
      
      stopAllAudio();
      
      expect(audioChannels[0].queue).toHaveLength(0);
      expect(audioChannels[1].queue).toHaveLength(0);
    });

    it('should do nothing if all channels are empty', () => {
      expect(() => stopAllAudio()).not.toThrow();
    });
  });
}); 