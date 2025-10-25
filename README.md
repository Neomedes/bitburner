## TODO

1. Use Player.jobs to reduce risk of errors in `sing_job.js`

### PAL - Purchase Augmentations List

The script `util/sing_augs_pal.ts` is there to provide all functionality for getting informations about augmentations.

These are:

- ✅ Find best augments of all factions
- ✅ Find best factions
- ✅ List missing requirements to join a factions
- ✅ Find currently available PAL (for money, reputation)
- ✅ Consider pre-requisite augmentations in the buying order
- ✅ Find next level PAL (how much money and/or reputation is needed until the next best augmentations are available)
- Split information about reputation, hacking and overall score
- Make it possible to first search for charisma upgrades and hacking upgrade thereafter
- Split reputation into faction and company reputation

### More Cheap Data

1. ✅ Basic Player data
   1. Periodically update the player data
   1. Money sources (`ns.getMoneySources()`)
   1. Strategy data (what to do, settings for all scripts)
1. ✅ Faction data
1. Company data

### Enhance Autoplay

1. Start: Study Computer Science at Rothman University at least for 1 minute or when a hacking skill of 50 is reached
1. Then do criminal activities in the slums:
   1. Shoplift until mugging is at 100%
   1. Mug until Homicide is at 100%
   1. Homicide until something else is needed (like studying/working for factions/companies)
1. Start hacknet
1. Hacking servers:
   1. First hack n00dles -> joesguns -> phantasy
   1. First, use the whole botnet
   1. When home gets better (CPU x RAM > Botnet RAM), switch to fill home with one script instead of using the botnet
   1. Additionally: When enough hacking skill is acquired, open backdoors on all servers
1. Determine which factions to join and what to do to get an invitation
   1. Travel around the world
   1. Work for companies
1. Determine how much reputation is needed for the best augments of this faction and how to get there
   1. Work for the faction (in the best job available)
   1. Eyeball whether it is faster to
      - directly get to the max reputation
      - by first getting to 150 favor (487491 reputation) and then restart

The autoplay should be generally enhanced using a purpose/primary task system.
There is always one goal: Defeat the world deamon. Therefore two things are needed:

1. The red pill
1. a huge hacking skill

To get the red pill
There the strategy splits, depending on the current situation of the player.
It is always neccessary to determine the currently best available route.
There is always a time x until the 

## Current concepts

This is the current folder strategy:

```js
autostart.js  // Run after every Node start and Augment installation
cct/          // Solving contracts
ds/           // data scripts - fetching and updating data
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