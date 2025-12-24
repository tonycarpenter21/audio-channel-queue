/**
 * @fileoverview Tests for Web Audio API support functionality
 */

import {
  isIOSDevice,
  isWebAudioSupported,
  shouldUseWebAudio,
  getWebAudioSupport,
  setWebAudioConfig,
  getWebAudioConfig,
  getAudioContext,
  createWebAudioNodes,
  setWebAudioVolume,
  getWebAudioVolume,
  resumeAudioContext,
  cleanupWebAudioNodes
} from '../src/web-audio';
import { WebAudioConfig, WebAudioSupport, WebAudioNodeSet } from '../src/types';

// Type definitions for mocks
interface MockAudioContext {
  createGain: jest.Mock;
  createMediaElementSource: jest.Mock;
  currentTime: number;
  destination: Record<string, unknown>;
  resume: jest.Mock;
  state: string;
}

interface MockAudioElement {
  pause: jest.Mock;
  play: jest.Mock;
  src: string;
  volume: number;
}

interface MockAudioParam {
  cancelScheduledValues: jest.Mock;
  linearRampToValueAtTime: jest.Mock;
  setValueAtTime: jest.Mock;
  value: number;
}

interface MockGainNode {
  connect: jest.Mock;
  context: MockAudioContext;
  disconnect: jest.Mock;
  gain: MockAudioParam;
}

interface MockGlobalThis {
  AudioContext?: jest.Mock;
  webkitAudioContext?: jest.Mock;
  window?: {
    AudioContext?: jest.Mock;
    webkitAudioContext?: jest.Mock;
  };
}

interface MockSourceNode {
  connect: jest.Mock;
  disconnect: jest.Mock;
}

// Mock global objects for testing
const mockAudioContext: MockAudioContext = {
  createGain: jest.fn(),
  createMediaElementSource: jest.fn(),
  currentTime: 0,
  destination: {},
  resume: jest.fn().mockResolvedValue(undefined),
  state: 'running'
};

const mockGainNode: MockGainNode = {
  connect: jest.fn(),
  context: mockAudioContext,
  disconnect: jest.fn(),
  gain: {
    cancelScheduledValues: jest.fn(),
    linearRampToValueAtTime: jest.fn(),
    setValueAtTime: jest.fn(),
    value: 1.0
  }
};

const mockSourceNode: MockSourceNode = {
  connect: jest.fn(),
  disconnect: jest.fn()
};

const mockAudio: MockAudioElement = {
  pause: jest.fn(),
  play: jest.fn().mockResolvedValue(undefined),
  src: 'test.mp3',
  volume: 1.0
};

// Mock navigator for iOS detection tests
const originalNavigator = global.navigator;

beforeEach(() => {
  jest.clearAllMocks();

  // Reset Web Audio API configuration
  setWebAudioConfig({
    autoDetectIOS: true,
    enabled: true,
    forceWebAudio: false
  });

  // Setup default AudioContext mock
  mockAudioContext.createMediaElementSource.mockReturnValue(mockSourceNode);
  mockAudioContext.createGain.mockReturnValue(mockGainNode);

  // Mock global AudioContext
  (global as unknown as MockGlobalThis).AudioContext = jest.fn(() => mockAudioContext);
  (global as unknown as MockGlobalThis).webkitAudioContext = jest.fn(() => mockAudioContext);

  // Mock window object
  (global as unknown as MockGlobalThis).window = {
    AudioContext: (global as unknown as MockGlobalThis).AudioContext,
    webkitAudioContext: (global as unknown as MockGlobalThis).webkitAudioContext
  };
});

afterEach(() => {
  // Restore original navigator
  Object.defineProperty(global, 'navigator', {
    value: originalNavigator,
    writable: true
  });

  // Clean up global mocks
  delete (global as unknown as MockGlobalThis).AudioContext;
  delete (global as unknown as MockGlobalThis).webkitAudioContext;
  delete (global as unknown as MockGlobalThis).window;
});

describe('iOS Device Detection', () => {
  it('should detect iPad as iOS device', () => {
    Object.defineProperty(global, 'navigator', {
      value: {
        userAgent:
          'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X) AppleWebKit/605.1.15 ' +
          '(KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1'
      },
      writable: true
    });

    expect(isIOSDevice()).toBe(true);
  });

  it('should detect iPhone as iOS device', () => {
    Object.defineProperty(global, 'navigator', {
      value: {
        userAgent:
          'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 ' +
          '(KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1'
      },
      writable: true
    });

    expect(isIOSDevice()).toBe(true);
  });

  it('should detect iPod as iOS device', () => {
    Object.defineProperty(global, 'navigator', {
      value: {
        userAgent:
          'Mozilla/5.0 (iPod touch; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 ' +
          '(KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1'
      },
      writable: true
    });

    expect(isIOSDevice()).toBe(true);
  });

  it('should detect modern iPad (MacIntel with touch) as iOS', () => {
    Object.defineProperty(global, 'navigator', {
      value: {
        maxTouchPoints: 2,
        userAgent:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 ' +
          '(KHTML, like Gecko) Version/14.0 Safari/605.1.15'
      },
      writable: true
    });

    expect(isIOSDevice()).toBe(true);
  });

  it('should not detect Mac as iOS device', () => {
    Object.defineProperty(global, 'navigator', {
      value: {
        maxTouchPoints: 0,
        userAgent:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
          '(KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      writable: true
    });

    expect(isIOSDevice()).toBe(false);
  });

  it('should not detect Windows as iOS device', () => {
    Object.defineProperty(global, 'navigator', {
      value: {
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
          '(KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      writable: true
    });

    expect(isIOSDevice()).toBe(false);
  });

  it('should return false when navigator is undefined', () => {
    Object.defineProperty(global, 'navigator', {
      value: undefined,
      writable: true
    });

    expect(isIOSDevice()).toBe(false);
  });
});

describe('Web Audio API Support Detection', () => {
  it('should detect Web Audio API support when AudioContext is available', () => {
    expect(isWebAudioSupported()).toBe(true);
  });

  it('should detect Web Audio API support when webkitAudioContext is available', () => {
    delete (global as unknown as MockGlobalThis).AudioContext;
    (global as unknown as MockGlobalThis).webkitAudioContext = jest.fn();

    expect(isWebAudioSupported()).toBe(true);
  });

  it('should return false when neither AudioContext nor webkitAudioContext is available', () => {
    delete (global as unknown as MockGlobalThis).AudioContext;
    delete (global as unknown as MockGlobalThis).webkitAudioContext;
    delete (global as unknown as MockGlobalThis).window;

    expect(isWebAudioSupported()).toBe(false);
  });
});

describe('Web Audio API Usage Decision', () => {
  it('should use Web Audio API when forced via configuration', () => {
    setWebAudioConfig({ forceWebAudio: true });

    Object.defineProperty(global, 'navigator', {
      value: {
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
          '(KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      writable: true
    });

    expect(shouldUseWebAudio()).toBe(true);
  });

  it('should use Web Audio API on iOS devices when auto-detection is enabled', () => {
    Object.defineProperty(global, 'navigator', {
      value: {
        userAgent:
          'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 ' +
          '(KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1'
      },
      writable: true
    });

    expect(shouldUseWebAudio()).toBe(true);
  });

  it('should not use Web Audio API on non-iOS devices by default', () => {
    Object.defineProperty(global, 'navigator', {
      value: {
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
          '(KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      writable: true
    });

    expect(shouldUseWebAudio()).toBe(false);
  });

  it('should not use Web Audio API when disabled in configuration', () => {
    setWebAudioConfig({ enabled: false });

    Object.defineProperty(global, 'navigator', {
      value: {
        userAgent:
          'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 ' +
          '(KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1'
      },
      writable: true
    });

    expect(shouldUseWebAudio()).toBe(false);
  });

  it('should not use Web Audio API when not supported', () => {
    delete (global as unknown as MockGlobalThis).AudioContext;
    delete (global as unknown as MockGlobalThis).webkitAudioContext;
    delete (global as unknown as MockGlobalThis).window;

    Object.defineProperty(global, 'navigator', {
      value: {
        userAgent:
          'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 ' +
          '(KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1'
      },
      writable: true
    });

    expect(shouldUseWebAudio()).toBe(false);
  });

  it('should not use Web Audio API on iOS when auto-detection is disabled', () => {
    setWebAudioConfig({ autoDetectIOS: false });

    Object.defineProperty(global, 'navigator', {
      value: {
        userAgent:
          'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 ' +
          '(KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1'
      },
      writable: true
    });

    expect(shouldUseWebAudio()).toBe(false);
  });
});

describe('Web Audio API Support Information', () => {
  it('should provide correct support information for iOS device', () => {
    Object.defineProperty(global, 'navigator', {
      value: {
        userAgent:
          'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 ' +
          '(KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1'
      },
      writable: true
    });

    const support: WebAudioSupport = getWebAudioSupport();

    expect(support.available).toBe(true);
    expect(support.isIOS).toBe(true);
    expect(support.usingWebAudio).toBe(true);
    expect(support.reason).toBe('iOS device detected - using Web Audio API for volume control');
  });

  it('should provide correct support information for non-iOS device', () => {
    Object.defineProperty(global, 'navigator', {
      value: {
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
          '(KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      writable: true
    });

    const support: WebAudioSupport = getWebAudioSupport();

    expect(support.available).toBe(true);
    expect(support.isIOS).toBe(false);
    expect(support.usingWebAudio).toBe(false);
    expect(support.reason).toBe('Using standard HTMLAudioElement volume control');
  });

  it('should provide correct support information when Web Audio API is disabled', () => {
    setWebAudioConfig({ enabled: false });

    const support: WebAudioSupport = getWebAudioSupport();

    expect(support.available).toBe(true);
    expect(support.usingWebAudio).toBe(false);
    expect(support.reason).toBe('Web Audio API disabled in configuration');
  });

  it('should provide correct support information when Web Audio API is not available', () => {
    delete (global as unknown as MockGlobalThis).AudioContext;
    delete (global as unknown as MockGlobalThis).webkitAudioContext;
    delete (global as unknown as MockGlobalThis).window;

    const support: WebAudioSupport = getWebAudioSupport();

    expect(support.available).toBe(false);
    expect(support.usingWebAudio).toBe(false);
    expect(support.reason).toBe('Web Audio API not supported in this environment');
  });

  it('should provide correct support information when forced', () => {
    setWebAudioConfig({ forceWebAudio: true });

    Object.defineProperty(global, 'navigator', {
      value: {
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
          '(KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      writable: true
    });

    const support: WebAudioSupport = getWebAudioSupport();

    expect(support.available).toBe(true);
    expect(support.isIOS).toBe(false);
    expect(support.usingWebAudio).toBe(true);
    expect(support.reason).toBe('Web Audio API forced via configuration');
  });
});

describe('Web Audio API Configuration', () => {
  it('should set and get Web Audio API configuration', () => {
    const config: Partial<WebAudioConfig> = {
      autoDetectIOS: false,
      enabled: false,
      forceWebAudio: true
    };

    setWebAudioConfig(config);
    const result = getWebAudioConfig();

    expect(result.enabled).toBe(false);
    expect(result.forceWebAudio).toBe(true);
    expect(result.autoDetectIOS).toBe(false);
  });

  it('should merge configuration with existing values', () => {
    setWebAudioConfig({ enabled: false });
    setWebAudioConfig({ forceWebAudio: true });

    const result = getWebAudioConfig();

    expect(result.enabled).toBe(false);
    expect(result.forceWebAudio).toBe(true);
    expect(result.autoDetectIOS).toBe(true); // Should remain default
  });
});

describe('AudioContext Management', () => {
  it('should create AudioContext successfully', () => {
    const context = getAudioContext();

    expect(context).toBe(mockAudioContext);
    expect((global as unknown as MockGlobalThis).AudioContext).toHaveBeenCalled();
  });

  it('should use webkitAudioContext as fallback', () => {
    delete (global as unknown as MockGlobalThis).AudioContext;
    const globalThis = global as unknown as MockGlobalThis;
    globalThis.window = { webkitAudioContext: globalThis.webkitAudioContext };

    const context = getAudioContext();

    expect(context).toBe(mockAudioContext);
    expect((global as unknown as MockGlobalThis).webkitAudioContext).toHaveBeenCalled();
  });

  it('should return null when Web Audio API is not supported', () => {
    delete (global as unknown as MockGlobalThis).AudioContext;
    delete (global as unknown as MockGlobalThis).webkitAudioContext;
    delete (global as unknown as MockGlobalThis).window;

    const context = getAudioContext();

    expect(context).toBe(null);
  });

  it('should handle AudioContext creation errors', () => {
    const throwingAudioContext = jest.fn(() => {
      throw new Error('AudioContext creation failed');
    });

    (global as unknown as MockGlobalThis).AudioContext = throwingAudioContext;
    (global as unknown as MockGlobalThis).window = {
      AudioContext: throwingAudioContext,
      webkitAudioContext: throwingAudioContext
    };

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    const context = getAudioContext();

    expect(context).toBe(null);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Failed to create AudioContext:',
      expect.any(Error)
    );

    consoleErrorSpy.mockRestore();
  });

  it('should resume suspended AudioContext', async () => {
    mockAudioContext.state = 'suspended';

    await resumeAudioContext(mockAudioContext as unknown as AudioContext);

    expect(mockAudioContext.resume).toHaveBeenCalled();
  });

  it('should not resume running AudioContext', async () => {
    mockAudioContext.state = 'running';

    await resumeAudioContext(mockAudioContext as unknown as AudioContext);

    expect(mockAudioContext.resume).not.toHaveBeenCalled();
  });

  it('should handle AudioContext resume errors', async () => {
    mockAudioContext.state = 'suspended';
    mockAudioContext.resume.mockRejectedValue(new Error('Resume failed'));

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    await resumeAudioContext(mockAudioContext as unknown as AudioContext);

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Failed to resume AudioContext:',
      expect.any(Error)
    );

    consoleErrorSpy.mockRestore();
  });
});

describe('Web Audio Node Management', () => {
  it('should create Web Audio nodes successfully', () => {
    const nodes = createWebAudioNodes(
      mockAudio as unknown as HTMLAudioElement,
      mockAudioContext as unknown as AudioContext
    );

    expect(nodes).toEqual({
      gainNode: mockGainNode,
      sourceNode: mockSourceNode
    });

    expect(mockAudioContext.createMediaElementSource).toHaveBeenCalledWith(mockAudio);
    expect(mockAudioContext.createGain).toHaveBeenCalled();
    expect(mockSourceNode.connect).toHaveBeenCalledWith(mockGainNode);
    expect(mockGainNode.connect).toHaveBeenCalledWith(mockAudioContext.destination);
  });

  it('should return null when node creation fails', () => {
    mockAudioContext.createMediaElementSource.mockImplementation(() => {
      throw new Error('Node creation failed');
    });

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    const nodes = createWebAudioNodes(
      mockAudio as unknown as HTMLAudioElement,
      mockAudioContext as unknown as AudioContext
    );

    expect(nodes).toBe(null);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Failed to create Web Audio nodes:',
      expect.any(Error)
    );

    consoleErrorSpy.mockRestore();
  });

  it('should clean up Web Audio nodes', () => {
    const nodes: WebAudioNodeSet = {
      gainNode: mockGainNode as unknown as GainNode,
      sourceNode: mockSourceNode as unknown as MediaElementAudioSourceNode
    };

    cleanupWebAudioNodes(nodes);

    expect(mockSourceNode.disconnect).toHaveBeenCalled();
    expect(mockGainNode.disconnect).toHaveBeenCalled();
  });

  it('should handle cleanup errors gracefully', () => {
    const nodes: WebAudioNodeSet = {
      gainNode: mockGainNode as unknown as GainNode,
      sourceNode: mockSourceNode as unknown as MediaElementAudioSourceNode
    };

    mockSourceNode.disconnect.mockImplementation(() => {
      throw new Error('Disconnect failed');
    });

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    cleanupWebAudioNodes(nodes);

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Error during Web Audio cleanup:',
      expect.any(Error)
    );

    consoleErrorSpy.mockRestore();
  });
});

describe('Web Audio Volume Control', () => {
  beforeEach(() => {
    mockGainNode.gain.value = 1.0;
    jest.clearAllMocks();
  });

  it('should set volume instantly without transition', () => {
    setWebAudioVolume(mockGainNode as unknown as GainNode, 0.5);

    expect(mockGainNode.gain.cancelScheduledValues).toHaveBeenCalledWith(0);
    expect(mockGainNode.gain.value).toBe(0.5);
    expect(mockGainNode.gain.linearRampToValueAtTime).not.toHaveBeenCalled();
  });

  it('should set volume with smooth transition', () => {
    setWebAudioVolume(mockGainNode as unknown as GainNode, 0.3, 500);

    expect(mockGainNode.gain.cancelScheduledValues).toHaveBeenCalledWith(0);
    expect(mockGainNode.gain.setValueAtTime).toHaveBeenCalledWith(1.0, 0);
    expect(mockGainNode.gain.linearRampToValueAtTime).toHaveBeenCalledWith(0.3, 0.5);
  });

  it('should clamp volume to valid range (0-1)', () => {
    setWebAudioVolume(mockGainNode as unknown as GainNode, 1.5);
    expect(mockGainNode.gain.value).toBe(1);

    setWebAudioVolume(mockGainNode as unknown as GainNode, -0.5);
    expect(mockGainNode.gain.value).toBe(0);
  });

  it('should get current volume from gain node', () => {
    mockGainNode.gain.value = 0.7;

    const volume = getWebAudioVolume(mockGainNode as unknown as GainNode);

    expect(volume).toBe(0.7);
  });

  it('should handle zero duration as instant transition', () => {
    setWebAudioVolume(mockGainNode as unknown as GainNode, 0.2, 0);

    expect(mockGainNode.gain.value).toBe(0.2);
    expect(mockGainNode.gain.linearRampToValueAtTime).not.toHaveBeenCalled();
  });

  it('should handle negative duration as instant transition', () => {
    setWebAudioVolume(mockGainNode as unknown as GainNode, 0.8, -100);

    expect(mockGainNode.gain.value).toBe(0.8);
    expect(mockGainNode.gain.linearRampToValueAtTime).not.toHaveBeenCalled();
  });
});

describe('Integration with HTML Audio Element', () => {
  it('should work with real HTML audio element properties', () => {
    const audio = mockAudio as unknown as HTMLAudioElement;
    const context = mockAudioContext as unknown as AudioContext;

    const nodes = createWebAudioNodes(audio, context);

    expect(nodes).not.toBe(null);
    if (nodes) {
      expect(mockAudioContext.createMediaElementSource).toHaveBeenCalledWith(audio);
    }
  });

  it('should maintain audio element functionality after Web Audio setup', () => {
    const audio = mockAudio as unknown as HTMLAudioElement;
    const context = mockAudioContext as unknown as AudioContext;

    createWebAudioNodes(audio, context);

    // Audio element should still be functional
    expect(audio.src).toBe('test.mp3');
    expect(audio.volume).toBe(1.0);
    expect(typeof audio.play).toBe('function');
    expect(typeof audio.pause).toBe('function');
  });
});
