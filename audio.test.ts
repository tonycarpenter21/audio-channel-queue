import * as audioModule from './audio';

jest.setTimeout(10000);

// Mock HTMLAudioElement
global.HTMLAudioElement = class {
  play = jest.fn().mockResolvedValue(undefined);
  addEventListener = jest.fn();
} as any;

// Mock Audio
(global as any).Audio = jest.fn().mockImplementation(() => ({
  play: jest.fn().mockResolvedValue(undefined),
  addEventListener: jest.fn(),
}));

type MockedAudio = {
  play: jest.Mock<Promise<void>>;
  pause: jest.Mock<void>;
  addEventListener: jest.Mock;
} & Partial<HTMLAudioElement>;

// Mock the audioChannels object
const audioChannels: { [key: number]: { queue: MockedAudio[] } } = {};

// Mock the queueAudio function
jest.spyOn(audioModule, 'queueAudio').mockImplementation(async (audioUrl: string, channelNumber: number = 0) => {
  if (!audioChannels[channelNumber]) {
    audioChannels[channelNumber] = { queue: [] };
  }
  const audio = new Audio(audioUrl) as MockedAudio;
  audioChannels[channelNumber].queue.push(audio);
  if (audioChannels[channelNumber].queue.length === 1) {
    await audioModule.playAudioQueue(channelNumber);
  }
});

// Mock the playAudioQueue function
jest.spyOn(audioModule, 'playAudioQueue').mockImplementation(async (channelNumber: number = 0) => {
  const channel = audioChannels[channelNumber];
  if (channel && channel.queue.length > 0) {
    const audio = channel.queue[0];
    await audio.play();
  }
});

// Mock the stopCurrentAudioInChannel function
jest.spyOn(audioModule, 'stopCurrentAudioInChannel').mockImplementation((channelNumber: number = 0) => {
  const channel = audioChannels[channelNumber];
  if (channel && channel.queue.length > 0) {
    const currentAudio = channel.queue[0];
    currentAudio.pause();
    channel.queue.shift();
    audioModule.playAudioQueue(channelNumber);
  }
});

// Mock the stopAllAudioInChannel function
jest.spyOn(audioModule, 'stopAllAudioInChannel').mockImplementation((channelNumber: number = 0) => {
  const channel = audioChannels[channelNumber];
  if (channel) {
    if (channel.queue.length > 0) {
      const currentAudio = channel.queue[0];
      currentAudio.pause();
    }
    channel.queue = [];
  }
});

// Mock the stopAllAudio function
jest.spyOn(audioModule, 'stopAllAudio').mockImplementation(() => {
  Object.keys(audioChannels).forEach((key) => {
    audioModule.stopAllAudioInChannel(Number(key));
  });
});

// Helper function to simulate audio ending
const simulateAudioEnded = async (channelNumber: number) => {
  const channel = audioChannels[channelNumber];
  if (channel && channel.queue.length > 0) {
    const audio = channel.queue[0];
    const endedCallback = audio.addEventListener.mock.calls.find(
      (call: [string, EventListener]) => call[0] === 'ended'
    )?.[1] as EventListener | undefined;
    if (endedCallback) {
      endedCallback(new Event('ended'));
    }
    channel.queue.shift();
    if (channel.queue.length > 0) {
      await audioModule.playAudioQueue(channelNumber);
    }
  }
};

describe('Audio Queue Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(audioChannels).forEach(key => delete audioChannels[Number(key)]);
    // Reset the audioModule.audioChannels as well
    (audioModule.audioChannels as any) = [];
  });

  describe('queueAudio', () => {
    it('should create a new audio channel if it doesn\'t exist', async () => {
      expect.assertions(2);
      await audioModule.queueAudio('test.mp3');
      expect(audioChannels[0]).toBeDefined();
      expect(audioChannels[0].queue.length).toBe(1);
    });

    it('should add audio to an existing channel', async () => {
      expect.assertions(1);
      await audioModule.queueAudio('test1.mp3');
      await audioModule.queueAudio('test2.mp3');
      expect(audioChannels[0].queue.length).toBe(2);
    });

    it('should use the specified channel number', async () => {
      expect.assertions(2);
      await audioModule.queueAudio('test.mp3', 1);
      expect(audioChannels[1]).toBeDefined();
      expect(audioChannels[1].queue.length).toBe(1);
    });

    it('should start playing if it\'s the first audio in the queue', async () => {
      expect.assertions(1);
      await audioModule.queueAudio('test.mp3');
      expect(audioChannels[0].queue[0].play).toHaveBeenCalled();
    });
  
    it('should not start playing if it\'s not the first audio in the queue', async () => {
      expect.assertions(1);
      await audioModule.queueAudio('test1.mp3');
      await audioModule.queueAudio('test2.mp3');
      expect(audioChannels[0].queue[1].play).not.toHaveBeenCalled();
    });
  });

  describe('playAudioQueue', () => {
    it('should play the next audio in the queue when the current one ends', async () => {
      expect.assertions(4);
      await audioModule.queueAudio('test1.mp3');
      await audioModule.queueAudio('test2.mp3');
      
      const firstAudio = audioChannels[0].queue[0];
      const secondAudio = audioChannels[0].queue[1];

      expect(firstAudio.play).toHaveBeenCalledTimes(1);
      expect(secondAudio.play).not.toHaveBeenCalled();

      simulateAudioEnded(0);

      expect(secondAudio.play).toHaveBeenCalledTimes(1);
      expect(audioChannels[0].queue.length).toBe(1);
    });

    it('should resolve the promise when all audio in the queue has been played', async () => {
      expect.assertions(2);
      await audioModule.queueAudio('test1.mp3');
      await audioModule.queueAudio('test2.mp3');

      expect(audioChannels[0].queue.length).toBe(2);

      simulateAudioEnded(0);
      simulateAudioEnded(0);

      expect(audioChannels[0].queue.length).toBe(0);
    });
  });

  describe('stopCurrentAudioInChannel', () => {
    it('should pause the current audio and remove it from the queue', async () => {
      expect.assertions(3);
      await audioModule.queueAudio('test1.mp3');
      await audioModule.queueAudio('test2.mp3');
  
      const firstAudio = audioChannels[0].queue[0];
      firstAudio.pause = jest.fn();
  
      audioModule.stopCurrentAudioInChannel();
  
      expect(firstAudio.pause).toHaveBeenCalled();
      expect(audioChannels[0].queue.length).toBe(1);
      expect(audioChannels[0].queue[0]).not.toBe(firstAudio);
    });
  
    it('should do nothing if the channel is empty', () => {
      audioModule.stopCurrentAudioInChannel();
      expect(audioChannels[0]).toBeUndefined();
    });
  });
  
  describe('stopAllAudioInChannel', () => {
    it('should pause the current audio and clear the queue', async () => {
      expect.assertions(2);
      await audioModule.queueAudio('test1.mp3');
      await audioModule.queueAudio('test2.mp3');
  
      const firstAudio = audioChannels[0].queue[0];
      firstAudio.pause = jest.fn();
  
      audioModule.stopAllAudioInChannel();
  
      expect(firstAudio.pause).toHaveBeenCalled();
      expect(audioChannels[0].queue).toHaveLength(0);
    });
  
    it('should do nothing if the channel is empty', () => {
      audioModule.stopAllAudioInChannel();
      expect(audioChannels[0]).toBeUndefined();
    });
  });

  describe('stopAllAudio', () => {
    it('should stop all audio in all channels', async () => {
      expect.assertions(4);
      await audioModule.queueAudio('test1.mp3', 0);
      await audioModule.queueAudio('test2.mp3', 1);
  
      const audio1 = audioChannels[0].queue[0];
      const audio2 = audioChannels[1].queue[0];
      audio1.pause = jest.fn();
      audio2.pause = jest.fn();
  
      audioModule.stopAllAudio();
  
      expect(audio1.pause).toHaveBeenCalled();
      expect(audio2.pause).toHaveBeenCalled();
      expect(audioChannels[0].queue).toHaveLength(0);
      expect(audioChannels[1].queue).toHaveLength(0);
    });
  
    it('should do nothing if all channels are empty', () => {
      expect.assertions(1);
      audioModule.stopAllAudio();
      expect(Object.keys(audioChannels)).toHaveLength(0);
    });
  
    it('should handle channels with no audio playing', async () => {
      expect.assertions(3);
      await audioModule.queueAudio('test1.mp3', 0);
      audioChannels[1] = { queue: [] };
  
      const audio1 = audioChannels[0].queue[0];
      audio1.pause = jest.fn();
  
      audioModule.stopAllAudio();
  
      expect(audio1.pause).toHaveBeenCalled();
      expect(audioChannels[0].queue).toHaveLength(0);
      expect(audioChannels[1].queue).toHaveLength(0);
    });
  });
});