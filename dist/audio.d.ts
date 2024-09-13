export type AudioQueue = HTMLAudioElement[];
export type AudioQueueChannel = {
    queue: AudioQueue;
};
export declare const audioChannels: AudioQueueChannel[];
export declare const queueAudio: (audioUrl: string, channelNumber?: number) => Promise<void>;
export declare const playAudioQueue: (channelNumber: number) => Promise<void>;
export declare const stopCurrentAudioInChannel: (channelNumber?: number) => void;
export declare const stopAllAudioInChannel: (channelNumber?: number) => void;
export declare const stopAllAudio: () => void;
