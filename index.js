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

class GameLog {
    constructor(log) {
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
        
        let logIdx = 0
        this.round = log[logIdx++]
        this.scores = log[logIdx++]
        this.dora = log[logIdx++]
        this.uradora = log[logIdx++]
        this.hands = []
        this.drawnTile = [null, null, null, null]
        this.calls = [[],[],[],[]]
        this.draws = []
        this.discards = []
        for (let pnum of Array(4).keys()) {
            this.hands.push(Array.from(log[logIdx++]))
            this.draws.push(log[logIdx++])
            this.discards.push(log[logIdx++])
            this.hands[pnum].sort(tileSort)
        }
        this.result = log[logIdx][0]
        this.scoreChanges = log[logIdx][1]
        this.winner = log[logIdx][2][0]
        this.payer = log[logIdx][2][1]
        this.pao = log[logIdx][2][2] // TODO: Find an example of this
        this.yakuStrings = log[logIdx][2].slice(3)
        this.handOver = false
    }
}

class GlobalState {
    constructor() {
        this.ui = new UI
        this.gl = null

        this.ply_counter = 0
        this.max_ply = 999
        this.mortalHtmlDoc = null
        this.json_data = null
        this.mortalEvals = []    // flat array of all decisions
        this.mortalEvalIdx = 0   // index to current decision
        this.heroPidx = null   // player index mortal reviewed

        this.C_db_height = 60
        this.C_db_totWidth = 605
        this.C_db_handPadding = 10
        this.C_db_padding = 15
        this.C_db_tileWidth = 34
        this.C_db_heroBarWidth = 16
        this.C_db_mortBarWidth = 10
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
        this.gridInfo = document.querySelector('.grid-info')
        this.povPidx = 0
        for (let pnum of Array(4).keys()) {
            this.hands.push(document.querySelector(`.grid-hand-p${pnum}`))
            this.discards.push(document.querySelector(`.grid-discard-p${pnum}`))
        }
    }
    #getHand(pidx) { 
        return this.hands[pidx.pov()] 
    }
    #getDiscard(pidx) { 
        return this.discards[pidx.pov()]
    }
    reset(round, dora, uradora) {
        this.gridInfo.replaceChildren()
        this.gridInfo.append('round ', JSON.stringify(round), document.createElement('br'))
        this.gridInfo.append('dora ', JSON.stringify(dora), document.createElement('br'))
        this.gridInfo.append('uradora ', JSON.stringify(uradora), document.createElement('br'))
        for (let i of Array(4).keys()) {
            this.discards[i].replaceChildren()
        }
    }
    updateGridInfo(ply, hands, calls, drawnTile) {
        this.clearDiscardBars()
        if (GS.heroPidx == ply.pidx) {
            this.gridInfo.append('heroIdx ', GS.heroPidx, ' idx ', GS.mortalEvalIdx)
            if (GS.heroPidx == ply.pidx && (ply.ply%2)==1) {
                this.gridInfo.append(' discarding')
                this.updateDiscardBars(ply, hands, calls, drawnTile)
            }
        }
        if (GS.gl.handOver) {
            this.gridInfo.append(document.createElement('br'))
            this.gridInfo.append('\nHand Over', document.createElement('br'))
            this.gridInfo.append(`result ${GS.gl.result} winner ${GS.gl.winner} payer ${GS.gl.payer}`, document.createElement('br'))
            this.gridInfo.append(JSON.stringify(GS.gl.scoreChanges, GS.gl.yakuStrings), document.createElement('br'))
        }
    }
    clearDiscardBars() {
        const discardBars = document.getElementById("discard-bars")
        discardBars.replaceChildren()
        let svgElement = document.createElementNS("http://www.w3.org/2000/svg", "svg")
        svgElement.setAttribute("width", GS.C_db_totWidth)
        svgElement.setAttribute("height", GS.C_db_height)
        svgElement.setAttribute("padding", GS.C_db_padding)
        discardBars.appendChild(svgElement);
    }
    updateDiscardBars(ply, hands, calls, drawnTile) {
        const discardBars = document.getElementById("discard-bars")
        discardBars.replaceChildren() // TODO don't recreate the svgElement twice every time
        let evals = GS.mortalEvals[GS.mortalEvalIdx]
        let svgElement = document.createElementNS("http://www.w3.org/2000/svg", "svg")
        svgElement.setAttribute("width", GS.C_db_totWidth)
        svgElement.setAttribute("height", GS.C_db_height)
        svgElement.setAttribute("padding", GS.C_db_height)
        console.log(evals)
        let heroDiscard = ply.getDiscard()
        if (heroDiscard == 60) {
            heroDiscard = drawnTile[ply.pidx]
        }
        let match = true // did we discard what mortal would?
        //console.log(' upcoming discard: ', heroDiscard)
        if (evals['m_discard'] != evals['p_discard']) {
            console.log(' mismatch!', evals['m_discard'], evals['p_discard'], heroDiscard)
            match = false
        }
        for (let i = -1; i < hands[ply.pidx].length; i++) {
            let tile = null
            let Pval = null
            if (i==-1) {
                tile = drawnTile[ply.pidx]
                if (tile == null) {
                    //console.log('skip tile null')
                    continue // on calls there was no drawnTile
                }
                console.log('tile', tile    )
            } else {
                tile = hands[ply.pidx][i]
            }
            Pval = evals['Pvals'][tile]
            if (Pval == null) {
                console.log('missing Pval, probably because it is an illegal discard')
                console.log(`tile=${tile} i=${i}`)
                continue
            }
            let slot = (i !== -1) ? i : hands[ply.pidx].length+1
            let xloc = GS.C_db_handPadding + GS.C_db_tileWidth/2 + slot*GS.C_db_tileWidth
            if (tile == heroDiscard) {
                console.log('slot ', slot, i, tile, heroDiscard)
                let rect2 = document.createElementNS("http://www.w3.org/2000/svg", "rect")
                rect2.setAttribute("x", xloc-GS.C_db_heroBarWidth/2)
                rect2.setAttribute("y", 0)
                rect2.setAttribute("width", GS.C_db_heroBarWidth)
                rect2.setAttribute("height", Math.ceil(1*GS.C_db_height))
                rect2.setAttribute("fill", "red")
                rect2.setAttribute("z-index", -1) // behind Mortal's Bar, but wider
                svgElement.appendChild(rect2)
            }
            let rect = document.createElementNS("http://www.w3.org/2000/svg", "rect")
            rect.setAttribute("x", xloc-GS.C_db_mortBarWidth/2)
            //console.log('test', tile, i, Pval, Math.floor((1-Pval/100)*GS.C_db_height))
            rect.setAttribute("y", Math.floor((1-Pval/100)*GS.C_db_height))
            rect.setAttribute("width", GS.C_db_mortBarWidth)
            rect.setAttribute("height", Math.ceil((Pval/100)*GS.C_db_height))
            rect.setAttribute("fill", "blue")
            svgElement.appendChild(rect);
        }
        discardBars.appendChild(svgElement);
    }
    updateHandInfo(hands, calls, drawnTile) {
                for (let pnum of Array(4).keys()) {
            let objPnum = new PIDX(pnum)
                        this.addHandTiles(objPnum, [], true)
            for (let tileInt of hands[pnum]) {
                this.addHandTiles(objPnum, [tenhou2str(tileInt)], false)
            }
            if (drawnTile[pnum] != null) {
                this.addBlankSpace(objPnum)
                for (let tileInt of [drawnTile[pnum]]) {
                    this.addHandTiles(objPnum, [tenhou2str(tileInt)], false)
                }
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
        this.#getHand(pidx).lastChild.style.margin = '6px'
    }

    // TODO kinda hacky way to add a space
    addBlankSpace(pidx) {
        this.addHandTiles(pidx, ['Blank'], false)
        this.#getHand(pidx).lastChild.style.opacity = "0"
    }
    addDiscard(pidx, tileStrArray, tsumogiri, riichi) {
        this.addDiscardTiles(pidx, tileStrArray)
        if (!tsumogiri) {
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

// TODO: Need work on dividing stuff into classes
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
        let draw = this.draws[this.pidx][this.nextDrawIdx[this.pidx]]
        if (draw == null) {
            console.log('undefined out of draws')
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
    incPly() {
        // even ply draw, odd ply discard
        // TODO: It's weird that we don't increment draw in the even ply?
        //       but for now it doesn't matter
        if (this.ply%2==1) {
            if (this.pidx == GS.heroPidx) {
                GS.mortalEvalIdx++
            }
            this.nextDrawIdx[this.pidx]++
            this.nextDiscardIdx[this.pidx]++
            this.pidx = this.whoIsNext()
        }
        this.ply++
    }
    whoIsNext() {
        // To know who is next we have to look at the other three players draw arrays
        // and determine there were any calls to disrupt the normal turn order
        let debug = false
        for (let tmpPidx of Array(4).keys()) {
            if (tmpPidx == this.pidx) {
                continue // cannot call own tile
            }
            let draw = this.draws[tmpPidx][this.nextDrawIdx[tmpPidx]]
            if (typeof draw == 'string') {
                // The call string encodes who they called from by putting e.g. 'p' in idx=0,2,4
                // See if the timing is correct by comparing caller idx to current discarder idx
                //        tmp                             this             v-- extra 4+ because e.g. -1%4 = -1 (we want 3)
                // p212121 p0 pon from their kami/left     p3   idx/2=0   (4+0-3)%4 = 1-1 = 0
                // 21p2121 p0 pon from their toimen/cross  p2   idx/2=1   (4+0-2)%4 = 2-1 = 1
                // 2121p21 p0 pon from their shimo/right   p1   idx/2=2   (4+0-1)%4 = 3-1 = 2
                let offset = (4 + tmpPidx - this.pidx) % 4 - 1
                debug && console.log('whoisnext', draw, this.draws[tmpPidx], this.pidx, tmpPidx, offset)
                let called = false
                // check if the non-numeric (e.g. 'p') is in the calculated offset spot
                if (draw[offset*2]<'0' || draw[offset*2]>'9') {
                    called = true
                    debug && console.log('huh', offset, draw, draw[offset*2])
                }
                if (called) {
                    GS.ui.lastDiscardWasCalled(new PIDX(this.pidx))
                    return tmpPidx
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

function parseJsonData(data) {
    if (data == null) {
        console.log('no data to parse yet')
        return
    }

    GS.gl = new GameLog(data['log'][0])
    const log = data['log'][0]
    logIdx = 0
    round = log[logIdx++]
    scores = log[logIdx++]
    dora = log[logIdx++]
    uradora = log[logIdx++]
    let hands = []
    let drawnTile = [null, null, null, null]
    let calls = [[],[],[],[]]
    let draws = []
    let discards = []
    for (pnum of Array(4).keys()) {
        hands.push(Array.from(log[logIdx++]))
        draws.push(log[logIdx++])
        discards.push(log[logIdx++])
        hands[pnum].sort(tileSort)
    }

    // Initialize whose turn it is, and pointers for current draws/discards for each player
    GS.mortalEvalIdx = 0
    let ply = new TurnNum(round[0], draws, discards)
    GS.ui.reset(round, dora, uradora)

    while (ply.ply < GS.ply_counter) {
        //console.log(ply.ply, ply.pidx)
        draw = ply.getDraw(draws)
        if (draw == null) {
            console.log("out of draws")
            GS.max_ply = this.ply
            GS.gl.handOver = true
            break
        }
        if (draw[0] == 'pon') {
            removeFromArray(hands[ply.pidx], draw[2])
            removeFromArray(hands[ply.pidx], draw[2])
            calls[ply.pidx].push(draw[2])
            if (draw[1] == 0) { calls[ply.pidx].push('rotate')}
            calls[ply.pidx].push(draw[2])
            if (draw[1] == 1) { calls[ply.pidx].push('rotate')}
            calls[ply.pidx].push(draw[2])
            if (draw[1] == 2) { calls[ply.pidx].push('rotate')}
        } else if (draw[0] == 'chi') {
            removeFromArray(hands[ply.pidx], draw[2])
            removeFromArray(hands[ply.pidx], draw[3])
            calls[ply.pidx].push(draw[1])
            calls[ply.pidx].push('rotate')
            calls[ply.pidx].push(draw[2])
            calls[ply.pidx].push(draw[3])
        } else if (draw[0] == 'draw') {
            drawnTile[ply.pidx] = draw[1]
        } else {
            throw new Error(`unknown draw ${draw}`)
        }
        //console.log(`ply ${ply.ply} pidx ${ply.pidx} draw ${draw}, ${tenhou2str(draw)}`)
        ply.incPly()
        if (ply.ply >= GS.ply_counter) {
            break
        }
        let discard = ply.getDiscard()
        if (typeof discard == "undefined") {
            console.log("out of discards")
            GS.max_ply = this.ply
            GS.gl.handOver = true
            break
        }
        let riichi = false
        if (discard[0] == 'r') {
            riichi = true
            discard = parseInt(discard.substring(1))
        } else if (typeof discard != 'number') {
            throw new Error('discard should be number', typeof discard, discard)
        }
        //console.log(`ply ${ply.ply} pidx ${ply.pidx} discard ${discard}`)
        let tsumogiri = discard==60
        if (tsumogiri) {
            discard = drawnTile[ply.pidx] // tsumogiri the drawn tile
            drawnTile[ply.pidx] = null
        } else if (draw[0] == 'draw') {
            // normal draw and discard
            removeFromArray(hands[ply.pidx], discard)
            hands[ply.pidx].push(drawnTile[ply.pidx])
            hands[ply.pidx].sort(tileSort)
            drawnTile[ply.pidx] = null
        } else {
            // otherwise it was a call, no new tile, just discard
            removeFromArray(hands[ply.pidx], discard)
        }
        GS.ui.addDiscard(new PIDX(ply.pidx), [tenhou2str(discard)], !tsumogiri, riichi)
        ply.incPly()
    }

    GS.ui.updateHandInfo(hands, calls, drawnTile)
    GS.ui.updateGridInfo(ply, hands, calls, drawnTile)
}

function createTile(tileStr) {
    const tileImg = document.createElement('img')
    tileImg.src = `media/Regular_shortnames/${tileStr}.svg`
    tileImg.style.background = "white"
    tileImg.style.border = "1px solid grey"
    tileImg.style.padding = "1px 1px 1px 1px"
    return tileImg
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

function incPlyCounter() {
    GS.ply_counter < GS.max_ply && GS.ply_counter++;
}

function decPlyCounter() {
    GS.ply_counter > 0 && GS.ply_counter--;
}

function getPlyCounter() {
    return GS.ply_counter;
}

function connectUI() {
    const inc = document.getElementById("ply-inc");
    const inc2 = document.getElementById("ply-inc2");
    const input = document.getElementById("ply-counter");
    const dec = document.getElementById("ply-dec");
    const dec2 = document.getElementById("ply-dec2");
    inc.addEventListener("click", () => {
        incPlyCounter();
        input.value = getPlyCounter();
        parseJsonData(GS.json_data)
    });
    inc2.addEventListener("click", () => {
        incPlyCounter();
        incPlyCounter();
        incPlyCounter();
        incPlyCounter();
        input.value = getPlyCounter();
        parseJsonData(GS.json_data)
    });
    dec.addEventListener("click", () => {
        if (input.value > 0) {
          decPlyCounter();
        }
        input.value = getPlyCounter();
        parseJsonData(GS.json_data)
    });
    dec2.addEventListener("click", () => {
        decPlyCounter();
        decPlyCounter();
        decPlyCounter();
        decPlyCounter();
        input.value = getPlyCounter();
        parseJsonData(GS.json_data)
    });
}

function setMortalHtmlStr(data) {
    const parser = new DOMParser()
    GS.mortalHtmlDoc = parser.parseFromString(data, 'text/html')
    parseMortalHtml()
    GS.json_data = JSON.parse(GS.mortalHtmlDoc.querySelector('textarea').value)
    console.log(GS.json_data)
    parseJsonData(GS.json_data)
}

function parseMortalHtml() {
    let RiichiState = null
    let debug = false
    
    let pid = null
    for (dtElement of GS.mortalHtmlDoc.querySelectorAll('dt')) {
        if (dtElement.textContent === 'player id') {
            GS.heroPidx = parseInt(dtElement.nextSibling.textContent)
            GS.ui.povPidx = GS.heroPidx // TODO: UI for changing povPidx
            console.log('heroPidx ', GS.ui.povPidx)
            break
        }
    }

    GS.mortalEvals = []
    for (d of GS.mortalHtmlDoc.querySelectorAll('details')) {
        debug && console.log(d)
        let summary = d.querySelector('summary')
        let currTurn = null
        if (!summary) {
            continue
        }
        if (summary.textContent.includes("Turn 1 ")) {
            RiichiState = null // reset state
        }
        if (summary.textContent.includes("Turn")) {
            currTurn = summary.textContent
        }
        if (RiichiState === 'complete') {
            continue // skip if we riiched a previous turn
        }
        let roles = d.querySelectorAll('span.role')
        if (roles.length == 0) {
            continue
        }
        let p_action = roles[0].nextSibling.textContent
        if (p_action.includes('Riichi')) {
            RiichiState = 'discarding' // set flag so we process the Riichi discard next
        }
        if (!p_action.includes('Discard')) {
            continue // TODO: Add code for calls also!
        }
        if (RiichiState === 'discarding') {
            RiichiState = 'complete' // We are now processing the riichi discard set the state now
        }
        // Player is wrapped nicely in a parent span
        let p_discard = roles[0].parentElement.querySelector('use').href.baseVal
        // Mortal is not wrapped, use next.next instead
        let m_discard = roles[1].nextSibling.nextSibling.querySelector('use').href.baseVal
        let tbody = d.querySelector('tbody')
        let m_Pval = null
        let p_Pval = null
        let info = {'p_discard':p_discard, 'm_discard':m_discard, 'currTurn':currTurn, 'Pvals':{}}
        for (let tr of tbody.querySelectorAll('tr')) {
            m_Pval = null
            p_Pval = null
            let tile = null
            let riichi = false
            let action = tr.textContent.trim()
            //console.log('')
            //console.log(tr)
            //console.log('action', typeof action, action)
            if (action.includes("Riichi")) {
                riichi = true
                //console.log('riichied')
            } else {
                tile = tr.querySelector('use').href.baseVal
            }
            i = tr.querySelectorAll('span.int')
            f = tr.querySelectorAll('span.frac')
            Qval = parseFloat(i[0].textContent + f[0].textContent)
            Pval = parseFloat(i[1].textContent + f[1].textContent)
            //console.log('tile', tile, riichi)
            if (riichi) {
                info['Pvals']['riichi'] = Pval
                // TODO: m_Pval and p_Pval
            } else {
                if (tile == m_discard) {
                    m_Pval = Pval
                }
                if (tile == p_discard) {
                    p_Pval = Pval
                }
                //console.log('parse tile', tile)
                tile = tile.replace('#pai-', '')
                tile = tm2t(tile)
                info['Pvals'][tile] = Pval
            }
        }
        info['m_Pval'] = m_Pval
        info['p_Pval'] = p_Pval
        //console.log(info)
        GS.mortalEvals.push(info)
    }
}

function getJsonData() {
    data = localStorage.getItem('mortalHtmlStr')
    if (data) {
        data = LZString.decompressFromUTF16(data)
        setMortalHtmlStr(data)
    }

    let fileInput = document.getElementById('mortal-html-file')
    fileInput.addEventListener('change', function(event) {
        let file = event.target.files[0]
        if (file) {
            let fr = new FileReader()
            fr.readAsText(file)
            fr.onload = function() {
                let data = LZString.compressToUTF16(fr.result)
                localStorage.setItem('mortalHtmlStr', data)
                setMortalHtmlStr(fr.result)
            }
        } else {
            console.log('no file')
        }
    })
}

const GS = new GlobalState
function main() {
    getJsonData()
    parseJsonData(GS.json_data)
    connectUI()
}
main()

