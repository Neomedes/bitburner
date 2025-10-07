## TODO

### Jobs

1. Finish `util/sing_job.ts` for the following functionality:
   - Search for best available job and apply if necessary
   - Dynamic determination, which reputation amount to target
   - Start working in job
   - Apply for promotion if needs are met
   - Intersect with studying for charisma
2. Start script for studying
   - Determine (auto or manual), which field to study (hack/charisma)
   - Determine (auto or manual) at what expense (free to expensive)
   - Determine (auto, manual or never) when to stop

### PAL - Purchase Augmentations List

The script `util/sing_augs_pal.ts` is there to provide all functionality for getting informations about augmentations.

These are:

- ✅ Find best augments
- ✅ Find best factions
- ➡ List missing requirements to join factions
- Find currently available PAL (for money, reputation)
- Consider pre-requisite augmentations in the buying order
- Find next level PAL (how much money and/or reputation is needed until the next best augmentations are available)

### More Cheap Data

1. Player data: Periodically update the player data

### Enhance Autostart

1. Study Computer Science at Rothman University
1. Do criminal activities in the slums
1. Start hacknet
1. Travel around the world to get Faction invitations
1. Work for specific companies to get their Faction's invitation
1. Consider different node phases:
   1. You have nothing => Start by 

## Current concepts

This is the current folder strategy:

```js
autostart.js  // Run after every Node start and Augment installation
cct/          // Solving contracts
hgw/          // Hacking servers for money and experience
lib/          // Common functionality
scripts/      // Direct use by player
util/         // Targetted scripts with single functionality (for minimal RAM usage)
```

## Original installation

This project was derived by these commands:

```
git clone https://github.com/bitburner-official/vscode-template
npm install
npm run defs
```

Attention: The last command refreshed definitions from the file `NetscriptDefinitions.d.ts`, but during this the file will be deleted and must be downloaded again, to keep all references valid:

https://github.com/bitburner-official/bitburner-src/blob/dev/src/ScriptEditor/NetscriptDefinitions.d.ts

## Overview over the original template
Write all your typescript source code in the `/src` directory

To autocompile as you save, run `npm run watch` in a terminal

To update your Netscript Definitions, run `npm run defs` in a terminal

Press F1 and Select `Bitburner: Enable File Watcher` to enable auto uploading to the game

If you run `watcher.js` in game, the game will automatically detect file changes and restart the associated scripts

## Imports
To ensure both the game and typescript have no issues with import paths, your import statements should follow a few formatting rules:

 * Paths must be absolute from the root of `src/`, which will be equivalent to the root directory of your home drive
 * Paths must contain no leading slash
 * Paths must end with no file extension

 ### Examples:

To import `helperFunction` from the file `helpers.ts` located in the directory `src/lib/`: 

```js
import { helperFunction } from 'lib/helpers'
```

To import all functions from the file `helpers.ts` located in the `src/lib/` directory as the namespace `helpers`:

```js
import * as helpers from 'lib/helpers'
```

To import `someFunction` from the file `main.ts` located in the `src/` directory:

```js
import { someFunction } from 'main'
```

## Deugging

For debugging bitburner on Steam you will need to enable a remote debugging port. This can be done by rightclicking bitburner in your Steam library and selecting properties. There you need to add `--remote-debugging-port=9222` [Thanks @DarkMio]

When debugging you see errors like the following:

```
Could not read source map for file:///path/to/Steam/steamapps/common/Bitburner/resources/app/dist/ext/monaco-editor/min/vs/editor/editor.main.js: ENOENT: no such file or directory, open '/path/to/Steam/steamapps/common/Bitburner/resources/app/dist/ext/monaco-editor/min/vs/editor/editor.main.js.map'
```

These errors are to be expected, they are referring to the game's files and the game does not come packaged with sourcemaps.