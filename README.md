# Audio Channel Queue
The purpose of this package is to help manage the playback of audio files. 

🎵 [Demo](https://tonycarpenter21.github.io/audio-queue-demo/queue-management)

📚 [Docs](https://tonycarpenter21.github.io/audio-queue-docs/)

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

Documentation can be found [here](https://tonycarpenter21.github.io/audio-queue-docs/)

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
```typescript
// Add an audio file to the queue and start playing it automatically.
queueAudio(audioUrl, channelNumber?, options?);
queueAudio('hello.mp3'); // Add to default channel 0
queueAudio('laser.mp3', 1, { loop: true, volume: 0.8 }); // Add to channel 1 with options
```


### Queue Audio with Priority
```typescript
// Add a file to the front of the queue (plays after current audio finishes).
queueAudioPriority(audioUrl, channelNumber?, options?);
queueAudioPriority('urgent.mp3'); // Add to front of default channel 0
queueAudioPriority('announcement.mp3', 1, { volume: 1.0 }); // Add to front of channel 1
```


### Stop Current Audio
```typescript
// Stop the current audio and automatically start playing the next one in queue.
stopCurrentAudioInChannel(channelNumber?);
stopCurrentAudioInChannel(); // Stop current audio in default channel (0)
stopCurrentAudioInChannel(2); // Stop current audio in channel 2
```


### Stop All Audio in Channel
```typescript
// Stop all audio in a channel and remove all enqueued files.
stopAllAudioInChannel(channelNumber?);
stopAllAudioInChannel(); // Stop and clear all audio in default channel (0)
stopAllAudioInChannel(1); // Stop and clear all audio in channel 1
```

### Stop All Audio
```typescript
// Stop all audio in all channels and remove all enqueued files.
stopAllAudio();
```

## 🔄 Advanced Queue Manipulation:

### Remove Queued Item
```typescript
// Remove a specific item from the queue by its position (cannot remove currently playing item at index 0).
removeQueuedItem(queuedSlotNumber, channelNumber?);
const result = removeQueuedItem(2); // Remove item at index 2 from default channel (0)
const result = removeQueuedItem(1, 1); // Remove item at index 1 from channel 1
```

### Reorder Queue Items
```typescript
// Move a queue item from one position to another (cannot move currently playing item at index 0).
reorderQueue(currentQueuedSlotNumber, newQueuedSlotNumber, channelNumber?);
const result = reorderQueue(3, 1); // Move item from index 3 to index 1 in default channel (0)
const result = reorderQueue(2, 4, 1); // Move item from index 2 to index 4 in channel 1
```

### Clear Queue After Current
```typescript
// Remove all items from the queue except the currently playing audio.
clearQueueAfterCurrent(channelNumber?);
const result = clearQueueAfterCurrent(); // Clear queue after current in default channel (0)
const result = clearQueueAfterCurrent(2); // Clear queue after current in channel 2
```

### Swap Queue Items
```typescript
// Swap the positions of two items in the queue (cannot involve currently playing item at index 0).
swapQueueItems(firstQueuedSlotNumber, secondQueuedSlotNumber, channelNumber?);
const result = swapQueueItems(1, 3); // Swap items at index 1 and 3 in default channel (0)
const result = swapQueueItems(2, 4, 1); // Swap items at index 2 and 4 in channel 1
```

### Get Queue Item Info
```typescript
// Get information about a specific item in the queue.
getQueueItemInfo(queuedSlotNumber, channelNumber?);
const itemInfo = getQueueItemInfo(1); // Get info for item at index 1 in default channel (0)
const info = getQueueItemInfo(2, 1); // Get info for item at index 2 in channel 1
```

### Get Queue Length
```typescript
// Get the total number of items in a channel's queue.
getQueueLength(channelNumber?);
const length = getQueueLength(); // Get queue length for default channel (0)
const count = getQueueLength(2); // Get queue length for channel 2
```

```typescript
// All queue manipulation functions return a QueueManipulationResult:
interface QueueManipulationResult {
  success: boolean;          // Whether the operation was successful
  error?: string;            // Error message if operation failed
  updatedQueue?: QueueSnapshot; // The queue snapshot after the operation (if successful)
}
```

## 🎛️ Volume Control Functions:

### Set Channel Volume
```typescript
// Set the volume for a specific channel (0-1 range).
setChannelVolume(channelNumber, volume);
setChannelVolume(0, 0.5); // Set channel 0 to 50% volume
setChannelVolume(1, 0.8); // Set channel 1 to 80% volume
```

### Get Channel Volume
```typescript
// Get the current volume level for a specific channel.
getChannelVolume(channelNumber?);
const volume = getChannelVolume(); // Get default channel (0) volume
console.log(`Channel volume: ${(getChannelVolume(2) * 100).toFixed(0)}%`); // Get channel 2 volume
```

### Set All Channels Volume
```typescript
// Set the same volume level for all channels.
setAllChannelsVolume(volume);
setAllChannelsVolume(0.6); // Set all channels to 60% volume
setAllChannelsVolume(0.0); // Mute all channels
```

### Volume Ducking (Background Audio Reduction)
```typescript
// Automatically reduce other channels' volume when priority audio plays.
setVolumeDucking(config);
setVolumeDucking({ priorityChannel: 1, duckingVolume: 0.2 }); // Simple ducking
setVolumeDucking({
  priorityChannel: 1,
  priorityVolume: 1.0,
  duckingVolume: 0.2,
  transitionDuration: 500
}); // Full configuration
```

```typescript
// Remove volume ducking configuration from all channels.
clearVolumeDucking();
```

## ⏯️ Pause/Resume Functions:

### Pause Channel
```typescript
// Pause audio playback in a specific channel.
pauseChannel(channelNumber?);
await pauseChannel(); // Pause audio in default channel (0)
await pauseChannel(1); // Pause audio in channel 1
```

### Resume Channel
```typescript
// Resume audio playback in a specific channel.
resumeChannel(channelNumber?);
await resumeChannel(); // Resume audio in default channel (0)
await resumeChannel(1); // Resume audio in channel 1
```

### Toggle Pause
```typescript
// Toggle between pause and resume states.
togglePauseChannel(channelNumber?);
await togglePauseChannel(); // Toggle default channel (0)
await togglePauseChannel(1); // Toggle channel 1
```

### Pause/Resume All Channels
```typescript
// Pause all channels simultaneously.
pauseAllChannels();
await pauseAllChannels();
```

```typescript
// Resume all channels that were paused.
resumeAllChannels();
await resumeAllChannels();
```

### Global Toggle Pause/Resume
```typescript
// Smart toggle that pauses all channels if any are playing, or resumes all if all are paused.
togglePauseAllChannels();
await togglePauseAllChannels();
```

### Check Pause State
```typescript
// Check if a specific channel is paused.
isChannelPaused(channelNumber?);
const isPaused = isChannelPaused(); // Check if default channel (0) is paused
const channelPaused = isChannelPaused(2); // Check if channel 2 is paused
```

```typescript
// Get pause state for all channels.
getAllChannelsPauseState();
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
```typescript
// Get information about the currently playing audio in a specific channel.
getCurrentAudioInfo(channelNumber?);
const audioInfo = getCurrentAudioInfo(); // Get current audio info for default channel (0)
const info = getCurrentAudioInfo(1); // Get info for channel 1 - returns AudioInfo | null
```

### Get All Channels Info
```typescript
// Get audio information for all channels.
getAllChannelsInfo();
const allChannelsInfo = getAllChannelsInfo();
```

### Queue State Management
```typescript
// Get a complete snapshot of the queue state for a specific channel.
getQueueSnapshot(channelNumber?);
const queueSnapshot = getQueueSnapshot(); // Get snapshot for default channel (0)
const snapshot = getQueueSnapshot(2); // Get snapshot for channel 2 - returns QueueSnapshot | null
```

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
```typescript
// Subscribe to real-time progress updates for a specific channel.
onAudioProgress(channelNumber, callback);
onAudioProgress(0, (info) => console.log(info.progress)); // Simple progress logging
onAudioProgress(1, (info) => updateProgressBar(info.currentTime, info.duration)); // Complex UI update
```

```typescript
// Remove all progress listeners for a specific channel.
offAudioProgress(channelNumber?);
offAudioProgress(); // Remove all progress listeners in default channel (0)
offAudioProgress(1); // Remove all progress listeners in channel 1
```

### Enhanced Event System
```typescript
// Subscribe to queue change events for visual updates.
onQueueChange(channelNumber, callback);
onQueueChange(0, (snapshot) => updateQueueDisplay(snapshot)); // Update UI on queue changes
```

```typescript
// Subscribe to audio start events.
onAudioStart(channelNumber, callback);
onAudioStart(0, (info) => console.log(`Started: ${info.fileName}`)); // Log audio starts
```

```typescript
// Unsubscribe from audio start events (removes ALL start callbacks for the channel)
offAudioStart(channelNumber);
offAudioStart(0); // Stop receiving all start notifications for channel 0
```

```typescript
// Subscribe to audio completion events.
onAudioComplete(channelNumber, callback);
onAudioComplete(0, (info) => logPlayHistory(info)); // Track completed audio
```

```typescript
// Unsubscribe from audio completion events (removes ALL complete callbacks for the channel)
offAudioComplete(channelNumber);
offAudioComplete(0); // Stop receiving all completion notifications for channel 0
```

```typescript
// Subscribe to audio pause events.
onAudioPause(channelNumber, callback);
onAudioPause(0, (info) => showPauseIcon(info)); // Show pause state in UI
```

```typescript
// Subscribe to audio resume events.
onAudioResume(channelNumber, callback);
onAudioResume(0, (info) => showPlayIcon(info)); // Show play state in UI
```

### TypeScript Support
If you cannot import audio files into your app, you may need a `custom.d.ts` file in the root directory. An example of one is shown here:

`custom.d.ts`
```typescript
declare module '*.mp3' {
  const src: string;
  export default src;
}
```

## Development & Contributing 🛠️

The package uses a modular TypeScript architecture that makes it easy to contribute and extend:

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
