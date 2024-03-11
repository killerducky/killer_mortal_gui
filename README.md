GUI for https://mjai.ekyu.moe

Notes for translators/developers:

The GUI is simple html+javascript, but you still must run a local webserver to load the json file. Use e.g. vscode liveserver or `python3 -m http.server`.

You also need a local json file. Run a review on the mjai site, and then you can use the utility script `curl_mjai.py` to download the json locally:

./curl_mjai.py -u https://mjai.ekyu.moe/killerducky/?data=/report/9572f900340af356.json

It will output some URLs for reference, the last one is an example URL to point your browser to locally. Modify the local IP/port for your system.

Credits:

* Tiles https://github.com/FluffyStuff/riichi-mahjong-tiles
* Tenhou log stuff from https://github.com/Equim-chan/tensoul/blob/main/convert.js
* Ukeire, Shanten, etc utilities from https://github.com/Euophrys/mahjong-discord-bot
* Translations originally from [Tenhou English UI Chrome extension](https://chromewebstore.google.com/detail/tenhou-english-ui/cbomnmkpjmleifejmnjhfnfnpiileiin)
* Compression from https://github.com/pieroxy/lz-string