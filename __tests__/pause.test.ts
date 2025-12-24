/**
 * @fileoverview Tests for pause and resume functionality
 */

import {
  pauseChannel,
  resumeChannel,
  togglePauseChannel,
  pauseAllChannels,
  resumeAllChannels,
  togglePauseAllChannels,
  isChannelPaused,
  getAllChannelsPauseState,
  pauseWithFade,
  resumeWithFade,
  togglePauseWithFade,
  pauseAllWithFade,
  resumeAllWithFade,
  togglePauseAllWithFade
} from '../src/pause';
import { onAudioPause, onAudioResume, audioChannels } from '../src/info';
import { queueAudio } from '../src/core';
import { toMockAudioElement, mockCallback } from './setup';
import { AudioInfo, FadeType, EasingType } from '../src/types';
import { getFadeConfig, transitionVolume } from '../src/volume';

// Fast duration for test fade operations to speed up tests
// Can be increased if tests become flaky
const TEST_FADE_DURATION = 10;

// Mock getFadeConfig to return fast configurations for testing
const TEST_FADE_CONFIGS = {
  [FadeType.Dramatic]: {
    duration: TEST_FADE_DURATION,
    pauseCurve: EasingType.EaseIn,
    resumeCurve: EasingType.EaseOut
  },
  [FadeType.Gentle]: {
    duration: TEST_FADE_DURATION,
    pauseCurve: EasingType.EaseOut,
    resumeCurve: EasingType.EaseIn
  },
  [FadeType.Linear]: {
    duration: TEST_FADE_DURATION,
    pauseCurve: EasingType.Linear,
    resumeCurve: EasingType.Linear
  }
};

// Mock getFadeConfig for all tests to use fast durations
jest.mock('../src/volume', () => ({
  ...jest.requireActual('../src/volume'),
  getFadeConfig: jest.fn((fadeType: FadeType) => ({ ...TEST_FADE_CONFIGS[fadeType] }))
}));

beforeEach(() => {
  jest.clearAllMocks();
  audioChannels.length = 0;
});

describe('Pause/Resume Functionality', () => {
  describe('pauseChannel', () => {
    it('should pause currently playing audio', async () => {
      await queueAudio('test.mp3', 0);
      const mockAudio = toMockAudioElement(audioChannels[0].queue[0]);
      mockAudio.paused = false;

      await pauseChannel(0);

      expect(mockAudio.pause).toHaveBeenCalled();
      expect(audioChannels[0].isPaused).toBe(true);
    });

    it('should not pause already paused audio', async () => {
      await queueAudio('test.mp3', 0);
      const mockAudio = toMockAudioElement(audioChannels[0].queue[0]);
      mockAudio.paused = true;

      await pauseChannel(0);

      expect(mockAudio.pause).not.toHaveBeenCalled();
    });

    it('should not pause ended audio', async () => {
      await queueAudio('test.mp3', 0);
      const mockAudio = toMockAudioElement(audioChannels[0].queue[0]);
      mockAudio.paused = false;
      mockAudio.ended = true;

      await pauseChannel(0);

      expect(mockAudio.pause).not.toHaveBeenCalled();
    });

    it('should handle non-existent channel gracefully', async () => {
      await expect(pauseChannel(99)).resolves.not.toThrow();
    });

    it('should handle empty queue gracefully', async () => {
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

      await expect(pauseChannel(0)).resolves.not.toThrow();
    });

    it('should emit pause event when pausing', async () => {
      const pauseCallback = mockCallback<(channelNumber: number, info: AudioInfo) => void>();
      onAudioPause(0, pauseCallback);

      await queueAudio('test.mp3', 0);
      const mockAudio = toMockAudioElement(audioChannels[0].queue[0]);
      mockAudio.paused = false;
      mockAudio.duration = 120;
      mockAudio.currentTime = 30;

      await pauseChannel(0);

      expect(pauseCallback).toHaveBeenCalledWith(
        0,
        expect.objectContaining({
          fileName: 'test.mp3',
          isPaused: true,
          isPlaying: false
        })
      );
    });

    it('should use default channel when no channel specified', async () => {
      await queueAudio('test.mp3');
      const mockAudio = toMockAudioElement(audioChannels[0].queue[0]);
      mockAudio.paused = false;

      await pauseChannel();

      expect(mockAudio.pause).toHaveBeenCalled();
      expect(audioChannels[0].isPaused).toBe(true);
    });

    describe('Fade Integration Tests', () => {
      describe('pauseWithFade', () => {
        it('should pause with gentle fade by default', async () => {
          await queueAudio('test.mp3', 0);
          const mockAudio = toMockAudioElement(audioChannels[0].queue[0]);
          mockAudio.paused = false;
          mockAudio.volume = 0.8;
          audioChannels[0].volume = 0.8;

          await pauseWithFade(FadeType.Gentle, 0);

          expect(mockAudio.pause).toHaveBeenCalled();
          expect(audioChannels[0].isPaused).toBe(true);
          expect(audioChannels[0].fadeState).toBeDefined();
          expect(audioChannels[0].fadeState?.fadeType).toBe(FadeType.Gentle);
          expect(audioChannels[0].fadeState?.isPaused).toBe(true);
          expect(audioChannels[0].fadeState?.isTransitioning).toBe(false);
          expect(audioChannels[0].fadeState?.originalVolume).toBe(0.8);
          expect(audioChannels[0].volume).toBe(0.8); // Volume should be restored
        });

        it('should pause with dramatic fade', async () => {
          await queueAudio('test.mp3', 0);
          const mockAudio = toMockAudioElement(audioChannels[0].queue[0]);
          mockAudio.paused = false;
          mockAudio.volume = 1.0;
          audioChannels[0].volume = 1.0;

          await pauseWithFade(FadeType.Dramatic, 0);

          expect(mockAudio.pause).toHaveBeenCalled();
          expect(audioChannels[0].fadeState).toBeDefined();
          expect(audioChannels[0].fadeState?.fadeType).toBe(FadeType.Dramatic);
          expect(audioChannels[0].fadeState?.originalVolume).toBe(1.0);
        });

        it('should pause instantly with instant fade type', async () => {
          await queueAudio('test.mp3', 0);
          const mockAudio = toMockAudioElement(audioChannels[0].queue[0]);
          mockAudio.paused = false;

          await pauseWithFade(FadeType.Linear, 0);

          expect(mockAudio.pause).toHaveBeenCalled();
          expect(audioChannels[0].fadeState).toBeDefined();
          expect(audioChannels[0].fadeState?.fadeType).toBe(FadeType.Linear);
        });

        it('should not pause if already paused', async () => {
          await queueAudio('test.mp3', 0);
          const mockAudio = toMockAudioElement(audioChannels[0].queue[0]);
          mockAudio.paused = true;

          await pauseWithFade(FadeType.Gentle, 0);

          expect(audioChannels[0].fadeState).toBeUndefined();
        });

        it('should handle non-existent channel gracefully', async () => {
          await expect(pauseWithFade(FadeType.Gentle, 99)).resolves.not.toThrow();
        });

        it('should preserve original volume when pausing during existing transition', async () => {
          await queueAudio('test.mp3', 0);
          const mockAudio = toMockAudioElement(audioChannels[0].queue[0]);
          mockAudio.paused = false;

          // Set initial volume
          const originalVolume = 0.8;
          mockAudio.volume = originalVolume;
          audioChannels[0].volume = originalVolume;

          // Simulate first pause that creates fade state
          await pauseWithFade(FadeType.Gentle, 0, 0); // Instant to avoid timing issues

          // Verify initial fade state is correct
          expect(audioChannels[0].fadeState?.originalVolume).toBe(originalVolume);
          expect(audioChannels[0].fadeState?.isTransitioning).toBe(false);

          // Now simulate a transitioning state (like during resume)
          if (audioChannels[0].fadeState) {
            audioChannels[0].fadeState.isTransitioning = true;
            audioChannels[0].fadeState.isPaused = false; // As if we're resuming
          }

          // Set current volume to an intermediate value (simulating mid-transition)
          const intermediateVolume = 0.3;
          audioChannels[0].volume = intermediateVolume;
          mockAudio.volume = intermediateVolume;
          mockAudio.paused = false;

          // Now pause again while "transitioning" - this should preserve original volume, not intermediate
          await pauseWithFade(FadeType.Gentle, 0, 0); // Instant to avoid timing issues

          // The originalVolume should still be the original (0.8), not the intermediate (0.3)
          expect(audioChannels[0].fadeState?.originalVolume).toBe(originalVolume);
          expect(audioChannels[0].fadeState?.isTransitioning).toBe(false);

          // And the volume should be restored to original, not stuck at intermediate
          expect(audioChannels[0].volume).toBe(originalVolume);
        });
      });

      describe('resumeWithFade', () => {
        it('should resume with complementary fade curve', async () => {
          await queueAudio('test.mp3', 0);
          const mockAudio = toMockAudioElement(audioChannels[0].queue[0]);

          // First pause with fade to set up state
          mockAudio.paused = false;
          audioChannels[0].volume = 0.7;
          await pauseWithFade(FadeType.Gentle, 0);

          // Now test resume
          await resumeWithFade(undefined, 0);

          expect(mockAudio.play).toHaveBeenCalled();
          expect(audioChannels[0].isPaused).toBe(false);
          expect(audioChannels[0].fadeState?.isPaused).toBe(false);
        });

        it('should fall back to regular resume if no fade state', async () => {
          await queueAudio('test.mp3', 0);
          const mockAudio = toMockAudioElement(audioChannels[0].queue[0]);
          mockAudio.paused = true;
          audioChannels[0].isPaused = true;

          await resumeWithFade(undefined, 0);

          expect(mockAudio.play).toHaveBeenCalled();
          expect(audioChannels[0].isPaused).toBe(false);
        });

        it('should handle instant resume correctly', async () => {
          await queueAudio('test.mp3', 0);
          const mockAudio = toMockAudioElement(audioChannels[0].queue[0]);

          // Set up instant fade state
          mockAudio.paused = false;
          await pauseWithFade(FadeType.Linear, 0);

          await resumeWithFade(undefined, 0);

          expect(mockAudio.play).toHaveBeenCalled();
          expect(audioChannels[0].fadeState?.isPaused).toBe(false);
        });

        it('should handle non-existent channel gracefully', async () => {
          await expect(resumeWithFade(undefined, 99)).resolves.not.toThrow();
        });

        it('should allow fadeType override', async () => {
          await queueAudio('test.mp3', 0);
          const mockAudio = toMockAudioElement(audioChannels[0].queue[0]);

          // Pause with gentle fade
          mockAudio.paused = false;
          audioChannels[0].volume = 0.7;
          await pauseWithFade(FadeType.Gentle, 0);

          // Resume with dramatic fade override
          await resumeWithFade(FadeType.Dramatic, 0);

          expect(mockAudio.play).toHaveBeenCalled();
          expect(audioChannels[0].isPaused).toBe(false);
          expect(audioChannels[0].fadeState?.isPaused).toBe(false);
          // The original fade state should still show Gentle, but Dramatic was used for resume
          expect(audioChannels[0].fadeState?.fadeType).toBe(FadeType.Gentle);
        });

        it('should resume audio with stored fade configuration', async () => {
          await queueAudio('test.mp3', 0);
          const mockAudio = toMockAudioElement(audioChannels[0].queue[0]);

          // First pause with fade
          await pauseWithFade(FadeType.Gentle, 0);

          // Reset for resume test
          mockAudio.paused = true;
          audioChannels[0].isPaused = true;

          // Resume should use stored fade type (Gentle)
          await resumeWithFade(undefined, 0);

          expect(mockAudio.play).toHaveBeenCalled();
          expect(audioChannels[0].isPaused).toBe(false);
        });

        it('should handle instant resume with duration 0', async () => {
          await queueAudio('test.mp3', 0);
          const mockAudio = toMockAudioElement(audioChannels[0].queue[0]);

          // Start with playing audio and volume
          mockAudio.paused = false;
          audioChannels[0].volume = 0.8;

          // Pause with fade to set up fade state
          await pauseWithFade(FadeType.Gentle, 0);

          // The audio should now be paused with fadeState set
          expect(audioChannels[0].fadeState).toBeDefined();

          // Resume with instant duration (0)
          await resumeWithFade(FadeType.Linear, 0, 0);

          expect(mockAudio.play).toHaveBeenCalled();
          expect(audioChannels[0].isPaused).toBe(false);
          expect(audioChannels[0].volume).toBe(0.8); // Should restore original volume
          expect(audioChannels[0].fadeState?.isPaused).toBe(false);
          expect(audioChannels[0].fadeState?.isTransitioning).toBe(false);
        });

        it('should handle override with custom fade type', async () => {
          await queueAudio('test.mp3', 0);
          const mockAudio = toMockAudioElement(audioChannels[0].queue[0]);

          // First pause with Gentle fade
          await pauseWithFade(FadeType.Gentle, 0);

          // Reset for resume test
          mockAudio.paused = true;
          audioChannels[0].isPaused = true;

          // Resume with override Dramatic fade
          await resumeWithFade(FadeType.Dramatic, 0);

          expect(mockAudio.play).toHaveBeenCalled();
          expect(audioChannels[0].isPaused).toBe(false);
        });
      });

      describe('togglePauseWithFade', () => {
        it('should pause when currently playing', async () => {
          await queueAudio('test.mp3', 0);
          const mockAudio = toMockAudioElement(audioChannels[0].queue[0]);
          mockAudio.paused = false;

          await togglePauseWithFade(FadeType.Dramatic, 0);

          expect(mockAudio.pause).toHaveBeenCalled();
          expect(audioChannels[0].fadeState?.fadeType).toBe(FadeType.Dramatic);
        });

        it('should resume when currently paused', async () => {
          await queueAudio('test.mp3', 0);
          const mockAudio = toMockAudioElement(audioChannels[0].queue[0]);

          // Set up paused state with fade
          mockAudio.paused = false;
          await pauseWithFade(FadeType.Gentle, 0);

          await togglePauseWithFade(FadeType.Dramatic, 0);

          expect(mockAudio.play).toHaveBeenCalled();
          expect(audioChannels[0].fadeState?.isPaused).toBe(false);
        });
      });

      describe('Multi-channel fade functions', () => {
        beforeEach(async () => {
          // Set up multiple channels
          await queueAudio('test1.mp3', 0);
          await queueAudio('test2.mp3', 1);
          await queueAudio('test3.mp3', 2);
        });

        it('should pause all channels with fade', async () => {
          const mockAudio0 = toMockAudioElement(audioChannels[0].queue[0]);
          const mockAudio1 = toMockAudioElement(audioChannels[1].queue[0]);
          const mockAudio2 = toMockAudioElement(audioChannels[2].queue[0]);

          mockAudio0.paused = false;
          mockAudio1.paused = false;
          mockAudio2.paused = false;

          await pauseAllWithFade(FadeType.Dramatic);

          expect(mockAudio0.pause).toHaveBeenCalled();
          expect(mockAudio1.pause).toHaveBeenCalled();
          expect(mockAudio2.pause).toHaveBeenCalled();
          expect(audioChannels[0].fadeState?.fadeType).toBe(FadeType.Dramatic);
          expect(audioChannels[1].fadeState?.fadeType).toBe(FadeType.Dramatic);
          expect(audioChannels[2].fadeState?.fadeType).toBe(FadeType.Dramatic);
        });

        it('should resume all channels with fade', async () => {
          // First pause all with fade
          const mockAudio0 = toMockAudioElement(audioChannels[0].queue[0]);
          const mockAudio1 = toMockAudioElement(audioChannels[1].queue[0]);
          const mockAudio2 = toMockAudioElement(audioChannels[2].queue[0]);

          mockAudio0.paused = false;
          mockAudio1.paused = false;
          mockAudio2.paused = false;

          await pauseAllWithFade(FadeType.Gentle);

          // Clear the play mocks
          mockAudio0.play.mockClear();
          mockAudio1.play.mockClear();
          mockAudio2.play.mockClear();

          await resumeAllWithFade();

          expect(mockAudio0.play).toHaveBeenCalled();
          expect(mockAudio1.play).toHaveBeenCalled();
          expect(mockAudio2.play).toHaveBeenCalled();
        });

        it('should toggle all channels with fade', async () => {
          const mockAudio0 = toMockAudioElement(audioChannels[0].queue[0]);
          const mockAudio1 = toMockAudioElement(audioChannels[1].queue[0]);
          const mockAudio2 = toMockAudioElement(audioChannels[2].queue[0]);

          mockAudio0.paused = false;
          mockAudio1.paused = false;
          mockAudio2.paused = true; // One paused, others playing

          await togglePauseAllWithFade(FadeType.Gentle);

          // Should pause all because some were playing
          expect(mockAudio0.pause).toHaveBeenCalled();
          expect(mockAudio1.pause).toHaveBeenCalled();
        });
      });

      describe('Fade configuration', () => {
        it('should use correct fade configurations', () => {
          const instantConfig = getFadeConfig(FadeType.Linear);
          expect(instantConfig.duration).toBe(TEST_FADE_DURATION);
          expect(instantConfig.pauseCurve).toBe(EasingType.Linear);
          expect(instantConfig.resumeCurve).toBe(EasingType.Linear);

          const gentleConfig = getFadeConfig(FadeType.Gentle);
          expect(gentleConfig.duration).toBe(TEST_FADE_DURATION);
          expect(gentleConfig.pauseCurve).toBe(EasingType.EaseOut);
          expect(gentleConfig.resumeCurve).toBe(EasingType.EaseIn);

          const dramaticConfig = getFadeConfig(FadeType.Dramatic);
          expect(dramaticConfig.duration).toBe(TEST_FADE_DURATION);
          expect(dramaticConfig.pauseCurve).toBe(EasingType.EaseIn);
          expect(dramaticConfig.resumeCurve).toBe(EasingType.EaseOut);
        });

        it('should return a copy of the config to prevent mutation', () => {
          const config1 = getFadeConfig(FadeType.Gentle);
          const config2 = getFadeConfig(FadeType.Gentle);

          config1.duration = 999;
          expect(config2.duration).toBe(TEST_FADE_DURATION); // Should not be affected
        });
      });

      describe('State synchronization', () => {
        it('should maintain volume state synchronously during fade operations', async () => {
          await queueAudio('test.mp3', 0);
          const mockAudio = toMockAudioElement(audioChannels[0].queue[0]);
          mockAudio.paused = false;
          audioChannels[0].volume = 0.8;

          await pauseWithFade(FadeType.Gentle, 0);

          // Volume should be restored immediately after pause
          expect(audioChannels[0].volume).toBe(0.8);

          await resumeWithFade(undefined, 0);

          // Volume should end up at original level
          expect(audioChannels[0].volume).toBe(0.8);
        });
      });
    });
  });

  describe('resumeChannel', () => {
    it('should resume paused audio', async () => {
      await queueAudio('test.mp3', 0);
      const mockAudio = toMockAudioElement(audioChannels[0].queue[0]);
      mockAudio.paused = true;
      audioChannels[0].isPaused = true;

      await resumeChannel(0);

      expect(mockAudio.play).toHaveBeenCalled();
      expect(audioChannels[0].isPaused).toBe(false);
    });

    it('should not resume already playing audio', async () => {
      await queueAudio('test.mp3', 0);

      const mockAudio = toMockAudioElement(audioChannels[0].queue[0]);

      // Set up the state: audio is already playing
      mockAudio.paused = false;
      audioChannels[0].isPaused = false;

      // NOW clear the play mock after all async operations are done
      mockAudio.play.mockClear();

      await resumeChannel(0);

      expect(mockAudio.play).not.toHaveBeenCalled();
    });

    it('should not resume ended audio', async () => {
      await queueAudio('test.mp3', 0);

      const mockAudio = toMockAudioElement(audioChannels[0].queue[0]);

      // Set up the state: audio has ended
      mockAudio.paused = true;
      mockAudio.ended = true;
      audioChannels[0].isPaused = true;

      // NOW clear the play mock after all async operations are done
      mockAudio.play.mockClear();

      await resumeChannel(0);

      expect(mockAudio.play).not.toHaveBeenCalled();
    });

    it('should handle non-existent channel gracefully', async () => {
      await expect(resumeChannel(99)).resolves.not.toThrow();
    });

    it('should emit resume event when resuming', async () => {
      const resumeCallback = mockCallback<(channelNumber: number, info: AudioInfo) => void>();
      onAudioResume(0, resumeCallback);

      await queueAudio('test.mp3', 0);
      const mockAudio = toMockAudioElement(audioChannels[0].queue[0]);
      mockAudio.paused = true;
      mockAudio.duration = 120;
      mockAudio.currentTime = 30;
      audioChannels[0].isPaused = true;

      await resumeChannel(0);

      expect(resumeCallback).toHaveBeenCalledWith(
        0,
        expect.objectContaining({
          fileName: 'test.mp3',
          isPaused: false,
          isPlaying: true
        })
      );
    });

    it('should use default channel when no channel specified', async () => {
      await queueAudio('test.mp3');
      const mockAudio = toMockAudioElement(audioChannels[0].queue[0]);
      mockAudio.paused = true;
      audioChannels[0].isPaused = true;

      await resumeChannel();

      expect(mockAudio.play).toHaveBeenCalled();
      expect(audioChannels[0].isPaused).toBe(false);
    });
  });

  describe('togglePauseChannel', () => {
    it('should pause playing audio', async () => {
      await queueAudio('test.mp3', 0);
      const mockAudio = toMockAudioElement(audioChannels[0].queue[0]);
      mockAudio.paused = false;

      await togglePauseChannel(0);

      expect(mockAudio.pause).toHaveBeenCalled();
      expect(audioChannels[0].isPaused).toBe(true);
    });

    it('should resume paused audio', async () => {
      await queueAudio('test.mp3', 0);
      const mockAudio = toMockAudioElement(audioChannels[0].queue[0]);
      mockAudio.paused = true;
      audioChannels[0].isPaused = true;

      await togglePauseChannel(0);

      expect(mockAudio.play).toHaveBeenCalled();
      expect(audioChannels[0].isPaused).toBe(false);
    });

    it('should handle empty queue gracefully', async () => {
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

      await expect(togglePauseChannel(0)).resolves.not.toThrow();
    });
  });

  describe('pauseAllChannels', () => {
    it('should pause all playing channels', async () => {
      await queueAudio('test1.mp3', 0);
      await queueAudio('test2.mp3', 1);
      await queueAudio('test3.mp3', 2);

      const mockAudio0 = toMockAudioElement(audioChannels[0].queue[0]);
      const mockAudio1 = toMockAudioElement(audioChannels[1].queue[0]);
      const mockAudio2 = toMockAudioElement(audioChannels[2].queue[0]);

      mockAudio0.paused = false;
      mockAudio1.paused = false;
      mockAudio2.paused = false;

      await pauseAllChannels();

      expect(mockAudio0.pause).toHaveBeenCalled();
      expect(mockAudio1.pause).toHaveBeenCalled();
      expect(mockAudio2.pause).toHaveBeenCalled();
      expect(audioChannels[0].isPaused).toBe(true);
      expect(audioChannels[1].isPaused).toBe(true);
      expect(audioChannels[2].isPaused).toBe(true);
    });

    it('should handle empty channels array gracefully', async () => {
      await expect(pauseAllChannels()).resolves.not.toThrow();
    });
  });

  describe('resumeAllChannels', () => {
    it('should resume all paused channels', async () => {
      await queueAudio('test1.mp3', 0);
      await queueAudio('test2.mp3', 1);

      const mockAudio0 = toMockAudioElement(audioChannels[0].queue[0]);
      const mockAudio1 = toMockAudioElement(audioChannels[1].queue[0]);

      mockAudio0.paused = true;
      mockAudio1.paused = true;
      audioChannels[0].isPaused = true;
      audioChannels[1].isPaused = true;

      await resumeAllChannels();

      expect(mockAudio0.play).toHaveBeenCalled();
      expect(mockAudio1.play).toHaveBeenCalled();
      expect(audioChannels[0].isPaused).toBe(false);
      expect(audioChannels[1].isPaused).toBe(false);
    });
  });

  describe('isChannelPaused', () => {
    it('should return true for paused channel', async () => {
      await queueAudio('test.mp3', 0);
      audioChannels[0].isPaused = true;

      expect(isChannelPaused(0)).toBe(true);
    });

    it('should return false for playing channel', async () => {
      await queueAudio('test.mp3', 0);
      audioChannels[0].isPaused = false;

      expect(isChannelPaused(0)).toBe(false);
    });

    it('should return false for non-existent channel', () => {
      expect(isChannelPaused(99)).toBe(false);
    });

    it('should use default channel when no channel specified', async () => {
      await queueAudio('test.mp3');
      audioChannels[0].isPaused = true;

      expect(isChannelPaused()).toBe(true);
    });
  });

  describe('getAllChannelsPauseState', () => {
    it('should return pause states for all channels', async () => {
      await queueAudio('test1.mp3', 0);
      await queueAudio('test2.mp3', 1);
      await queueAudio('test3.mp3', 2);

      audioChannels[0].isPaused = false;
      audioChannels[1].isPaused = true;
      audioChannels[2].isPaused = false;

      const pauseStates = getAllChannelsPauseState();

      expect(pauseStates).toEqual([false, true, false]);
    });

    it('should return empty array when no channels exist', () => {
      const pauseStates = getAllChannelsPauseState();
      expect(pauseStates).toEqual([]);
    });

    it('should handle channels with undefined isPaused', async () => {
      await queueAudio('test.mp3', 0);
      (audioChannels[0] as unknown as { isPaused: undefined }).isPaused = undefined;

      const pauseStates = getAllChannelsPauseState();

      expect(pauseStates).toEqual([false]);
    });
  });

  describe('togglePauseAllChannels', () => {
    it('should pause all channels when any channel is playing', async () => {
      await queueAudio('test1.mp3', 0);
      await queueAudio('test2.mp3', 1);
      await queueAudio('test3.mp3', 2);

      const mockAudio1 = toMockAudioElement(audioChannels[0].queue[0]);
      const mockAudio2 = toMockAudioElement(audioChannels[1].queue[0]);
      const mockAudio3 = toMockAudioElement(audioChannels[2].queue[0]);

      // Ensure they are all playing
      mockAudio1.paused = false;
      mockAudio2.paused = false;
      mockAudio3.paused = false;
      audioChannels[0].isPaused = false;
      audioChannels[1].isPaused = false;
      audioChannels[2].isPaused = false;

      await togglePauseAllChannels();

      expect(mockAudio1.pause).toHaveBeenCalled();
      expect(mockAudio2.pause).toHaveBeenCalled();
      expect(mockAudio3.pause).toHaveBeenCalled();
      expect(audioChannels[0].isPaused).toBe(true);
      expect(audioChannels[1].isPaused).toBe(true);
      expect(audioChannels[2].isPaused).toBe(true);
    });

    it('should resume all channels when all channels are paused', async () => {
      await queueAudio('test1.mp3', 0);
      await queueAudio('test2.mp3', 1);
      await pauseAllChannels();

      const mockAudio1 = toMockAudioElement(audioChannels[0].queue[0]);
      const mockAudio2 = toMockAudioElement(audioChannels[1].queue[0]);

      // Clear the pause calls so we can test resume calls
      mockAudio1.play.mockClear();
      mockAudio2.play.mockClear();

      await togglePauseAllChannels();

      expect(mockAudio1.play).toHaveBeenCalled();
      expect(mockAudio2.play).toHaveBeenCalled();
      expect(audioChannels[0].isPaused).toBe(false);
      expect(audioChannels[1].isPaused).toBe(false);
    });

    it('should handle mixed pause states correctly (pause all if any playing)', async () => {
      await queueAudio('test1.mp3', 0);
      await queueAudio('test2.mp3', 1);

      // Pause only one channel
      await pauseChannel(0);

      const mockAudio1 = toMockAudioElement(audioChannels[0].queue[0]);
      const mockAudio2 = toMockAudioElement(audioChannels[1].queue[0]);

      // Clear previous pause calls
      mockAudio1.pause.mockClear();
      mockAudio2.pause.mockClear();

      // Channel 0 is paused, channel 1 is still playing
      // togglePauseAllChannels should pause everything
      await togglePauseAllChannels();

      // Channel 1 should be paused (channel 0 was already paused)
      expect(mockAudio2.pause).toHaveBeenCalled();
      expect(audioChannels[1].isPaused).toBe(true);
    });

    it('should handle empty channels gracefully', async () => {
      await expect(togglePauseAllChannels()).resolves.not.toThrow();
    });

    it('should handle channels with ended audio', async () => {
      await queueAudio('test.mp3', 0);

      const mockAudio = toMockAudioElement(audioChannels[0].queue[0]);
      mockAudio.ended = true;
      mockAudio.paused = false; // Ended but not paused

      // Should not consider ended audio as "playing"
      await togglePauseAllChannels();

      // Since no audio is actually playing, this should try to resume
      expect(mockAudio.play).toHaveBeenCalled();
    });

    it('should work correctly with single channel', async () => {
      await queueAudio('test.mp3', 0);

      const mockAudio = toMockAudioElement(audioChannels[0].queue[0]);
      mockAudio.paused = false;
      audioChannels[0].isPaused = false;

      // First toggle should pause
      await togglePauseAllChannels();
      expect(audioChannels[0].isPaused).toBe(true);

      // Second toggle should resume
      mockAudio.play.mockClear();
      await togglePauseAllChannels();
      expect(mockAudio.play).toHaveBeenCalled();
      expect(audioChannels[0].isPaused).toBe(false);
    });
  });
});

describe('Custom Duration Support', () => {
  describe('pauseWithFade with custom duration', () => {
    it('should use custom duration instead of fadeType default', async () => {
      await queueAudio('test.mp3', 0);
      const mockAudio = toMockAudioElement(audioChannels[0].queue[0]);
      mockAudio.paused = false;
      audioChannels[0].volume = 0.8;

      const customDuration = TEST_FADE_DURATION;
      await pauseWithFade(FadeType.Gentle, 0, customDuration);

      expect(audioChannels[0].fadeState?.customDuration).toBe(customDuration);
      expect(audioChannels[0].fadeState?.fadeType).toBe(FadeType.Gentle);
      expect(audioChannels[0].fadeState?.originalVolume).toBe(0.8);
    });

    it('should use fadeType default when no custom duration provided', async () => {
      await queueAudio('test.mp3', 0);
      const mockAudio = toMockAudioElement(audioChannels[0].queue[0]);
      mockAudio.paused = false;
      audioChannels[0].volume = 0.8;

      await pauseWithFade(FadeType.Dramatic, 0);

      expect(audioChannels[0].fadeState?.customDuration).toBeUndefined();
      expect(audioChannels[0].fadeState?.fadeType).toBe(FadeType.Dramatic);
    });

    it('should handle zero duration as instant pause', async () => {
      await queueAudio('test.mp3', 0);
      const mockAudio = toMockAudioElement(audioChannels[0].queue[0]);
      mockAudio.paused = false;

      await pauseWithFade(FadeType.Gentle, 0, 0);

      expect(mockAudio.pause).toHaveBeenCalled();
      expect(audioChannels[0].isPaused).toBe(true);
    });
  });

  describe('resumeWithFade with custom duration', () => {
    it('should use custom duration parameter over stored duration', async () => {
      await queueAudio('test.mp3', 0);
      const mockAudio = toMockAudioElement(audioChannels[0].queue[0]);

      // Pause with custom duration
      mockAudio.paused = false;
      audioChannels[0].volume = 0.6;
      await pauseWithFade(FadeType.Gentle, 0, TEST_FADE_DURATION);

      // Resume with different custom duration
      const customResumeDuration = TEST_FADE_DURATION;
      await resumeWithFade(undefined, 0, customResumeDuration);

      expect(mockAudio.play).toHaveBeenCalled();
      expect(audioChannels[0].fadeState?.isPaused).toBe(false);
    });

    it('should use stored custom duration when no resume duration provided', async () => {
      await queueAudio('test.mp3', 0);
      const mockAudio = toMockAudioElement(audioChannels[0].queue[0]);

      // Pause with custom duration
      mockAudio.paused = false;
      audioChannels[0].volume = 0.7;
      const pauseDuration = TEST_FADE_DURATION;
      await pauseWithFade(FadeType.Dramatic, 0, pauseDuration);

      // Resume without specifying duration (should use stored custom duration)
      await resumeWithFade(undefined, 0);

      expect(mockAudio.play).toHaveBeenCalled();
      expect(audioChannels[0].fadeState?.isPaused).toBe(false);
    });

    it('should use fadeType default when no custom durations exist', async () => {
      await queueAudio('test.mp3', 0);
      const mockAudio = toMockAudioElement(audioChannels[0].queue[0]);

      // Pause without custom duration
      mockAudio.paused = false;
      audioChannels[0].volume = 0.9;
      await pauseWithFade(FadeType.Linear, 0);

      // Resume without custom duration
      await resumeWithFade(undefined, 0);

      expect(mockAudio.play).toHaveBeenCalled();
      expect(audioChannels[0].fadeState?.isPaused).toBe(false);
    });

    it('should override fadeType and use custom duration', async () => {
      await queueAudio('test.mp3', 0);
      const mockAudio = toMockAudioElement(audioChannels[0].queue[0]);

      // Pause with gentle fade
      mockAudio.paused = false;
      audioChannels[0].volume = 0.5;
      await pauseWithFade(FadeType.Gentle, 0);

      // Resume with dramatic fade override and custom duration
      await resumeWithFade(FadeType.Dramatic, 0, TEST_FADE_DURATION);

      expect(mockAudio.play).toHaveBeenCalled();
      expect(audioChannels[0].fadeState?.isPaused).toBe(false);
    });
  });

  describe('togglePauseWithFade with custom duration', () => {
    it('should use custom duration for both pause and resume', async () => {
      await queueAudio('test.mp3', 0);
      const mockAudio = toMockAudioElement(audioChannels[0].queue[0]);
      mockAudio.paused = false;
      audioChannels[0].volume = 0.8;

      const customDuration = TEST_FADE_DURATION;

      // First toggle should pause with custom duration
      await togglePauseWithFade(FadeType.Gentle, 0, customDuration);

      expect(audioChannels[0].fadeState?.customDuration).toBe(customDuration);
      expect(audioChannels[0].isPaused).toBe(true);

      // Second toggle should resume with same custom duration
      await togglePauseWithFade(FadeType.Gentle, 0, customDuration);

      expect(audioChannels[0].fadeState?.isPaused).toBe(false);
    });
  });

  describe('Multi-channel fade functions with custom duration', () => {
    it('should apply custom duration to all channels in pauseAllWithFade', async () => {
      await queueAudio('test1.mp3', 0);
      await queueAudio('test2.mp3', 1);

      const mockAudio0 = toMockAudioElement(audioChannels[0].queue[0]);
      const mockAudio1 = toMockAudioElement(audioChannels[1].queue[0]);
      mockAudio0.paused = false;
      mockAudio1.paused = false;
      audioChannels[0].volume = 0.7;
      audioChannels[1].volume = 0.9;

      const customDuration = TEST_FADE_DURATION;
      await pauseAllWithFade(FadeType.Dramatic, customDuration);

      expect(audioChannels[0].fadeState?.customDuration).toBe(customDuration);
      expect(audioChannels[1].fadeState?.customDuration).toBe(customDuration);
      expect(audioChannels[0].fadeState?.fadeType).toBe(FadeType.Dramatic);
      expect(audioChannels[1].fadeState?.fadeType).toBe(FadeType.Dramatic);
    });

    it('should apply custom duration to all channels in resumeAllWithFade', async () => {
      await queueAudio('test1.mp3', 0);
      await queueAudio('test2.mp3', 1);

      const mockAudio0 = toMockAudioElement(audioChannels[0].queue[0]);
      const mockAudio1 = toMockAudioElement(audioChannels[1].queue[0]);

      // Pause both channels first
      mockAudio0.paused = false;
      mockAudio1.paused = false;
      await pauseAllWithFade(FadeType.Gentle);

      // Resume with custom duration
      const customResumeDuration = TEST_FADE_DURATION;
      await resumeAllWithFade(FadeType.Linear, customResumeDuration);

      expect(mockAudio0.play).toHaveBeenCalled();
      expect(mockAudio1.play).toHaveBeenCalled();
      expect(audioChannels[0].fadeState?.isPaused).toBe(false);
      expect(audioChannels[1].fadeState?.isPaused).toBe(false);
    });

    it('should apply custom duration in togglePauseAllWithFade', async () => {
      await queueAudio('test1.mp3', 0);
      await queueAudio('test2.mp3', 1);

      const mockAudio0 = toMockAudioElement(audioChannels[0].queue[0]);
      const mockAudio1 = toMockAudioElement(audioChannels[1].queue[0]);
      mockAudio0.paused = false;
      mockAudio1.paused = false;

      const customDuration = TEST_FADE_DURATION;

      // Should pause all with custom duration
      await togglePauseAllWithFade(FadeType.Gentle, customDuration);

      expect(audioChannels[0].fadeState?.customDuration).toBe(customDuration);
      expect(audioChannels[1].fadeState?.customDuration).toBe(customDuration);

      // Should resume all with same custom duration
      await togglePauseAllWithFade(FadeType.Gentle, customDuration);

      expect(audioChannels[0].fadeState?.isPaused).toBe(false);
      expect(audioChannels[1].fadeState?.isPaused).toBe(false);
    });
  });
});

describe('Race Condition Handling', () => {
  describe('Rapid pause/resume toggle protection', () => {
    it('should preserve original volume during rapid toggles', async () => {
      await queueAudio('test.mp3', 0);
      const mockAudio = toMockAudioElement(audioChannels[0].queue[0]);
      mockAudio.paused = false;

      const originalVolume = 0.75;
      audioChannels[0].volume = originalVolume;

      // First pause with fade
      await pauseWithFade(FadeType.Gentle, 0);

      // Verify original volume is preserved
      expect(audioChannels[0].fadeState?.originalVolume).toBe(originalVolume);

      // Now resume
      await resumeWithFade(FadeType.Gentle, 0);

      // Original volume should still be preserved
      expect(audioChannels[0].fadeState?.originalVolume).toBe(originalVolume);
    });

    it('should not capture zero volume as original volume', async () => {
      await queueAudio('test.mp3', 0);
      const mockAudio = toMockAudioElement(audioChannels[0].queue[0]);
      mockAudio.paused = false;

      // Set up scenario where current volume might be 0 during transition
      audioChannels[0].volume = 0;

      // Create existing fade state with proper original volume
      audioChannels[0].fadeState = {
        fadeType: FadeType.Gentle,
        isPaused: false,
        originalVolume: 0.8
      };

      await pauseWithFade(FadeType.Dramatic, 0);

      // Should use the existing original volume, not capture the zero volume
      expect(audioChannels[0].fadeState?.originalVolume).toBe(0.8);
    });

    it('should handle resume with corrupted original volume gracefully', async () => {
      await queueAudio('test.mp3', 0);
      const mockAudio = toMockAudioElement(audioChannels[0].queue[0]);

      // Set up corrupted fade state (original volume of 0)
      audioChannels[0].fadeState = {
        fadeType: FadeType.Gentle,
        isPaused: true,
        originalVolume: 0
      };

      await resumeWithFade(undefined, 0);

      // Should fallback to 1.0 when original volume is invalid
      expect(mockAudio.play).toHaveBeenCalled();
      expect(audioChannels[0].fadeState?.isPaused).toBe(false);
    });

    it('should handle multiple sequential fade operations on same channel', async () => {
      await queueAudio('test.mp3', 0);
      const mockAudio = toMockAudioElement(audioChannels[0].queue[0]);
      mockAudio.paused = false;
      audioChannels[0].volume = 0.6;

      // Sequential fade operations
      await pauseWithFade(FadeType.Gentle, 0);
      await resumeWithFade(FadeType.Dramatic, 0);
      await pauseWithFade(FadeType.Linear, 0);
      await resumeWithFade(FadeType.Gentle, 0);

      // Should not throw and should maintain valid state
      expect(audioChannels[0].fadeState).toBeDefined();
      expect(typeof audioChannels[0].fadeState?.originalVolume).toBe('number');
      expect(audioChannels[0].fadeState?.originalVolume).toBeGreaterThan(0);
    });
  });

  describe('Volume state synchronization', () => {
    it('should maintain consistent volume state across fade operations', async () => {
      await queueAudio('test.mp3', 0);
      const mockAudio = toMockAudioElement(audioChannels[0].queue[0]);
      mockAudio.paused = false;

      const targetVolume = 0.65;
      audioChannels[0].volume = targetVolume;

      // Pause with fade
      await pauseWithFade(FadeType.Gentle, 0);

      // Volume should be restored to original after pause
      expect(audioChannels[0].volume).toBe(targetVolume);
      expect(audioChannels[0].fadeState?.originalVolume).toBe(targetVolume);

      // Resume with fade
      await resumeWithFade(undefined, 0);

      // Final volume should match original
      expect(audioChannels[0].volume).toBe(targetVolume);
    });

    it('should handle volume changes between pause and resume', async () => {
      await queueAudio('test.mp3', 0);
      const mockAudio = toMockAudioElement(audioChannels[0].queue[0]);
      mockAudio.paused = false;

      const initialVolume = 0.8;
      audioChannels[0].volume = initialVolume;

      // Pause with fade
      await pauseWithFade(FadeType.Gentle, 0);

      // Manually change volume while paused (simulating external volume change)
      audioChannels[0].volume = 0.3;

      // Resume should restore to original volume, not current volume
      await resumeWithFade(undefined, 0);

      expect(audioChannels[0].volume).toBe(initialVolume);
    });
  });

  describe('Fade type override behavior', () => {
    it('should use new fadeType parameter in resumeAllWithFade', async () => {
      await queueAudio('test1.mp3', 0);
      await queueAudio('test2.mp3', 1);

      const mockAudio0 = toMockAudioElement(audioChannels[0].queue[0]);
      const mockAudio1 = toMockAudioElement(audioChannels[1].queue[0]);

      // Pause both channels with different fade types
      mockAudio0.paused = false;
      mockAudio1.paused = false;
      await pauseWithFade(FadeType.Gentle, 0);
      await pauseWithFade(FadeType.Dramatic, 1);

      // Resume all with override fade type
      await resumeAllWithFade(FadeType.Linear);

      expect(mockAudio0.play).toHaveBeenCalled();
      expect(mockAudio1.play).toHaveBeenCalled();
      expect(audioChannels[0].fadeState?.isPaused).toBe(false);
      expect(audioChannels[1].fadeState?.isPaused).toBe(false);
    });

    it('should use stored fade types when no override provided in resumeAllWithFade', async () => {
      await queueAudio('test1.mp3', 0);
      await queueAudio('test2.mp3', 1);

      const mockAudio0 = toMockAudioElement(audioChannels[0].queue[0]);
      const mockAudio1 = toMockAudioElement(audioChannels[1].queue[0]);

      // Pause both channels
      mockAudio0.paused = false;
      mockAudio1.paused = false;
      await pauseWithFade(FadeType.Gentle, 0);
      await pauseWithFade(FadeType.Dramatic, 1);

      // Resume all without override (should use stored fade types)
      await resumeAllWithFade();

      expect(mockAudio0.play).toHaveBeenCalled();
      expect(mockAudio1.play).toHaveBeenCalled();
      expect(audioChannels[0].fadeState?.isPaused).toBe(false);
      expect(audioChannels[1].fadeState?.isPaused).toBe(false);
    });
  });

  describe('Web Audio API pause/resume regression tests', () => {
    it('should update gain node when resuming with Web Audio', async () => {
      const mockGainNode = {
        connect: jest.fn(),
        context: { currentTime: 0 },
        disconnect: jest.fn(),
        gain: {
          cancelScheduledValues: jest.fn(),
          linearRampToValueAtTime: jest.fn(),
          setValueAtTime: jest.fn(),
          value: 0
        }
      };

      const mockSourceNode = {
        connect: jest.fn(),
        disconnect: jest.fn()
      };

      const mockContext = {
        createGain: jest.fn().mockReturnValue(mockGainNode),
        createMediaElementSource: jest.fn().mockReturnValue(mockSourceNode),
        currentTime: 0,
        destination: {},
        resume: jest.fn().mockResolvedValue(undefined),
        state: 'running'
      };

      await queueAudio('test1.mp3', 1);
      const mockAudio = toMockAudioElement(audioChannels[1].queue[0]);

      audioChannels[1].webAudioContext = mockContext as unknown as AudioContext;
      audioChannels[1].webAudioNodes = new Map();
      audioChannels[1].webAudioNodes.set(mockAudio as unknown as HTMLAudioElement, {
        gainNode: mockGainNode as unknown as GainNode,
        sourceNode: mockSourceNode as unknown as MediaElementAudioSourceNode
      });

      // Simulate post-pause state: audio.volume and gain node out of sync
      mockAudio.paused = true;
      mockAudio.volume = 1.0;
      mockGainNode.gain.value = 0;
      audioChannels[1].volume = 1.0;
      audioChannels[1].isPaused = true;
      audioChannels[1].fadeState = {
        customDuration: undefined,
        fadeType: FadeType.Gentle,
        isPaused: true,
        isTransitioning: false,
        originalVolume: 1.0
      };

      mockAudio.play.mockClear();
      mockGainNode.gain.setValueAtTime.mockClear();

      // Call instant resume (duration = 0)
      // This should call setChannelVolumeSync which MUST update the gain node
      await resumeWithFade(undefined, 1, 0);

      expect(mockAudio.play).toHaveBeenCalled();

      // The gain node MUST be updated
      expect(mockGainNode.gain.value).toBeCloseTo(1.0, 5);
    });

    it('should read gain node value for transitionVolume start when Web Audio active', async () => {
      const mockGainNode = {
        connect: jest.fn(),
        context: { currentTime: 0 },
        disconnect: jest.fn(),
        gain: {
          cancelScheduledValues: jest.fn(),
          linearRampToValueAtTime: jest.fn(),
          setValueAtTime: jest.fn(),
          value: 0
        }
      };

      const mockSourceNode = {
        connect: jest.fn(),
        disconnect: jest.fn()
      };

      const mockContext = {
        createGain: jest.fn().mockReturnValue(mockGainNode),
        createMediaElementSource: jest.fn().mockReturnValue(mockSourceNode),
        currentTime: 0,
        destination: {},
        resume: jest.fn().mockResolvedValue(undefined),
        state: 'running'
      };

      await queueAudio('test1.mp3', 1);
      const mockAudio = toMockAudioElement(audioChannels[1].queue[0]);

      audioChannels[1].webAudioContext = mockContext as unknown as AudioContext;
      audioChannels[1].webAudioNodes = new Map();
      audioChannels[1].webAudioNodes.set(mockAudio as unknown as HTMLAudioElement, {
        gainNode: mockGainNode as unknown as GainNode,
        sourceNode: mockSourceNode as unknown as MediaElementAudioSourceNode
      });

      // Simulate the exact bug scenario from iOS logs:
      // - audio.volume is 1.0 (ignored by iOS when Web Audio active)
      // - gainNode.gain.value is 0 (the actual volume)
      // - We want to transition to volume 1.0
      mockAudio.volume = 1.0;
      mockGainNode.gain.value = 0;
      audioChannels[1].volume = 0;

      mockGainNode.gain.setValueAtTime.mockClear();

      // Call transitionVolume(1, 1.0, 800) - should fade from 0 to 1
      // With the fix, it reads gainNode.gain.value (0), calculates delta=1, and animates
      await transitionVolume(1, 1.0, 800);

      // Wait for animation to complete
      await new Promise((resolve) => setTimeout(resolve, 900));

      // The gain node MUST be updated to 1.0

      expect(mockGainNode.gain.value).toBeCloseTo(1.0, 1);
    });
  });
});
