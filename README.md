# Audio Channel Queue
The purpose of this package is to help queue audio files so they do not play on top of each other. You can also enqueue audio files to different queues. This allows you to play sounds concurrently, but not have them overlap in their given audio queue. The package also supports real-time audio progress tracking, duration information, and playback metadata! 🎵📊

This package offers TypeScript support 📘, boasts zero dependencies 🚫, and is released under the MIT license 📜. As an added bonus, it's NON-GMO 🌱 and 100% Free Range Organic 🐓.

To preview this package and see how it works with visualized code examples, check out the demo that can be found here: [Audio Channel Queue Demo](https://tonycarpenter21.github.io/audio-queue-demo/). (A link to the demo repo can be found here: [Audio Channel Queue Demo Repo](https://github.com/tonycarpenter21/audio-queue-demo).)

NPM package can be found [here](https://www.npmjs.com/package/audio-channel-queue).

GitHub Repo can be found [here](https://github.com/tonycarpenter21/audio-channel-queue).

## Architecture & Code Organization 🏗️

Modular architecture for maintainability and extensibility:

```
src/
├── index.ts     # Main entry point with organized exports
├── types.ts     # TypeScript interfaces and type definitions  
├── core.ts      # Core queue management functions
├── info.ts      # Audio information and progress tracking
├── events.ts    # Event handling and emission logic
└── utils.ts     # Helper functions and utilities
```

## How To Install This Package:
Install this package by running either of these commands (typescript packages are included automatically):
- For npm run `npm install audio-channel-queue`
- For yarn run `yarn add audio-channel-queue`

## Basic Queue Management Functions:

### Queue Audio
```queueAudio(audioFileGoesHere, channelNumber);```
Use the `queueAudio()` function to add a file to the queue and start playing it automatically. It takes two arguments:
- The first argument is an imported sound file.
- The second argument is optional and it allows you to choose a different queue channel. 

### Stop Current Audio
```stopCurrentAudioInChannel(queueChannelNumberGoesHere);```
Use the `stopCurrentAudioInChannel()` function to stop the current playback of a file in a queue and start playing the next one automatically. It takes one argument:
- The first argument is optional and it allows you to choose a different queue channel. If you are only using the default channel, just use `stopCurrentAudioInChannel()`.

### Stop All Audio in Channel
```stopAllAudioInChannel(queueChannelNumberGoesHere);```
Use the `stopAllAudioInChannel()` function to stop the current playback of all files in a queue and removes all enqueued files. It takes one argument:
- The first argument is optional and it allows you to choose a different queue channel. If you are only using the default channel, just use `stopAllAudioInChannel()`.

### Stop All Audio
```stopAllAudio();```
Use the `stopAllAudio()` function to stop the current playback of all files in all queues. It takes no arguments.

## Audio Information and Progress Tracking:

### AudioInfo Interface
The package now provides detailed information about audio playback through the `AudioInfo` interface:
```typescript
interface AudioInfo {
  currentTime: number;       // Current position in milliseconds
  duration: number;          // Total duration in milliseconds
  fileName: string;          // Extracted filename from URL
  isPlaying: boolean;        // Whether audio is currently playing
  progress: number;          // Progress as percentage (0-1)
  src: string;               // Audio file source URL
}
```

### Get Current Audio Info
```getCurrentAudioInfo(channelNumber);```
Get information about the currently playing audio in a specific channel. Returns `AudioInfo | null`.
- `channelNumber` (optional): The channel number (defaults to 0)
- Returns `null` if no audio is currently playing in the channel

### Get All Channels Info
```getAllChannelsInfo();```
Get audio information for all channels. Returns an array of `AudioInfo | null` objects.
- Returns an array where each index corresponds to a channel number
- `null` values indicate channels with no currently playing audio

### Queue State Management
```getQueueSnapshot(channelNumber);```
Get a complete snapshot of the queue state for a specific channel. Returns `QueueSnapshot | null`.

```typescript
interface QueueSnapshot {
  channelNumber: number;     // Channel this snapshot represents
  totalItems: number;        // Total items in queue
  currentIndex: number;      // Index of currently playing item
  items: Array<{             // Array of queue items with metadata
    src: string;
    fileName: string;
    duration: number;
    isCurrentlyPlaying: boolean;
  }>;
}
```

### Real-time Progress Tracking
```onAudioProgress(channelNumber, callback);```
Subscribe to real-time progress updates for a specific channel.
- `channelNumber`: The channel number to monitor
- `callback`: Function that receives `AudioInfo` updates

```offAudioProgress(channelNumber);```
Remove all progress listeners for a specific channel.
- `channelNumber`: The channel number to stop monitoring

### Queue Change Events
```onQueueChange(channelNumber, callback);```
Subscribe to queue change events for visual updates.
- Triggered when items are added, removed, or when playback moves to next item
- Perfect for updating UI queue displays

```offQueueChange(channelNumber);```
Remove queue change listeners for a specific channel.

### Audio Lifecycle Events
```onAudioStart(channelNumber, callback);```
Subscribe to audio start events.
- Triggered when audio begins playing (after metadata loads)
- Provides duration, filename, and source information

```onAudioComplete(channelNumber, callback);```
Subscribe to audio completion events.
- Triggered when audio finishes or is stopped
- Includes remaining queue count information

### Example Usage with Progress Tracking:

`App.tsx`
```typescript
import redTeamWins from './audio/red_team_wins.mp3';
import { 
  queueAudio, 
  getCurrentAudioInfo, 
  onAudioProgress, 
  offAudioProgress,
  onQueueChange,
  onAudioStart,
  onAudioComplete,
  getQueueSnapshot,
  AudioInfo,
  QueueSnapshot 
} from 'audio-channel-queue';
import { useState, useEffect } from 'react';

function App(): JSX.Element {
  const [currentInfo, setCurrentInfo] = useState<AudioInfo | null>(null);
  const [queueSnapshot, setQueueSnapshot] = useState<QueueSnapshot | null>(null);
  const [isTracking, setIsTracking] = useState(false);

  const playSound = () => {
    queueAudio(redTeamWins);
    
    // Get initial audio info
    setTimeout(() => {
      const info = getCurrentAudioInfo();
      setCurrentInfo(info);
    }, 100);
  };

  const startTracking = () => {
    setIsTracking(true);
    
    // Track real-time progress
    onAudioProgress(0, (info: AudioInfo) => {
      setCurrentInfo(info);
      console.log(`Progress: ${(info.progress * 100).toFixed(1)}%`);
    });

    // Track queue changes
    onQueueChange(0, (snapshot: QueueSnapshot) => {
      setQueueSnapshot(snapshot);
      console.log(`Queue updated: ${snapshot.totalItems} items`);
    });

    // Track audio lifecycle
    onAudioStart(0, (info) => {
      console.log(`Started playing: ${info.fileName}`);
    });

    onAudioComplete(0, (info) => {
      console.log(`Completed: ${info.fileName}, ${info.remainingInQueue} remaining`);
    });
  };

  const stopTracking = () => {
    setIsTracking(false);
    offAudioProgress(0);
    offQueueChange(0);
  };

  const addMoreAudio = () => {
    queueAudio('./sounds/notification.wav');
    queueAudio('./sounds/alert.mp3');
  };

  return (
    <div className="App">
      <button onClick={playSound}>Play Sound</button>
      <button onClick={addMoreAudio}>Add More to Queue</button>
      <button onClick={startTracking} disabled={isTracking}>
        Start Progress Tracking
      </button>
      <button onClick={stopTracking} disabled={!isTracking}>
        Stop Progress Tracking
      </button>
      
      {currentInfo && (
        <div>
          <h3>Now Playing:</h3>
          <p>File: {currentInfo.fileName}</p>
          <p>Duration: {(currentInfo.duration / 1000).toFixed(1)}s</p>
          <p>Current Time: {(currentInfo.currentTime / 1000).toFixed(1)}s</p>
          <p>Progress: {(currentInfo.progress * 100).toFixed(1)}%</p>
          <p>Playing: {currentInfo.isPlaying ? 'Yes' : 'No'}</p>
        </div>
      )}

      {queueSnapshot && (
        <div>
          <h3>Queue Status:</h3>
          <p>Channel: {queueSnapshot.channelNumber}</p>
          <p>Total Items: {queueSnapshot.totalItems}</p>
          <p>Current Index: {queueSnapshot.currentIndex}</p>
          <ul>
            {queueSnapshot.items.map((item, index) => (
              <li key={index} style={{ 
                fontWeight: item.isCurrentlyPlaying ? 'bold' : 'normal' 
              }}>
                {item.fileName} ({(item.duration / 1000).toFixed(1)}s)
                {item.isCurrentlyPlaying && ' ▶️'}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default App;
```

### Legacy Access
If you need to expose the queue array for logging or other purposes, it is available to you as well: `audioChannels`.

### TypeScript Support
If you cannot import audio files into your app, you may need a `custom.d.ts` file in the root directory. An example of one is shown here:

`custom.d.ts`
```typescript
declare module '*.mp3' {
  const src: string;
  export default src;
}
```

## Features:
- ✅ Queue management across multiple channels
- ✅ Real-time audio progress tracking
- ✅ Audio duration and metadata extraction
- ✅ Automatic filename extraction from URLs
- ✅ Queue state snapshots and change events
- ✅ Audio lifecycle events (start/complete)
- ✅ TypeScript support with full type definitions
- ✅ Modular architecture with clean separation of concerns
- ✅ Comprehensive JSDoc documentation with examples
- ✅ Zero dependencies
- ✅ Backward compatible with existing implementations
- ✅ Comprehensive error handling

## Development & Contributing 🛠️

The package uses a modular TypeScript architecture that makes it easy to contribute and extend:

### File Structure:
- **`src/types.ts`** - Interface definitions and type exports
- **`src/core.ts`** - Main queue management logic
- **`src/info.ts`** - Audio information and progress tracking
- **`src/events.ts`** - Event system and callback management
- **`src/utils.ts`** - Helper functions and utilities
- **`src/index.ts`** - Public API exports

### Testing:
The package includes a comprehensive test suite with 64+ tests covering all functionality:

```bash
# Run tests once
npm test

# Run tests in watch mode during development
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

**Test Coverage**: 85%+ code coverage across all modules with realistic HTMLAudioElement mocking using jsdom.