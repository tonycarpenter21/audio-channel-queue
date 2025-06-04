# Audio Channel Queue
The purpose of this package is to help manage the playback of audio files. 

## 🌟 Key Features

- ✅ **Multi-channel queue management** - Independent audio queues for concurrent playback
- ✅ **Pause/Resume functionality** - Full playback control for individual channels or all channels
- ✅ **Volume control with ducking** - Dynamic volume management and automatic background audio reduction
- ✅ **Loop support** - Seamless audio looping for background music and ambient sounds
- ✅ **Priority queueing** - Add urgent audio to the front of any queue
- ✅ **Real-time progress tracking** - Comprehensive playback monitoring and metadata
- ✅ **Event-driven architecture** - Extensive callback system for UI integration
- ✅ **TypeScript support** - Full type definitions and IntelliSense support
- ✅ **Zero dependencies** - Lightweight and self-contained
- ✅ **Backward compatible** - All existing APIs continue to work

This package offers TypeScript support 📘, boasts zero dependencies 🚫, and is released under the MIT license 📜. As an added bonus, it's NON-GMO 🌱 and 100% Free Range Organic 🐓.

To preview this package and see how it works with visualized code examples, check out the demo that can be found here: [Audio Channel Queue Demo](https://tonycarpenter21.github.io/audio-queue-demo/). (A link to the demo repo can be found here: [Audio Channel Queue Demo Repo](https://github.com/tonycarpenter21/audio-queue-demo).)

NPM package can be found [here](https://www.npmjs.com/package/audio-channel-queue).

GitHub Repo can be found [here](https://github.com/tonycarpenter21/audio-channel-queue).

## 🌐 Browser Compatibility

This package is designed for **browser environments** and uses the Web Audio API (`HTMLAudioElement`). It is **not** intended for Node.js server-side use.

### ✅ **Supported Browsers:**
- **Chrome 51+** (June 2016)
- **Firefox 54+** (June 2017)  
- **Safari 10+** (September 2016)
- **Edge 15+** (April 2017)
- **Mobile browsers** with HTML5 audio support

### 🛠️ **Development Requirements:**
- **Node.js 14+** (for building and testing only)
- **TypeScript 4.5+** (included in devDependencies)

### ⚠️ **Not Supported:**
- Node.js server environments (no HTMLAudioElement)
- Internet Explorer (lacks ES6 support)
- Web Workers (no DOM access)

## Architecture & Code Organization 🏗️

Modular architecture for maintainability and extensibility:

```
src/
├── index.ts     # Main entry point with organized exports
├── types.ts     # TypeScript interfaces and type definitions  
├── core.ts      # Core queue management functions
├── pause.ts     # Pause and resume functionality
├── volume.ts    # Volume control and ducking management
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
```queueAudio(audioFileGoesHere, channelNumber, options);```
Use the `queueAudio()` function to add a file to the queue and start playing it automatically. It takes three arguments:
- The first argument is an imported sound file.
- The second argument is optional and it allows you to choose a different queue channel.
- The third argument is optional configuration for loop, volume, and priority.

### Queue Audio with Priority
```queueAudioPriority(audioFileGoesHere, channelNumber, options);```
Use the `queueAudioPriority()` function to add a file to the front of the queue (plays after current audio finishes). Perfect for urgent announcements!

### Stop Current Audio
```stopCurrentAudioInChannel(queueChannelNumberGoesHere);```
Use the `stopCurrentAudioInChannel()` function to stop the current playback of a file in a queue and start playing the next one automatically.

### Stop All Audio in Channel
```stopAllAudioInChannel(queueChannelNumberGoesHere);```
Use the `stopAllAudioInChannel()` function to stop the current playback of all files in a queue and removes all enqueued files.

### Stop All Audio
```stopAllAudio();```
Use the `stopAllAudio()` function to stop the current playback of all files in all queues. It takes no arguments.

## 🎛️ Volume Control Functions:

### Set Channel Volume
```setChannelVolume(channelNumber, volume);```
Set the volume for a specific channel (0-1 range).
```typescript
setChannelVolume(0, 0.5); // Set channel 0 to 50% volume
setChannelVolume(1, 0.8); // Set channel 1 to 80% volume
```

### Get Channel Volume
```getChannelVolume(channelNumber);```
Get the current volume level for a specific channel.
```typescript
const volume = getChannelVolume(0);
console.log(`Channel 0 volume: ${volume * 100}%`);
```

### Set All Channels Volume
```setAllChannelsVolume(volume);```
Set the same volume level for all channels.
```typescript
setAllChannelsVolume(0.6); // Set all channels to 60% volume
```

### Volume Ducking (Background Audio Reduction)
```setVolumeDucking(config);```
Automatically reduce other channels' volume when priority audio plays - perfect for voice announcements over background music!
```typescript
// When channel 1 plays, reduce all other channels to 20% volume
setVolumeDucking({
  priorityChannel: 1,
  priorityVolume: 1.0,
  duckingVolume: 0.2
});
```

```clearVolumeDucking();```
Remove volume ducking configuration from all channels.

## ⏯️ Pause/Resume Functions:

### Pause Channel
```pauseChannel(channelNumber);```
Pause audio playback in a specific channel.
```typescript
await pauseChannel(0); // Pause audio in channel 0
await pauseChannel(); // Pause audio in default channel
```

### Resume Channel
```resumeChannel(channelNumber);```
Resume audio playback in a specific channel.
```typescript
await resumeChannel(0); // Resume audio in channel 0
```

### Toggle Pause
```togglePauseChannel(channelNumber);```
Toggle between pause and resume states.
```typescript
await togglePauseChannel(0); // Pause if playing, resume if paused
```

### Pause/Resume All Channels
```pauseAllChannels();``` and ```resumeAllChannels();```
Control all channels simultaneously.
```typescript
await pauseAllChannels(); // Emergency pause - everything stops
await resumeAllChannels(); // Resume everything that was paused
```

### Global Toggle Pause/Resume
```togglePauseAllChannels();```
Smart toggle that pauses all channels if any are playing, or resumes all if all are paused.
```typescript
await togglePauseAllChannels(); // Pause all if any playing, resume all if all paused
```

### Check Pause State
```isChannelPaused(channelNumber);``` and ```getAllChannelsPauseState();```
```typescript
const isPaused = isChannelPaused(0);
const allPauseStates = getAllChannelsPauseState();
```

## Audio Information and Progress Tracking:

### AudioInfo Interface
The package provides detailed information about audio playback through the enhanced `AudioInfo` interface:
```typescript
interface AudioInfo {
  currentTime: number;       // Current position in milliseconds
  duration: number;          // Total duration in milliseconds
  fileName: string;          // Extracted filename from URL
  isLooping: boolean;        // Whether audio is set to loop
  isPaused: boolean;         // Whether audio is currently paused
  isPlaying: boolean;        // Whether audio is currently playing
  progress: number;          // Progress as percentage (0-1)
  src: string;               // Audio file source URL
  volume: number;            // Current volume level (0-1)
}
```

### Get Current Audio Info
```getCurrentAudioInfo(channelNumber);```
Get information about the currently playing audio in a specific channel. Returns `AudioInfo | null`.

### Get All Channels Info
```getAllChannelsInfo();```
Get audio information for all channels. Returns an array of `AudioInfo | null` objects.

### Queue State Management
```getQueueSnapshot(channelNumber);```
Get a complete snapshot of the queue state for a specific channel. Returns `QueueSnapshot | null`.

```typescript
interface QueueSnapshot {
  channelNumber: number;     // Channel this snapshot represents
  currentIndex: number;      // Index of currently playing item
  isPaused: boolean;         // Whether current audio is paused
  items: Array<{             // Array of queue items with metadata
    duration: number;
    fileName: string;
    isCurrentlyPlaying: boolean;
    isLooping: boolean;
    src: string;
    volume: number;
  }>;
  totalItems: number;        // Total items in queue
  volume: number;            // Current channel volume (0-1)
}
```

### Real-time Progress Tracking
```onAudioProgress(channelNumber, callback);```
Subscribe to real-time progress updates for a specific channel.

```offAudioProgress(channelNumber);```
Remove all progress listeners for a specific channel.

### Enhanced Event System
```onQueueChange(channelNumber, callback);```
Subscribe to queue change events for visual updates.

```onAudioStart(channelNumber, callback);```
Subscribe to audio start events.

```onAudioComplete(channelNumber, callback);```
Subscribe to audio completion events.

```onAudioPause(channelNumber, callback);```
Subscribe to audio pause events.

```onAudioResume(channelNumber, callback);```
Subscribe to audio resume events.

### Example Usage with All New Features:

`App.tsx`
```typescript
import backgroundMusic from './audio/background.mp3';
import announcement from './audio/announcement.wav';
import { 
  queueAudio, 
  queueAudioPriority,
  getCurrentAudioInfo,
  pauseChannel,
  resumeChannel,
  togglePauseAllChannels,
  setChannelVolume,
  setVolumeDucking,
  onAudioProgress,
  onAudioPause,
  onAudioResume,
  onQueueChange,
  AudioInfo,
  QueueSnapshot 
} from 'audio-channel-queue';
import { useState, useEffect } from 'react';

function App(): JSX.Element {
  const [currentInfo, setCurrentInfo] = useState<AudioInfo | null>(null);
  const [queueSnapshot, setQueueSnapshot] = useState<QueueSnapshot | null>(null);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    // Set up background music with looping
    const setupBackgroundMusic = async () => {
      await queueAudio(backgroundMusic, 0, { 
        loop: true, 
        volume: 0.3 
      });
      setChannelVolume(0, 0.3); // 30% volume for background
    };

    // Configure volume ducking for announcements
    setVolumeDucking({
      priorityChannel: 1,     // Announcements on channel 1
      priorityVolume: 1.0,    // Full volume for announcements
      duckingVolume: 0.1      // Reduce background to 10% during announcements
    });

    // Set up event listeners
    onAudioProgress(0, (info: AudioInfo) => {
      setCurrentInfo(info);
    });

    onQueueChange(0, (snapshot: QueueSnapshot) => {
      setQueueSnapshot(snapshot);
    });

    onAudioPause(0, (channelNumber, info) => {
      setIsPaused(true);
      console.log(`Channel ${channelNumber} paused: ${info.fileName}`);
    });

    onAudioResume(0, (channelNumber, info) => {
      setIsPaused(false);
      console.log(`Channel ${channelNumber} resumed: ${info.fileName}`);
    });

    setupBackgroundMusic();
  }, []);

  const playAnnouncement = async () => {
    // Priority queue - plays next, automatically ducks background music
    await queueAudioPriority(announcement, 1);
  };

  const toggleBackgroundMusic = async () => {
    if (isPaused) {
      await resumeChannel(0);
    } else {
      await pauseChannel(0);
    }
  };

  const adjustBackgroundVolume = (volume: number) => {
    setChannelVolume(0, volume);
  };

  const emergencyToggleAll = async () => {
    await togglePauseAllChannels(); // Smart toggle - pause all if any playing, resume all if all paused
  };

  return (
    <div className="App">
      <h2>Audio Control Center</h2>
      
      {/* Background Music Controls */}
      <div className="background-controls">
        <h3>Background Music</h3>
        <button onClick={toggleBackgroundMusic}>
          {isPaused ? '▶️ Resume' : '⏸️ Pause'}
        </button>
        <label>
          Volume: 
          <input 
            type="range" 
            min="0" 
            max="1" 
            step="0.1"
            onChange={(e) => adjustBackgroundVolume(Number(e.target.value))}
          />
        </label>
      </div>

      {/* Announcement Controls */}
      <div className="announcement-controls">
        <h3>Announcements</h3>
        <button onClick={playAnnouncement}>
          📢 Play Announcement (Auto-ducks background)
        </button>
      </div>

      {/* Emergency Controls */}
      <div className="emergency-controls">
        <h3>Emergency Controls</h3>
        <button onClick={emergencyToggleAll}>
          🚨 Toggle All Audio (Smart Pause/Resume)
        </button>
      </div>

      {/* Current Audio Info */}
      {currentInfo && (
        <div className="current-info">
          <h3>Now Playing:</h3>
          <p>🎵 {currentInfo.fileName}</p>
          <p>⏱️ {(currentInfo.currentTime / 1000).toFixed(1)}s / {(currentInfo.duration / 1000).toFixed(1)}s</p>
          <p>📊 Progress: {(currentInfo.progress * 100).toFixed(1)}%</p>
          <p>🔊 Volume: {(currentInfo.volume * 100).toFixed(0)}%</p>
          <p>🔄 Looping: {currentInfo.isLooping ? 'Yes' : 'No'}</p>
          <p>⏸️ Paused: {currentInfo.isPaused ? 'Yes' : 'No'}</p>
          
          {/* Progress Bar */}
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${currentInfo.progress * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Queue Status */}
      {queueSnapshot && (
        <div className="queue-status">
          <h3>Queue Status (Channel {queueSnapshot.channelNumber}):</h3>
          <p>📋 Total Items: {queueSnapshot.totalItems}</p>
          <p>🔊 Channel Volume: {(queueSnapshot.volume * 100).toFixed(0)}%</p>
          <p>⏸️ Channel Paused: {queueSnapshot.isPaused ? 'Yes' : 'No'}</p>
          
          <h4>Queue Items:</h4>
          <ul>
            {queueSnapshot.items.map((item, index) => (
              <li key={index} style={{ 
                fontWeight: item.isCurrentlyPlaying ? 'bold' : 'normal',
                color: item.isCurrentlyPlaying ? '#007bff' : 'inherit'
              }}>
                {item.fileName} ({(item.duration / 1000).toFixed(1)}s)
                {item.isCurrentlyPlaying && ' ▶️ PLAYING'}
                {item.isLooping && ' 🔄 LOOP'}
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

### Advanced Usage Examples:

#### Gaming Audio System
```typescript
// Background music (channel 0)
await queueAudio('./music/background.mp3', 0, { loop: true, volume: 0.4 });

// Sound effects (channel 1)
await queueAudio('./sfx/explosion.wav', 1);

// Voice chat (channel 2) - ducks other audio
setVolumeDucking({
  priorityChannel: 2,
  priorityVolume: 1.0,
  duckingVolume: 0.2
});

// Critical game announcements (priority)
await queueAudioPriority('./voice/game-over.wav', 2);
```

#### Podcast/Radio App
```typescript
// Main content (channel 0)
await queueAudio('./podcast/episode1.mp3', 0);

// Jingles and ads (channel 1) - interrupt at natural breaks
await queueAudioPriority('./ads/sponsor.mp3', 0);

// Background ambient (channel 2)
await queueAudio('./ambient/coffee-shop.mp3', 2, { 
  loop: true, 
  volume: 0.1 
});

// Pause everything for phone calls
onPhoneCall(() => pauseAllChannels());
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
- ✅ Pause and resume functionality for individual channels and all channels
- ✅ Volume control with per-channel precision (0-1 range)
- ✅ Volume ducking for priority audio (automatic background reduction)
- ✅ Audio looping capabilities for background music and ambient sounds
- ✅ Priority queueing system for urgent audio playback
- ✅ Real-time audio progress tracking with enhanced metadata
- ✅ Comprehensive event system (start, complete, pause, resume, queue changes)
- ✅ Audio duration and metadata extraction with loop and volume info
- ✅ Automatic filename extraction from URLs
- ✅ Queue state snapshots with pause and volume information
- ✅ TypeScript support with full type definitions
- ✅ Modular architecture with clean separation of concerns
- ✅ Comprehensive JSDoc documentation with examples
- ✅ Zero dependencies
- ✅ Backward compatible with existing implementations
- ✅ Comprehensive error handling with graceful degradation

## Development & Contributing 🛠️

The package uses a modular TypeScript architecture that makes it easy to contribute and extend:

### File Structure:
- **`src/types.ts`** - Interface definitions and type exports
- **`src/core.ts`** - Main queue management logic and priority queueing
- **`src/pause.ts`** - Pause and resume functionality
- **`src/volume.ts`** - Volume control and ducking management  
- **`src/info.ts`** - Audio information and progress tracking
- **`src/events.ts`** - Event system and callback management
- **`src/utils.ts`** - Helper functions and utilities
- **`src/index.ts`** - Public API exports

### Testing:
The package includes a comprehensive test suite with 74+ tests covering all functionality:

```bash
# Run tests once
npm test

# Run tests in watch mode during development
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

**Test Coverage**: 85%+ code coverage across all modules with realistic HTMLAudioElement mocking using jsdom.