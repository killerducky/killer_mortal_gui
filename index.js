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

/* Source: https://mjai.ekyu.moe/report/ac7f456533f7d814.html#kyoku-2-0 
Also saved in mhjong_mortal_ui/example_logs/Example_mjai_report.html
*/
json_data = {
    "dan":["雀豪★1","雀豪★1","雀聖★2","雀聖★2"],
    "lobby":0,
    "log":[[
        [2,0,0], // East 3, no repeats
        [22000,11300,44700,22000],
        [22], // Dora 2p
        [], // Uradora
        // PID0 = E in E1  now: West
        [25,18,18,46,22,31,16,34,29,47,17,13,17],
        [28,21,13,19,24,41,35,34,11,26,41,45,28,34,37],
        [31,46,47,25,21,60,28,60,60,29,60,60,60,60,60],
        // PID1 = S in E1  now: North
        [37,23,45,42,51,37,13,38,43,23,46,38,12],              // hand
        [47,12,11,44,47,14,"3838p38",43,33,22,36,14,28,12,17], // draws
        [43,42,46,45,44,47,47,11,43,33,22,36,60,14,60],        // discards
        // PID2 = W in E1,  now: East << POV player
        [41,21,36,26,15,39,29,44,47,32,46,26,35],
        [29,16,43,16,26,52, 38 ,31,32,38,25,36,24,31,"c141516",25],
        [44,39,60,46,47,32, 60 ,60,60,60,21,26,41,60,29,29],
        // PID3 i N in E1   now: South
        [28,19,27,33,15,44,11,22,32,15,19,35,45],       // hand
        [33,39,19,21,29,44,42,14,27,42,45,42,41,16,39], // draws
        [44,60,11,45,35,60,33,60,60,60,60,60,60,42,60], // discards
        ["和了",[-7700,7700,0,0],[1,0,1,"30符4飜7700点","断幺九(1飜)","ドラ(2飜)","赤ドラ(1飜)"]]
    ]],
    "name":["Aさん","Bさん","Cさん","Dさん"],
    "rate":[1538.0,1261.0,2263.0,645.0],
    "ratingc":"PF4",
    "rule":{"aka":0,"aka51":1,"aka52":1,"aka53":1,
    "disp":"玉の間南喰赤"},
    "sx":["C","C","C","C"]
}


//take '2m' and return 2 + 10 etc.
function tm2t(str) { 
    //tenhou's tile encoding:
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

// TODO: This should really just be a class keeping state of the entire round
class TurnNum {
    constructor(dealerIdx, draws, discards) {
        this.dealerIdx = dealerIdx
        this.draws = draws
        this.discards = discards
        this.ply = 0
        this.pidx = dealerIdx
        this.nextDiscardIdx = [0,0,0,0]
        this.nextDrawIdx = [0,0,0,0]
    }
    getDraw() {
        return this.draws[this.pidx][this.nextDrawIdx[this.pidx]]
    }
    getDiscard() {
        return this.discards[this.pidx][this.nextDiscardIdx[this.pidx]]
    }
    incPly() {
        this.nextDrawIdx[this.pidx]++
        this.nextDiscardIdx[this.pidx]++
        this.pidx = this.whoIsNext()
        this.ply++
    }
    whoIsNext() {
        let debug = false
        for (let tmpPidx of Array(4).keys()) {
            if (tmpPidx == this.pidx) {
                debug && console.log('skip: cannot call own tile')
                continue // skip: cannot call own tile
            }
            if (debug) {
                console.log('test', tmpPidx, this.nextDrawIdx[tmpPidx], this.ply, this.pidx)
            }
            let draw = this.draws[tmpPidx][this.nextDrawIdx[tmpPidx]]
            debug && console.log(draw, tenhou2str(draw), this.draws[tmpPidx])
            if (typeof draw == 'string' && draw.indexOf('p')) {
                console.log('pon?', draw, tmpPidx)
                return tmpPidx
            }
        }
        return (this.pidx+1) % 4
    }
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

    // Initialize whose turn it is, and pointers for current draws/discards for each player
    const ply = new TurnNum(round[0], draws, discards)

    while (1) {
        //console.log(ply.ply, ply.turn, ply.pidx)
        draw = ply.getDraw(draws)
        if (typeof draw == "undefined") { 
            console.log("out of draws")
            break 
        }
        console.log(`ply ${ply.ply} pidx ${ply.pidx} draw ${draw}, ${tenhou2str(draw)}`)
        discard = ply.getDiscard(discards)
        if (typeof discard == "undefined") {
            console.log("out of discards")
            break
        }
        if (discard==60) {
            discard = draw // tsumogiri the drawn tile
        }
        console.log(`discard ${discard}, ${tenhou2str(discard)}`)
        addDiscard(ply.pidx, [tenhou2str(discard)])
        ply.incPly()
    }
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

function addDiscard(pidx, tileStrArray) {
    discardsElem = document.querySelector(`.grid-discard-p${pidx}`)
    addTiles(discardsElem, tileStrArray)
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
        //discards = document.querySelector(`.grid-discard-p${pnum}`)
        //addTiles(discards, convertTileStr('123m456s789p1234z'), true)
        selfHand = document.querySelector(`.grid-hand-p${pnum}`)
        addTiles(selfHand, convertTileStr('123m456s789p1234z'), true)
    }
}

createElements()
parseJsonData(json_data)

