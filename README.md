GUI for https://mjai.ekyu.moe

Notes for translators/developers:

The initial release didn't have a good localization setup, just some quick code I put together for English only. I'm adding i18next support at the top of of translations.js

The GUI is simple html+javascript, but you still must run a local webserver to load the json file. Use e.g. vscode liveserver or `python3 -m http.server`.

You also need a local json file. Run a review on the mjai site, and then you can use the utility script `curl_mjai.py` to download the json locally:

./curl_mjai.py -u https://mjai.ekyu.moe/killerducky/?data=/report/9572f900340af356.json

It will output some URLs for reference, the last one is an example URL to point your browser to locally. Modify the local IP/port for your system.
