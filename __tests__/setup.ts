/**
 * @fileoverview Test setup and shared mocks for audio-channel-queue tests
 */

// Set longer timeout for audio tests
jest.setTimeout(15000);

// Enhanced mock for HTMLAudioElement with all properties we need
export class MockAudioElement {
  private _src: string = '';
  public duration: number = 120; // 2 minutes default
  public currentTime: number = 0;
  public paused: boolean = true;
  public ended: boolean = false;
  public readyState: number = 4; // HAVE_ENOUGH_DATA
  public loop: boolean = false; // Loop property
  public volume: number = 1.0; // Volume property (0-1)
  private eventListeners: Map<string, Set<EventListener>> = new Map();

  // These are the Jest mock functions
  public play: jest.MockedFunction<() => Promise<void>>;
  public pause: jest.MockedFunction<() => void>;
  public addEventListener: jest.MockedFunction<(event: string, listener: EventListener) => void>;
  public removeEventListener: jest.MockedFunction<(event: string, listener: EventListener) => void>;
  public dispatchEvent: jest.MockedFunction<(event: Event) => boolean>;

  constructor(src?: string) {
    if (src) {
      this.src = src;
    }

    // Initialize Jest mock functions
    this.play = jest.fn().mockImplementation(async () => {
      if (this.ended && !this.loop) {
        return Promise.resolve();
      }
      
      this.paused = false;
      this.ended = false;
      
      // Immediately trigger events for test detection
      setTimeout(() => {
        this.triggerEvent('loadedmetadata');
        this.triggerEvent('play');
      }, 0);
      
      return Promise.resolve();
    });

    this.pause = jest.fn().mockImplementation(() => {
      this.paused = true;
      this.triggerEvent('pause');
    });

    this.addEventListener = jest.fn().mockImplementation((event: string, listener: EventListener) => {
      if (!this.eventListeners.has(event)) {
        this.eventListeners.set(event, new Set());
      }
      this.eventListeners.get(event)!.add(listener);
    });

    this.removeEventListener = jest.fn().mockImplementation((event: string, listener: EventListener): void => {
      const listeners: Set<EventListener> | undefined = this.eventListeners.get(event);
      if (listeners) {
        listeners.delete(listener);
      }
    });

    this.dispatchEvent = jest.fn().mockImplementation((event: Event) => {
      this.triggerEvent(event.type as any);
      return true;
    });
  }

  get src(): string {
    return this._src;
  }

  set src(value: string) {
    this._src = value;
    // Automatically trigger loadedmetadata when src is set
    setTimeout(() => {
      this.readyState = 4;
      this.triggerEvent('loadedmetadata');
    }, 0);
  }

  // Utility method to trigger events for testing
  triggerEvent(eventType: string, eventData?: any): void {
    const listeners: Set<EventListener> | undefined = this.eventListeners.get(eventType);
    if (listeners) {
      const event: Event = new Event(eventType);
      Object.assign(event, eventData);
      listeners.forEach((listener: EventListener) => listener(event));
    }
  }

  // Simulate loading metadata
  simulateLoadedMetadata(): void {
    this.readyState = 4;
    this.triggerEvent('loadedmetadata');
  }

  // Simulate time updates
  simulateTimeUpdate(currentTime: number): void {
    this.currentTime = currentTime;
    this.triggerEvent('timeupdate');
  }

  // Simulate audio ending
  simulateEnded(): void {
    this.ended = true;
    this.paused = true;
    this.currentTime = this.duration;
    this.triggerEvent('ended');
  }

  // Reset method for test cleanup
  reset(): void {
    this.paused = true;
    this.ended = false;
    this.currentTime = 0;
    this.loop = false;
    this.volume = 1.0;
    
    // Clear mock call history
    this.play.mockClear();
    this.pause.mockClear();
    this.addEventListener.mockClear();
    this.removeEventListener.mockClear();
    this.dispatchEvent.mockClear();
  }
}

// Mock setTimeout to execute immediately in tests (for volume transitions and retries)
const originalSetTimeout = global.setTimeout;
global.setTimeout = ((callback: Function, delay?: number) => {
  if (delay === undefined || delay <= 5) {
    // Execute immediately for short delays (used in volume transitions and audio retries)
    callback();
    return 0 as any;
  }
  // Use original setTimeout for longer delays
  return originalSetTimeout(callback as any, delay);
}) as any;

// Patch setupAudioErrorHandling to preserve Jest mocks
jest.doMock('../src/errors', () => {
  const originalModule = jest.requireActual('../src/errors');
  return {
    ...originalModule,
    setupAudioErrorHandling: (audio: any, channelNumber: number, originalUrl: string, onError?: (error: Error) => Promise<void>) => {
      // Call the original function but don't wrap the play method if it's a Jest mock
      if (audio.play && typeof audio.play.mockImplementation === 'function') {
        // This is a Jest mock, don't wrap it - just call the original setupAudioErrorHandling without the onError wrapper
        return originalModule.setupAudioErrorHandling(audio, channelNumber, originalUrl, undefined);
      } else {
        // Not a Jest mock, use the original behavior
        return originalModule.setupAudioErrorHandling(audio, channelNumber, originalUrl, onError);
      }
    }
  };
});

// Mock HTMLAudioElement globally
global.HTMLAudioElement = MockAudioElement as any;

// Mock Audio constructor
(global as any).Audio = jest.fn().mockImplementation((src?: string) => {
  return new MockAudioElement(src);
});

// Test utilities
export const createMockAudio = (src: string = 'test.mp3', duration: number = 120): MockAudioElement => {
  const audio = new MockAudioElement(src);
  audio.duration = duration;
  return audio;
};

export const waitForPromises = async (maxWait: number = 100): Promise<void> => {
  const start = Date.now();
  
  // Multiple cycles to ensure all promises resolve - jsdom compatible
  while (Date.now() - start < maxWait) {
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    // Use setTimeout instead of setImmediate for jsdom compatibility
    await new Promise<void>((resolve) => setTimeout(resolve, 1));
  }
};

export const waitForAudioEvents = async (timeout: number = 50): Promise<void> => {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, timeout);
  });
};

export const mockCallback = <T extends (...args: any[]) => any>(): jest.MockedFunction<T> => {
  return jest.fn() as unknown as jest.MockedFunction<T>;
};

// Utility for comparing floating point numbers with tolerance
export const expectVolumeToBeCloseTo = (actual: number, expected: number, tolerance: number = 0.01): void => {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tolerance);
}; 