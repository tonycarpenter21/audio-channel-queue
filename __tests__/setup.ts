/**
 * @fileoverview Test setup and shared mocks for audio-channel-queue tests
 */

// Set longer timeout for audio tests
jest.setTimeout(15000);

// Minimal interface representing the subset of HTMLAudioElement that we actually use
export interface MinimalAudioElement {
  src: string;
  duration: number;
  currentTime: number;
  paused: boolean;
  ended: boolean;
  readyState: number;
  loop: boolean;
  volume: number;
  play(): Promise<void>;
  pause(): void;
  addEventListener(type: string, listener: EventListener): void;
  removeEventListener(type: string, listener: EventListener): void;
  dispatchEvent(event: Event): boolean;
}

// Enhanced mock for HTMLAudioElement with all properties we need
export class MockAudioElement {
  addEventListener: jest.Mock = jest.fn();
  currentTime: number = 0;
  duration: number = 120;
  ended: boolean = false;
  error: MediaError | null = null;
  load: jest.Mock = jest.fn();
  loop: boolean = false;
  networkState: number = HTMLMediaElement.NETWORK_IDLE;
  parentNode: ParentNode | null = null;
  pause: jest.Mock = jest.fn();
  paused: boolean = true;
  play: jest.Mock = jest.fn().mockResolvedValue(undefined);
  readyState: number = 4;
  removeAttribute: jest.Mock = jest.fn();
  removeEventListener: jest.Mock = jest.fn();
  src: string = '';
  volume: number = 1;
  private eventListeners: Map<string, EventListener[]> = new Map();

  constructor(src?: string) {
    if (src) {
      this.src = src;
    }

    // Set up play behavior to update state
    this.play.mockImplementation(async () => {
      this.paused = false;
      this.ended = false;
      // Trigger events immediately for testing
      setTimeout(() => {
        this.triggerEvent('loadedmetadata');
        this.triggerEvent('play');
      }, 0);
      return Promise.resolve();
    });

    // Set up pause behavior
    this.pause.mockImplementation(() => {
      this.paused = true;
    });

    // Track event listeners properly
    this.addEventListener.mockImplementation((eventType: string, listener: EventListener) => {
      if (!this.eventListeners.has(eventType)) {
        this.eventListeners.set(eventType, []);
      }
      this.eventListeners.get(eventType)!.push(listener);
    });

    this.removeEventListener.mockImplementation((eventType: string, listener: EventListener) => {
      const listeners = this.eventListeners.get(eventType);
      if (listeners) {
        const index = listeners.indexOf(listener);
        if (index > -1) {
          listeners.splice(index, 1);
        }
      }
    });

    this.load.mockImplementation(() => {
      // Mock implementation - does nothing but doesn't throw errors
      return Promise.resolve();
    });
  }

  // Add the missing dispatchEvent method
  dispatchEvent(event: Event): boolean {
    const listeners = this.eventListeners.get(event.type);
    if (listeners) {
      listeners.forEach((listener) => {
        try {
          listener(event);
        } catch (error) {
          console.error('Error in event listener:', error);
        }
      });
    }
    return true;
  }

  // Methods for test control
  triggerEvent(eventType: string): void {
    const event = new Event(eventType);
    this.dispatchEvent(event);
  }

  simulateLoadedMetadata(): void {
    this.readyState = 4;
    this.triggerEvent('loadedmetadata');
  }

  simulatePlay(): void {
    this.paused = false;
    this.triggerEvent('play');
  }

  simulateEnded(): void {
    this.ended = true;
    this.paused = true;
    this.triggerEvent('ended');
  }

  simulateError(message: string = 'Test error'): void {
    this.error = { message } as MediaError;
    this.triggerEvent('error');
  }

  simulateTimeUpdate(time: number): void {
    this.currentTime = time;
    this.triggerEvent('timeupdate');
  }
}

// Type for setTimeout callback
type TimeoutCallback = () => void;

// Mock setTimeout to execute immediately in tests (for volume transitions and retries)
const originalSetTimeout = global.setTimeout;
global.setTimeout = ((callback: TimeoutCallback, delay?: number) => {
  if (delay === undefined || delay <= 5) {
    // Execute immediately for short delays (used in volume transitions and audio retries)
    callback();
    return 0 as unknown as ReturnType<typeof setTimeout>;
  } else if (delay === 16) {
    // For volume transitions using 16ms delays, use a proper timeout to prevent stack overflow
    return originalSetTimeout(callback, 1);
  }
  // Use original setTimeout for longer delays
  return originalSetTimeout(callback, delay);
}) as typeof setTimeout;

// Patch setupAudioErrorHandling to preserve Jest mocks
jest.doMock('../src/errors', () => {
  const originalModule = jest.requireActual('../src/errors');
  return {
    ...originalModule,
    setupAudioErrorHandling: (
      audio: HTMLAudioElement,
      channelNumber: number,
      originalUrl: string,
      onError?: (error: Error) => Promise<void>
    ): void => {
      // Call the original function but don't wrap the play method if it's a Jest mock
      if (
        audio.play &&
        typeof (audio.play as unknown as { mockImplementation?: unknown }).mockImplementation ===
          'function'
      ) {
        // This is a Jest mock, don't wrap it - just call the original setupAudioErrorHandling without the onError wrapper
        return originalModule.setupAudioErrorHandling(audio, channelNumber, originalUrl, undefined);
      } else {
        // Not a Jest mock, use the original behavior
        return originalModule.setupAudioErrorHandling(audio, channelNumber, originalUrl, onError);
      }
    }
  };
});

// Type declaration for extending global with HTMLAudioElement
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace NodeJS {
    interface Global {
      HTMLAudioElement: typeof HTMLAudioElement;
      Audio: typeof Audio;
    }
  }
}

// Mock HTMLAudioElement globally
(global as NodeJS.Global).HTMLAudioElement = MockAudioElement as unknown as typeof HTMLAudioElement;

// Mock Audio constructor
(global as NodeJS.Global).Audio = jest.fn().mockImplementation((src?: string) => {
  return new MockAudioElement(src);
}) as unknown as typeof Audio;

// Suppress expected console warnings during tests
const originalConsoleWarn = console.warn;
beforeEach(() => {
  // Silence expected security warnings in tests
  console.warn = jest.fn((message: string) => {
    if (
      message.includes('Direct modification of channel.') ||
      message.includes('Operation lock timeout') ||
      message.includes('Direct deletion from audioChannels')
    ) {
      // Suppress these expected warnings during tests
      return;
    }
    // Let other warnings through
    originalConsoleWarn(message);
  });
});

afterEach(() => {
  // Restore original console.warn
  console.warn = originalConsoleWarn;
});

// Test utilities
export const createMockAudio = (
  src: string = 'test.mp3',
  duration: number = 120
): MockAudioElement => {
  const audio = new MockAudioElement(src);
  audio.duration = duration;
  return audio;
};

// Helper to safely convert MockAudioElement to HTMLAudioElement for tests
export const toHTMLAudioElement = (mockAudio: MockAudioElement): HTMLAudioElement => {
  return mockAudio as unknown as HTMLAudioElement;
};

// Helper to safely convert HTMLAudioElement to MockAudioElement for tests
export const toMockAudioElement = (htmlAudio: HTMLAudioElement): MockAudioElement => {
  return htmlAudio as unknown as MockAudioElement;
};

export const waitForAudioEvents = async (timeout: number = 50): Promise<void> => {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, timeout);
  });
};

export const mockCallback = <T extends (...args: never[]) => unknown>(): jest.MockedFunction<T> => {
  return jest.fn() as unknown as jest.MockedFunction<T>;
};

// Utility for comparing floating point numbers with tolerance
export const expectVolumeToBeCloseTo = (
  actual: number,
  expected: number,
  tolerance: number = 0.01
): void => {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tolerance);
};

// Test channel number generator to ensure unique channel numbers across all tests
let testChannelCounter = 50; // Start at 50 to avoid conflicts with manual numbers but stay within MAX_CHANNELS=64

/**
 * Generates a unique channel number for tests to avoid conflicts
 * @returns A unique channel number for testing (50-63)
 */
export const getTestChannel = (): number => {
  if (testChannelCounter >= 64) {
    testChannelCounter = 50; // Wrap around to stay within limits
  }
  return testChannelCounter++;
};
