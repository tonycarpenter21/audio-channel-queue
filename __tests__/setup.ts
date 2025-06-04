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

  constructor(src?: string) {
    if (src) {
      this.src = src;
    }
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

  play = jest.fn().mockImplementation(async () => {
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

  pause = jest.fn().mockImplementation(() => {
    this.paused = true;
    this.triggerEvent('pause');
  });

  addEventListener = jest.fn().mockImplementation((event: string, listener: EventListener) => {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(listener);
  });

  removeEventListener = jest.fn().mockImplementation((event: string, listener: EventListener): void => {
    const listeners: Set<EventListener> | undefined = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(listener);
    }
  });

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

  // Add dispatchEvent method
  dispatchEvent = jest.fn((event: Event) => {
    this.triggerEvent(event.type as any);
    return true;
  });

  // Reset method for test cleanup
  reset(): void {
    this.paused = true;
    this.ended = false;
    this.currentTime = 0;
    this.loop = false;
    this.volume = 1.0;
  }
}

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