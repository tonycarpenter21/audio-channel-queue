"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.stopAllAudio = exports.stopAllAudioInChannel = exports.stopCurrentAudioInChannel = exports.queueAudio = exports.audioChannels = void 0;
exports.audioChannels = [];
const queueAudio = (audioUrl_1, ...args_1) => __awaiter(void 0, [audioUrl_1, ...args_1], void 0, function* (audioUrl, channelNumber = 0) {
    if (!exports.audioChannels[channelNumber]) {
        exports.audioChannels[channelNumber] = { queue: [] };
    }
    const audio = new Audio(audioUrl);
    exports.audioChannels[channelNumber].queue.push(audio);
    if (exports.audioChannels[channelNumber].queue.length === 1) {
        return playAudioQueue(channelNumber);
    }
});
exports.queueAudio = queueAudio;
const playAudioQueue = (channelNumber) => __awaiter(void 0, void 0, void 0, function* () {
    const channel = exports.audioChannels[channelNumber];
    if (channel.queue.length === 0)
        return;
    const currentAudio = channel.queue[0];
    return new Promise((resolve) => {
        currentAudio.addEventListener('ended', () => __awaiter(void 0, void 0, void 0, function* () {
            channel.queue.shift();
            yield playAudioQueue(channelNumber);
            resolve();
        }));
        currentAudio.play();
    });
});
const stopCurrentAudioInChannel = (channelNumber = 0) => {
    const channel = exports.audioChannels[channelNumber];
    if (channel && channel.queue.length > 0) {
        const currentAudio = channel.queue[0];
        currentAudio.pause();
        channel.queue.shift();
        playAudioQueue(channelNumber);
    }
};
exports.stopCurrentAudioInChannel = stopCurrentAudioInChannel;
const stopAllAudioInChannel = (channelNumber = 0) => {
    const channel = exports.audioChannels[channelNumber];
    if (channel) {
        if (channel.queue.length > 0) {
            const currentAudio = channel.queue[0];
            currentAudio.pause();
        }
        channel.queue = [];
    }
};
exports.stopAllAudioInChannel = stopAllAudioInChannel;
const stopAllAudio = () => {
    exports.audioChannels.forEach((_channel, index) => {
        (0, exports.stopAllAudioInChannel)(index);
    });
};
exports.stopAllAudio = stopAllAudio;
