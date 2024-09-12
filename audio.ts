export type AudioQueue = HTMLAudioElement[];

export type AudioQueueChannel = {
  queue: AudioQueue;
}

export const audioChannels: AudioQueueChannel[] = [];

export const queueAudio = async (audioUrl: string, channelNumber: number = 0): Promise<void> => {
  if (!audioChannels[channelNumber]) {
    audioChannels[channelNumber] = { queue: [] };
  }

  const audio: HTMLAudioElement = new Audio(audioUrl);
  audioChannels[channelNumber].queue.push(audio);

  if (audioChannels[channelNumber].queue.length === 1) {
    return playAudioQueue(channelNumber);
  }
};

const playAudioQueue = async (channelNumber: number): Promise<void> => {
  const channel: AudioQueueChannel = audioChannels[channelNumber];

  if (channel.queue.length === 0) return;

  const currentAudio: HTMLAudioElement = channel.queue[0];

  return new Promise<void>((resolve) => {
    currentAudio.addEventListener('ended', async () => {
      channel.queue.shift();
      await playAudioQueue(channelNumber);
      resolve();
    });

    currentAudio.play();
  });
};

export const stopCurrentAudioInChannel = (channelNumber: number = 0): void => {
  const channel: AudioQueueChannel = audioChannels[channelNumber];
  if (channel && channel.queue.length > 0) {
    const currentAudio: HTMLAudioElement = channel.queue[0];
    currentAudio.pause();
    channel.queue.shift();
    playAudioQueue(channelNumber);
  }
};

export const stopAllAudioInChannel = (channelNumber: number = 0): void => {
  const channel: AudioQueueChannel = audioChannels[channelNumber];
  if (channel) {
    if (channel.queue.length > 0) {
      const currentAudio: HTMLAudioElement = channel.queue[0];
      currentAudio.pause();
    }
    channel.queue = [];
  }
};

export const stopAllAudio = (): void => {
  audioChannels.forEach((_channel: AudioQueueChannel, index: number) => {
    stopAllAudioInChannel(index);
  });
};
