W_tilemap = {
    "1m": 0,
    "2m": 1,
    "3m": 2,
    "4m": 3,
    "5m": 4,
    "5mr": 4.1,
    "6m": 5,
    "7m": 6,
    "8m": 7,
    "9m": 8,
    "1p": 9,
    "2p": 10,
    "3p": 11,
    "4p": 12,
    "5p": 13,
    "5pr": 13.1,
    "6p": 14,
    "7p": 15,
    "8p": 16,
    "9p": 17,
    "1s": 18,
    "2s": 19,
    "3s": 20,
    "4s": 21,
    "5s": 22,
    "5sr": 22.1,
    "6s": 23,
    "7s": 24,
    "8s": 25,
    "9s": 26,
    "E": 27,
    "S": 28,
    "W": 29,
    "N": 30,
    "P": 31,
    "F": 32,
    "C": 33,
    "?": 34
}

json_data = {"dan":["雀豪★1","雀豪★1","雀豪★1","雀豪★1"],"lobby":0,
"log":[[[0,0,0], // round
[25000,25000,25000,25000], // scores
[14], // dora 4m
[], // ura
[39,16,24,33,39,12,35,36,17,46,21,34,37],
[33,27,37,36,29,35,18,45,41],
[21,46,12,39,39,24,34,60,60],
[12,28,17,41,24,12,23,32,36,12,47,38,39],
[32,15,11,31,26,28,13,27],
[39,41,60,60,47,36,38,28],
[13,14,37,26,34,24,45,52,23,46,18,45,19],
[11,51,35,28,32,44,26,"45p4545"],
[46,11,37,60,60,60,19,18],
[22,43,47,38,42,53,18,14,38,18,43,16,25],
[31,31,21,16,42,46,26,19],
[60,60,42,47,60,60,21,60],
["和了",[2000,-2000,0,0],[0,1,0,"40符1飜2000点","一盃口(1飜)"]]]],
"name":["Aさん","Bさん","Cさん","Dさん"],
"rate":[849.0,1507.0,1284.0,1199.0],"ratingc":"PF4","rule":{"aka":0,"aka51":1,"aka52":1,"aka53":1,"disp":"玉の間南喰赤"},"sx":["C","C","C","C"]}

createElements()
parseJsonData(json_data)

//take '2m' and return 2 + 10 etc.
function tm2t(str)
{   //tenhou's tile encoding:
    //   11-19    - 1-9 man
    //   21-29    - 1-9 pin
    //   31-39    - 1-9 sou
    //   41-47    - ESWN WGR
    //   51,52,53 - aka 5 man, pin, sou
    let num = parseInt(str[0]);
    const tcon = { m : 1, p : 2, s : 3, z : 4 };

    return num ? 10 * tcon[str[1]] + num : 50 + tcon[str[1]];
}

// take 2+10 and return '2m'
function tenhou2str(tileInt) {
    if (tileInt > 50) {
        const akacon = { 51:'0m', 52:'0p', 53:'0s'}
        return akacon[tileInt]
    }
    suitInt = Math.floor(tileInt / 10)
    tileInt = tileInt % 10
    const tcon = ['m', 'p', 's', 'z']
    output = tileInt.toString() + tcon[suitInt-1]
    return output
}

function parseJsonData(data) {
    const log = data['log'][0]
    round = log.shift()
    scores = log.shift()
    dora = log.shift()
    uradora = log.shift()
    haipais = []
    draws = []
    discards = []
    for (pnum of Array(4).keys()) {
        haipais.push(log.shift())
        draws.push(log.shift())
        discards.push(log.shift())
        haipais[pnum].sort()
        hand = document.querySelector(`.grid-hand-p${pnum}`)
        hand.replaceChildren()
        for (tileInt of haipais[pnum]) {
            addTiles(hand, [tenhou2str(tileInt)], false)
        }
    }

    const main = document.querySelector('main')
    // quick hack output some info.
    main.append(document.createElement('br'))
    main.append('round ', JSON.stringify(round), document.createElement('br'))
    main.append('dora ', JSON.stringify(dora), document.createElement('br'))
    main.append('uradora ', JSON.stringify(uradora), document.createElement('br'))
}
function createTile(tileStr) {
    const tileImg = document.createElement('img')
    tileImg.src = `media/tiles/${tileStr}.svg`
    return tileImg
}

function addTiles(container, tileStrArray, replace) {
    if (replace) {
        container.replaceChildren()
    }
    for (i in tileStrArray) {
        container.appendChild(createTile(tileStrArray[i]))
    }   
}

function convertTileStr(str) {
    let output = []
    let suit = ''
    for (i=str.length-1; i>=0; i--) {
        if (!isNaN(str[i])) {
            if (suit === '') {
                throw new Error(`error in convertTileStr: ${str}`)
            }
            output.push(str[i]+suit)
        } else {
            suit = str[i]
        }
    }
    output.reverse()
    return output
}

function createElements() {
    for (pnum of Array(4).keys()) {
        discards = document.querySelector(`.grid-discard-p${pnum}`)
        addTiles(discards, convertTileStr('123m456s789p1234z'), true)
        selfHand = document.querySelector(`.grid-hand-p${pnum}`)
        addTiles(selfHand, convertTileStr('123m456s789p1234z'), true)
    }
}

