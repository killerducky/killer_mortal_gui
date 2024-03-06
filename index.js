"use strict";

class GlobalState {
    constructor() {
        this.ui = new UI
        this.fullData = null // Full json -- maybe split this up some, super redundant!
        this.gs = null // current round GameState
        this.ge = null // array of array of GameEvent

        this.ply_counter = 0
        this.hand_counter = 0
        this.json_data = null
        this.heroPidx = null   // player index mortal reviewed
        this.showHands = false
        this.showMortal = true
        this.uiConnected = false

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
        this.C_cb_widthFactor = 1.5
        this.C_cb_maxShown = 4

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
        this.tilesLeft = 70
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
        }
        this.resultArray = log[logIdx++]
        this.result = this.resultArray[0]
        this.scoreChanges = [0,0,0,0]
        this.winner = []
        this.payer = []
        this.pao = []
        this.yakuStrings = []
        let idx = 1
        let s = this.resultArray[idx]
        while(this.resultArray[idx]) {
            this.scoreChanges = this.scoreChanges.map((a, i) => a+this.resultArray[idx][i])
            idx++
            if (this.resultArray[idx]) {
                this.winner.push(this.resultArray[idx][0])
                this.payer.push(this.resultArray[idx][1])
                this.pao.push(this.resultArray[idx][2]) // TODO: Find an example of this
                this.yakuStrings.push(this.resultArray[idx].slice(3))
            }
            idx++
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
        this.tilesLeft = document.querySelector('.info-tiles-left')
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
        let str = i18next.t(GS.C_windStr[GS.gs.roundWind-tm2t('e')])
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
        this.round.replaceChildren(this.roundStr(true))
        this.doras.replaceChildren()
        this.tilesLeft.replaceChildren()
        for (let pidx=0; pidx<4; pidx++) {
            this.discards[pidx].replaceChildren()
            let seatWind = (4 + pidx - GS.gs.roundNum) % 4
            this.pInfo[pidx].replaceChildren(i18next.t(GS.C_windStr[seatWind]))
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
        let key = ['Hero', 'Kami', 'Toimen', 'Shimo', 'Pot'][relIdx]
        return i18next.t(`position-rel.${key}`)
    }
    parseYakuString(yaku) {
        let s = yaku.split(/([\(\)])|([0-9]+)/)
        s = s.map(x => { return !x ? '' : x.match(/[0-9\-\(\)]/) ? x : i18next.t(x) })
        return s.join(' ')
    }
    createParaElem(text) {
        let p = document.createElement("p")
        p.append(text)
        return p
    }
    updateGridInfo() {
        this.clearDiscardBars()
        this.clearCallBars()
        let event = GS.ge[GS.hand_counter][GS.ply_counter]
        this.updateDiscardBars()
        this.updateCallBars()
        this.tilesLeft.append(`x${GS.gs.tilesLeft}`)
        if (event.mortalEval && event.mortalEval.tiles_left != GS.gs.tilesLeft) {
            console.log('tiles left mismatch:', event.mortalEval.tiles_left, GS.gs.tilesLeft)
        }
        for (let i=0; i<5; i++) {
            if (GS.gs.dora[i] == null || i > GS.gs.thisRoundExtraDoras) {
                this.doras.append(createTile('back'))
            } else {
                this.doras.append(createTile(tenhou2str(GS.gs.dora[i])))
            }
        }
        if (GS.gs.handOver) {
            this.infoThisRoundTable.replaceChildren()
            let table = document.createElement("table")
            let resultTypeStr
            for (let idx=0; idx==0||idx<GS.gs.winner.length; idx++) {
                if (idx>0) {
                    this.infoThisRoundTable.append(document.createElement("br"))
                }
                if (GS.gs.result == '和了') {
                    const winnerStr = this.relativeToHeroStr(GS.gs.winner[idx])
                    const typeStr = GS.gs.winner[0] === GS.gs.payer[0] ? "Tsumo" : "Ron"
                    resultTypeStr = i18next.t('win-by', {type:i18next.t(typeStr), winner:winnerStr})
                } else {
                    resultTypeStr = i18next.t(GS.gs.result)
                }
                this.infoThisRoundTable.append(this.createParaElem(resultTypeStr))
                if (GS.gs.result == '和了') {
                    for (let yaku of GS.gs.yakuStrings[idx]) {
                        this.infoThisRoundTable.append(this.createParaElem(this.parseYakuString(yaku)))
                    }
                }
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
        if (!GS.showMortal || !mortalEval) {
            return
        }
        const callBars = document.querySelector('.killer-call-bars')
        let svgElement = callBars.firstElementChild
        let slot = 0
        for (let [idx, detail] of mortalEval.details.entries()) {
            let Pval = detail.normProb*100
            let mortalDetail = !mortalEval.is_equal && idx==0
            if (detail.action.type == 'dahai' && !mortalDetail) {
                continue // Skip tiles (unless it's a mismatch)
            }
            if (slot>=GS.C_cb_maxShown-1 && !mortalDetail && mortalEval.actual_index != idx) {
                continue // Not enough room in GUI to show more
            }
            let xloc = GS.C_db_tileWidth*GS.C_cb_widthFactor/2 + slot*GS.C_db_tileWidth*GS.C_cb_widthFactor
            if (mortalEval.actual_index == idx) {
                svgElement.appendChild(createRect(
                    xloc-GS.C_db_heroBarWidth/2, GS.C_db_heroBarWidth, GS.C_cb_heroBarHeight, 1, GS.C_colorBarHero
                ))
            }
            svgElement.appendChild(createRect(
                xloc-GS.C_db_mortBarWidth/2, GS.C_db_mortBarWidth, GS.C_cb_heroBarHeight, Pval/100*GS.C_cb_mortBarHeightRatio, GS.C_colorBarMortal
            ))
            let textContent = i18next.t(detail.action.type)
            if (detail.action.type == 'hora' && detail.action.actor != detail.action.target) {
                textContent = i18next.t('ron') // translate defaults to Tsumo. Change to Ron in this case            
            }
            svgElement.appendChild(createSvgText(xloc-GS.C_db_mortBarWidth/2-10, GS.C_db_height + 20, textContent))
            // Some kans include pai, some don't.
            let pai = detail.action.type.endsWith('kan') ? detail.action.consumed[0] : detail.action.pai
            if (pai) {
                let tiles = [pai]
                if (detail.action.consumed && !detail.action.type.endsWith('kan')) {
                    tiles = detail.action.consumed
                }
                let x_offset = tiles.length == 1 ? 25 : 35 // why did I use svgs and now I have to write my own layout code!
                for (let i=0; i<tiles.length; i++) {
                    let tileSvg = this.createTileSvg(xloc+(i+1)*20-GS.C_db_mortBarWidth/2-x_offset, GS.C_db_height + 30, tiles[i])
                    svgElement.appendChild(tileSvg[0])
                    svgElement.appendChild(tileSvg[1])
                }
            }
            slot++
        }
        if (!mortalEval.is_equal) {
            let xloc = GS.C_db_tileWidth*GS.C_cb_widthFactor/5 + slot*GS.C_db_tileWidth*GS.C_cb_widthFactor
            let textContent = (mortalEval.details[mortalEval.actual_index].normProb > .50) ? i18next.t("Hmm...") : i18next.t("Clack!")
            svgElement.appendChild(createSvgText(xloc-GS.C_db_mortBarWidth/2, 60, textContent))
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
    updateDiscardBars() {
        let gameEvent = GS.ge[GS.hand_counter][GS.ply_counter]
        let mortalEval = gameEvent.mortalEval
        const discardBars = document.getElementById("discard-bars")
        let svgElement = discardBars.firstElementChild
        if (!GS.showMortal) {
            svgElement.appendChild(createSvgText(60,30,i18next.t("spoiler")))
            return
        }
        if (!mortalEval) {
            return // nothing to display
        }
        for (let i = -1; i < GS.gs.hands[gameEvent.actor].length; i++) {
            let tile = (i==-1) ? GS.gs.drawnTile[gameEvent.actor] : GS.gs.hands[gameEvent.actor][i]
            if (tile == null) {
                continue // on calls there was no drawnTile
            }
            let matchingDetailIdx = mortalEval.details.findIndex(x => x.action && x.action.type == 'dahai' && x.action.pai && x.action.pai==tile)
            if (matchingDetailIdx == -1) {
                continue // TODO: Check code for this. For now assume due to illegal calls swaps
            }
            let matchingDetail = mortalEval.details[matchingDetailIdx]
            let Pval = matchingDetail.normProb*100
            let slot = (i !== -1) ? i : GS.gs.hands[gameEvent.actor].length+0.5
            let xloc = GS.C_db_handPadding + GS.C_db_tileWidth/2 + slot*GS.C_db_tileWidth
            if (matchingDetailIdx == mortalEval.actual_index) {
                svgElement.appendChild(createRect(
                    xloc-GS.C_db_heroBarWidth/2, GS.C_db_heroBarWidth, GS.C_db_height, 1, GS.C_colorBarHero
                ))
            }
            svgElement.appendChild(createRect(
                xloc-GS.C_db_mortBarWidth/2, GS.C_db_mortBarWidth, GS.C_db_height, Pval/100*GS.C_cb_mortBarHeightRatio, GS.C_colorBarMortal
            ));
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
            this.addBlankSpace(pidx, true)
            if (GS.gs.drawnTile[pidx] != null) {
                if (GS.showHands || (GS.gs.handOver && GS.gs.scoreChanges[pidx]>0) || pidx==GS.heroPidx) {
                    this.addHandTiles(pidx, [tenhou2str(GS.gs.drawnTile[pidx])], false)
                } else {
                    this.addHandTiles(pidx, ['back'], false)
                }
            } else {
                this.addBlankSpace(pidx, false)
            }
            if (GS.gs.calls[pidx].length > 0) {
                this.addBlankSpace(pidx, true)
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
    addBlankSpace(pidx, narrow) {
        this.addHandTiles(pidx, ['Blank'], false)
        this.hands[pidx].lastChild.style.opacity = "0"
        if (narrow) {
            this.hands[pidx].lastChild.classList.add('narrow')
        }
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
    addTableRow(table, str, value){
        let tr = table.insertRow()
        let cell = tr.insertCell()
        cell.textContent = `${str}`
        cell = tr.insertCell()
        cell.textContent = `${value}`
    }
    updateAbout() {
        let table = document.createElement("table")
        let metadata = document.querySelector('.about-metadata')
        metadata.replaceChildren(table)
        this.addTableRow(table, i18next.t('Engine'), GS.fullData['engine'])
        this.addTableRow(table, i18next.t('Model tag'), GS.fullData['review']['model_tag'])
        this.addTableRow(table, i18next.t('Mjai-reviewer version'), GS.fullData['version'])
        this.addTableRow(table, i18next.t('Game length'), i18next.t(GS.fullData['game_length']))
        this.addTableRow(table, i18next.t('Loading time'), GS.fullData['loading_time'])
        this.addTableRow(table, i18next.t('Review time'), GS.fullData['review_time'])
        this.addTableRow(table, i18next.t('Temperature'), GS.fullData['review']['temperature'])
        {
            let m = GS.fullData['review']['total_matches']
            let r = GS.fullData['review']['total_reviewed']
            let p = (m/r*100).toFixed(1)
            let s = `${m}/${r} = ${p}%`
            this.addTableRow(table, i18next.t('Matches/total'), s)
        }
        this.addTableRow(table, i18next.t('Rating'), (GS.fullData.review.rating*100).toFixed(1))
    }
    updateResultsTable() {
        let table = document.createElement("table")
        this.infoRoundTable.replaceChildren(table)
        let hand_counter = 0
        let tr = table.insertRow()
        let cell = tr.insertCell()
        cell.textContent = i18next.t('Round')
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
        cell.textContent = i18next.t("Final")
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

function createRect(x, width, totHeight, fillRatio, fill) {
    let y = (1-fillRatio)*totHeight
    let rect = document.createElementNS("http://www.w3.org/2000/svg", "rect")
    rect.setAttribute("x", x)
    rect.setAttribute("y", y)
    rect.setAttribute("width", width)
    rect.setAttribute("height", totHeight*fillRatio)
    rect.setAttribute("fill", fill)
    return rect
}
function createSvgText(x, y, text) {
    let svg = document.createElementNS("http://www.w3.org/2000/svg", "text")
    svg.setAttribute("x", x)
    svg.setAttribute("y", y)
    svg.setAttribute("fill", GS.C_colorText)
    svg.textContent = text
    return svg
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
        if (event.dora_marker) {
            GS.gs.thisRoundExtraDoras++
        }
        if (event.type == 'tsumo') {
            GS.gs.drawnTile[event.actor] = event.pai
            GS.gs.tilesLeft--
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
            GS.gs.hands[event.actor].push(GS.gs.drawnTile[event.actor])
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
            GS.gs.hands[event.actor].push(GS.gs.drawnTile[event.actor])
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
    for (const hand of GS.gs.hands) {
        hand.sort(tileSort)
    }
    GS.ui.reset()
    GS.ui.updateHandInfo()
    GS.ui.updateDiscardPond()
    GS.ui.updateGridInfo()
}

function addResult() {
    for (let [idx, currGeList] of GS.ge.entries()) {
        let gs = new GameState(GS.fullData.split_logs[idx].log[0])
        // TODO: Currently using the tenhou split_logs to parse result
        // And assuming there is only one hora event. Remove the extras (double/triple Ron)
        while(currGeList.slice(-2)[0].type == 'hora') {
            currGeList.splice(-2, 1)
        }
        let result = currGeList.slice(-1)[0]
        for (let tmpPly=0; tmpPly<currGeList.length; tmpPly++) {
            let fourRiichiDraw = sum(gs.thisRoundSticks) == 3 && currGeList[tmpPly].type == "ryukyoku" && currGeList[tmpPly-2].type == 'reach'
            if (fourRiichiDraw) {
                gs.thisRoundSticks[currGeList[tmpPly-2].actor]++
            } else if (currGeList[tmpPly].type == "reach_accepted") {
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
        incRoundCounter()
    }
}

function decPlyCounter() {
    if (GS.ply_counter > 0) {
        GS.ply_counter--
    } else {
        decRoundCounter()
        GS.ply_counter = GS.ge[GS.hand_counter].length-1
    }
}

function incRoundCounter() {
    GS.hand_counter++
    if (GS.hand_counter >= GS.ge.length) {
        GS.hand_counter = 0
    }
    GS.ply_counter = 0
}

function decRoundCounter() {
    GS.hand_counter--
    if (GS.hand_counter < 0) {
        GS.hand_counter = GS.ge.length-1
    }
    GS.ply_counter = 0
}

function stopCondition(onlyMismatches) {
    let mortalEval = GS.ge[GS.hand_counter][GS.ply_counter].mortalEval
    let mismatch = mortalEval && !mortalEval.is_equal
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
function i18nElem(key) {
    const elem = document.getElementById(key)
    elem.innerHTML = i18next.t(key)
    return elem
}
function connectUI() {
    // first part might run more than once when people change language
    document.title = i18next.t("title")
    const roundInc = i18nElem("round-inc")
    const roundDec = i18nElem("round-dec")
    const prevMismatch = i18nElem("prev-mismatch")
    const nextMismatch = i18nElem("next-mismatch")
    const inc2 = i18nElem("ply-inc2")
    const dec2 = i18nElem("ply-dec2")
    const inc = i18nElem("ply-inc")
    const dec = i18nElem("ply-dec")
    const options = i18nElem("options")
    const toggleShowHands =  i18nElem("toggle-hands")
    const toggleMortalAdvice = i18nElem("toggle-mortal-advice")
    const about =  i18nElem("about")
    const aboutBody = document.getElementById("about-body")
    const langLabel = i18nElem("langLabel")
    const optionsLabel = i18nElem("options-label")
    aboutBody.replaceChildren(document.createElement("ul"))
    let aboutBodyList = i18next.t("about-body", {returnObjects:true})
    for (let i=0; i<aboutBodyList.length; i++) {
        let ul = document.createElement("li")
        let node = document.createElement("span")
        node.innerHTML = aboutBodyList[i]
        ul.appendChild(node)
        aboutBody.appendChild(ul)
    }

    // only run the rest once ever
    if (GS.uiConnected) {
        return
    }
    GS.uiConnected = true
    const optionsModal = document.getElementById("options-modal")
    const closeOptionsModal = document.querySelector(".options-close")
    const aboutModal =  document.getElementById("about-modal")
    const infoRound = document.querySelector('.info-round')
    const infoRoundModal = document.querySelector('.info-round-modal')
    const closeModal = document.querySelector('.info-round-close')
    const closeAboutModal = document.querySelector('.about-close')
    const langSelect = document.getElementById("langSelect")
    langSelect.value = i18next.language
    langSelect.addEventListener("change", () => {
        if (i18next.language == langSelect.value) {
            return
        }
        i18next.changeLanguage(langSelect.value)
        localStorage.setItem("lang", langSelect.value)
        connectUI()
        GS.ui.updateResultsTable()
        GS.ui.updateAbout()
        updateState()
    })
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
    roundInc.addEventListener("click", () => {
        incRoundCounter();
        updateState()
    });
    roundDec.addEventListener("click", () => {
        decRoundCounter();
        updateState()
    });
    options.addEventListener('click', () => {
        showModalAndWait(optionsModal)
    })
    toggleShowHands.addEventListener("click", () => {
        GS.showHands = !GS.showHands
        updateState()
    })
    toggleMortalAdvice.addEventListener("click", () => {
        GS.showMortal = !GS.showMortal
        updateState()
    })
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
    closeOptionsModal.addEventListener("click", () => {
        optionsModal.close()
    })
    for (let pidx=1; pidx<4; pidx++) {
        document.querySelector(`.grid-hand-p${pidx}`).addEventListener("click", () => {
            GS.showHands = !GS.showHands
            updateState()
        })
    }
    document.querySelector(`.grid-hand-p0-container`).addEventListener("click", () => {
        GS.showMortal = !GS.showMortal
        updateState()
    })
    document.addEventListener('keydown', function(event) {
        if (event.key == 'h') {
            GS.showHands = !GS.showHands
            updateState()
        } else if (event.key == 'm') {
            GS.showMortal = !GS.showMortal
            updateState()
        // } else if (event.key == 'g') {
        //     const roundGraphModel = document.querySelector('#round-graph-modal')
        //     roundGraphModel.show()
        //     roundGraphModel.addEventListener('click', (event) => {
        //         roundGraphModel.close()
        //     })
        }
    });
}

function mergeMortalEvals(data) {
    for (let [i, round] of GS.ge.entries()) {
        let currReviewKyoku = data.review.kyokus[i]
        let reviewIdx = 0
        for (let event of round) {
            let mortalEval = currReviewKyoku.entries[reviewIdx]
            if (mortalEval === undefined) {
                break // out of events to merge
            }
            let opponentTsumo = event.actor != GS.heroPidx && event.type=='tsumo'
            let heroDahai = event.actor == GS.heroPidx && event.type=='dahai'
            if (opponentTsumo || heroDahai) {
                continue
            }
            let heroRiichiDiscard = event.actor == GS.heroPidx && event.type == 'reach' && mortalEval.junme == currReviewKyoku.entries[reviewIdx-1].junme
            if (event.actor == mortalEval.last_actor && (event.pai == mortalEval.tile || heroRiichiDiscard)) {
                event.mortalEval = mortalEval
                reviewIdx++
            }
        }
        if (reviewIdx < currReviewKyoku.entries.length) {
            console.log("Didn't merge all events", round, currReviewKyoku.entries, reviewIdx)
            throw new Error
        }
    }
}

// Add a fake mortalEval for forced riichi discard
// Mortal doesn't have these, but for UI consistency draw a 100% bar on actual discard
function addRiichiDiscardEvals(data) {
    return // TODO decide if we should do this or not
    for (let [i, round] of GS.ge.entries()) {
        for (let [j, event] of round.entries()) {
            if (event.type == 'reach' && event.actor == GS.heroPidx && event.mortalEval === undefined) {
                let actualPai = round[j+1].pai
                let actualTsumogiri = round[j+1].tsumogiri
                event.mortalEval = {type:'dahai', actor:GS.heroPidx, pai:round[j+1].pai}
                event.mortalEval = {actual:{type:'dahai', actor:GS.heroPidx, pai:actualPai, tsumogiri:actualTsumogiri},
                    details:[{action:{type:'dahai', actor:GS.heroPidx, pai:actualPai, tsumogiri:actualTsumogiri}, normProb:1, prob:1}],
                    is_equal:true,
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
function getBody(data) {
    const parser = new DOMParser()
    let body = parser.parseFromString(data, 'text/html').querySelector('body').textContent
    data = JSON.parse(body)
    return data
}
function parseMortalJsonStr(data) {
    GS.ply_counter = 0 // TODO where does it make sense to reset this stuff?
    GS.hand_counter = 0
    GS.fullData = data
    GS.heroPidx = GS.fullData.player_id
    GS.ui.setPovPidx(GS.fullData.player_id)
    GS.ge = []
    let currGe = null
    for (let [idx, event] of data.mjai_log.entries()) {
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
        if (data.mjai_log[idx-1].type == 'dora') {
            event.dora_marker = data.mjai_log[idx-1].dora_marker
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
    normalizeMortalEvals(data)
    mergeMortalEvals(data)
    addRiichiDiscardEvals(data)
    addResult()
    GS.ui.updateResultsTable()
    GS.ui.updateAbout()
}

// Soften using temperature GS.C_soft_T
// Then normalize so the highest entry is set to 1, others scaled relative to the highest
function normalizeAndSoften(pdfs) {
    const hotter = pdfs.map(x => Math.pow(x, 1/GS.C_soft_T))
    const denom = Math.max(...hotter)
    return hotter.map(x => x/denom)
}

function getCurrGe() {
    return GS.ge[GS.hand_counter][GS.ply_counter]
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
        GS.ui.addBlankSpace(pidx, true)
        GS.ui.addHandTiles(pidx, ['1m'], false)
        GS.ui.addBlankSpace(pidx, true)

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

function debugState() {
    console.log('GS.fullData:', GS.fullData)
    console.log('GS.ge', GS.ge)
    console.log(`GS.ge[${GS.hand_counter}]`, GS.ge[GS.hand_counter])
    console.log('hand', GS.hand_counter)
    console.log('ply', GS.ply_counter)
    console.log('event', getCurrGe())
}

// one-off tests for a given problem
function tmpTest() {
    GS.hand_counter = 7
    GS.ply_counter = 24
    // let currGe = getCurrGe()
    // currGe.mortalEval.details.push({action:{type:'chi', consumed:[33,33], pai:'fake'}, normProb:.5})
    // currGe.mortalEval.details.push({action:{type:'chi', consumed:[33,33], pai:'fake'}, normProb:.4})
    // currGe.mortalEval.details.push({action:{type:'chi', consumed:[33,33], pai:'fake'}, normProb:.3})
    updateState()
    debugState()
}

function parseUrl() {
    const urlParams = new URLSearchParams(window.location.search)
    let dataParam = urlParams.get('data')
    if (!dataParam) {
        alert("Invalid URL: data parameter not given")
        return
    }
    var xhr = new XMLHttpRequest();
    xhr.open('GET', `${dataParam}`, true);
    xhr.responseType = 'json';
    xhr.onload = function() {
        var status = xhr.status;
        if (status == 200) {
            setMortalJsonStr(xhr.response)
            updateState()
            connectUI()
        } else {
            alert(`Invalid URL: ${dataParam} ${xhr.statusText}`)
        }
    };
    xhr.send();
}

const GS = new GlobalState
function main() {
    const lang = localStorage.getItem("lang") || "en"
    i18next_data.lng = lang
    i18next.init(i18next_data).then(parseUrl(true))
}
main()

