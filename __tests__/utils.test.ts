/**
 * @fileoverview Tests for utility functions
 */

import { extractFileName, getAudioInfoFromElement, createQueueSnapshot, cleanWebpackFilename } from '../src/utils';
import { MockAudioElement } from './setup';
import { AudioInfo, ExtendedAudioQueueChannel } from '../src/types';

describe('Utility Functions', () => {
  describe('extractFileName', () => {
    it('should extract filename from full URL', () => {
      const fileName: string = extractFileName('https://example.com/audio/song.mp3');
      expect(fileName).toBe('song.mp3');
    });

    it('should extract filename from relative path', () => {
      const fileName: string = extractFileName('./sounds/notification.wav');
      expect(fileName).toBe('notification.wav');
    });

    it('should extract filename from absolute path', () => {
      const fileName: string = extractFileName('/home/user/music/track.flac');
      expect(fileName).toBe('track.flac');
    });

    it('should handle URL with query parameters', () => {
      const fileName: string = extractFileName('https://example.com/audio/song.mp3?version=1&quality=high');
      expect(fileName).toBe('song.mp3');
    });

    it('should handle URL with hash', () => {
      const fileName: string = extractFileName('https://example.com/audio/song.mp3#timestamp=30');
      expect(fileName).toBe('song.mp3');
    });

    it('should return "unknown" for invalid URLs', () => {
      const fileName: string = extractFileName('invalid-url');
      expect(fileName).toBe('invalid-url');
    });

    it('should return "unknown" for empty path', () => {
      const fileName: string = extractFileName('https://example.com/');
      expect(fileName).toBe('unknown');
    });

    it('should handle URLs without protocol', () => {
      const fileName: string = extractFileName('example.com/music/song.mp3');
      expect(fileName).toBe('song.mp3');
    });

    it('should handle file URLs', () => {
      const fileName: string = extractFileName('file:///C:/Users/music/song.mp3');
      expect(fileName).toBe('song.mp3');
    });
  });

  describe('getAudioInfoFromElement', () => {
    it('should return null for null audio element', () => {
      const info: AudioInfo | null = getAudioInfoFromElement(null as any);
      expect(info).toBeNull();
    });

    it('should return null for undefined audio element', () => {
      const info: AudioInfo | null = getAudioInfoFromElement(undefined as any);
      expect(info).toBeNull();
    });

    it('should extract complete audio info from audio element', () => {
      const mockAudio: MockAudioElement = new MockAudioElement('https://example.com/song.mp3');
      mockAudio.duration = 180; // 3 minutes
      mockAudio.currentTime = 60; // 1 minute
      mockAudio.paused = false;
      mockAudio.ended = false;
      mockAudio.readyState = 4;

      const info: AudioInfo | null = getAudioInfoFromElement(mockAudio as any);

      expect(info).toEqual({
        currentTime: 60000, // Converted to milliseconds
        duration: 180000, // Converted to milliseconds
        fileName: 'song.mp3',
        isLooping: false,
        isPaused: false,
        isPlaying: true,
        progress: 0.3333333333333333,
        remainingInQueue: 0,
        src: 'https://example.com/song.mp3',
        volume: 1
      });
    });

    it('should handle NaN duration gracefully', () => {
      const mockAudio = new MockAudioElement('test.mp3');
      mockAudio.duration = NaN;
      mockAudio.currentTime = 30;

      const info = getAudioInfoFromElement(mockAudio as any);

      expect(info?.duration).toBe(0);
      expect(info?.currentTime).toBe(30000);
      expect(info?.progress).toBe(0);
    });

    it('should handle NaN currentTime gracefully', () => {
      const mockAudio = new MockAudioElement('test.mp3');
      mockAudio.duration = 120;
      mockAudio.currentTime = NaN;

      const info = getAudioInfoFromElement(mockAudio as any);

      expect(info?.duration).toBe(120000);
      expect(info?.currentTime).toBe(0);
      expect(info?.progress).toBe(0);
    });

    it('should detect paused audio correctly', () => {
      const mockAudio = new MockAudioElement('test.mp3');
      mockAudio.paused = true;
      mockAudio.ended = false;
      mockAudio.readyState = 4;

      const info = getAudioInfoFromElement(mockAudio as any);

      expect(info?.isPlaying).toBe(false);
    });

    it('should detect ended audio correctly', () => {
      const mockAudio = new MockAudioElement('test.mp3');
      mockAudio.paused = false;
      mockAudio.ended = true;
      mockAudio.readyState = 4;

      const info = getAudioInfoFromElement(mockAudio as any);

      expect(info?.isPlaying).toBe(false);
    });

    it('should detect loading audio correctly', () => {
      const mockAudio = new MockAudioElement('test.mp3');
      mockAudio.paused = false;
      mockAudio.ended = false;
      mockAudio.readyState = 2; // HAVE_CURRENT_DATA, not enough to play

      const info = getAudioInfoFromElement(mockAudio as any);

      expect(info?.isPlaying).toBe(false);
    });

    it('should cap progress at 1.0', () => {
      const mockAudio = new MockAudioElement('test.mp3');
      mockAudio.duration = 100;
      mockAudio.currentTime = 150; // More than duration

      const info = getAudioInfoFromElement(mockAudio as any);

      expect(info?.progress).toBe(1);
    });

    it('should handle zero duration', () => {
      const mockAudio = new MockAudioElement('test.mp3');
      mockAudio.duration = 0;
      mockAudio.currentTime = 30;

      const info = getAudioInfoFromElement(mockAudio as any);

      expect(info?.progress).toBe(0);
    });
  });

  describe('createQueueSnapshot', () => {
    it('should return null for non-existent channel', () => {
      const channels: ExtendedAudioQueueChannel[] = [];
      const snapshot = createQueueSnapshot(0, channels);
      expect(snapshot).toBeNull();
    });

    it('should create snapshot for empty queue', () => {
      const channels: ExtendedAudioQueueChannel[] = [{
        queue: [],
        audioCompleteCallbacks: new Set(),
        audioErrorCallbacks: new Set(),
        audioStartCallbacks: new Set(),
        audioPauseCallbacks: new Set(),
        audioResumeCallbacks: new Set(),
        isPaused: false,
        progressCallbacks: new Map(),
        queueChangeCallbacks: new Set(),
        volume: 1.0
      }];

      const snapshot = createQueueSnapshot(0, channels);

      expect(snapshot).toEqual({
        channelNumber: 0,
        currentIndex: 0,
        isPaused: false,
        items: [],
        totalItems: 0,
        volume: 1.0
      });
    });

    it('should create snapshot with multiple items', () => {
      const mockAudio1 = new MockAudioElement('song1.mp3');
      const mockAudio2 = new MockAudioElement('song2.mp3');
      const mockAudio3 = new MockAudioElement('song3.mp3');
      
      mockAudio1.duration = 180;
      mockAudio2.duration = 240;
      mockAudio3.duration = 200;
      
      mockAudio1.paused = false; // Currently playing
      mockAudio1.ended = false;

      const channels: ExtendedAudioQueueChannel[] = [{
        queue: [mockAudio1 as any, mockAudio2 as any, mockAudio3 as any],
        audioCompleteCallbacks: new Set(),
        audioErrorCallbacks: new Set(),
        audioStartCallbacks: new Set(),
        audioPauseCallbacks: new Set(),
        audioResumeCallbacks: new Set(),
        isPaused: false,
        progressCallbacks: new Map(),
        queueChangeCallbacks: new Set(),
        volume: 1.0
      }];

      const snapshot = createQueueSnapshot(0, channels);

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

    it('should handle NaN durations gracefully', () => {
      const mockAudio = new MockAudioElement('test.mp3');
      mockAudio.duration = NaN;

      const channels: ExtendedAudioQueueChannel[] = [{
        queue: [mockAudio as any],
        audioCompleteCallbacks: new Set(),
        audioErrorCallbacks: new Set(),
        audioStartCallbacks: new Set(),
        audioPauseCallbacks: new Set(),
        audioResumeCallbacks: new Set(),
        isPaused: false,
        progressCallbacks: new Map(),
        queueChangeCallbacks: new Set(),
        volume: 1.0
      }];

      const snapshot = createQueueSnapshot(0, channels);

      expect(snapshot?.items[0].duration).toBe(0);
    });

    it('should correctly identify currently playing audio', () => {
      const mockAudio1 = new MockAudioElement('song1.mp3');
      const mockAudio2 = new MockAudioElement('song2.mp3');
      
      // First audio is paused
      mockAudio1.paused = true;
      mockAudio1.ended = false;
      
      // Second audio should not be playing (only first can be)
      mockAudio2.paused = false;
      mockAudio2.ended = false;

      const channels: ExtendedAudioQueueChannel[] = [{
        queue: [mockAudio1 as any, mockAudio2 as any],
        audioCompleteCallbacks: new Set(),
        audioErrorCallbacks: new Set(),
        audioStartCallbacks: new Set(),
        audioPauseCallbacks: new Set(),
        audioResumeCallbacks: new Set(),
        isPaused: false,
        progressCallbacks: new Map(),
        queueChangeCallbacks: new Set(),
        volume: 1.0
      }];

      const snapshot = createQueueSnapshot(0, channels);

      expect(snapshot?.items[0].isCurrentlyPlaying).toBe(false);
      expect(snapshot?.items[1].isCurrentlyPlaying).toBe(false); // Only index 0 can be playing
    });
  });

  describe('cleanWebpackFilename', () => {
    it('should remove webpack hash from standard filenames', () => {
      const cleanName: string = cleanWebpackFilename('song.a1b2c3d4.mp3');
      expect(cleanName).toBe('song.mp3');
    });

    it('should remove long webpack hashes', () => {
      const cleanName: string = cleanWebpackFilename('notification.1a2b3c4d5e6f7890.wav');
      expect(cleanName).toBe('notification.wav');
    });

    it('should handle different file extensions', () => {
      const mp3: string = cleanWebpackFilename('music.12345678.mp3');
      const wav: string = cleanWebpackFilename('sound.abcdef12.wav');
      const ogg: string = cleanWebpackFilename('audio.87654321.ogg');
      
      expect(mp3).toBe('music.mp3');
      expect(wav).toBe('sound.wav');
      expect(ogg).toBe('audio.ogg');
    });

    it('should handle case-insensitive hashes', () => {
      const lower: string = cleanWebpackFilename('track.abcdef12.mp3');
      const upper: string = cleanWebpackFilename('track.ABCDEF12.mp3');
      const mixed: string = cleanWebpackFilename('track.AbCdEf12.mp3');
      
      expect(lower).toBe('track.mp3');
      expect(upper).toBe('track.mp3');
      expect(mixed).toBe('track.mp3');
    });

    it('should not modify filenames without webpack hashes', () => {
      const cleanName: string = cleanWebpackFilename('clean-file.mp3');
      expect(cleanName).toBe('clean-file.mp3');
    });

    it('should not modify filenames with short potential hashes', () => {
      const shortHash: string = cleanWebpackFilename('file.abc.mp3');
      expect(shortHash).toBe('file.abc.mp3'); // Too short to be webpack hash
    });

    it('should handle filenames with multiple dots', () => {
      const multiDot: string = cleanWebpackFilename('my.song.title.a1b2c3d4.mp3');
      expect(multiDot).toBe('my.song.title.mp3');
    });

    it('should handle edge cases', () => {
      const empty: string = cleanWebpackFilename('');
      const noDots: string = cleanWebpackFilename('filename');
      const justHash: string = cleanWebpackFilename('a1b2c3d4.mp3');
      
      expect(empty).toBe('');
      expect(noDots).toBe('filename');
      expect(justHash).toBe('a1b2c3d4.mp3'); // No pattern match without prefix
    });

    it('should handle exact 8-character hashes', () => {
      const exactEight: string = cleanWebpackFilename('file.12345678.mp3');
      expect(exactEight).toBe('file.mp3');
    });

    it('should handle very long hashes', () => {
      const longHash: string = cleanWebpackFilename('file.1234567890abcdef1234567890abcdef.mp3');
      expect(longHash).toBe('file.mp3');
    });
  });
}); 