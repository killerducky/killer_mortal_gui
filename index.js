/* Source: https://mjai.ekyu.moe/report/ac7f456533f7d814.html#kyoku-2-0 
Also saved in mahjong_mortal_ui/example_logs/Example_mjai_report.html

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
*/

const RUNES  = {
    /*hand limits*/
    "mangan"         : ["満貫",         "Mangan ",         "Mangan "               ],
    "haneman"        : ["跳満",         "Haneman ",        "Haneman "              ],
    "baiman"         : ["倍満",         "Baiman ",         "Baiman "               ],
    "sanbaiman"      : ["三倍満",       "Sanbaiman ",      "Sanbaiman "            ],
    "yakuman"        : ["役満",         "Yakuman ",        "Yakuman "              ],
    "kazoeyakuman"   : ["数え役満",     "Kazoe Yakuman ",  "Counted Yakuman "      ],
    "kiriagemangan"  : ["切り上げ満貫", "Kiriage Mangan ", "Rounded Mangan "       ],
    /*round enders*/
    "agari"          : ["和了",         "Agari",           "Agari"                 ],
    "ryuukyoku"      : ["流局",         "Ryuukyoku",       "Exhaustive Draw"       ],
    "nagashimangan"  : ["流し満貫",     "Nagashi Mangan",  "Mangan at Draw"        ],
    "suukaikan"      : ["四開槓",       "Suukaikan",       "Four Kan Abortion"     ],
    "sanchahou"      : ["三家和",       "Sanchahou",       "Three Ron Abortion"    ],
    "kyuushukyuuhai" : ["九種九牌",     "Kyuushu Kyuuhai", "Nine Terminal Abortion"],
    "suufonrenda"    : ["四風連打",     "Suufon Renda",    "Four Wind Abortion"    ],
    "suuchariichi"   : ["四家立直",     "Suucha Riichi",   "Four Riichi Abortion"  ],
    /*scoring*/
    "fu"             : ["符",           /*"Fu",*/"符",     "Fu"                    ],
    "han"            : ["飜",           /*"Han",*/"飜",    "Han"                   ],
    "points"         : ["点",           /*"Points",*/"点", "Points"                ],
    "all"            : ["∀",            "∀",               "∀"                     ],
    "pao"            : ["包",           "pao",             "Responsibility"        ],
    /*rooms*/
    "tonpuu"         : ["東喰",         " East",           " East"                 ],
    "hanchan"        : ["南喰",         " South",          " South"                ],
    "friendly"       : ["友人戦",       "Friendly",        "Friendly"              ],
    "tournament"     : ["大会戦",       "Tounament",       "Tournament"            ],
    "sanma"          : ["三",           "3-Player ",       "3-Player "             ],
    "red"            : ["赤",           " Red",            " Red Fives"            ],
    "nored"          : ["",             " Aka Nashi",      " No Red Fives"         ]
};

class GameLog {
    constructor(log) {
        let logIdx = 0
        this.rawRound = log[logIdx++]
        this.roundWind = Math.floor(this.rawRound[0]/4) + tm2t('e')
        this.dealerIdx = this.rawRound[0] % 4
        this.roundNum = this.dealerIdx
        this.honbas = this.rawRound[1]
        this.roundSticks = this.rawRound[2]
        this.scores = log[logIdx++]
        this.dora = log[logIdx++]
        this.uradora = log[logIdx++]
        this.hands = []
        this.draws = []
        this.discards = []
        this.discardPond = [[],[],[],[]]
        for (let pnum=0; pnum<4; pnum++) {
            this.hands.push(Array.from(log[logIdx++]))
            this.draws.push(log[logIdx++])
            this.discards.push(log[logIdx++])
            this.hands[pnum].sort(tileSort)
        }
        this.resultArray = log[logIdx++]
        this.result = this.resultArray[0]
        this.scoreChanges = this.resultArray[1]
        if (this.resultArray.length > 2) {
            this.winner = this.resultArray[2][0]
            this.payer = this.resultArray[2][1]
            this.pao = this.resultArray[2][2] // TODO: Find an example of this
            this.yakuStrings = this.resultArray[2].slice(3)
        } else {
            this.winner = null
            this.payer = null
            this.pao = null
            this.yakuStrings = null
        }
        this.drawnTile = [null, null, null, null]
        this.calls = [[],[],[],[]]
        this.handOver = false
    }
}

class GlobalState {
    constructor() {
        this.ui = new UI
        this.gl = null
        this.ge = null

        this.ply_counter = 0
        this.hand_counter = 0
        this.mortalHtmlDoc = null
        this.json_data = null
        this.heroPidx = null   // player index mortal reviewed

        this.C_soft_T = 2

        this.C_db_height = 60
        this.C_db_totWidth = 605
        this.C_db_handPadding = 10
        this.C_db_padding = 15
        this.C_db_tileWidth = 34
        this.C_db_heroBarWidth = 16
        this.C_db_mortBarWidth = 10
        this.C_cb_height = 60
        this.C_cb_totHeight = 100
        this.C_cb_totWidth = 100
        this.C_cb_padding = 10

        this.C_windStr = ['East', 'South', 'West', 'North']
    }
}

class PIDX {
    constructor(pidx) {
        this.pidx = pidx
    }
    logical() {
        return this.pidx
    }
    pov() {
        return (4 + this.pidx - GS.ui.povPidx) % 4
    }
}

class UI {
    constructor() {
        this.hands = []
        this.discards = []
        this.pInfo = []
        this.gridInfo = document.querySelector('.grid-info')
        this.povPidx = 0
        for (let pnum of Array(4).keys()) {
            this.hands.push(document.querySelector(`.grid-hand-p${pnum}`))
            this.discards.push(document.querySelector(`.grid-discard-p${pnum}`))
            this.pInfo.push(document.querySelector(`.gi-p${pnum}`))
        }
        this.round = document.querySelector('.info-round')
        this.sticks = document.querySelector('.info-sticks')
        this.honbas = document.querySelector('.info-honbas')
        this.doras = document.querySelector('.info-doras')
        this.result = document.querySelector('.result')
    }
    #getHand(pidx) { 
        return this.hands[pidx.pov()] 
    }
    #getDiscard(pidx) { 
        return this.discards[pidx.pov()]
    }
    reset() {
        this.round.replaceChildren(GS.C_windStr[GS.gl.roundWind-41])
        this.round.append("-", GS.gl.roundNum+1)
        if (GS.gl.honbas > 0) {
            this.round.append("-", GS.gl.honbas)
        }
        if (GS.gl.sticks > 0) {
            this.round.append(' +', GS.gl.sticks, "000")
        }
        // this.round.append('  raw:', GS.gl.rawRound)
        // this.honbas.replaceChildren(`Honbas ${GS.gl.honbas}`)
        this.sticks.replaceChildren()
        this.doras.replaceChildren()
        this.result.replaceChildren()
        for (let i=0; i<5; i++) {
            if (GS.gl.dora[i] == null) {
                this.doras.append(createTile('back'))
            } else {
                this.doras.append(createTile(tenhou2str(GS.gl.dora[i])))
            }
            this.doras.lastChild.setAttribute('width', 20)
        }
        for (let pidx=0; pidx<4; pidx++) {
            this.discards[pidx].replaceChildren()
            if (pidx == GS.heroPidx) {
                let pidxObj = new PIDX(pidx)
                let seatWind = (4 + GS.heroPidx - GS.gl.roundNum) % 4
                this.pInfo[pidxObj.pov()].replaceChildren(GS.C_windStr[seatWind])
                this.pInfo[pidxObj.pov()].append(' ', GS.gl.scores[pidx])
            }
        }
    }
    #relativeToHeroStr(pidx) {
        let relIdx = (4 + GS.heroPidx - pidx) % 4
        return ['Self', 'Left', 'Cross', 'Right'][relIdx]
    }
    updateGridInfo() {
        this.clearDiscardBars()
        this.clearCallBars()
        let mortalEval = GS.ge[GS.hand_counter][GS.ply_counter].mortalEval
        if (mortalEval) {
            if (mortalEval.type == 'Discard') {
                this.updateDiscardBars()
                this.updateCallBars()
            } else {
                this.updateCallBars()
            }
        }
        if (GS.gl.handOver) {
            if (GS.gl.result == '和了') {
                if (GS.gl.winner == GS.gl.payer) {
                    this.result.append(`Tsumo ${this.#relativeToHeroStr(GS.gl.winner)}`)
                } else {
                    this.result.append(`Ron `)
                    this.result.append(document.createElement("br"))
                    this.result.append(`Winner ${this.#relativeToHeroStr(GS.gl.winner)} +${GS.gl.scoreChanges[GS.gl.winner]}`)
                    this.result.append(document.createElement("br"))
                    this.result.append(`Loser ${this.#relativeToHeroStr(GS.gl.payer)} ${GS.gl.scoreChanges[GS.gl.payer]}`)
                    this.result.append(document.createElement("br"))
                }
            } else if (GS.gl.result == '流局') {
                this.result.append('Draw')
            } else if (GS.gl.result == '流し満貫') {
                this.result.append('Nagashi Mangan (wow!) TODO test this')
            }
            this.result.append(document.createElement("br"))
            this.result.append(`raw: r${GS.gl.result} w${GS.gl.winner} p${GS.gl.payer} `, 'u', GS.gl.uradora, ' ', GS.gl.scoreChanges, ' ', GS.gl.yakuStrings)
        }
    }
    clearCallBars() {
        const callBars = document.querySelector('.killer-call-bars')
        let svgElement = document.createElementNS("http://www.w3.org/2000/svg", "svg")
        svgElement.setAttribute("width", GS.C_cb_totWidth)
        svgElement.setAttribute("height", GS.C_cb_totHeight)
        callBars.replaceChildren(svgElement)
    }
    updateCallBars() {
        let gameEvent = GS.ge[GS.hand_counter][GS.ply_counter]
        let mortalEval = gameEvent.mortalEval
        const callBars = document.querySelector('.killer-call-bars')
        let svgElement = callBars.firstElementChild
        let heroSlotFound = false
        let slot = 0
        for (const key in mortalEval.Pvals) {
            if (!isNaN(key)) {
                continue // skip tiles
            }
            let Pval = mortalEval.Pvals[key]
            let xloc = GS.C_db_handPadding + GS.C_db_tileWidth/2 + slot*GS.C_db_tileWidth
            if (key == mortalEval.p_action) {
                let rect2 = document.createElementNS("http://www.w3.org/2000/svg", "rect")
                rect2.setAttribute("x", xloc-GS.C_db_heroBarWidth/2)
                rect2.setAttribute("y", 0)
                rect2.setAttribute("width", GS.C_db_heroBarWidth)
                rect2.setAttribute("height", Math.ceil(1*GS.C_cb_height))
                rect2.setAttribute("fill", "red")
                svgElement.appendChild(rect2)
            }
            let rect = document.createElementNS("http://www.w3.org/2000/svg", "rect")
            rect.setAttribute("x", xloc-GS.C_db_mortBarWidth/2)
            rect.setAttribute("y", Math.floor((1-Pval/100)*GS.C_cb_height))
            rect.setAttribute("width", GS.C_db_mortBarWidth)
            rect.setAttribute("height", Math.ceil(Pval/100*GS.C_cb_height))
            rect.setAttribute("fill", "blue")
            svgElement.appendChild(rect);
            let text = document.createElementNS("http://www.w3.org/2000/svg", "text")
            text.setAttribute("x", xloc-GS.C_db_mortBarWidth/2-10)
            text.setAttribute("y", GS.C_db_height + 20)
            let color = getComputedStyle(document.documentElement).getPropertyValue('--color-text')
            text.setAttribute("fill", color)
            text.textContent = key
            svgElement.appendChild(text)
            slot++
        }
    }
    clearDiscardBars() {
        const discardBars = document.getElementById("discard-bars")
        let svgElement = document.createElementNS("http://www.w3.org/2000/svg", "svg")
        svgElement.setAttribute("width", GS.C_db_totWidth)
        svgElement.setAttribute("height", GS.C_db_height)
        svgElement.setAttribute("padding", GS.C_db_padding)
        discardBars.replaceChildren(svgElement)
    }
    updateDiscardBars() {
        let gameEvent = GS.ge[GS.hand_counter][GS.ply_counter]
        let mortalEval = gameEvent.mortalEval
        const discardBars = document.getElementById("discard-bars")
        let svgElement = discardBars.firstElementChild 
        let heroSlotFound = mortalEval.p_action == 'Riichi' && 'Riichi' in mortalEval.Pvals
        for (let i = -1; i < GS.gl.hands[gameEvent.pidx].length; i++) {
            let tile = null
            let Pval = null
            if (i==-1) {
                tile = GS.gl.drawnTile[gameEvent.pidx]
                if (tile == null) {
                    //console.log('skip tile null')
                    continue // on calls there was no drawnTile
                }
            } else {
                tile = GS.gl.hands[gameEvent.pidx][i]
            }
            Pval = mortalEval['Pvals'][tile]
            Pval = mortalEval['Pvals_soft'][tile]
            if (Pval == null) {
                console.log('missing Pval, probably because it is an illegal discard')
                console.log(`tile=${tile} i=${i}`)
                console.log(GS.ge[GS.hand_counter])
                console.log('ply', GS.ply_counter)
                continue
            }
            let slot = (i !== -1) ? i : GS.gl.hands[gameEvent.pidx].length+1
            let xloc = GS.C_db_handPadding + GS.C_db_tileWidth/2 + slot*GS.C_db_tileWidth
            if (tile == mortalEval.p_action) {
                heroSlotFound = true
                let rect2 = document.createElementNS("http://www.w3.org/2000/svg", "rect")
                rect2.setAttribute("x", xloc-GS.C_db_heroBarWidth/2)
                rect2.setAttribute("y", 0)
                rect2.setAttribute("width", GS.C_db_heroBarWidth)
                rect2.setAttribute("height", Math.ceil(1*GS.C_db_height))
                rect2.setAttribute("fill", "red")
                svgElement.appendChild(rect2)
            }
            let rect = document.createElementNS("http://www.w3.org/2000/svg", "rect")
            rect.setAttribute("x", xloc-GS.C_db_mortBarWidth/2)
            rect.setAttribute("y", Math.floor((1-Pval/100)*GS.C_db_height))
            rect.setAttribute("width", GS.C_db_mortBarWidth)
            rect.setAttribute("height", Math.ceil((Pval/100)*GS.C_db_height))
            rect.setAttribute("fill", "blue")
            svgElement.appendChild(rect);
        }
        if (!heroSlotFound) {
            console.log('!heroSlotFound', gameEvent)
            throw new Error()
        }
    }
    updateHandInfo(hands, calls, drawnTile) {
        for (let pnum=0; pnum<4; pnum++) {
            let objPnum = new PIDX(pnum)
            this.addHandTiles(objPnum, [], true)
            for (let tileInt of hands[pnum]) {
                this.addHandTiles(objPnum, [tenhou2str(tileInt)], false)
            }
            this.addBlankSpace(objPnum)
            if (drawnTile[pnum] != null) {
                this.addHandTiles(objPnum, [tenhou2str(drawnTile[pnum])], false)
            } else {
                this.addBlankSpace(objPnum)
            }
            if (calls[pnum].length > 0) {
                this.addBlankSpace(objPnum)
                for (let tileInt of calls[pnum]) {
                    if (tileInt == 'rotate') {
                        this.rotateLastTile(objPnum)
                    } else {
                        this.addHandTiles(objPnum, [tenhou2str(tileInt)], false)
                    }
                }
            }
        }
    }
    addHandTiles(pidx, tileStrArray, replace) {
        if (replace) {
            this.#getHand(pidx).replaceChildren()
        }
        for (let i in tileStrArray) {
            this.#getHand(pidx).appendChild(createTile(tileStrArray[i]))
        }   
    }
    addDiscardTiles(pidx, tileStrArray, replace) {
        if (replace) {
            this.#getDiscard(pidx).replaceChildren()
        }
        for (let i in tileStrArray) {
            this.#getDiscard(pidx).appendChild(createTile(tileStrArray[i]))
        }   
    }
    rotateLastTile(pidx) {
        let angle = (pidx.pov() * 90 + 90) % 360
        this.#getHand(pidx).lastChild.style.transform = `rotate(${angle}deg)`
        if (pidx.pov() == 1 || pidx.pov() == 3) {
            this.#getHand(pidx).lastChild.style.marginBottom = '-5px'
            this.#getHand(pidx).lastChild.style.marginTop = '5px'
            this.#getHand(pidx).lastChild.style.transform += pidx.pov()==1 ? ' translate(6px,0px)' : ' translate(-6px,0px)'
        } else {
            this.#getHand(pidx).lastChild.style.marginRight = '5px'
            this.#getHand(pidx).lastChild.style.marginLeft = '5px'
            this.#getHand(pidx).lastChild.style.marginBottom = '0px'
            this.#getHand(pidx).lastChild.style.transform += pidx.pov()==2 ? ' translate(-6px,0px)' : ' translate(6px,0px)'
        }
    }
    addBlankSpace(pidx) {
        this.addHandTiles(pidx, ['Blank'], false)
        this.#getHand(pidx).lastChild.style.opacity = "0"
    }
    updateDiscardPond() {
        for (let pidx=0; pidx<4; pidx++) {
            let pidxObj = new PIDX(pidx)
            for (let tile of GS.gl.discardPond[pidx]) {
                this.addDiscard(pidxObj, [tenhou2str(tile.tile)], tile.tsumogiri, tile.riichi)
                if (tile.called) {
                    this.lastDiscardWasCalled(pidxObj)
                }
            }
        }
    }
    addDiscard(pidx, tileStrArray, tsumogiri, riichi) {
        this.addDiscardTiles(pidx, tileStrArray)
        if (tsumogiri) {
            this.#getDiscard(pidx).lastChild.style.background = "lightgrey"
        }
        if (riichi) {
            let angle = (pidx.pov() * 90 + 90) % 360
            this.#getDiscard(pidx).lastChild.style.transform = `rotate(${angle}deg`
        }
    }
    lastDiscardWasCalled(pidx) {
        this.#getDiscard(pidx).lastChild.style.opacity = "0.5"
    }
}

class Tile {
    constructor(tile) {
        this.tile = tile
        this.tsumogiri = false
        this.riichi = false
        this.rotate = false
        this.called = false
    }
}
             
function mortalHashTile2tenhou(tileStr) {
    tileStr = tileStr.replace('#pai-', '')
    tileStr = tm2t(tileStr)
    return tileStr
}

//take '2m' and return 2 + 10 etc.
function tm2t(str) { 
    //tenhou's tile encoding:
    //   11-19    - 1-9 man
    //   21-29    - 1-9 pin
    //   31-39    - 1-9 sou
    //   41-47    - ESWN WGR
    //   51,52,53 - aka 5 man, pin, sou
    const tcon = { m : 1, p : 2, s : 3, z : 4 };
    // handle mortal '5sr' for red 5s
    if (str.length==3) {
        if (str[0] != '5' || str[2] != 'r') {
            throw new Error('Expected something like "5sr"!')
        }
        str = str.substring(0, str.length - 1)
        return 50+tcon[str[1]]
    }
    let num = parseInt(str[0]);
    if (isNaN(num)) {
        //                                                   Pai=White Fa=Green Chun=Red
        const yakuhai = { 'e': 41, 's': 42, 'w': 43, 'n': 44, 'p':45, 'f':46, 'c': 47}
        tile = yakuhai[str[0]]
        if (tile == null) {
            throw new Error(`Could not parse ${str}`)
        }
        return yakuhai[str[0]]
    }

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

// take 51 (0m) and return 15.1 for sorting
function tileInt2Float(tileInt) {
    let f = tileInt == 51 ? 15.1 : tileInt == 52 ? 25.1 : tileInt == 53 ? 35.1 : tileInt
    return f
}

// sort aka red fives
function tileSort(a, b) {
    let a1 = tileInt2Float(a)
    let b1 = tileInt2Float(b)
    return a1-b1
}

class TurnNum {
    constructor() {
        this.draws = GS.gl.draws
        this.discards = GS.gl.discards
        this.ply = 0
        this.pidx = GS.gl.dealerIdx
        this.nextDiscardIdx = [0,0,0,0]
        this.nextDrawIdx = [0,0,0,0]
    }
    stringState() {
        return `TurnNum: ${this.ply} ${this.pidx} ${this.nextDiscardIdx} ${this.nextDrawIdx}`
    }
    getDraw() {
        let draw = this.draws[this.pidx][this.nextDrawIdx[this.pidx]]
        if (draw == null) {
            //console.log('undefined out of draws')
            return null
        }
        if (typeof draw == "string") {
            // by the time we are here, it's guaranteed any call is legal
            // no need to check who it came from etc
            //console.log('string draw', draw)
            let idx = draw.indexOf('p')
            if (idx !== -1) {
                idx = idx/2
                draw = parseInt(draw[5]+draw[6]) // no matter where 'p' is, the last two digits are the ponned tile
                //console.log('pon', idx, draw)
                return ['pon', idx, draw]
            }
            //   daiminkan: (open kan)
            //     kamicha   "m39393939" (0)
            //     toimen    "39m393939" (1)
            //     shimocha  "222222m22" (3)
            //     (writes to draws; 0 to discards)
            idx = draw.indexOf('m')
            if (idx !== -1) {
                idx = idx/2
                if (idx==3) { 
                    idx=2 // special case for shimocha
                }
                draw = parseInt(draw[7]+draw[8]) // no matter where 'm' is, the last two digits are the ponned tile
                return ['openkan', idx, draw]
            }
            let chiIdx = draw.indexOf('c')
            if (chiIdx !== -1) {
                let t0 = parseInt(draw[1]+draw[2])
                let t1 = parseInt(draw[3]+draw[4])
                let t2 = parseInt(draw[5]+draw[6])
                //console.log('chi', t0, t1, t2)
                return ['chi', t0, t1, t2]
            }
            throw new Error(`Cannot parse draw ${draw}`)
        }
        return ['draw', draw]
    }
    getDiscard() {
        return this.discards[this.pidx][this.nextDiscardIdx[this.pidx]]
    }
    incPly(discard, selfKan, openKan) {
        if (discard !== null) {
            this.nextDrawIdx[this.pidx]++
            this.nextDiscardIdx[this.pidx]++
            if (!selfKan) {
                this.pidx = this.whoIsNext(discard)
            } else {
                // console.log('self kan so extra turn')
            }
            if (openKan) {
                console.log('openkan')
                this.nextDiscardIdx[this.pidx]++
            }
        } else if (selfKan) {
            this.nextDrawIdx[this.pidx]++
            this.nextDiscardIdx[this.pidx]++
        }
        this.ply++
    }
    whoIsNext(discard) {
        // To know who is next we have to look at the other three players draw arrays
        // and determine there were any calls to disrupt the normal turn order
        for (let tmpPidx=0; tmpPidx<4; tmpPidx++) {
            let offset = (4 + tmpPidx - this.pidx - 1) % 4
            if (tmpPidx == this.pidx || offset == 0) {
                // cannot call own tile
                // if offset is zero it will be our turn next unless someone else is doing e.g. pon
                continue
            }
            let draw = this.draws[tmpPidx][this.nextDrawIdx[tmpPidx]]
            if (typeof draw == 'string') {
                let fancyDrawClass = new Draw(draw)
                // The call string encodes who they called from by putting e.g. 'p' in idx=0,2,4
                // See if the timing is correct by comparing caller idx to current discarder idx
                //        tmp                             this             v-- extra 4+ because e.g. -1%4 = -1 (we want 3)
                // p212121 p0 pon from their kami/left     p3   idx/2=0   (4+0-3)%4 = 1-1 = 0
                // 21p2121 p0 pon from their toimen/cross  p2   idx/2=1   (4+0-2)%4 = 2-1 = 1
                // 2121p21 p0 pon from their shimo/right   p1   idx/2=2   (4+0-1)%4 = 3-1 = 2
                // if (fancyDrawClass.type=='m') {
                    // console.log('open kan incoming', fancyDrawClass, offset)
                    // }
                // check if the non-numeric (e.g. 'p') is in the calculated offset spot
                if (fancyDrawClass.idx == offset) {
                    if (parseInt(draw[0]+draw[1])==discard) {
                        return tmpPidx
                    } else {
                        // console.log('We will call from them, but it must be later, not now!')
                        // console.log(draw, discard, tmpPidx, GS.gl.rawRound)
                        // console.log(fancyDrawClass)
                    }
                }
            }
        }
        return (this.pidx+1) % 4
    }
}

function removeFromArray(array, value) {
    const indexToRemove = array.indexOf(value)
    if (indexToRemove === -1) { 
        throw new Error(`Value ${value} not in array ${array}`)
    }
    array.splice(indexToRemove, 1)
}

function updateState() {
    if (GS.json_data == null) {
        console.log('no data to parse yet')
        return
    }
    GS.gl = new GameLog(GS.json_data[GS.hand_counter]['log'][0])
    for (let ply=0; ply <= GS.ply_counter; ply++) {
        let event = GS.ge[GS.hand_counter][ply]
        if (event.type == 'draw') {
            GS.gl.drawnTile[event.pidx] = event.draw
        } else if (event.type == 'call') {
            let dp = GS.gl.discardPond[event.fromIdxAbs]
            dp[dp.length-1].called = true
            GS.gl.calls[event.pidx].push(event.draw)
            if (event.fromIdxRel == 0) {
                GS.gl.calls[event.pidx].push('rotate')
            }
            for (let i=0; i<event.meldedTiles.length; i++) {
                removeFromArray(GS.gl.hands[event.pidx], event.meldedTiles[i])
                GS.gl.calls[event.pidx].push(event.meldedTiles[i])
                if (event.fromIdxRel == i+1) {
                    GS.gl.calls[event.pidx].push('rotate')
                }
            }
        } else if (event.type == 'kakan') {
            // kakan = added kan
            console.assert(event.meldedTiles.length==1)
            // Put the drawn tile into hand first, then remove whatever tile we are going to kakan
            GS.gl.hands[event.pidx].push(GS.gl.drawnTile[event.pidx])
            GS.gl.hands[event.pidx].sort(tileSort)
            GS.gl.drawnTile[event.pidx] = null
            for (let i=0; i<event.meldedTiles.length; i++) {
                removeFromArray(GS.gl.hands[event.pidx], event.meldedTiles[i])
                GS.gl.calls[event.pidx].push(event.meldedTiles[i])
                GS.gl.calls[event.pidx].push('rotate')
            }
        } else if (event.type == 'ankan') {
            console.assert(event.meldedTiles.length==4)
            GS.gl.hands[event.pidx].push(GS.gl.drawnTile[event.pidx])
            GS.gl.hands[event.pidx].sort(tileSort)
            GS.gl.drawnTile[event.pidx] = null
            for (let i=0; i<event.meldedTiles.length; i++) {
                removeFromArray(GS.gl.hands[event.pidx], event.meldedTiles[i])
                GS.gl.calls[event.pidx].push(event.meldedTiles[i])
                if (event.fromIdxRel == i+1) {
                    GS.gl.calls[event.pidx].push('rotate')
                }
            }
        } else if (event.type == 'discard') {
            let riichi = GS.ge[GS.hand_counter][ply-1].type == "riichi"
            let tsumogiri = event.discard==60
            if (tsumogiri) {
                let tile = new Tile(GS.gl.drawnTile[event.pidx])
                tile.riichi = riichi
                tile.tsumogiri = true
                GS.gl.discardPond[event.pidx].push(tile)
                GS.gl.drawnTile[event.pidx] = null
            } else {
                let tile = new Tile(event.discard)
                tile.riichi = riichi
                GS.gl.discardPond[event.pidx].push(tile)
                removeFromArray(GS.gl.hands[event.pidx], event.discard)
                // for calls there will not be a drawnTile
                if (GS.gl.drawnTile[event.pidx]) {
                    GS.gl.hands[event.pidx].push(GS.gl.drawnTile[event.pidx])
                    GS.gl.hands[event.pidx].sort(tileSort)
                    GS.gl.drawnTile[event.pidx] = null
                }
            }
        } else if (event.type == 'riichi') {
            // console.log('riichi', GS.ply_counter)
        } else if (event.type == 'result') {
            GS.gl.handOver = true
            console.log('result: ', GS.gl.result, GS.gl.scoreChanges, GS.gl.winner, GS.gl.payer, GS.gl.yakuStrings)
        } else {
            console.log(event)
            throw new Error('unknown type')
        }
    }
    GS.ui.reset()
    GS.ui.updateHandInfo(GS.gl.hands, GS.gl.calls, GS.gl.drawnTile)
    GS.ui.updateDiscardPond()
    GS.ui.updateGridInfo()
}

class GameEvent {
    constructor(type, pidx, args) {
        this.type = type
        this.pidx = pidx
        if (this.type == 'call') {
            this.draw = args['draw']
            this.fromIdxRel = args['fromIdxRel']
            this.fromIdxAbs = (4 + this.pidx - this.fromIdxRel - 1) % 4
            this.meldedTiles = args['meldedTiles']
        } else if (this.type == 'draw') {
            this.draw = args['draw']
        } else if (this.type == 'discard') {
            this.discard = args['discard']
        } else if (this.type == 'ankan') {
            this.meldedTiles = args['meldedTiles']
        } else if (this.type == 'kakan') {
            this.fromIdxRel = args['fromIdxRel']
            this.fromIdxAbs = (4 + this.pidx - this.fromIdxRel - 1) % 4
            this.meldedTiles = args['meldedTiles']
        } else if (this.type == 'riichi') {
            // do nothing
        } else if (this.type == 'result') {
        } else {
            throw new Error('invalid')
        }
    }
}

class Draw {
    constructor(callStr) {
        this.idx = callStr.search(/[a-z]/)
        if (this.idx==-1) {
            this.type = 'draw'
            this.drawnTile = parseInt(callStr)
            console.assert(!isNaN(callStr))
        } else {
            this.type = callStr[this.idx]
            this.calledTile = parseInt(callStr[this.idx+1] + callStr[this.idx+2])
            this.idx = Math.min(this.idx/2, 2)
            this.meldedTiles = callStr.replace(/[a-z]/, '').match(/../g).map(x => parseInt(x))
        }
    }
}
/* 
function parseCallStr(callStr) {
    console.log(new Draw(callStr))
}

parseCallStr("m39393939")
parseCallStr("39m393939")
parseCallStr("222222m22")
parseCallStr("k37373737")
parseCallStr("31k313131")
parseCallStr("3737k3737")
parseCallStr("c111213")
parseCallStr("11")
 */
///////////////////////////////////////////////////
// kan naki:
//   daiminkan: (open kan)
//     kamicha   "m39393939" (0)
//     toimen    "39m393939" (1)
//     shimocha  "222222m22" (3)
//     (writes to draws; 0 to discards)
//   shouminkan: (kakan aka added kan) (same order as pon; immediate tile after k is the added tile)
//     kamicha   "k37373737" (0)
//     toimen    "31k313131" (1)
//     shimocha  "3737k3737" (2)
//     (writes to discards)
//   ankan: (closed kan)
//     "121212a12" (3)
//     (writes to discards)
///////////////////////////////////////////////////
function preParseTenhouLogs(data) {
    GS.ge = []
    if (data == null) {
        console.log('no data to parse yet')
        return
    }
    for (round of data) {
        // console.log('round', round)
        GS.ge.push([])
        GS.gl = new GameLog(round['log'][0])
        // console.log(GS.gl)
        let debug = false
        let openkans = 0
        let ply = new TurnNum()
        while (1) {
            let draw = ply.getDraw(GS.gl.draws)
            if (draw == null) {
                break
            }
            if (GS.ge.length == 7 && GS.ge[GS.ge.length-1].length >= 40) {
                // debug = true
            }
            if (GS.gl.rawRound[0] == 1 && GS.gl.rawRound[1] == 1 && GS.ge[GS.ge.length-1].length >= 14) {
                //debug = true
            }
            debug && console.log('draw', ply, draw)
            if (draw[0] == 'draw') {
                GS.ge[GS.ge.length-1].push(new GameEvent('draw', ply.pidx, {'draw':draw[1]}))
            } else {
                if (draw[0] == 'pon') {
                    let ge = new GameEvent('call', ply.pidx, {'draw':draw[2], 'fromIdxRel':draw[1], 'meldedTiles':[draw[2], draw[2]]})
                    GS.ge[GS.ge.length-1].push(ge)
                } else if (draw[0] == 'openkan') {
                    let ge = new GameEvent('call', ply.pidx, {'draw':draw[2], 'fromIdxRel':draw[1], 'meldedTiles':[draw[2], draw[2], draw[2]]})
                    GS.ge[GS.ge.length-1].push(ge)
                } else if (draw[0] == 'chi') {
                    let ge = new GameEvent('call', ply.pidx, {'draw':draw[1], 'fromIdxRel':0, 'meldedTiles':[draw[2], draw[3]]})
                    GS.ge[GS.ge.length-1].push(ge)
                } else {
                    throw new Error('?', draw)
                }
            }
            ply.incPly(null, draw[0] == 'openkan', draw[0] == 'openkan')
            if (draw[0] == 'openkan') {
                openkans++
                // skip discard, loop back around to draw again
                continue
            }
            // ply.incPly(false, false)
            let discard = ply.getDiscard()
            debug && console.log('disc', ply, discard)
            if (typeof discard == "undefined") {
                break
            }
            if (typeof discard == 'string' && discard.indexOf('k') != -1) {
                fromIdxRel = discard.indexOf('k')/2
                let mt = parseInt(discard[7]+discard[8])
                GS.ge[GS.ge.length-1].push(new GameEvent(
                    'kakan', ply.pidx, {'fromIdxRel':fromIdxRel, 'meldedTiles':[mt]}
                ))
                // kakan and ankan mean we get another draw
                // kakan writes 0 to discard, and there is a chance someone Rons for Robbing a Kan
                ply.incPly(mt, true, false)
            } else if (typeof discard == 'string' && discard.indexOf('a') != -1) {
                let mt = parseInt(discard[7]+discard[8])
                GS.ge[GS.ge.length-1].push(new GameEvent(
                    'ankan', ply.pidx, {'meldedTiles':[mt, mt, mt, mt]}))
                // kakan and ankan mean we get another draw
                ply.incPly(mt, true, false)
            } else {
                if (discard[0] == 'r') {
                    // split riichi into two events
                    GS.ge[GS.ge.length-1].push(new GameEvent('riichi', ply.pidx))
                    discard = parseInt(discard.substring(1))
                    // let the next if statement handle the discard
                }
                if (typeof discard == 'number') {
                    GS.ge[GS.ge.length-1].push(new GameEvent('discard', ply.pidx, {'discard':discard}))
                } else {
                    console.log(typeof discard, discard)
                    throw new Error('discard should be number')
                }
                if (discard == 60) {
                    discard = draw[1]
                }
                ply.incPly(discard, false, false)
            }
        }
        GS.ge[GS.ge.length-1].push(new GameEvent('result', null))
        let checkPlies = 0
        for (i=0; i<4; i++) {
            checkPlies += GS.gl.draws[i].length
            checkPlies += GS.gl.discards[i].length
        }
        // openkans have an extra 0 in the discard array that is just skipped
        checkPlies == ply.ply + openkans || console.log('error', checkPlies, ply.stringState())
    }
    // merge in mortalEval events
    for (let roundNum=0; roundNum<GS.ge.length; roundNum++) {
        let mortalEvalIdx = 0
        for (let event of GS.ge[roundNum]) {
            if (mortalEvalIdx >= GS.mortalEvals[roundNum].length) {
                break
            }
            let mortalEval = GS.mortalEvals[roundNum][mortalEvalIdx]
            if (event.type == 'draw' && event.pidx == GS.heroPidx && mortalEval.type=='Discard') {
                // TODO: I think the only reason we check mortalEval.type=='Discard' is because there is Tsumo also
                // probably could add that also.
                event.mortalEval = mortalEval
                if (mortalEval.p_action == "Riichi") {
                    mortalEvalIdx++
                    mortalEval = GS.mortalEvals[roundNum][mortalEvalIdx]
                    if (mortalEval) {
                        if (mortalEval.type == "Discard") {
                            event.mortalEvalAfterRiichi = mortalEval
                            console.log('mortal disagreed with riichi discard', event)
                        } else {
                            console.log('TODO: Add Ron/Tsumo/Kan after riichi', mortalEval)
                        }
                    } 
                }
                mortalEvalIdx++
            } else if (event.type == 'call' && event.pidx == GS.heroPidx) {
                console.assert(mortalEval.type == 'Discard')
                event.mortalEval = mortalEval
                mortalEvalIdx++
            } else if (event.type == 'discard' && ((GS.heroPidx + mortalEval.fromIdxRel)%4 == event.pidx) && mortalEval.type=='Call') {
                event.mortalEval = mortalEval
                mortalEvalIdx++
            }
        }
    }
    console.log('preParseTenhouLogs done', GS.ge)
}

function createTile(tileStr) {
    if (!tileStr || tileStr == null || tileStr.length>5) {
        console.log('error', tileStr)
        throw new Error()
    }
    const tileImg = document.createElement('img')
    tileImg.src = `media/Regular_shortnames/${tileStr}.svg`
    tileImg.style.background = "white"
    tileImg.style.border = "1px solid grey"
    tileImg.style.padding = "1px 1px 1px 1px"
    return tileImg
}

// Input: 123m456s789p1112z Output: 1m2m3m4s5s6s7p8p9p1z1z1z2z
function convertTileStr(str) {
    let output = []
    let suit = ''
    // go backwards so we know what suit each number is
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

function incPlyCounter() {
    GS.ply_counter < GS.ge[GS.hand_counter].length-1 && GS.ply_counter++
}

function decPlyCounter() {
    GS.ply_counter > 0 && GS.ply_counter--
}

function incHandCounter() {
    GS.hand_counter++
    if (GS.hand_counter >= GS.ge.length) {
        GS.hand_counter = 0
    }
    GS.ply_counter = 0
}

function decHandCounter() {
    GS.hand_counter--
    if (GS.hand_counter < 0) {
        GS.hand_counter = GS.ge.length-1
    }
    GS.ply_counter = 0
}

function connectUI() {
    const inc = document.getElementById("ply-inc");
    const inc2 = document.getElementById("ply-inc2");
    const dec = document.getElementById("ply-dec");
    const dec2 = document.getElementById("ply-dec2");
    const handInc = document.getElementById("hand-inc")
    const handDec = document.getElementById("hand-dec")
    inc.addEventListener("click", () => {
        incPlyCounter();
        updateState()
    });
    inc2.addEventListener("click", () => {
        do {
            incPlyCounter();
        } while (!('mortalEval' in GS.ge[GS.hand_counter][GS.ply_counter]) && GS.ply_counter < GS.ge[GS.hand_counter].length-1)
        updateState()
    });
    dec.addEventListener("click", () => {
        decPlyCounter();
        updateState()
    });
    dec2.addEventListener("click", () => {
        do {
            decPlyCounter();
        } while (!('mortalEval' in GS.ge[GS.hand_counter][GS.ply_counter]) && GS.ply_counter > 0)
        updateState()
    });
    handInc.addEventListener("click", () => {
        incHandCounter();
        updateState()
    });
    handDec.addEventListener("click", () => {
        decHandCounter();
        updateState()
    });
}

function setMortalHtmlStr(data) {
    const parser = new DOMParser()
    GS.mortalHtmlDoc = parser.parseFromString(data, 'text/html')
    GS.ply_counter = 0 // TODO where does it make sense to reset this stuff?
    GS.hand_counter = 0
    parseMortalHtml()
    GS.json_data = []
    for (ta of GS.mortalHtmlDoc.querySelectorAll('textarea')) {
        GS.json_data.push(JSON.parse(ta.value))
    }
    preParseTenhouLogs(GS.json_data)
}

class MortalEval {
    constructor(currTurn) {
        this.currTurn = currTurn
        this.Pvals = {}
        this.type = null
        this.p_discard = null
        this.p_action = null
        this.m_action = null
    }   
}

//
// Discard example (Note Player and Mortal have different formats)
//<span> <span class="role">Player: </span>Discard <svg class="tile"><use class="face" href="#pai-7s"></use></svg></span>
//<span class="role">Mortal: </span>
//Discard 
//<svg class="tile"><use class="face" href="#pai-7s"></use></svg>

// Call example 1
//<span> <span class="role">Player: </span>Skip</span>
//<span class="role">Mortal: </span>
//Skip
//<tr><td>Skip</td><td><span class="int">0.</span><span class="frac">18420</span></td><td><span class="int">100.</span><span class="frac">00000</span></td></tr>
//<tr><td><svg class="tile"><use class="face" href="#pai-s"></use></svg><svg class="tile"><use class="face" href="#pai-s"></use></svg> Pon</td><td><span class="int">-1.</span><span class="frac">68001</span></td><td><span class="int">0.</span><span class="frac">00000</span></td></tr>

// Call example 2
//<td><svg class="tile"><use class="face" href="#pai-s"></use></svg><svg class="tile"><use class="face" href="#pai-s"></use></svg> Pon</td>
//<span style="background:#ffd5d5"> <span class="role">Player: </span><svg class="tile"><use class="face" href="#pai-4m"></use></svg><svg class="tile"><use class="face" href="#pai-6m"></use></svg> Chii</span>
//<span class="role">Mortal: </span>
//Skip
//<tr><td>Skip</td><td><span class="int">-0.</span><span class="frac">03748</span></td><td><span class="int">99.</span><span class="frac">65749</span></td></tr>
//<td><svg class="tile"><use class="face" href="#pai-4m"></use></svg><svg class="tile"><use class="face" href="#pai-6m"></use></svg> Chii</td>
//
function parseMortalHtml() {
    let RiichiState = null
    
    for (dtElement of GS.mortalHtmlDoc.querySelectorAll('dt')) {
        if (dtElement.textContent === 'player id') {
            GS.heroPidx = parseInt(dtElement.nextSibling.textContent)
            GS.ui.povPidx = GS.heroPidx
            break
        }
    }

    GS.mortalEvals = []
    for (d of GS.mortalHtmlDoc.querySelectorAll('details')) {
        let summary = d.querySelector('summary')
        let currTurn = null
        if (!summary) {
            continue
        }
        // the Tenhou JSON log is in this, use it to find new rounds
        if (d.querySelector('textarea')) {
            RiichiState = null // reset state
            GS.mortalEvals.push([])
        }
        // Turn example: <summary>Turn 6 (×50)<span class="turn-info"> &nbsp;&nbsp;&nbsp;2 shanten&nbsp;&nbsp;&nbsp;</span></summary>
        if (summary.textContent.includes("Turn")) {
            currTurn = summary.textContent
        }
        if (RiichiState === 'Complete') {
            // continue // skip if we riiched a previous turn
            // TODO: Post-riichi Kans
        }

        let roles = d.querySelectorAll('span.role')
        if (roles.length == 0) {
            continue
        }
        let evals = new MortalEval(currTurn)
        evals.p_action = roles[0].nextSibling.textContent
        if (RiichiState == 'Discarding') {
            RiichiState = 'Complete' // We are now processing the riichi discard set the state now
        }
        if (evals.p_action.includes('Riichi')) {
            RiichiState = 'Discarding' // set flag so we process the Riichi discard next
        }

        if (evals.p_action.includes('Discard')) {
            evals.type = 'Discard'
            // Player is wrapped nicely in a parent span
            evals.p_action = roles[0].parentElement.querySelector('use').href.baseVal
            // Mortal is not wrapped, use next.next instead
            evals.m_action = roles[1].nextSibling.nextSibling.querySelector('use').href.baseVal
            evals.p_action = mortalHashTile2tenhou(evals.p_action)
            evals.m_action = mortalHashTile2tenhou(evals.m_action)
        } else {
            evals.p_action = roles[0].nextSibling.textContent
            evals.m_action = roles[1].nextSibling.textContent
            let beforeAction = d.querySelector('li.tsumo').getAttribute('before')
            if (beforeAction && !beforeAction.includes('Draw')) {
                evals.type = 'Call' // Chi, Pon, Open Kan
                evals.strFromRel = beforeAction.match(/^[^\W]+/)[0]
                const fromMap = {"Shimocha":1, "Toimen":2, "Kamicha":3}
                console.assert(evals.strFromRel in fromMap)
                evals.fromIdxRel = fromMap[evals.strFromRel]
            } else if (evals.p_action == "Tsumo") {
                evals.type = 'Tsumo'
            } else {
                evals.type = 'Discard' // Riichi, Ankan, Kakan
            }
        }
        let tbody = d.querySelector('tbody')
        for (let tr of tbody.querySelectorAll('tr')) {
            let action = tr.firstElementChild.textContent.trim()
            i = tr.querySelectorAll('span.int')
            f = tr.querySelectorAll('span.frac')
            Qval = parseFloat(i[0].textContent + f[0].textContent)
            Pval = parseFloat(i[1].textContent + f[1].textContent)

            if (evals.type == 'Call' || action == "Riichi" || action == "Tsumo") {
                evals.Pvals[action] = Pval
                //console.log('action', action, tr.innerHTML)
                // TODO: Chi/Pon etc has tiles in it
            } else {
                let tile = tr.querySelector('use').href.baseVal
                tile = mortalHashTile2tenhou(tile)
                evals.Pvals[tile] = Pval
            }
        }
        let softmaxed = soften(Object.values(evals.Pvals))
        evals.Pvals_soft = Object.keys(evals.Pvals).reduce((acc, key, index) => {
            acc[key] = softmaxed[index];
            return acc;
        }, {});

        GS.mortalEvals[GS.mortalEvals.length-1].push(evals)
    }
    console.log('parseMortalHtml done', GS.mortalEvals)
}

function soften(pdfs) {
    const hotter = pdfs.map(x => Math.pow(x, 1/GS.C_soft_T))
    const denom = hotter.reduce((a, b) => a + b)
    return hotter.map(x => x/denom*100)
}

function getJsonData() {
    data = localStorage.getItem('mortalHtmlStr')
    if (data) {
        mortalFilename = localStorage.getItem('mortalFilename')
        let label = document.getElementById('mortal-html-label')
        label.innerHTML = "Choose Mortal File<br>" + mortalFilename
        data = LZString.decompressFromUTF16(data)
        setMortalHtmlStr(data)
        updateState()
    }

    let fileInput = document.getElementById('mortal-html-file')
    fileInput.addEventListener('change', function(event) {
        let file = event.target.files[0]
        if (file) {
            let label = document.getElementById('mortal-html-label')
            label.innerHTML = "Choose Mortal File<br>" + file.name
            let fr = new FileReader()
            fr.readAsText(file)
            fr.onload = function() {
                let data = LZString.compressToUTF16(fr.result)
                localStorage.setItem('mortalHtmlStr', data)
                localStorage.setItem('mortalFilename', file.name)
                setMortalHtmlStr(fr.result)
                updateState()
            }
        } else {
            console.log('no file')
        }
    })
}

const GS = new GlobalState
function main() {
    getJsonData()
    connectUI()
}
main()

