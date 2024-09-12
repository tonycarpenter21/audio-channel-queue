# Audio Queue Package
The purpose of this package is to help queue audio files so they do not play on top of each other. 

You can also enqueue audio files to different queues. This allows you to play sounds concurrently, but not have them overlap in their given audio queue.

To preview this package and see how it works with visualized code examples, check out the demo that can be found here: _____.

## How To Install This Package:
Install this package by running either of these commands:
- For npm run `npm install _____ --save?` (for typescript run `npm install ____ ____--save`)
- For yarn run `yarn add _____` (for typescript run `yarn add ____ ____`)

### How To Use This Package:
```queueAudio(audioFileGoesHere);```
Use the `queueAudio()` function to add a file to the queue and start playing it automatically. It takes two arguments:
- The first argument is an imported sound file.
- The second argument is optional and it allows you to choose a different queue channel. 

```stopCurrentAudioInChannel(queueChannelNumberGoesHere);```
Use the `stopCurrentAudioInChannel()` function to stop the current playback of a file in a queue and start playing the next one automatically. It takes one argument:
- The first argument is optional and it allows you to choose a different queue channel. If you are only using the default channel, just use `stopCurrentAudioInChannel()`.

```stopAllAudioInChannel(queueChannelNumberGoesHere);```
Use the `stopAllAudioInChannel()` function to stop the current playback of all files in a queue and removes all enqueued files. It takes one argument:
- The first argument is optional and it allows you to choose a different queue channel. If you are only using the default channel, just use `stopAllAudioInChannel()`.

```stopAllAudio(queueChannelNumberGoesHere);```
Use the `stopAllAudio()` function to stop the current playback of all files in all queues. It takes no arguments.

If you need to expose the queue array for logging or other purposes, it is available to you as well: `audioChannels`.

### Example Usage in React:

`App.tsx`
```
import redTeamWins from './audio/red_team_wins.mp3';
import { queueAudio } from './queue-audio-package ____';

function App(): JSX.Element {

  return (
    <div>
      <button onClick={()=> queueAudio(redTeamWins)}>Play sound</button>
    </div>
  )
};

export default App;
```

If you cannot import audio files into your app, you may need a `custom.d.ts` file in the root directory. An example of one is shown here:

`custom.d.ts`
```
declare module '*.mp3' {
  const src: string;
  export default src;
}
```