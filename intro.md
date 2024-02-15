Killer Mortal Reviewer is a GUI frontend to the Mortal AI engine. You must first generate a Mortal review, save it, and then load it into this GUI.

Usage:
   1. Generate a Mortal review <a href="https://mjai.ekyu.moe" target="_blank">https://mjai.ekyu.moe</a>
   1. Click "Save this page"
   1. Return and click "Choose Mortal File"

Credits:

* Compression from https://github.com/pieroxy/lz-string
* Tenhou log stuff from https://github.com/Equim-chan/tensoul/blob/main/convert.js
* Tiles https://github.com/FluffyStuff/riichi-mahjong-tiles
* Translations from [Tenhou English UI Chrome extension](https://chromewebstore.google.com/detail/tenhou-english-ui/cbomnmkpjmleifejmnjhfnfnpiileiin)

Example tenhou/6 log
```
json_data = {
    "dan":["雀豪★1","雀豪★1","雀聖★2","雀聖★2"],
    "lobby":0,
    "log":[[
        [2,0,0], // East 3, no repeats, no riichi sticks  E3 means PID2 is now East/Dealer
        [22000,11300,44700,22000], // start points
        [22], // Dora 2p
        [], // Uradora
        // PID0 = E in E1  now: West
        [25,18,18,46,22,31,16,34,29,47,17,13,17],
        [28,21,13,19,24,41,35,34,11,26,41,45,28,34,37],
        [31,46,47,25,21,60,28,60,60,29,60,60,60,60,60],
        // PID1 = S in E1  now: North
        [37,23,45,42,51,37,13,38,43,23,46,38,12],              // haipai = starting hand
        [47,12,11,44,47,14,"3838p38",43,33,22,36,14,28,12,17], // draws
        [43,42,46,45,44,47,47,11,43,33,22,36,60,14,60],        // discards
        // PID2 = W in E1  now: East                           // (mortal POV player in this case)
        [41,21,36,26,15,39,29,44,47,32,46,26,35],
        [29,16,43,16,26,52,38,31,32,38,25,36,24,31,"c141516",25],
        [44,39,60,46,47,32,60,60,60,60,21,26,41,60,29,29],
        // PID3 = N in E1  now: South
        [28,19,27,33,15,44,11,22,32,15,19,35,45],       // haipai = starting hand
        [33,39,19,21,29,44,42,14,27,42,45,42,41,16,39], // draws
        [44,60,11,45,35,60,33,60,60,60,60,60,60,42,60], // discards
        [
            "和了",           // "heaven" = Agari = Win (Tsumo or Ron)
            [-7700,7700,0,0], // point change
            [1,0,1,           // who won, points from (self if tsumo), who won or if pao: who's responsible
                "30符4飜7700点","断幺九(1飜)","ドラ(2飜)","赤ドラ(1飜)"]  // score info strings
        ]
    ]],
    "name":["Aさん","Bさん","Cさん","Dさん"],
    "rate":[1538.0,1261.0,2263.0,645.0],
    "ratingc":"PF4",
    "rule":{"aka":0,"aka51":1,"aka52":1,"aka53":1,
    "disp":"玉の間南喰赤"},
    "sx":["C","C","C","C"]
}
```