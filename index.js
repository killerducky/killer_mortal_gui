"use strict";

class GlobalState {
    constructor() {
        this.ui = new UI
        this.fullData = null // Full json -- maybe split this up some, super redundant!
        this.gs = null // current round GameState
        this.ge = null // array of array of GameEvent
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
        this.C_cb_totHeight = 115
        this.C_cb_totWidth = 260
        this.C_cb_padding = 10

        this.C_colorText = getComputedStyle(document.documentElement).getPropertyValue('--color-text')
        this.C_colorBarMortal = getComputedStyle(document.documentElement).getPropertyValue('--color-bar-mortal')
        this.C_colorBarHero = getComputedStyle(document.documentElement).getPropertyValue('--color-bar-hero')
        this.C_colorTsumogiri = getComputedStyle(document.documentElement).getPropertyValue('--color-tsumogiri')
        this.C_colorTileBg = getComputedStyle(document.documentElement).getPropertyValue('--color-tile-bg')

        this.C_windStr = ['E', 'S', 'W', 'N']
    }
}

class GameState {
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

class UI {
    constructor() {
        this.hands = [[],[],[],[]]
        this.discards = [[],[],[],[]]
        this.pInfo = [[],[],[],[]]
        this.pInfoResult = [[],[],[],[]]
        this.gridInfo = document.querySelector('.grid-info')
        this.round = document.querySelector('.info-round')
        this.prevRoundSticks = document.querySelector('.info-sticks')
        this.doras = document.querySelector('.info-doras')
        this.aboutModal = document.querySelector('.about-modal')
        this.infoRoundModal = document.querySelector('.info-round-modal')
        this.infoRoundTable = document.querySelector('.info-round-table')
        this.infoThisRoundModal = document.querySelector('.info-this-round-modal')
        this.infoThisRoundTable = document.querySelector('.info-this-round-table')
        this.infoThisRoundClose = document.querySelector('.info-this-round-close')
        this.setPovPidx(0)
    }
    setPovPidx(newPidx) {
        this.povPidx = newPidx
        for (let pidx=0; pidx<4; pidx++) {
            let tmpPovPidx = (4 + pidx - this.povPidx) % 4
            this.hands[pidx] = document.querySelector(`.grid-hand-p${tmpPovPidx}`)
            this.discards[pidx] = document.querySelector(`.grid-discard-p${tmpPovPidx}`)
            this.pInfo[pidx] = document.querySelector(`.gi-p${tmpPovPidx}`)
            this.pInfoResult[pidx] = document.querySelector(`.gi-p${tmpPovPidx}-result`)
        }
    }
    roundStr(showSticks) {
        let str = GS.C_windStr[GS.gs.roundWind-41]
        str += (GS.gs.roundNum+1)
        if (GS.gs.honbas > 0) {
            str += "-" + GS.gs.honbas
        }
        if (showSticks && GS.gs.prevRoundSticks>0) {
            str += " +" + GS.gs.prevRoundSticks*1000
        }
        return str
    }
    reset() {
        let currGeList = GS.ge[GS.hand_counter]
        let result = currGeList.slice(-1)[0]
        this.round.replaceChildren(this.roundStr(true))
        this.prevRoundSticks.replaceChildren()
        this.doras.replaceChildren()
        for (let pidx=0; pidx<4; pidx++) {
            this.discards[pidx].replaceChildren()
            let seatWind = (4 + pidx - GS.gs.roundNum) % 4
            this.pInfo[pidx].replaceChildren(GS.C_windStr[seatWind])
            this.pInfo[pidx].append(' ', GS.gs.scores[pidx]-GS.gs.thisRoundSticks[pidx]*1000)
            this.pInfoResult[pidx].replaceChildren()
            this.pInfoResult[pidx].append(this.formatString(-GS.gs.thisRoundSticks[pidx]*1000, false, true))
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
        // console.log('updateGridInfo', event, mortalEval)
        if (mortalEval) {
            this.updateDiscardBars()
            this.updateCallBars() // For calls such as Kan or Riichi instead of discarding
        }
        for (let i=0; i<5; i++) {
            if (GS.gs.dora[i] == null || i > GS.gs.thisRoundExtraDoras) {
                this.doras.append(createTile('back'))
            } else {
                this.doras.append(createTile(tenhou2str(GS.gs.dora[i])))
            }
        }
        if (GS.gs.handOver) {
            // console.log('handOver', event)
            this.infoThisRoundTable.replaceChildren()
            let table = document.createElement("table")
            if (GS.gs.result == '和了') {
                if (GS.gs.winner == GS.gs.payer) {
                    this.infoThisRoundTable.append(`Tsumo`)
                    this.infoThisRoundTable.append(document.createElement("br"))
                } else {
                    this.infoThisRoundTable.append(`Ron`)
                    this.infoThisRoundTable.append(document.createElement("br"))
                }
            } else if (GS.gs.result == '流局') {
                this.infoThisRoundTable.append('Draw')
                this.infoThisRoundTable.append(document.createElement("br"))
            } else if (GS.gs.result == '流し満貫') {
                this.infoThisRoundTable.append('Nagashi Mangan (wow!) TODO test this')
            } else if (GS.gs.result == '九種九牌') {
                this.infoThisRoundTable.append('Nine Terminal Draw')
            }
            for (let yaku of GS.gs.yakuStrings) {
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
            this.infoThisRoundClose.addEventListener('click', (event) => {
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
    createTileSvg(x, y, tile) {
        if (isNaN(tile)) {
            console.log(tile)
            throw new Error()
        }
        const backgroundRect = document.createElementNS("http://www.w3.org/2000/svg", "rect")
        backgroundRect.setAttribute("x", x-1)
        backgroundRect.setAttribute("y", y-1)
        backgroundRect.setAttribute("width", "20")
        backgroundRect.setAttribute("height", "26")
        backgroundRect.setAttribute("fill", GS.C_colorTileBg)
        const tileSvg = document.createElementNS("http://www.w3.org/2000/svg", "image")
        tileSvg.setAttribute('href', `media/Regular_shortnames/${tenhou2str(tile)}.svg`)
        tileSvg.setAttribute("x", x)
        tileSvg.setAttribute("y", y)
        tileSvg.style.background = GS.C_colorTileBg
        tileSvg.style.border = "5px solid red"
        tileSvg.style.padding = "1px 1px 1px 1px"
        tileSvg.setAttribute("width", 18)
        return [backgroundRect, tileSvg]
    }
    updateCallBars() {
        let gameEvent = GS.ge[GS.hand_counter][GS.ply_counter]
        let mortalEval = gameEvent.mortalEval
        const callBars = document.querySelector('.killer-call-bars')
        let svgElement = callBars.firstElementChild
        let slot = 0
        for (let detail of mortalEval.details) {
            let Pval = detail.normProb*100
            let mortalQuackTile = !mortalEval.is_equal && detail.action.pai == mortalEval.expected.pai
            if (detail.action.type == 'dahai' && !mortalQuackTile) {
                continue // Skip tiles (unless it's a mismatch)
            }
            // console.log('callbar', detail)
            let xloc = GS.C_db_tileWidth*1.3/2 + slot*GS.C_db_tileWidth*1.3
            if (detail.action.pai == mortalEval.actual.pai) {
                svgElement.appendChild(this.createRect(
                    xloc-GS.C_db_heroBarWidth/2, GS.C_db_heroBarWidth, GS.C_cb_heroBarHeight, 1, GS.C_colorBarHero
                ))
            }
            svgElement.appendChild(this.createRect(
                xloc-GS.C_db_mortBarWidth/2, GS.C_db_mortBarWidth, GS.C_cb_heroBarHeight, Pval/100*GS.C_cb_mortBarHeightRatio, GS.C_colorBarMortal
            ))
            let text = document.createElementNS("http://www.w3.org/2000/svg", "text")
            text.setAttribute("x", xloc-GS.C_db_mortBarWidth/2-10)
            text.setAttribute("y", GS.C_db_height + 20)
            text.setAttribute("fill", GS.C_colorText)
            text.textContent = detail.action.type == 'dahai' ? 'Cut' : 
                               detail.action.type == 'pon' ? 'Pon' :
                               detail.action.type == 'chi' ? 'Chi' :
                               detail.action.type == 'none' ? 'Skip' :
                               detail.action.type == 'hora' ? 'Tsumo' : // TODO Is Ron different?
                               detail.action.type == 'reach' ? 'Riichi' :
                               detail.action.type
            svgElement.appendChild(text)
            if (detail.action.pai) {
                let splitKey = [detail.action.pai] // TODO
                let x_offset = splitKey.length == 1 ? 25 : 35 // why did I use svgs and now I have to write my own layout code!
                for (let i=0; i<splitKey.length; i++) {
                    let tileSvg = this.createTileSvg(xloc+(i+1)*20-GS.C_db_mortBarWidth/2-x_offset, GS.C_db_height + 30, splitKey[i])
                    svgElement.appendChild(tileSvg[0])
                    svgElement.appendChild(tileSvg[1])
                }
            }
            slot++
        }
        // console.log(mortalEval)
        if (!mortalEval.is_equal) {
            let xloc = GS.C_db_tileWidth*1.3/2 + slot*GS.C_db_tileWidth*1.3
            let text = document.createElementNS("http://www.w3.org/2000/svg", "text")
            text.setAttribute("x", xloc-GS.C_db_mortBarWidth/2)
            text.setAttribute("y", 60)
            text.setAttribute("fill", GS.C_colorText)
            // TODO
            if (false) {
                text.textContent = "Hmm..."
            } else {
                text.textContent = "Quack!"
            }
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
        let heroSlotFound = false
        for (let i = -1; i < GS.gs.hands[gameEvent.actor].length; i++) {
            let tile = (i==-1) ? GS.gs.drawnTile[gameEvent.actor] : GS.gs.hands[gameEvent.actor][i]
            if (tile == null) {
                continue // on calls there was no drawnTile
            }
            let matchingDetail = mortalEval.details.find(x => x.action && x.action.pai && x.action.pai==tile)
            if (matchingDetail == null) {
                continue // TODO: Check code for this. For now assume due to illegal calls swaps
            }
            let Pval = matchingDetail.normProb*100
            let slot = (i !== -1) ? i : GS.gs.hands[gameEvent.actor].length+1
            let xloc = GS.C_db_handPadding + GS.C_db_tileWidth/2 + slot*GS.C_db_tileWidth
            if (matchingDetail.action.pai == mortalEval.actual.pai) {
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
            // console.log('!heroSlotFound', gameEvent.mortalEval.actual.type, gameEvent)
            // console.log(GS.gs.drawnTile[gameEvent.actor])
            // console.log(GS.gs.drawnTile)
            // throw new Error()
        }
    }
    updateHandInfo() {
        for (let pidx=0; pidx<4; pidx++) {
            this.addHandTiles(pidx, [], true)
            for (let tileInt of GS.gs.hands[pidx]) {
                // TODO: Draw and all tenpai could show the hands also?
                if (GS.showHands || (GS.gs.handOver && GS.gs.scoreChanges[pidx]>0) || pidx==GS.heroPidx) {
                    this.addHandTiles(pidx, [tenhou2str(tileInt)], false)
                } else {
                    this.addHandTiles(pidx, ['back'], false)
                }
            }
            this.addBlankSpace(pidx)
            if (GS.gs.drawnTile[pidx] != null) {
                if (GS.showHands || (GS.gs.handOver && GS.gs.scoreChanges[pidx]>0) || pidx==GS.heroPidx) {
                    this.addHandTiles(pidx, [tenhou2str(GS.gs.drawnTile[pidx])], false)
                } else {
                    this.addHandTiles(pidx, ['back'], false)
                }
            } else {
                this.addBlankSpace(pidx)
            }
            if (GS.gs.calls[pidx].length > 0) {
                this.addBlankSpace(pidx)
                for (let tileInt of GS.gs.calls[pidx]) {
                    if (tileInt == 'rotate') {
                        this.rotateLastTile(pidx, 'hand')
                    } else if (tileInt == 'float') {
                        this.floatLastTile(pidx)
                    } else if (tileInt == 'back') {
                        this.addHandTiles(pidx, [tileInt], false)
                    } else {
                        this.addHandTiles(pidx, [tenhou2str(tileInt)], false)
                    }
                }
            }
        }
    }
    addHandTiles(pidx, tileStrArray, replace) {
        if (replace) {
            this.hands[pidx].replaceChildren()
        }
        for (let i in tileStrArray) {
            this.hands[pidx].appendChild(createTile(tileStrArray[i]))
        }   
    }
    addDiscardTiles(pidx, tileStrArray, replace) {
        let div = this.discards[pidx]
        if (replace) {
            div.replaceChildren()
        }
        for (let i in tileStrArray) {
            // Add 4 blank placeholders for the first 2 rows of discards
            // The 3rd row will allow 4 overflow tiles
            // Then it overflows to the 4th row (and probably overlaps GUI stuff a bit)
            if (div.childElementCount == 6 || div.childElementCount == 12+4) {
                for (let j=0; j<4; j++) {
                    div.appendChild(createTile('Blank'))
                    div.lastChild.style.opacity = "0"
                }
            }
            div.appendChild(createTile(tileStrArray[i]))
        }   
    }
    rotateLastTile(pidx, type) {
        let div = (type=='hand') ? this.hands[pidx] : this.discards[pidx]
        div.lastChild.lastChild.classList.add('rotate')
    }
    floatLastTile(pidx) {
        let div = this.hands[pidx]
        div.lastChild.lastChild.classList.add('float')
    }
    addBlankSpace(pidx) {
        this.addHandTiles(pidx, ['Blank'], false)
        this.hands[pidx].lastChild.style.opacity = "0"
    }
    updateDiscardPond() {
        let event = GS.ge[GS.hand_counter][GS.ply_counter]
        // console.log('updateDiscardPond', event)
        for (let pidx=0; pidx<4; pidx++) {
            for (let tile of GS.gs.discardPond[pidx]) {
                this.addDiscard(pidx, [tenhou2str(tile.tile)], tile.tsumogiri, tile.riichi)
                if (tile.called) {
                    this.lastDiscardWasCalled(pidx)
                }
            }
            if (event.type=='dahai' && pidx==event.actor) {
                this.discards[pidx].lastChild.lastChild.classList.add('last-discard')
            }
        }
    }
    addDiscard(pidx, tileStrArray, tsumogiri, riichi) {
        this.addDiscardTiles(pidx, tileStrArray)
        if (tsumogiri) {
            this.discards[pidx].lastChild.lastChild.classList.add('tsumogiri')
        }
        if (riichi) {
            this.rotateLastTile(pidx, 'discard')
        }
    }
    lastDiscardWasCalled(pidx) {
        this.discards[pidx].lastChild.classList.add('called')
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
            GS.gs = new GameState(GS.fullData.split_logs[roundNum].log[0])
            let result = currGeList.slice(-1)[0]
            tr = table.insertRow()
            tr.addEventListener('click', () => {
                GS.hand_counter = roundNum
                GS.ply_counter = 0
                this.infoRoundModal.close()
                updateState()
            })
            cell = tr.insertCell()
            cell.textContent = this.roundStr(false)
            for (let pidx=0; pidx<4+1; pidx++) {
                cell = tr.insertCell()
                cell.textContent = pidx==4 ? GS.gs.prevRoundSticks*1000 : `${GS.gs.scores[pidx]}`
            }
            cell = tr.insertCell()
            for (let pidx=0; pidx<4+1; pidx++) {
                cell = tr.insertCell()
                cell.textContent = `${result.scoreChangesPlusSticks[pidx]}`
                if (result.scoreChangesPlusSticks[pidx] < -7000) {
                    cell.classList.add('big-loss')
                } else if (result.scoreChangesPlusSticks[pidx] < -3000) {
                    cell.classList.add('medium-loss')
                } else if (result.scoreChangesPlusSticks[pidx] > 7000) {
                    cell.classList.add('big-win')
                } else if (result.scoreChangesPlusSticks[pidx] > 3000) {
                    cell.classList.add('medium-win')
                }
            }
            hand_counter++
        }
        tr = table.insertRow()
        cell = tr.insertCell()
        cell.textContent = "Final"
        let lastResult = GS.ge.slice(-1)[0].slice(-1)[0]
        for (let pidx=0; pidx<4+1; pidx++) {
            let finalScore = lastResult.scoreChangesPlusSticks[pidx]
            finalScore += pidx==4 ? GS.gs.prevRoundSticks*1000 : GS.gs.scores[pidx]
            cell = tr.insertCell()
            cell.textContent = `${finalScore}`
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
    if (str == undefined) {
        console.log('undefined!')
    }
    if (!isNaN(str)) {
        // console.log('already?', str)
        return str
    }
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
        let tile = yakuhai[str[0].toLowerCase()]
        if (tile == null) {
            throw new Error(`Could not parse ${str}`)
        }
        return tile
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

function removeFromArray(array, value) {
    const indexToRemove = array.indexOf(value)
    if (indexToRemove === -1) { 
        throw new Error(`Value ${value} not in array ${array}`)
    }
    array.splice(indexToRemove, 1)
}

function updateState() {
    if (GS.ge == null) {
        console.log('no data to parse yet')
        return
    }
    GS.gs = new GameState(GS.fullData.split_logs[GS.hand_counter].log[0])
    for (let ply=0; ply <= GS.ply_counter; ply++) {
        let event = GS.ge[GS.hand_counter][ply]
        if (event.type == 'tsumo') {
            GS.gs.drawnTile[event.actor] = event.pai
        } else if (event.type == 'chi' || event.type == 'pon') {
            let dp = GS.gs.discardPond[event.target]
            dp[dp.length-1].called = true
            GS.gs.hands[event.actor].push(event.pai)
            let newCall = []
            let fromIdxRel = (4 + event.actor - event.target - 1) % 4
            let consumed = [...event.consumed]
            consumed.splice(fromIdxRel, 0, event.pai)
            for (let i=0; i<consumed.length; i++) {
                removeFromArray(GS.gs.hands[event.actor], consumed[i])
                newCall.push(consumed[i])
                if (i==fromIdxRel) {
                    newCall.push('rotate')
                }
            }
            GS.gs.calls[event.actor] = newCall.concat(GS.gs.calls[event.actor])
        } else if (event.type == 'daiminkan') {
            let dp = GS.gs.discardPond[event.target]
            dp[dp.length-1].called = true
            GS.gs.thisRoundExtraDoras++
            GS.gs.hands[event.actor].push(event.pai)
            let newCall = []
            let fromIdxRel = (4 + event.actor - event.target - 1) % 4
            let consumed = [...event.consumed]
            consumed.splice(fromIdxRel, 0, event.pai)
            for (let i=0; i<consumed.length; i++) {
                removeFromArray(GS.gs.hands[event.actor], consumed[i])
                newCall.push(consumed[i])
                if (fromIdxRel == i) {
                    newCall.push('rotate')
                }
                if (fromIdxRel+1 == i) {
                    newCall.push('rotate')
                    newCall.push('float')
                }
            }
            GS.gs.calls[event.actor] = newCall.concat(GS.gs.calls[event.actor])
        } else if (event.type == 'kakan') {
            // kakan = added kan
            GS.gs.thisRoundExtraDoras++
            GS.gs.hands[event.actor].push(GS.gs.drawnTile[event.actor])
            GS.gs.hands[event.actor].sort(tileSort)
            GS.gs.drawnTile[event.actor] = null
            removeFromArray(GS.gs.hands[event.actor], event.pai)
            let rotatedIdx = null
            for (let i=1; i<GS.gs.calls[event.actor].length; i++) {
                if (GS.gs.calls[event.actor][i]=='rotate' && fuzzyCompareTile(GS.gs.calls[event.actor][i-1], event.pai)) {
                    rotatedIdx = i
                    break
                }
            }
            if (rotatedIdx === null) {
                console.log(event, GS.gs.calls[event.actor])
                throw new Error('Cannot find meld to kakan to')
            }
            GS.gs.calls[event.actor].splice(rotatedIdx+1, 0, event.pai, 'rotate', 'float')
        } else if (event.type == 'ankan') {
            GS.gs.thisRoundExtraDoras++
            GS.gs.hands[event.actor].push(GS.gs.drawnTile[event.actor])
            GS.gs.hands[event.actor].sort(tileSort)
            GS.gs.drawnTile[event.actor] = null
            let newCall = []
            for (let i=0; i<event.consumed.length; i++) {
                removeFromArray(GS.gs.hands[event.actor], event.consumed[i])
                if (i==0 || i==3) {
                    newCall.push('back')
                } else {
                    newCall.push(event.consumed[i])
                    newCall.push('rotate')
                    if (i==2) {
                        newCall.push('float')
                    }
                }
            }
            GS.gs.calls[event.actor] = newCall.concat(GS.gs.calls[event.actor])
        } else if (event.type == 'dahai') {
            // for calls there will not be a drawnTile
            if (GS.gs.drawnTile[event.actor]) {
                GS.gs.hands[event.actor].push(GS.gs.drawnTile[event.actor])
                GS.gs.hands[event.actor].sort(tileSort)
                GS.gs.drawnTile[event.actor] = null
            }
            let tile = new Tile(event.pai)
            tile.riichi = GS.ge[GS.hand_counter][ply-1].type == "reach"
            tile.tsumogiri = event.tsumogiri
            GS.gs.discardPond[event.actor].push(tile)
            removeFromArray(GS.gs.hands[event.actor], event.pai)
        } else if (event.type == 'reach') {
            // console.log('reach', GS.ply_counter)
        } else if (event.type == 'reach_accepted') {
            GS.gs.thisRoundSticks[event.actor]++
            // console.log('reach_accepted', GS.ply_counter)
        } else if (event.type == 'hora' || event.type == 'ryukyoku') {
            GS.gs.handOver = true
        } else if (event.type == 'dora') {
            // TODO: I have my own logic for this, could remove now.
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
        if (this.type == 'k') {
            // only one of the tiles is actually new
            this.meldedTiles = [this.meldedTiles[this.fromIdxRel]]
        }
        // e.g. 151515k51 -- 51 (red 5) was called from relative p2 (there is no p3)
        // But wait until after we got the real called tile
        this.fromIdxRel = Math.min(this.fromIdxRel, 2)
    }
}

function addResult() {
    for (let [idx, currGeList] of GS.ge.entries()) {
        let gs = new GameState(GS.fullData.split_logs[idx].log[0])
        let result = currGeList.slice(-1)[0]
        for (let tmpPly=0; tmpPly<currGeList.length; tmpPly++) {
            if (currGeList[tmpPly].type == "reach_accepted") {
                gs.thisRoundSticks[currGeList[tmpPly].actor]++
            }
        }
        result.scoreChangesPlusSticks = gs.scoreChanges.concat([0])
        for (let pidx=0; pidx<4; pidx++) {
            result.scoreChangesPlusSticks[pidx] -= gs.thisRoundSticks[pidx]*1000
        }
        if (gs.result == '和了') {
            // If there was a winner, they get the prevRoundSticks
            result.scoreChangesPlusSticks[4] = -gs.prevRoundSticks*1000
        } else {
            // If no winner, pot "wins" the sticks
            result.scoreChangesPlusSticks[4] += sum(gs.thisRoundSticks)*1000
        }
        console.assert(sum(result.scoreChangesPlusSticks)==0)
    }

}

function createTile(tileStr) {
    if (!tileStr || tileStr == null || tileStr.length>5) {
        console.log('error', tileStr)
        throw new Error()
    }
    const tileDiv = document.createElement('div')
    const tileImg = document.createElement('img')
    tileDiv.append(tileImg)
    tileDiv.classList.add('tileDiv')
    tileImg.src = `media/Regular_shortnames/${tileStr}.svg`
    tileImg.classList.add('tileImg')
    return tileDiv
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
    let mismatch = mortalEval && (mortalEval.expected != mortalEval.actual)
    return mortalEval && (!onlyMismatches || mismatch) ||
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
    const infoRoundModal = document.querySelector('.info-round-modal')
    const closeModal = document.querySelector('.info-round-close')
    const closeAboutModal = document.querySelector('.about-close')
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
    closeAboutModal.addEventListener("click", () => {
        aboutModal.close()
    })
}

function mergeMortalEvals(data) {
    let i, round
    console.log('mortalEvals aka review.kyokus', data.review.kyokus)
    for ([i, round] of GS.ge.entries()) {
        let currReviewKyoku = data.review.kyokus[i]
        let reviewIdx = 0
        for (let event of round.entries()) {
            let mortalEval = currReviewKyoku.entries[reviewIdx]
            if (mortalEval === undefined) {
                // console.log('out of events to merge')
                break
            }
            if (event[1].actor == mortalEval.last_actor && event[1].pai == mortalEval.tile) {
                if (event[1].actor != GS.heroPidx && event[1].type=='tsumo') {
                    // console.log('maybe not merge?')
                    // console.log(event)
                    // console.log(mortalEval)
                } else {
                    if (event[1].actor != GS.heroPidx && event[1].type!='dahai') {
                        console.log('check this merge:')
                        console.log(event)
                        console.log(mortalEval)
                    }
                    event[1].mortalEval = mortalEval
                    // console.log("merge", event, mortalEval)
                    reviewIdx++
                }
            }
        }
    }
}

function deepMap(obj, key, f) {
    const stack = [obj];
    while (stack.length > 0) {
        const current = stack.pop();
        if (typeof current === 'object') {
            for (let prop in current) {
                if (current.hasOwnProperty(prop)) {
                    if (prop === key) {
                        // console.log(prop, current[prop], f(current[prop]))
                        current[prop] = f(current[prop])
                    } else if (typeof current[prop] === 'object') {
                        stack.push(current[prop]);
                    }
                }
            }
        }
    }
}
function convertConsumed(data) {
    for (let i=0; i < data.length; i++) {
        data[i] = tm2t(data[i])
    }
    return data
}
function convertPai2Tenhou(data) {
    deepMap(data, 'pai', tm2t)
    deepMap(data, 'tile', tm2t)
    deepMap(data, 'consumed', convertConsumed)
}
function parseMortalJsonStr(data) {
    GS.ply_counter = 0 // TODO where does it make sense to reset this stuff?
    GS.hand_counter = 0
    const parser = new DOMParser()
    let body = parser.parseFromString(data, 'text/html').querySelector('body').textContent
    data = JSON.parse(body)
    GS.fullData = data
    console.log('Full data:', data)
    GS.heroPidx = GS.fullData.player_id
    GS.ui.setPovPidx(GS.fullData.player_id)
    GS.ge = []
    let currGe = null
    for (let event of data.mjai_log) {
        if (event.type == 'end_game' || event.type == 'start_game' || event.type == 'dora') {
            continue
        }
        if (event.type == 'start_kyoku') {
            currGe = []
            continue
        }
        if (event.type == 'end_kyoku') {
            GS.ge.push(currGe)
            currGe = null
            continue
        }
        currGe.push(event)
    }
    return data
}

function normalizeMortalEvals(data) {
    for (let kyoku of data.review.kyokus) {
        for (let mortalEval of kyoku.entries) {
            let probs = mortalEval.details.map(x => x.prob)
            let normProbs = normalizeAndSoften(probs)
            mortalEval.details = mortalEval.details.map((obj, idx) => {
                return { ...obj, normProb: normProbs[idx]}
            })
        }
    }
}

function setMortalJsonStr(data) {
    data = parseMortalJsonStr(data)
    convertPai2Tenhou(data)
    console.log('GS.ge premerge', GS.ge)
    normalizeMortalEvals(data)
    mergeMortalEvals(data)
    console.log('GS.ge postmerge', GS.ge)
    addResult()
    GS.ui.updateResultsTable()
}

// Soften using temperature GS.C_soft_T
// Then normalize so the highest entry is set to 1, others scaled relative to the highest
function normalizeAndSoften(pdfs) {
    const hotter = pdfs.map(x => Math.pow(x, 1/GS.C_soft_T))
    const denom = Math.max(...hotter)
    return hotter.map(x => x/denom)
}

function getJsonData() {
    let data = localStorage.getItem('mortalHtmlStr')
    let label = document.getElementById('mortal-html-label')
    if (data) {
        let mortalFilename = localStorage.getItem('mortalFilename')
        label.innerHTML = "Choose Mortal File<br>" + mortalFilename
        data = LZString.decompressFromUTF16(data)
        setMortalJsonStr(data)
        updateState()
        GS.newUser = false
    } else {
        data = LZString.decompressFromBase64(demo_data)
        setMortalJsonStr(data)
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
                setMortalJsonStr(fr.result)
                updateState()
            }
        } else {
            console.log('no file')
        }
    })
}

function discardOverflowTest() {
    for (let pidx=0; pidx<4; pidx++) {
        for (let i=0; i<27; i++) {
            GS.ui.addDiscardTiles(pidx, ['1m'], false)
            if (i==15) {
                GS.ui.rotateLastTile(pidx, 'discard')
            }
        }
    }
    for (let pidx=0; pidx<4; pidx++) {
        GS.ui.addHandTiles(pidx, [], true)
        GS.ui.addHandTiles(pidx, ['1m'], false)
        GS.ui.addBlankSpace(pidx)
        GS.ui.addHandTiles(pidx, ['1m'], false)
        GS.ui.addBlankSpace(pidx)

        GS.ui.addHandTiles(pidx, ['1m'], false)
        GS.ui.addHandTiles(pidx, ['1m'], false)
        GS.ui.addHandTiles(pidx, ['1m'], false)
        GS.ui.rotateLastTile(pidx, 'hand')
        GS.ui.addHandTiles(pidx, ['1m'], false)
        GS.ui.rotateLastTile(pidx, 'hand')
        GS.ui.floatLastTile(pidx)
        GS.ui.addHandTiles(pidx, ['1m'], false)
        GS.ui.addHandTiles(pidx, ['1m'], false)
        GS.ui.addHandTiles(pidx, ['1m'], false)
        GS.ui.rotateLastTile(pidx, 'hand')
        GS.ui.addHandTiles(pidx, ['1m'], false)
        GS.ui.rotateLastTile(pidx, 'hand')
        GS.ui.floatLastTile(pidx)
        GS.ui.addHandTiles(pidx, ['1m'], false)
        GS.ui.addHandTiles(pidx, ['1m'], false)
        GS.ui.addHandTiles(pidx, ['1m'], false)
        GS.ui.rotateLastTile(pidx, 'hand')
        GS.ui.addHandTiles(pidx, ['1m'], false)
        GS.ui.rotateLastTile(pidx, 'hand')
        GS.ui.floatLastTile(pidx)
        GS.ui.addHandTiles(pidx, ['1m'], false)
        GS.ui.addHandTiles(pidx, ['1m'], false)
        GS.ui.addHandTiles(pidx, ['1m'], false)
        GS.ui.rotateLastTile(pidx, 'hand')
        GS.ui.addHandTiles(pidx, ['1m'], false)
        GS.ui.rotateLastTile(pidx, 'hand')
        GS.ui.floatLastTile(pidx)
    }
}

function tests() {
    console.assert(new NewTile('151515k51').newTile == 51)
    console.assert(new NewTile('151551k15').newTile == 15)
}

const GS = new GlobalState
function main() {
    //tests()
    getJsonData()
    connectUI()
    // discardOverflowTest()
}
main()

