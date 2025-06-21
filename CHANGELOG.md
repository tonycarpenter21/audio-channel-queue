# Changelog

All notable changes to this project will be documented in this file.

## [1.9.0] - 2025-01-16

### Changed - TypeScript Code Quality & Standards Implementation 🎯
  - Configuration defaults preserve `0` durations and empty configs
  - Retry attempts and Map.get() operations now handle falsy values correctly

- **🧹 Linting & Code Standards**: Achieved zero linting errors and warnings across entire codebase
  - **Enhanced type declarations**: All variables now have explicit types 

### Technical Improvements
- **Implemented Prettier & ESLint**: Implemented formatting packages to improve code style consistency in the repo.
- **Enhanced type mapping**: Progress callbacks now use proper symbol-based keys for type safety
- **Better mock typing**: Test setup uses proper function types instead of generic Function type
- **Explicit variable typing**: All Map, WeakMap, and loop variables have explicit type annotations
- **Symbol-based constants**: Replaced type assertions with proper symbol constants for global operations

### Fixed
- **Type assertion safety**: Eliminated all `null as any` type assertions that could cause runtime errors
- **Progress callback typing**: Fixed type safety issues in global progress callback management
- **Test compilation**: Resolved TypeScript compilation errors in test files

## [1.8.0] - 2025-01-16

### Added - Enhanced Fade System & Type Safety Improvements 🎵
- **🎛️ Improved Fade Types**: Enhanced fade options with consistent timing and better Linear support
  - `Linear` - Steady, consistent fade (800ms, linear transition)
  - `Gentle` - Smooth, subtle fade (800ms, ease-out → ease-in)
  - `Dramatic` - Quick, pronounced fade (800ms, ease-in → ease-out)
  - **Automatic pairing**: Resume operations use the complementary curve of the pause operation
  - **No manual curve management**: Users just pick the feel they want, package handles the rest

- **🎯 Enhanced Type Safety**: Converted string literal types to enums for better IntelliSense support
  - `EasingType` enum with `Linear`, `EaseIn`, `EaseOut`, `EaseInOut` values
  - `FadeType` enum with `Linear`, `Gentle`, `Dramatic` values
  - **Backward compatibility**: Enum string values match previous literal types exactly

- **🔧 Improved Configuration System**: Better fade and easing configuration management
  - All fade configurations now use enum keys for consistency
  - Enhanced `VolumeConfig.transitionEasing` to use `EasingType` enum
  - Updated `FADE_CONFIGS` mapping to use enum property keys

### Technical Improvements
- **Backward compatibility maintained** - existing string usage continues to work
- **Enhanced TypeScript definitions** for all enum types and related interfaces

## [1.7.0] - 2025-01-16

### Added - Comprehensive Error Handling & Recovery System 🚨
- **🔧 Error Detection & Categorization**: Automatic error type classification
  - `onAudioError(channelNumber, callback)` - Subscribe to error events with detailed error information
  - `offAudioError(channelNumber, callback)` - Remove error event listeners
  - **Error categorization**: Network, decode, unsupported, permission, abort, timeout, and unknown error types
  - **Rich error context**: Error type, retry attempt, remaining queue items, timestamps, and file information

- **🔄 Smart Retry Logic with Exponential Backoff**: Automatic recovery from transient failures
  - `setRetryConfig(config)` - Configure retry behavior (max attempts, delays, timeouts)
  - `getRetryConfig()` - Get current retry configuration
  - `retryFailedAudio(channelNumber)` - Manually retry failed audio
  - **Exponential backoff**: Progressive delay increases (1s → 2s → 4s → 8s) to avoid overwhelming servers
  - **Fallback URL support**: Automatically tries backup servers/CDNs when primary source fails
  - **Configurable timeouts**: Set maximum wait times for audio loading
  - **Skip vs preserve**: Choose to skip failed tracks or keep retrying

- **🎵 Advanced Error Recovery**: Intelligent queue management during failures
  - `setErrorRecovery(options)` - Configure error recovery behavior
  - `getErrorRecovery()` - Get current recovery settings
  - **Auto-continue playback**: Automatically plays next track when current fails
  - **Queue preservation**: Keeps remaining tracks even if one fails
  - **User feedback options**: Optional error notifications and analytics logging
  - **Graceful degradation**: Maintains audio experience even when some sources fail

### Added - Enhanced Type System & Utilities
- **📋 QueueItem Type**: Complete type definition for individual queue items
  - New `QueueItem` interface with duration, filename, playing status, looping state, source URL, and volume
  - Enhanced type safety for queue manipulation and display
  - Full TypeScript intellisense support for queue item properties

- **🛠️ Utility Function Exports**: Previously internal utilities now publicly available
  - `extractFileName(url)` - Extract clean filenames from URLs for display
  - `getAudioInfoFromElement(audio, channel)` - Extract comprehensive audio metadata
  - `createQueueSnapshot(channel)` - Generate detailed queue state snapshots
  - `cleanWebpackFilename(filename)` - Clean up bundled filenames for better UX

### Changed - Code Quality & Architecture Improvements
  - Improved performance by removing unnecessary runtime checks

- **⚡ Volume Transition Improvements**: More precise volume control behavior
  - Better API contract: Short durations (1-5ms) now execute as requested instead of instant
  - Improved test reliability through proper mocking instead of production code workarounds

- **🏗️ Enhanced Test Architecture**: Better separation of concerns in testing
  - Proper Jest mock preservation through test utilities
  - Faster test execution with optimized setTimeout mocking for volume transitions

### Added - Error Handling Integration Examples
- **Network failure simulation** with automatic retry and fallback URL demonstration
- **Mixed success/failure queue handling** showing graceful degradation
- **Real-time error monitoring** with detailed error event information
- **Custom recovery configuration** examples for different use cases
- **Multi-channel error isolation** ensuring independent error handling per channel

### Technical Improvements
- **Error event emission** with comprehensive error context and metadata
- **Timeout protection** for audio loading with configurable time limits
- **Memory-safe error handling** with proper cleanup of retry attempts and timeouts
- **Backward compatibility maintained** - all existing APIs continue to work without changes
- **Enhanced TypeScript definitions** for all new error handling interfaces and types

### Fixed
- **Test mock preservation**: Jest mocks now properly maintained during error handling setup
- **Volume transition precision**: Corrected timing behavior for short-duration volume changes
- **Code coupling issues**: Eliminated dependencies between production code and testing frameworks
- **Export completeness**: All utility functions and types now properly exported from package

## [1.6.0] - 2025-01-16

### Added - Major Feature Expansion 🚀
- **⏯️ Pause/Resume System**: Complete playback control for individual channels and all channels
  - `pauseChannel(channelNumber)` - Pause specific channel
  - `resumeChannel(channelNumber)` - Resume specific channel  
  - `togglePauseChannel(channelNumber)` - Toggle pause state
  - `pauseAllChannels()` - Emergency pause everything
  - `resumeAllChannels()` - Resume everything that was paused
  - `isChannelPaused(channelNumber)` - Check pause state
  - `getAllChannelsPauseState()` - Get all channel pause states

- **🔊 Volume Control with Ducking**: Dynamic volume management and automatic background audio reduction
  - `setChannelVolume(channelNumber, volume)` - Per-channel volume control (0-1 range)
  - `getChannelVolume(channelNumber)` - Get current channel volume
  - `setAllChannelsVolume(volume)` - Set all channels to same volume
  - `getAllChannelsVolume()` - Get all channel volumes
  - `setVolumeDucking(config)` - Auto-reduce background audio when priority audio plays
  - `clearVolumeDucking()` - Remove ducking configuration
  - `applyVolumeDucking()` and `restoreVolumeLevels()` - Manual ducking control
  - **Smooth volume transitions** with configurable easing (linear, ease-in, ease-out, ease-in-out)
  - **Advanced ducking configuration** with separate transition durations for duck and restore

- **🔄 Audio Looping**: Seamless audio looping for background music and ambient sounds
  - `queueAudio(url, channel, { loop: true })` - Enable looping for any audio
  - Enhanced `AudioInfo` interface with `isLooping` property
  - Perfect for background music, ambient sounds, and continuous audio

- **⚡ Priority Queueing**: Add urgent audio to the front of any queue
  - `queueAudioPriority(audioUrl, channelNumber, options)` - Dedicated priority function
  - `queueAudio(url, channel, { priority: true })` - Alternative priority syntax
  - Plays after current audio finishes (user-friendly, non-interrupting)

- **📊 Enhanced Audio Information**: Comprehensive audio metadata and state tracking
  - Updated `AudioInfo` interface with `isPaused`, `isLooping`, `volume` properties
  - Enhanced `QueueSnapshot` interface with pause state and volume information
  - New event callbacks: `onAudioPause(channelNumber, callback)`, `onAudioResume(channelNumber, callback)`
  - Real-time pause/resume state tracking across all channels

- **🎛️ Advanced Options System**: Flexible audio configuration
  - `AudioQueueOptions` interface supporting `loop`, `volume`, `priority`, `addToFront`
  - Volume options with automatic clamping (0-1 range) and NaN handling
  - Channel volume inheritance and per-audio volume overrides

### Added - New Module Structure
- **`src/pause.ts`** - Complete pause/resume functionality with state management
- **`src/volume.ts`** - Volume control, ducking, and smooth transitions
- **Enhanced `src/core.ts`** - AudioQueueOptions support, priority queueing, async stop functions
- **Enhanced `src/events.ts`** - Added pause/resume event emission
- **Enhanced `src/info.ts`** - Pause/resume event subscriptions
- **Enhanced `src/types.ts`** - New interfaces for volume config, audio options, pause callbacks

### Added - Comprehensive Testing
- **155 total tests** across all functionality (100% pass rate)
- **`__tests__/pause.test.ts`** - Complete pause/resume functionality testing (334 lines)
- **`__tests__/volume.test.ts`** - Volume control and ducking tests (474 lines)
- **`__tests__/core-enhancements.test.ts`** - Looping, priority queueing, options integration (388 lines)
- **Enhanced test utilities** with async waiting, floating-point comparisons, and proper mock management
- **Comprehensive edge case coverage** including error handling, state management, and integration scenarios

### Changed
- **All stop functions now async** (`stopCurrentAudioInChannel`, `stopAllAudioInChannel`, `stopAllAudio`) to support volume restoration
- **Enhanced channel structure** with pause state tracking and volume configuration
- **Improved MockAudioElement** in tests with proper lifecycle management and event simulation
- **Enhanced error handling** with graceful NaN volume handling and robust state management
- **README.md completely updated** with comprehensive examples for gaming, podcast, educational apps
- **Feature count expanded** from 8 to 16 total package features

### Fixed
- **Async timing issues** in tests with proper promise handling and event synchronization
- **Volume precision issues** with floating-point comparison utilities
- **Test reliability** with enhanced mock setup and cleanup procedures
- **Memory management** with proper event listener cleanup and state reset

### Technical Improvements
- **Smooth volume transitions** with configurable duration and easing functions
- **Modular volume ducking** with priority channel detection and automatic restoration
- **Non-blocking audio playback** to prevent test timeouts and improve responsiveness
- **Enhanced JSDoc documentation** with realistic usage examples for all new functions
- **Backward compatibility maintained** - all existing APIs continue to work without changes

### Examples Added
- **Gaming audio system** with background music, sound effects, and voice chat ducking
- **Radio/podcast app** with main content, commercial breaks, and ambient background
- **Educational app** with lessons, study music, and interactive feedback
- **React component examples** demonstrating real-time audio info display and control interfaces

## [1.5.0] - 2025-06-01

### Added
- **AudioInfo Interface**: New interface providing comprehensive audio metadata including duration, current time, progress, filename, playing status, and source URL
- **getCurrentAudioInfo()**: Function to get current audio information for a specific channel
- **getAllChannelsInfo()**: Function to get audio information for all channels
- **onAudioProgress()**: Real-time progress tracking with callback subscription
- **offAudioProgress()**: Function to remove progress listeners
- **getQueueSnapshot()**: Function to get complete queue state snapshots
- **onQueueChange()**: Subscribe to queue change events for visual updates
- **offQueueChange()**: Remove queue change listeners
- **onAudioStart()**: Subscribe to audio start events
- **onAudioComplete()**: Subscribe to audio completion events
- **Comprehensive test suite** with 64+ tests covering all functionality (85%+ code coverage)
- **Jest testing framework** with jsdom environment for realistic HTMLAudioElement testing
- **Test commands**: `npm test`, `npm run test:watch`, `npm run test:coverage`
- **Automatic filename extraction** from audio URLs
- **Real-time event listeners** for timeupdate, loadedmetadata, play, pause, and ended events
- **Comprehensive JSDoc documentation** for all functions with examples
- **Enhanced TypeScript support** with full type definitions for new features
- **cleanWebpackFilename()**: New utility function to remove webpack hash patterns from filenames for cleaner display names
- **Enhanced event timing**: onAudioStart now waits for both loadedmetadata and play events to ensure accurate duration information

### Changed
- **BREAKING**: Reorganized entire codebase into modular structure:
  - `src/types.ts` - All TypeScript interfaces and type definitions
  - `src/utils.ts` - Helper functions (filename extraction, audio info extraction)
  - `src/events.ts` - Event handling and emission logic
  - `src/info.ts` - Audio information and progress tracking functions
  - `src/core.ts` - Core queue management functions
  - `src/index.ts` - Main entry point with organized exports
- **Package entry point** changed from `dist/audio.js` to `dist/index.js`
- Extended internal channel structure to support multiple callback types
- Updated README with comprehensive examples and documentation for new features
- All time values now consistently returned in milliseconds
- Enhanced error handling for audio metadata edge cases
- **Object keys alphabetically sorted** throughout codebase for consistency
- **File-level JSDoc headers** added to all modules

### Fixed
- Improved event listener cleanup to prevent memory leaks
- Resolved circular dependency issues in module imports
- Enhanced TypeScript compilation configuration

### Migration Guide
- **No breaking changes to public API** - all existing function calls remain the same
- Import statements unchanged - the package automatically exports from the new modular structure

## [1.4.0] - 2023-09-13

### Added
- Implemented Jest and Jest Testing
- Created Changelog

### Changed
- Updated ReadMe

### Fixed
- Removed node_modules from git tracking

## [1.3.0] - 2024-09-11

### Changed
- Updated ReadMe

## [1.2.0] - 2024-09-11

### Changed
- Updated ReadMe

## [1.1.0] - 2024-09-11

### Changed
- Updated ReadMe

## [1.0.0] - 2024-09-11