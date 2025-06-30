/**
 * @fileoverview Tests for utility functions
 */

import {
  extractFileName,
  getAudioInfoFromElement,
  createQueueSnapshot,
  cleanWebpackFilename,
  validateAudioUrl,
  sanitizeForDisplay
} from '../src/utils';
import { MockAudioElement, toHTMLAudioElement } from './setup';
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
      const fileName: string = extractFileName(
        'https://example.com/audio/song.mp3?version=1&quality=high'
      );
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

    it('should return filename when URL parsing fails but path has filename', () => {
      // This tests the catch block where URL parsing fails but we can still extract filename
      const fileName: string = extractFileName('not-a-url/but/has/path/audio.mp3');
      expect(fileName).toBe('audio.mp3');
    });

    it('should return original input when no path separators exist', () => {
      // This tests the catch block returning the fileName variable
      const fileName: string = extractFileName('filename.mp3');
      expect(fileName).toBe('filename.mp3');
    });

    it('should handle query parameters correctly', () => {
      // Test with query parameter - in real URLs, special characters would be encoded
      const queryUrl = '/audio/song.mp3?name=test&id=123';
      expect(extractFileName(queryUrl)).toBe('song.mp3');

      // Test with URL-encoded query parameter injection (realistic scenario)
      const queryXss = '/audio/track.mp3?name=%3Cscript%3Ealert%28%22xss%22%29%3C%2Fscript%3E';
      expect(extractFileName(queryXss)).toBe('track.mp3');

      // Test with hash fragment
      const hashUrl = '/audio/music.mp3#timestamp=120';
      expect(extractFileName(hashUrl)).toBe('music.mp3');
    });
  });

  describe('getAudioInfoFromElement', () => {
    it('should return null for null audio element', () => {
      const info: AudioInfo | null = getAudioInfoFromElement(null as unknown as HTMLAudioElement);
      expect(info).toBeNull();
    });

    it('should return null for undefined audio element', () => {
      const info: AudioInfo | null = getAudioInfoFromElement(
        undefined as unknown as HTMLAudioElement
      );
      expect(info).toBeNull();
    });

    it('should extract complete audio info from audio element', () => {
      const mockAudio: MockAudioElement = new MockAudioElement('https://example.com/song.mp3');
      mockAudio.duration = 180; // 3 minutes
      mockAudio.currentTime = 60; // 1 minute
      mockAudio.paused = false;
      mockAudio.ended = false;
      mockAudio.readyState = 4;

      const info: AudioInfo | null = getAudioInfoFromElement(toHTMLAudioElement(mockAudio));

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

      const info = getAudioInfoFromElement(toHTMLAudioElement(mockAudio));

      expect(info?.duration).toBe(0);
      expect(info?.currentTime).toBe(30000);
      expect(info?.progress).toBe(0);
    });

    it('should handle NaN currentTime gracefully', () => {
      const mockAudio = new MockAudioElement('test.mp3');
      mockAudio.duration = 120;
      mockAudio.currentTime = NaN;

      const info = getAudioInfoFromElement(toHTMLAudioElement(mockAudio));

      expect(info?.duration).toBe(120000);
      expect(info?.currentTime).toBe(0);
      expect(info?.progress).toBe(0);
    });

    it('should detect paused audio correctly', () => {
      const mockAudio = new MockAudioElement('test.mp3');
      mockAudio.paused = true;
      mockAudio.ended = false;
      mockAudio.readyState = 4;

      const info = getAudioInfoFromElement(toHTMLAudioElement(mockAudio));

      expect(info?.isPlaying).toBe(false);
    });

    it('should detect ended audio correctly', () => {
      const mockAudio = new MockAudioElement('test.mp3');
      mockAudio.paused = false;
      mockAudio.ended = true;
      mockAudio.readyState = 4;

      const info = getAudioInfoFromElement(toHTMLAudioElement(mockAudio));

      expect(info?.isPlaying).toBe(false);
    });

    it('should detect loading audio correctly', () => {
      const mockAudio = new MockAudioElement('test.mp3');
      mockAudio.paused = false;
      mockAudio.ended = false;
      mockAudio.readyState = 2; // HAVE_CURRENT_DATA, not enough to play

      const info = getAudioInfoFromElement(toHTMLAudioElement(mockAudio));

      expect(info?.isPlaying).toBe(false);
    });

    it('should cap progress at 1.0', () => {
      const mockAudio = new MockAudioElement('test.mp3');
      mockAudio.duration = 100;
      mockAudio.currentTime = 150; // More than duration

      const info = getAudioInfoFromElement(toHTMLAudioElement(mockAudio));

      expect(info?.progress).toBe(1);
    });

    it('should handle zero duration', () => {
      const mockAudio = new MockAudioElement('test.mp3');
      mockAudio.duration = 0;
      mockAudio.currentTime = 30;

      const info = getAudioInfoFromElement(toHTMLAudioElement(mockAudio));

      expect(info?.progress).toBe(0);
    });

    it('should calculate remainingInQueue when channel context is provided', () => {
      const mockAudio = new MockAudioElement('test.mp3');
      mockAudio.duration = 120;
      mockAudio.currentTime = 60;
      mockAudio.paused = false;
      mockAudio.ended = false;
      mockAudio.readyState = 4;

      const channels: ExtendedAudioQueueChannel[] = [
        {
          audioCompleteCallbacks: new Set(),
          audioErrorCallbacks: new Set(),
          audioPauseCallbacks: new Set(),
          audioResumeCallbacks: new Set(),
          audioStartCallbacks: new Set(),
          isPaused: false,
          progressCallbacks: new Map(),
          queue: [
            toHTMLAudioElement(mockAudio),
            toHTMLAudioElement(new MockAudioElement('next1.mp3')),
            toHTMLAudioElement(new MockAudioElement('next2.mp3'))
          ],
          queueChangeCallbacks: new Set(),
          volume: 1.0
        }
      ];

      const info = getAudioInfoFromElement(toHTMLAudioElement(mockAudio), 0, channels);

      expect(info?.remainingInQueue).toBe(2); // 3 total items - 1 currently playing
    });

    it('should handle missing channel when calculating remainingInQueue', () => {
      const mockAudio = new MockAudioElement('test.mp3');
      const channels: ExtendedAudioQueueChannel[] = [];

      const info = getAudioInfoFromElement(toHTMLAudioElement(mockAudio), 0, channels);

      expect(info?.remainingInQueue).toBe(0); // Should default to 0 when channel doesn't exist
    });
  });

  describe('createQueueSnapshot', () => {
    it('should return null for non-existent channel', () => {
      const channels: ExtendedAudioQueueChannel[] = [];
      const snapshot = createQueueSnapshot(0, channels);
      expect(snapshot).toBeNull();
    });

    it('should create snapshot for empty queue', () => {
      const channels: ExtendedAudioQueueChannel[] = [
        {
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
        }
      ];

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

      const channels: ExtendedAudioQueueChannel[] = [
        {
          audioCompleteCallbacks: new Set(),
          audioErrorCallbacks: new Set(),
          audioPauseCallbacks: new Set(),
          audioResumeCallbacks: new Set(),
          audioStartCallbacks: new Set(),
          isPaused: false,
          progressCallbacks: new Map(),
          queue: [
            toHTMLAudioElement(mockAudio1),
            toHTMLAudioElement(mockAudio2),
            toHTMLAudioElement(mockAudio3)
          ],
          queueChangeCallbacks: new Set(),
          volume: 1.0
        }
      ];

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

      const channels: ExtendedAudioQueueChannel[] = [
        {
          audioCompleteCallbacks: new Set(),
          audioErrorCallbacks: new Set(),
          audioPauseCallbacks: new Set(),
          audioResumeCallbacks: new Set(),
          audioStartCallbacks: new Set(),
          isPaused: false,
          progressCallbacks: new Map(),
          queue: [toHTMLAudioElement(mockAudio)],
          queueChangeCallbacks: new Set(),
          volume: 1.0
        }
      ];

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

      const channels: ExtendedAudioQueueChannel[] = [
        {
          audioCompleteCallbacks: new Set(),
          audioErrorCallbacks: new Set(),
          audioPauseCallbacks: new Set(),
          audioResumeCallbacks: new Set(),
          audioStartCallbacks: new Set(),
          isPaused: false,
          progressCallbacks: new Map(),
          queue: [toHTMLAudioElement(mockAudio1), toHTMLAudioElement(mockAudio2)],
          queueChangeCallbacks: new Set(),
          volume: 1.0
        }
      ];

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

  describe('validateAudioUrl', () => {
    it('should accept valid URLs', () => {
      expect(validateAudioUrl('https://example.com/audio.mp3')).toBe(
        'https://example.com/audio.mp3'
      );
      expect(validateAudioUrl('http://example.com/sound.wav')).toBe('http://example.com/sound.wav');
      expect(validateAudioUrl('./sounds/local.mp3')).toBe('./sounds/local.mp3');
      expect(validateAudioUrl('/absolute/path/audio.ogg')).toBe('/absolute/path/audio.ogg');
      expect(validateAudioUrl('//cdn.example.com/audio.mp3')).toBe('//cdn.example.com/audio.mp3');
    });

    it('should trim whitespace', () => {
      expect(validateAudioUrl('  https://example.com/audio.mp3  ')).toBe(
        'https://example.com/audio.mp3'
      );
      expect(validateAudioUrl('\n\t./sounds/local.mp3\n\t')).toBe('./sounds/local.mp3');
    });

    it('should reject dangerous protocols', () => {
      expect(() => validateAudioUrl('javascript:alert("XSS")')).toThrow('dangerous protocol');
      expect(() => validateAudioUrl('data:text/html,<script>alert("XSS")</script>')).toThrow(
        'dangerous protocol'
      );
      expect(() => validateAudioUrl('vbscript:msgbox("XSS")')).toThrow('dangerous protocol');
      expect(() => validateAudioUrl('file:///etc/passwd')).toThrow('dangerous protocol');
      expect(() => validateAudioUrl('about:blank')).toThrow('dangerous protocol');
      expect(() => validateAudioUrl('chrome://settings')).toThrow('dangerous protocol');
      expect(() => validateAudioUrl('chrome-extension://abc')).toThrow('dangerous protocol');
    });

    it('should reject path traversal attempts', () => {
      expect(() => validateAudioUrl('../../../etc/passwd')).toThrow('path traversal');
      expect(() => validateAudioUrl('audio/../../sensitive.txt')).toThrow('path traversal');
      expect(() => validateAudioUrl('..\\..\\windows\\system32')).toThrow('path traversal');
    });

    it('should reject suspicious protocol-like patterns', () => {
      expect(() => validateAudioUrl('custom:protocol')).toThrow('suspicious protocol-like pattern');
      expect(() => validateAudioUrl('unknown://something')).toThrow(
        'suspicious protocol-like pattern'
      );
    });

    it('should allow Windows drive paths', () => {
      expect(validateAudioUrl('C:/audio/file.mp3')).toBe('C:/audio/file.mp3');
      expect(validateAudioUrl('D:\\sounds\\music.wav')).toBe('D:\\sounds\\music.wav');
    });

    it('should warn about missing audio extensions', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      validateAudioUrl('https://example.com/noextension');
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('does not have a recognized audio file extension')
      );

      // Should not warn for URLs with query parameters
      consoleSpy.mockClear();
      validateAudioUrl('https://example.com/audio?file=song.mp3');
      expect(consoleSpy).not.toHaveBeenCalled();

      // Should not warn for recognized extensions
      consoleSpy.mockClear();
      validateAudioUrl('https://example.com/song.mp3');
      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should reject invalid input types', () => {
      expect(() => validateAudioUrl('')).toThrow('non-empty string');
      expect(() => validateAudioUrl(null as unknown as string)).toThrow('non-empty string');
      expect(() => validateAudioUrl(undefined as unknown as string)).toThrow('non-empty string');
      expect(() => validateAudioUrl(123 as unknown as string)).toThrow('non-empty string');
    });
  });

  describe('sanitizeForDisplay', () => {
    it('should escape HTML special characters', () => {
      expect(sanitizeForDisplay('<script>alert("XSS")</script>')).toBe(
        '&lt;script&gt;alert(&quot;XSS&quot;)&lt;&#x2F;script&gt;'
      );
      expect(sanitizeForDisplay('<img src="x" onerror="alert(\'XSS\')">')).toBe(
        '&lt;img src=&quot;x&quot; onerror=&quot;alert(&#x27;XSS&#x27;)&quot;&gt;'
      );
      expect(sanitizeForDisplay('Tom & Jerry')).toBe('Tom &amp; Jerry');
    });

    it('should handle normal text unchanged', () => {
      expect(sanitizeForDisplay('normal-file.mp3')).toBe('normal-file.mp3');
      expect(sanitizeForDisplay('song name with spaces.wav')).toBe('song name with spaces.wav');
      expect(sanitizeForDisplay('123_test-file.ogg')).toBe('123_test-file.ogg');
    });

    it('should handle empty or invalid input', () => {
      expect(sanitizeForDisplay('')).toBe('');
      expect(sanitizeForDisplay(null as unknown as string)).toBe('');
      expect(sanitizeForDisplay(undefined as unknown as string)).toBe('');
      expect(sanitizeForDisplay(123 as unknown as string)).toBe('');
    });
  });

  describe('extractFileName with sanitization', () => {
    it('should sanitize extracted filenames', () => {
      // Test with simple path injection - this will work correctly
      const simpleXss = '/path/to/<img src=x>.mp3';
      expect(extractFileName(simpleXss)).toBe('&lt;img src=x&gt;.mp3');

      // Test with URL-encoded XSS attempt (more realistic)
      const encodedXss = '/audio/%3Cscript%3Etest%3C%2Fscript%3E.wav';
      expect(extractFileName(encodedXss)).toBe('&lt;script&gt;test&lt;&#x2F;script&gt;.wav');
    });

    it('should decode and sanitize URL-encoded filenames', () => {
      const encodedUrl = 'https://example.com/song%20%26%20music.mp3';
      expect(extractFileName(encodedUrl)).toBe('song &amp; music.mp3');
    });
  });
});
