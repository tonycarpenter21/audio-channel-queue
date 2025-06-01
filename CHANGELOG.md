# Changelog

All notable changes to this project will be documented in this file.

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