# Introduction
GUI for https://mjai.ekyu.moe

# Table of Contents
- [Introduction](#introduction)
- [Table of Contents](#table-of-contents)
- [Dealin Rate](#dealin-rate)
  - [Overview of the algorithm](#overview-of-the-algorithm)
  - [Riichi trap suji](#riichi-trap-suji)
- [Notes for translators/developers](#notes-for-translatorsdevelopers)
- [Credits](#credits)

# Dealin Rate
The Mortal engine does not have a dealin rate output, but in Options you can opt-in to showing dealin rates approximated by simple heuristics.

## Overview of the algorithm
* Only enabled for players that Riichi
* Estimates the odds for each simple wait type
  * Ryanmen
  * Kanchan
  * Penchan
  * Shanpon
  * Tanki
  * (Complex waits are not explicitly accounted for)
* Likelyhood of each wait has several factors:
  * Number of combinations available to create that wait, based on unseen tiles from the POV of a player deciding on a discard
    * A general way account for e.g. kabe, one-chance, expensive vs cheap suits
    * For example, at first the combinations available for a 45m ryanmen are:
      * 4*4 = 16 combinations
    * But if there is only one 5m left and two 4m left
        * 1*2 = 2 combinations
  * Multiplier for how likely players are to end up with each type of wait
    | Type | Multiplier | Notes |
    |-----|-----|-----|
    | Ryanmen | 3.5 | Players tend to aim for and Riichi ryanmens! |
    | Kanchan | 0.21 | 
    | Kanchan* | 2.6 | Suji trap Riichi cutting e.g. 5m from 531m |
    | Penchan | 1.0 | |
    | Honor Tanki/Shanpon | 1.7 |
    | Other Tanki/Shanpon | 1.0 |
  * Multiplier for some simple discard reading and dora
    | Type | Multiplier | Description |
    |-----|-----|-----|
    | Dora involved | 1.2 | Any wait involving the dora |
    | Ura suji | 1.3 | Cut 5m from 578m |
    | Matagi suji | 0.6 | Cut 3m early, probably not from 233m or 334m |
    | Riichi Matagi suji | 1.2 | Cut 3m late, could be from 233m or 334m |
  * Multipliers were tuned for best predictions on Tenhou Houou games
    * Credit [The Hopeless Girl on the Path of Houou](https://pathofhouou.blogspot.com/2021/04/guide-replay-analysis.html) for games and analysis framework code (which they got from ApplySci? And maybe other people?)
* Examples of things not accounted for
  * Yaku reading
  * Assumes never furiten Riichi
  * The tiles they are waiting for are mostly dead
    * e.g. Kan of 5p, will still assume they might Riichi a 46p Kanchan
  * Point situation indicates higher than normal odds they riichi on a bad wait

## Riichi trap suji
Here is are some example dealin rates of a situation where they Riichi on 5m
```
                     Total  Ryankan Kanchan  Tanki Shanpon 
No-suji          2s:  9.5%   7.5%    0.3%    0.4%   1.2%
Riichi trap suji 2m:  6.0%    -      4.3%    0.4%   1.2%
Normal suji      2p:  2.0%    -      0.3%    0.4%   1.2%
```
The odds of a 13m Kanchan wait are much higher than the other 13 waits. The 2m is still safer than no-suji 2s, but not by much.

# Notes for translators/developers
The GUI is simple html+javascript, but you still must run a local webserver to load the json file. Use e.g. vscode liveserver or `python3 -m http.server`.

You also need a local json file. Run a review on the mjai site, and then you can use the utility script `curl_mjai.py` to download the json locally:

./curl_mjai.py -u https://mjai.ekyu.moe/killerducky/?data=/report/9572f900340af356.json

It will output some URLs for reference, the last one is an example URL to point your browser to locally. Modify the local IP/port for your system.

# Credits
* Tiles https://github.com/FluffyStuff/riichi-mahjong-tiles
* Tenhou log stuff from https://github.com/Equim-chan/tensoul/blob/main/convert.js
* Ukeire, Shanten, etc utilities from https://github.com/Euophrys/mahjong-discord-bot
* Translations originally from [Tenhou English UI Chrome extension](https://chromewebstore.google.com/detail/tenhou-english-ui/cbomnmkpjmleifejmnjhfnfnpiileiin)
* Compression from https://github.com/pieroxy/lz-string

