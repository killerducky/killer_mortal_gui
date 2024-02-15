"use strict";

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
        this.prevRoundSticks = this.rawRound[2]
        this.thisRoundSticks = [0,0,0,0]
        this.thisRoundExtraDoras = 0
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
        this.scoreChanges = this.resultArray[1] || [0,0,0,0]
        if (this.resultArray.length > 2) {
            this.winner = this.resultArray[2][0]
            this.payer = this.resultArray[2][1]
            this.pao = this.resultArray[2][2] // TODO: Find an example of this
            this.yakuStrings = this.resultArray[2].slice(3)
        } else {
            this.winner = null
            this.payer = null
            this.pao = null
            this.yakuStrings = []
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
        this.newUser = true

        this.ply_counter = 0
        this.hand_counter = 0
        this.mortalHtmlDoc = null
        this.json_data = null
        this.heroPidx = null   // player index mortal reviewed
        this.showHands = false

        this.C_soft_T = 2

        this.C_db_height = 60
        this.C_db_totWidth = 605
        this.C_db_handPadding = 10
        this.C_db_padding = 15
        this.C_db_tileWidth = 34
        this.C_db_heroBarWidth = 20
        this.C_db_mortBarWidth = 10
        this.C_cb_heroBarHeight = 60
        this.C_cb_mortBarHeightRatio = 0.9
        this.C_cb_totHeight = 105
        this.C_cb_totWidth = 200
        this.C_cb_padding = 10

        this.C_colorText = getComputedStyle(document.documentElement).getPropertyValue('--color-text')
        this.C_colorBarMortal = getComputedStyle(document.documentElement).getPropertyValue('--color-bar-mortal')
        this.C_colorBarHero = getComputedStyle(document.documentElement).getPropertyValue('--color-bar-hero')
        this.C_colorTsumogiri = getComputedStyle(document.documentElement).getPropertyValue('--color-tsumogiri')

        this.C_windStr = ['E', 'S', 'W', 'N']
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
        this.pInfoResult = []
        this.gridInfo = document.querySelector('.grid-info')
        this.povPidx = 0
        for (let pnum of Array(4).keys()) {
            this.hands.push(document.querySelector(`.grid-hand-p${pnum}`))
            this.discards.push(document.querySelector(`.grid-discard-p${pnum}`))
            this.pInfo.push(document.querySelector(`.gi-p${pnum}`))
            this.pInfoResult.push(document.querySelector(`.gi-p${pnum}-result`))
        }
        this.round = document.querySelector('.info-round')
        this.prevRoundSticks = document.querySelector('.info-sticks')
        this.doras = document.querySelector('.info-doras')
        this.aboutModal = document.querySelector('.about-modal')
        this.infoRoundModal = document.querySelector('.info-round-modal')
        this.infoRoundTable = document.querySelector('.info-round-table')
        this.infoThisRoundModal = document.querySelector('.info-this-round-modal')
        this.infoThisRoundTable = document.querySelector('.info-this-round-table')
    }
    getHand(pidx) { 
        return this.hands[pidx.pov()] 
    }
    getDiscard(pidx) { 
        return this.discards[pidx.pov()]
    }
    roundStr() {
        let str = GS.C_windStr[GS.gl.roundWind-41]
        str += (GS.gl.roundNum+1)
        if (GS.gl.honbas > 0) {
            str += "-" + GS.gl.honbas
        }
        return str
    }
    reset() {
        let currGeList = GS.ge[GS.hand_counter]
        let result = currGeList.slice(-1)[0]
        this.round.replaceChildren(this.roundStr())
        this.prevRoundSticks.replaceChildren()
        this.doras.replaceChildren()
        for (let pidx=0; pidx<4; pidx++) {
            let pidxObj = new PIDX(pidx)
            this.discards[pidxObj.pov()].replaceChildren()
            let seatWind = (4 + pidx - GS.gl.roundNum) % 4
            this.pInfo[pidxObj.pov()].replaceChildren(GS.C_windStr[seatWind])
            this.pInfo[pidxObj.pov()].append(' ', GS.gl.scores[pidx]-GS.gl.thisRoundSticks[pidx]*1000)
            this.pInfoResult[pidxObj.pov()].replaceChildren()
            this.pInfoResult[pidxObj.pov()].append(this.formatString(-GS.gl.thisRoundSticks[pidx]*1000, false, true))
        }
    }
    formatString(num, showZero, addPlus) {
        if (!showZero && num == 0) {
            return ''
        }
        let s = (addPlus && num>0) ? '+' : ''
        s += num
        return s
    }
    relativeToHeroStr(pidx) {
        let relIdx = pidx<4 ? (4 + GS.heroPidx - pidx) % 4 : pidx
        return ['Hero', 'Kami', 'Toimen', 'Shimo', 'Pot'][relIdx]
    }
    parseYakuString(yaku) {
        let s = yaku.split(/([\(\)])|([0-9:]+)/)
        s = s.map(x => x in exactTranslation ? exactTranslation[x]['DEFAULT'] : x)
        s = s.map(x => x in partialTranslationForStats ? partialTranslationForStats[x]['DEFAULT'] : x)
        return s.join(' ')
    }
    updateGridInfo() {
        this.clearDiscardBars()
        this.clearCallBars()
        let event = GS.ge[GS.hand_counter][GS.ply_counter]
        let mortalEval = event.mortalEval
        if (mortalEval) {
            if (mortalEval.type == 'Discard') {
                this.updateDiscardBars()
                this.updateCallBars() // For calls such as Kan or Riichi instead of discarding
            } else {
                this.updateCallBars()
            }
        }
        for (let i=0; i<5; i++) {
            if (GS.gl.dora[i] == null || i > GS.gl.thisRoundExtraDoras) {
                this.doras.append(createTile('back'))
            } else {
                this.doras.append(createTile(tenhou2str(GS.gl.dora[i])))
            }
            this.doras.lastChild.setAttribute('width', 20)
        }
        if (GS.gl.handOver) {
            this.infoThisRoundTable.replaceChildren()
            let table = document.createElement("table")
            if (GS.gl.result == '和了') {
                if (GS.gl.winner == GS.gl.payer) {
                    this.infoThisRoundTable.append(`Tsumo`)
                    this.infoThisRoundTable.append(document.createElement("br"))
                } else {
                    this.infoThisRoundTable.append(`Ron`)
                    this.infoThisRoundTable.append(document.createElement("br"))
                }
            } else if (GS.gl.result == '流局') {
                this.infoThisRoundTable.append('Draw')
                this.infoThisRoundTable.append(document.createElement("br"))
            } else if (GS.gl.result == '流し満貫') {
                this.infoThisRoundTable.append('Nagashi Mangan (wow!) TODO test this')
            } else if (GS.gl.result == '九種九牌') {
                this.infoThisRoundTable.append('Nine Terminal Draw')
            }
            for (let yaku of GS.gl.yakuStrings) {
                this.infoThisRoundTable.append(this.parseYakuString(yaku))
                this.infoThisRoundTable.append(document.createElement("br"))
            }
            for (let pidx=0; pidx<4+1; pidx++) {
                let tr = table.insertRow()
                let cell = tr.insertCell()
                cell.textContent = `${this.relativeToHeroStr(pidx)}`
                cell = tr.insertCell()
                cell.textContent = `${event.scoreChangesPlusSticks[pidx]}`
            }
            table.style.margin = "10px auto"
            this.infoThisRoundTable.append(table)

            this.infoThisRoundModal.showModal()
            this.infoThisRoundModal.addEventListener('click', (event) => {
                this.infoThisRoundModal.close()
            })
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
        let slot = 0
        let mismatch = false
        for (const key in mortalEval.Pvals) {
            let Pval = mortalEval.Pvals[key]
            if (!isNaN(key) && (mortalEval.m_action != key || mortalEval.p_action == key)) {
                continue
            }
            let xloc = GS.C_db_tileWidth*1.2/2 + slot*GS.C_db_tileWidth*1.2
            if (key == mortalEval.p_action) {
                svgElement.appendChild(this.createRect(
                    xloc-GS.C_db_heroBarWidth/2, GS.C_db_heroBarWidth, GS.C_cb_heroBarHeight, 1, GS.C_colorBarHero
                ))
            }
            svgElement.appendChild(this.createRect(
                xloc-GS.C_db_mortBarWidth/2, GS.C_db_mortBarWidth, GS.C_cb_heroBarHeight, Pval/100*GS.C_cb_mortBarHeightRatio, GS.C_colorBarMortal
            ));
            if (isNaN(key)) {
                let text = document.createElementNS("http://www.w3.org/2000/svg", "text")
                text.setAttribute("x", xloc-GS.C_db_mortBarWidth/2-10)
                text.setAttribute("y", GS.C_db_height + 20)
                text.setAttribute("fill", GS.C_colorText)
                text.textContent = key
                svgElement.appendChild(text)
            } else {
                mismatch = true
                let backgroundRect = document.createElementNS("http://www.w3.org/2000/svg", "rect")
                backgroundRect.setAttribute("x", xloc - GS.C_db_mortBarWidth / 2 - 10+5-1)
                backgroundRect.setAttribute("y", GS.C_db_height + 10-1)
                backgroundRect.setAttribute("width", "20")
                backgroundRect.setAttribute("height", "26")
                backgroundRect.setAttribute("fill", "white")
                svgElement.appendChild(backgroundRect)
                const tileImg = document.createElementNS("http://www.w3.org/2000/svg", "image")
                tileImg.setAttribute('href', `media/Regular_shortnames/${tenhou2str(key)}.svg`)
                tileImg.setAttribute("x", xloc-GS.C_db_mortBarWidth/2-10+5)
                tileImg.setAttribute("y", GS.C_db_height + 10)
                tileImg.style.background = "white"
                tileImg.style.border = "5px solid red"
                tileImg.style.padding = "1px 1px 1px 1px"
                tileImg.setAttribute("width", 18)
                svgElement.appendChild(tileImg)
                let text = document.createElementNS("http://www.w3.org/2000/svg", "text")
            }
            slot++
        }
        if (mismatch) {
            let xloc = GS.C_db_tileWidth*1.2/2 + slot*GS.C_db_tileWidth*1.2
            let text = document.createElementNS("http://www.w3.org/2000/svg", "text")
            text.setAttribute("x", xloc-GS.C_db_mortBarWidth/2)
            text.setAttribute("y", 60)
            text.setAttribute("fill", GS.C_colorText)
            text.textContent = "Hmmm..."
            svgElement.appendChild(text)
        }

    }
    clearDiscardBars() {
        const discardBars = document.getElementById("discard-bars")
        const svgElement = document.createElementNS("http://www.w3.org/2000/svg", "svg")
        svgElement.setAttribute("width", GS.C_db_totWidth)
        svgElement.setAttribute("height", GS.C_db_height)
        svgElement.setAttribute("padding", GS.C_db_padding)
        discardBars.replaceChildren(svgElement)
    }
    createRect(x, width, totHeight, fillRatio, fill) {
        let y = (1-fillRatio)*totHeight
        let rect = document.createElementNS("http://www.w3.org/2000/svg", "rect")
        rect.setAttribute("x", x)
        rect.setAttribute("y", y)
        rect.setAttribute("width", width)
        rect.setAttribute("height", totHeight*fillRatio)
        rect.setAttribute("fill", fill)
        return rect
    }
    updateDiscardBars() {
        let gameEvent = GS.ge[GS.hand_counter][GS.ply_counter]
        let mortalEval = gameEvent.mortalEval
        const discardBars = document.getElementById("discard-bars")
        let svgElement = discardBars.firstElementChild
        let heroSlotFound = typeof mortalEval.p_action == 'string' && (
            (mortalEval.p_action == 'Ryuukyoku' && 'Ryuukyoku' in mortalEval.Pvals) ||
            (mortalEval.p_action == 'Riichi' && 'Riichi' in mortalEval.Pvals) ||
            (mortalEval.p_action == 'Kan' && 'Kan' in mortalEval.Pvals)
        )
        for (let i = -1; i < GS.gl.hands[gameEvent.pidx].length; i++) {
            let tile = (i==-1) ? GS.gl.drawnTile[gameEvent.pidx] : GS.gl.hands[gameEvent.pidx][i]
            if (tile == null) {
                continue // on calls there was no drawnTile
            }
            let Pval = mortalEval['Pvals_soft'][tile]
            if (Pval == null) {
                continue // TODO: Check code for this. For now assume due to illegal calls swaps
            }
            let slot = (i !== -1) ? i : GS.gl.hands[gameEvent.pidx].length+1
            let xloc = GS.C_db_handPadding + GS.C_db_tileWidth/2 + slot*GS.C_db_tileWidth
            if (tile == mortalEval.p_action) {
                heroSlotFound = true
                svgElement.appendChild(this.createRect(
                    xloc-GS.C_db_heroBarWidth/2, GS.C_db_heroBarWidth, GS.C_db_height, 1, GS.C_colorBarHero
                ))
            }
            svgElement.appendChild(this.createRect(
                xloc-GS.C_db_mortBarWidth/2, GS.C_db_mortBarWidth, GS.C_db_height, Pval/100*GS.C_cb_mortBarHeightRatio, GS.C_colorBarMortal
            ));
        }
        if (!heroSlotFound) {
            console.log('!heroSlotFound', gameEvent)
            console.log(GS.gl.drawnTile[gameEvent.pidx])
            console.log(GS.gl.drawnTile)
            throw new Error()
        }
    }
    updateHandInfo() {
        let result = GS.ge[GS.hand_counter].slice(-1)[0]
        for (let pnum=0; pnum<4; pnum++) {
            let objPidx = new PIDX(pnum)
            this.addHandTiles(objPidx, [], true)
            for (let tileInt of GS.gl.hands[pnum]) {
                // TODO: Draw and all tenpai could show the hands also?
                if (GS.showHands || (GS.gl.handOver && GS.gl.scoreChanges[pnum]>0) || pnum==GS.heroPidx) {
                    this.addHandTiles(objPidx, [tenhou2str(tileInt)], false)
                } else {
                    this.addHandTiles(objPidx, ['back'], false)
                }
            }
            this.addBlankSpace(objPidx)
            if (GS.gl.drawnTile[pnum] != null) {
                this.addHandTiles(objPidx, [tenhou2str(GS.gl.drawnTile[pnum])], false)
            } else {
                this.addBlankSpace(objPidx)
            }
            if (GS.gl.calls[pnum].length > 0) {
                this.addBlankSpace(objPidx)
                for (let tileInt of GS.gl.calls[pnum]) {
                    if (tileInt == 'rotate') {
                        this.rotateLastTile(objPidx, 'hand')
                    } else if (tileInt == 'float') {
                        this.floatLastTile(objPidx)
                    } else if (tileInt == 'back') {
                        this.addHandTiles(objPidx, [tileInt], false)
                    } else {
                        this.addHandTiles(objPidx, [tenhou2str(tileInt)], false)
                    }
                }
            }
        }
    }
    addHandTiles(pidx, tileStrArray, replace) {
        if (replace) {
            this.getHand(pidx).replaceChildren()
        }
        for (let i in tileStrArray) {
            this.getHand(pidx).appendChild(createTile(tileStrArray[i]))
        }   
    }
    addDiscardTiles(pidx, tileStrArray, replace) {
        if (replace) {
            this.getDiscard(pidx).replaceChildren()
        }
        for (let i in tileStrArray) {
            this.getDiscard(pidx).appendChild(createTile(tileStrArray[i]))
        }   
    }
    rotateLastTile(objPidx, type) {
        let div = (type=='hand') ? this.getHand(objPidx) : this.getDiscard(objPidx)
        let angle = (objPidx.pov() * 90 + 90) % 360
        div.lastChild.style.transform = `rotate(${angle}deg)`
        if (objPidx.pov() == 1 || objPidx.pov() == 3) {
            div.lastChild.style.marginBottom = '-5px'
            div.lastChild.style.marginTop = '5px'
            div.lastChild.style.transform += objPidx.pov()==1 ? ' translate(6px,0px)' : ' translate(-6px,0px)'
        } else {
            div.lastChild.style.marginRight = '5px'
            div.lastChild.style.marginLeft = '5px'
            div.lastChild.style.marginBottom = '0px'
            div.lastChild.style.transform += objPidx.pov()==2 ? ' translate(-6px,0px)' : ' translate(6px,0px)'
        }
    }
    floatLastTile(pidx) {
        if (pidx.pov() == 0) {
            this.getHand(pidx).lastChild.style.marginLeft = '-39px'
            this.getHand(pidx).lastChild.style.transform += ' translate(-34px,0px)'
        } else if (pidx.pov() == 1) {
            this.getHand(pidx).lastChild.style.marginTop = '-39px'
            this.getHand(pidx).lastChild.style.transform += ' translate(-34px,0px)'
        } else if (pidx.pov() == 2) {
            this.getHand(pidx).lastChild.style.marginLeft = '-39px'
            this.getHand(pidx).lastChild.style.transform += ' translate(34px,0px)'
        } else if (pidx.pov() == 3) {
            this.getHand(pidx).lastChild.style.marginTop = '-39px'
            this.getHand(pidx).lastChild.style.transform += ' translate(34px,0px)'
        } else {
            console.log('error ', pidx)
        }
    }
    addBlankSpace(pidx) {
        this.addHandTiles(pidx, ['Blank'], false)
        this.getHand(pidx).lastChild.style.opacity = "0"
    }
    updateDiscardPond() {
        let event = GS.ge[GS.hand_counter][GS.ply_counter]
        for (let pidx=0; pidx<4; pidx++) {
            let pidxObj = new PIDX(pidx)
            for (let tile of GS.gl.discardPond[pidx]) {
                this.addDiscard(pidxObj, [tenhou2str(tile.tile)], tile.tsumogiri, tile.riichi)
                if (tile.called) {
                    this.lastDiscardWasCalled(pidxObj)
                }
            }
            if (event.type=='discard' && pidx==event.pidx) {
                // console.log('hi', event)
                // this.getDiscard(pidxObj).lastChild.style.transform += ' translate(30px,30px)'
                // console.log(this.getDiscard(pidxObj).lastChild)
            }
        }
    }
    addDiscard(pidx, tileStrArray, tsumogiri, riichi) {
        this.addDiscardTiles(pidx, tileStrArray)
        if (tsumogiri) {
            this.getDiscard(pidx).lastChild.style.background = GS.C_colorTsumogiri
        }
        if (riichi) {
            this.rotateLastTile(pidx, 'discard')
        }
    }
    lastDiscardWasCalled(pidx) {
        this.getDiscard(pidx).lastChild.style.opacity = "0.5"
    }
    updateResultsTable() {
        let table = document.createElement("table")
        this.infoRoundTable.replaceChildren(table)
        let hand_counter = 0
        let tr = table.insertRow()
        let cell = tr.insertCell()
        cell.textContent = 'Round'
        for (let i=0; i<2; i++) {
            for (let pidx=0; pidx<4+1; pidx++) {
                cell = tr.insertCell()
                cell.textContent = `${this.relativeToHeroStr(pidx)}`
            }
            if (i==0) {cell = tr.insertCell()}
        }
        for (let [roundNum, currGeList] of GS.ge.entries()) {
            GS.gl = new GameLog(GS.json_data[hand_counter]['log'][0])
            let result = currGeList.slice(-1)[0]
            tr = table.insertRow()
            tr.addEventListener('click', () => {
                GS.hand_counter = roundNum
                GS.ply_counter = 0
                this.infoRoundModal.close()
                updateState()
            })
            cell = tr.insertCell()
            cell.textContent = this.roundStr()
            for (let pidx=0; pidx<4+1; pidx++) {
                cell = tr.insertCell()
                cell.textContent = pidx==4 ? GS.gl.prevRoundSticks*1000 : `${GS.gl.scores[pidx]}`
            }
            cell = tr.insertCell()
            for (let pidx=0; pidx<4+1; pidx++) {
                cell = tr.insertCell()
                cell.textContent = `${result.scoreChangesPlusSticks[pidx]}`
                if (result.scoreChangesPlusSticks[pidx] < -7000) {
                    cell.classList.add('big-loss')
                } else if (result.scoreChangesPlusSticks[pidx] < 0) {
                    cell.classList.add('small-loss')
                }
            }
            hand_counter++
        }
        this.infoRoundModal.addEventListener('click', (event) => {
            this.infoRoundModal.close()
        })
    }
}

function sum(a) {
    return a.reduce((a,b)=>a+b) // javascript really doesn't have this by default?
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
        let tile = yakuhai[str[0]]
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
    let suitInt = Math.floor(tileInt / 10)
    tileInt = tileInt % 10
    const tcon = ['m', 'p', 's', 'z']
    let output = tileInt.toString() + tcon[suitInt-1]
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

// 15 == 51, 25 == 52 (aka 5s are equal to normal 5s)
function fuzzyCompareTile(t1, t2) {
    let ft1 = Math.floor(tileInt2Float(t1))
    let ft2 = Math.floor(tileInt2Float(t2))
    return ft1 == ft2
}

class TurnNum {
    constructor() {
        this.ply = 0
        this.pidx = GS.gl.dealerIdx
        this.nextDiscardIdx = [0,0,0,0]
        this.nextDrawIdx = [0,0,0,0]
    }
    stringState() {
        return `TurnNum: ${this.ply} ${this.pidx} ${this.nextDiscardIdx} ${this.nextDrawIdx}`
    }
    getDraw() {
        let draw = GS.gl.draws[this.pidx][this.nextDrawIdx[this.pidx]]
        if (draw == null) {
            //console.log('undefined out of draws')
            return null
        }
        return new NewTile(draw)
    }
    getDiscard() {
        let discard = GS.gl.discards[this.pidx][this.nextDiscardIdx[this.pidx]]
        if (typeof discard == "undefined") {
            return null
        }
        return new NewTile(discard)
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
                // cannot call own tile. if offset is zero it will be our turn next unless someone else is doing e.g. pon
                continue
            }
            let draw = GS.gl.draws[tmpPidx][this.nextDrawIdx[tmpPidx]]
            if (typeof draw == 'string') {
                let fancyDrawClass = new NewTile(draw)
                // The call string encodes who they called from by putting e.g. 'p' in idx=0,2,4
                // See if the timing is correct by comparing caller idx to current discarder idx
                //        tmp                             this             v-- extra 4+ because e.g. -1%4 = -1 (we want 3)
                // p212121 p0 pon from their kami/left     p3   idx/2=0   (4+0-3)%4 = 1-1 = 0
                // 21p2121 p0 pon from their toimen/cross  p2   idx/2=1   (4+0-2)%4 = 2-1 = 1
                // 2121p21 p0 pon from their shimo/right   p1   idx/2=2   (4+0-1)%4 = 3-1 = 2
                if (fancyDrawClass.fromIdxRel == offset) {
                    if (fuzzyCompareTile(fancyDrawClass.newTile, discard)) {
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
            let dp = GS.gl.discardPond[event.draw.fromIdxAbs]
            dp[dp.length-1].called = true
            if (event.draw.type == 'm') {
                GS.gl.thisRoundExtraDoras++ // openkan
            }
            GS.gl.hands[event.pidx].push(event.draw.newTile)
            let allMeldedTiles = event.draw.meldedTiles
            let newCall = []
            for (let i=0; i<allMeldedTiles.length; i++) {
                removeFromArray(GS.gl.hands[event.pidx], allMeldedTiles[i])
                newCall.push(allMeldedTiles[i])
                if (event.draw.fromIdxRel == i) {
                    newCall.push('rotate')
                }
                if (event.draw.type == 'm' && event.draw.fromIdxRel+1 == i) {
                    newCall.push('rotate')
                    newCall.push('float')
                }
            }
            GS.gl.calls[event.pidx] = newCall.concat(GS.gl.calls[event.pidx])
        } else if (event.type == 'kakan') {
            // kakan = added kan
            console.assert(event.kanTile.meldedTiles.length==1)
            GS.gl.thisRoundExtraDoras++
            // Put the drawn tile into hand first, then remove the tile we are going to kakan
            GS.gl.hands[event.pidx].push(GS.gl.drawnTile[event.pidx])
            GS.gl.hands[event.pidx].sort(tileSort)
            GS.gl.drawnTile[event.pidx] = null
            removeFromArray(GS.gl.hands[event.pidx], event.kanTile.meldedTiles[0])
            let rotatedIdx = null
            for (let i=1; i<GS.gl.calls[event.pidx].length; i++) {
                if (GS.gl.calls[event.pidx][i]=='rotate' && fuzzyCompareTile(GS.gl.calls[event.pidx][i-1], event.kanTile.meldedTiles[0])) {
                    rotatedIdx = i
                    break
                }
            }
            if (rotatedIdx === null) {
                console.log(event, GS.gl.calls[event.pidx])
                throw new Error('Cannot find meld to kakan to')
            }
            GS.gl.calls[event.pidx].splice(rotatedIdx+1, 0, event.kanTile.meldedTiles[0], 'rotate', 'float')
        } else if (event.type == 'ankan') {
            console.assert(event.meldedTiles.length==4)
            GS.gl.thisRoundExtraDoras++
            GS.gl.hands[event.pidx].push(GS.gl.drawnTile[event.pidx])
            GS.gl.hands[event.pidx].sort(tileSort)
            GS.gl.drawnTile[event.pidx] = null
            let newCall = []
            for (let i=0; i<event.meldedTiles.length; i++) {
                removeFromArray(GS.gl.hands[event.pidx], event.meldedTiles[i])
                if (i==0 || i==3) {
                    newCall.push('back')
                } else {
                    newCall.push(event.meldedTiles[i])
                    newCall.push('rotate')
                    if (i==2) {
                        newCall.push('float')
                    }
                }
            }
            GS.gl.calls[event.pidx] = newCall.concat(GS.gl.calls[event.pidx])
        } else if (event.type == 'discard') {
            let riichi = GS.ge[GS.hand_counter][ply-1].type == "riichi"
            // If riichi and the tile passed
            if (riichi && GS.ge[GS.hand_counter][ply+1].type != 'result') {
                GS.gl.thisRoundSticks[event.pidx]++
            }
            if (event.discard==60) {
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
        } else {
            console.log(event)
            throw new Error('unknown type')
        }
    }
    GS.ui.reset()
    GS.ui.updateHandInfo()
    GS.ui.updateDiscardPond()
    GS.ui.updateGridInfo()
}

class GameEvent {
    constructor(type, pidx, args) {
        this.type = type
        this.pidx = pidx
        if (this.type == 'call') {
            this.draw = args['draw']
            this.draw.fromIdxAbs = (4 + pidx - this.draw.fromIdxRel - 1) % 4
        } else if (this.type == 'draw') {
            this.draw = args['draw']
        } else if (this.type == 'discard') {
            this.discard = args['discard']
        } else if (this.type == 'ankan') {
            this.meldedTiles = args['meldedTiles']
        } else if (this.type == 'kakan') {
            this.kanTile = args['kanTile']
        } else if (this.type == 'riichi') {
            // do nothing
        } else if (this.type == 'result') {
        } else {
            throw new Error('invalid')
        }
    }
}

class NewTile {
    constructor(callStr) {
        this.callStr = callStr // save original string/number for debug
        if (typeof callStr == 'number') {
            this.type = 'draw'
            this.newTile = parseInt(callStr)
            return
        }
        this.fromIdxRel = callStr.search(/[a-z]/)
        this.type = callStr[this.fromIdxRel]
        this.fromIdxRel = this.fromIdxRel/2
        if (this.type == 'r') {
            this.newTile = parseInt(callStr[1]+callStr[2])
            this.fromIdxRel = null
            return
        }
        this.meldedTiles = callStr.replace(/[a-z]/, '').match(/../g).map(x => parseInt(x))
        this.newTile = this.meldedTiles[this.fromIdxRel]
        // TODO: Test ankan of red 5 type cases
        if (this.type == 'k') {
            // only one of the tiles is actually new
            this.meldedTiles = [this.meldedTiles[this.fromIdxRel]]
        }
        // e.g. 151515k51 -- 51 (red 5) was called from relative p2 (there is no p3)
        // But wait until after we got the real called tile
        this.fromIdxRel = Math.min(this.fromIdxRel, 2)
    }
}

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

function parseOneTenhouRound(round) {
    let currGeList = []
    GS.ge.push(currGeList)
    GS.gl = new GameLog(round['log'][0])
    let openkanCnt = 0
    let kakanCnt = 0
    let ply = new TurnNum()

    while (1) {
        let draw = ply.getDraw(GS.gl.draws)
        if (draw == null) {
            break
        }
        if (draw.type == 'draw') {
            currGeList.push(new GameEvent('draw', ply.pidx, {'draw':draw.newTile}))
        } else {
            let ge = new GameEvent('call', ply.pidx, {'draw':draw})
            currGeList.push(ge)
        }
        ply.incPly(null, draw.type == 'm', draw.type == 'm')
        if (draw.type == 'm') {
            openkanCnt++
            // skip discard, loop back around to draw again
            continue
        }
        let discard = ply.getDiscard()
        if (discard === null) {
            break
        }
        if (discard.type == 'k') {
            console.assert(discard.meldedTiles.length==1)
            currGeList.push(new GameEvent('kakan', ply.pidx, {'kanTile':discard}))
            kakanCnt++
            // kakan and ankan mean we get another draw
            // kakan writes 0 to discard, and there is a chance someone Rons for Robbing a Kan
            ply.incPly(discard.newTile, true, false)
        } else if (discard.type == 'a') {
            currGeList.push(new GameEvent('ankan', ply.pidx, {'meldedTiles':discard.meldedTiles}))
            // kakan and ankan mean we get another draw
            ply.incPly(discard.newTile, true, false)
        } else {
            if (discard.type == 'r') {
                // split riichi into two events
                currGeList.push(new GameEvent('riichi', ply.pidx))
                // let the next if statement handle the discard
            }
            if (typeof discard.newTile == 'number') {
                currGeList.push(new GameEvent('discard', ply.pidx, {'discard':discard.newTile}))
            } else {
                console.log(typeof discard, discard)
                throw new Error('discard.newTile should be number')
            }
            if (discard.newTile == 60) {
                discard.newTile = draw.newTile
            }
            ply.incPly(discard.newTile, false, false)
        }
    }
    return [openkanCnt, kakanCnt, ply, currGeList]
}

function addResult(currGeList) {
    let result = new GameEvent('result', null)
    currGeList.push(result)

    for (let tmpPly=1; tmpPly<currGeList.length; tmpPly++) {
        let riichi = currGeList[tmpPly-1].type == "riichi"
        // If riichi and the tile passed
        if (riichi && currGeList[tmpPly+1].type != 'result') {
            GS.gl.thisRoundSticks[currGeList[tmpPly].pidx]++
        }
    }
    result.scoreChangesPlusSticks = GS.gl.scoreChanges.concat([0])
    for (let pidx=0; pidx<4; pidx++) {
        result.scoreChangesPlusSticks[pidx] -= GS.gl.thisRoundSticks[pidx]*1000
    }
    if (GS.gl.result == '和了') {
        // If there was a winner, they get the prevRoundSticks
        result.scoreChangesPlusSticks[4] = -GS.gl.prevRoundSticks*1000
    } else {
        // If no winner, pot "wins" the sticks
        result.scoreChangesPlusSticks[4] += sum(GS.gl.thisRoundSticks)*1000
    }
    console.assert(sum(result.scoreChangesPlusSticks)==0)
}

function mergeMortalEvents() {
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
                            // console.log('mortal disagreed with riichi discard', event)
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
            } else if (event.type == 'result') {
                //console.log('result', event, mortalEval)
            }
        }
    }
}

function checkPlies(openkanCnt, kakanCnt, ply, currGeList) {
    let checkPlies = 0
    for (let i=0; i<4; i++) {
        checkPlies += GS.gl.draws[i].length
        checkPlies += GS.gl.discards[i].length
    }
    // openkans have an extra 0 in the discard array that is just skipped
    checkPlies == ply.ply + openkanCnt || console.log('checkPlies mismatch', checkPlies, ply.stringState(), openkanCnt, kakanCnt, result, GS.gl.thisRoundSticks)
}

function preParseTenhouLogs(data) {
    GS.ge = []
    if (data == null) {
        console.log('no data to parse yet')
        return
    }
    for (let round of data) {
        let currGeList
        let openkanCnt
        let kakanCnt
        let ply
        [openkanCnt, kakanCnt, ply, currGeList] = parseOneTenhouRound(round)
        addResult(currGeList)
        checkPlies(openkanCnt, kakanCnt, ply, currGeList)
    }
    mergeMortalEvents()
    console.log('preParseTenhouLogs done', GS.ge)
    GS.ui.updateResultsTable()
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
    if (GS.ply_counter < GS.ge[GS.hand_counter].length-1) {
        GS.ply_counter++
    } else {
        incHandCounter()
    }
}

function decPlyCounter() {
    if (GS.ply_counter > 0) {
        GS.ply_counter--
    } else {
        decHandCounter()
        GS.ply_counter = GS.ge[GS.hand_counter].length-1
    }
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

function stopCondition(onlyMismatches) {
    let mortalEval = GS.ge[GS.hand_counter][GS.ply_counter].mortalEval
    let mismatch = mortalEval && (mortalEval.m_action != mortalEval.p_action)
    return mortalEval && (!onlyMismatches || mismatch) ||
        GS.ply_counter == 0 || 
        GS.ply_counter == GS.ge[GS.hand_counter].length-1
}
function showModalAndWait(modal) {
    modal.showModal()
    modal.addEventListener('click', (event) => {
        if (event.target == modal) {
            modal.close()
        }
    })
}
function connectUI() {
    const handInc = document.getElementById("hand-inc")
    const handDec = document.getElementById("hand-dec")
    const prevMismatch = document.getElementById("prev-mismatch")
    const nextMismatch = document.getElementById("next-mismatch")
    const inc2 = document.getElementById("ply-inc2");
    const dec2 = document.getElementById("ply-dec2");
    const inc = document.getElementById("ply-inc");
    const dec = document.getElementById("ply-dec");
    const showHands =  document.getElementById("show-hands")
    const about =  document.getElementById("about")
    const aboutModal =  document.getElementById("about-modal")
    const infoRound = document.querySelector('.info-round')
    const closeModal = document.querySelector('.info-round-close')
    const infoRoundModal = document.querySelector('.info-round-modal')
    inc.addEventListener("click", () => {
        incPlyCounter();
        updateState()
    });
    inc2.addEventListener("click", () => {
        do {
            incPlyCounter();
        } while (!stopCondition(false))
        updateState()
    });
    nextMismatch.addEventListener("click", () => {
        do {
            incPlyCounter();
        } while (!stopCondition(true))
        updateState()
    });
    dec.addEventListener("click", () => {
        decPlyCounter();
        updateState()
    });
    dec2.addEventListener("click", () => {
        do {
            decPlyCounter();
        } while (!stopCondition(false))
        updateState()
    });
    prevMismatch.addEventListener("click", () => {
        do {
            decPlyCounter();
        } while (!stopCondition(true))
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
    showHands.addEventListener("click", () => {
        GS.showHands = !GS.showHands
        updateState()
    })
    if (GS.newUser) {
        showModalAndWait(aboutModal)
    }
    about.addEventListener("click", () => {
        showModalAndWait(aboutModal)
    })
    infoRound.addEventListener("click", () => {
        infoRoundModal.showModal()
    })
    closeModal.addEventListener("click", () => {
        infoRoundModal.close()
    })
}

function setMortalHtmlStr(data) {
    const parser = new DOMParser()
    GS.mortalHtmlDoc = parser.parseFromString(data, 'text/html')
    GS.ply_counter = 0 // TODO where does it make sense to reset this stuff?
    GS.hand_counter = 0
    parseMortalHtml()
    GS.json_data = []
    for (let ta of GS.mortalHtmlDoc.querySelectorAll('textarea')) {
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
    
    for (let dtElement of GS.mortalHtmlDoc.querySelectorAll('dt')) {
        if (dtElement.textContent === 'player id') {
            GS.heroPidx = parseInt(dtElement.nextSibling.textContent)
            GS.ui.povPidx = GS.heroPidx
            break
        }
    }

    GS.mortalEvals = []
    for (let d of GS.mortalHtmlDoc.querySelectorAll('details')) {
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
        // TODO: This is probably not going to be the final value of evals.p_action!
        evals.p_action = roles[0].nextSibling.textContent.trim()
        if (RiichiState == 'Discarding') {
            RiichiState = 'Complete' // We are now processing the riichi discard set the state now
        }
        if (evals.p_action.includes('Riichi')) {
            RiichiState = 'Discarding' // set flag so we process the Riichi discard next
        }

        if (evals.p_action.includes('Discard')) {
            evals.type = 'Discard'
            // replace evals.p_action with the actual tile discarded
            // Player is wrapped nicely in a parent span
            evals.p_action = roles[0].parentElement.querySelector('use').href.baseVal
            // Mortal is not wrapped, use next.next instead
            evals.m_action = roles[1].nextSibling.nextSibling.querySelector('use').href.baseVal
            evals.p_action = mortalHashTile2tenhou(evals.p_action)
            evals.m_action = mortalHashTile2tenhou(evals.m_action)
        } else {
            // TODO this isn't right for all cases but m_action isn't really used anyways...
            evals.m_action = roles[1].nextSibling.textContent.trim()
            let beforeAction = d.querySelector('li.tsumo').getAttribute('before')
            if (beforeAction && !beforeAction.includes('Draw')) {
                // if (evals.p_action != "Skip") {
                //     console.log(roles[1].parentElement.textContent)
                // }
                evals.type = 'Call' // Chi, Pon, Open Kan
                evals.p_action = roles[0].parentElement.textContent.replace(/Player:/, '').trim()
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
            let i = tr.querySelectorAll('span.int')
            let f = tr.querySelectorAll('span.frac')
            let Qval = parseFloat(i[0].textContent + f[0].textContent)
            let Pval = parseFloat(i[1].textContent + f[1].textContent)

            if (evals.type == 'Call' || action == "Riichi" || action == "Tsumo" || action == "Kan" || action == "Ryuukyoku") {
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
    const denom = Math.max(...hotter)
    return hotter.map(x => x/denom*100)
}

function getJsonData() {
    let data = localStorage.getItem('mortalHtmlStr')
    let label = document.getElementById('mortal-html-label')
    if (data) {
        let mortalFilename = localStorage.getItem('mortalFilename')
        label.innerHTML = "Choose Mortal File<br>" + mortalFilename
        data = LZString.decompressFromUTF16(data)
        setMortalHtmlStr(data)
        updateState()
        GS.newUser = false
    } else {
        data = LZString.decompressFromBase64(demo_data)
        setMortalHtmlStr(data)
        updateState()
        label.innerHTML = "Choose Mortal File<br>" + "(Demo file loaded)"
    }

    let fileInput = document.getElementById('mortal-html-file')
    fileInput.addEventListener('change', function(event) {
        let file = event.target.files[0]
        if (file) {
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

function tests() {
    console.assert(new NewTile('151515k51').newTile == 51)
    console.assert(new NewTile('151551k15').newTile == 15)
    // crazy open kans
    GS.json_data = '{"title":["",""],"name":["","","",""],"rule":{"aka":0,"aka51":1,"aka52":1,"aka53":1,"disp":"玉の間南喰赤"},"sx":["C","C","C","C"],"log":[[[0,0,0],[25000,25000,25000,25000],[47],[],[11,13,51,17,19,21,21,21,23,23,23,25,25],[25,42,42,42,42],[11,13,51,17,19],[31,31,31,31,33,33,33,33,35,35,35,53,37],[],[],[32,32,32,32,34,34,34,34,36,36,36,36,38],[],[],[11,11,11,13,13,13,15,15,15,17,17,17,19],["111111m11",41,"131313m13",41,"151515m51",41,"171717m17",41],[0,60,0,60,0,60,0,60],["不明"]]]}'
    GS.json_data = [JSON.parse(GS.json_data)]
    GS.mortalEvals = [[]]
    preParseTenhouLogs(GS.json_data)
    updateState()
    console.log('tests done (remove from production)')
}

const GS = new GlobalState
function main() {
    //tests()
    getJsonData()
    connectUI()
}
main()

