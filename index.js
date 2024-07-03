"use strict";

import { calculateMinimumShanten, calculateStandardShanten } from "./shanten.js";
import { calculateUkeire } from "./efficiency.js"

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
        this.showDealinRate = null // set by localStorage
        this.uiConnected = false

        // calcCombos Weights
        // penchan anchor at 1
        this.C_ccw_ryanmen = 3.5
        this.C_ccw_honorTankiShanpon = 1.7
        this.C_ccw_nonHonorTankiShanpon = 1.0
        this.C_ccw_kanchan = 0.21
        this.C_ccw_kanchanRiichiSujiTrap = 2.6
        this.C_ccw_uraSuji = 1.3
        this.C_ccw_matagiSujiEarly = 0.6
        this.C_ccw_matagiSujiRiichi = 1.2
        this.C_ccw_doraGreed = 1.2
        this.C_ccw_akaDiscard = 0.14

        this.C_soft_T = 2

        this.mediaBreak = getComputedStyle(document.documentElement).getPropertyValue('--media-break')
        this.updateZoom()

        this.C_db_height = 50
        this.C_db_dealinMax = 15
        this.C_db_totWidth = 605
        this.C_db_handPadding = 5
        this.C_db_tileWidth = 34
        this.C_db_tileHeight = 44
        this.C_db_heroBarWidth = 20
        this.C_db_mortBarWidth = 10
        this.C_cb_heroBarHeight = this.C_db_height // maybe don't need separate one...
        this.C_cb_mortBarHeightRatio = 0.9
        this.C_cb_padding = 10
        this.C_cb_widthFactor = 1.5
        this.C_cb_maxShown = 4

        this.C_colorText = getComputedStyle(document.documentElement).getPropertyValue('--color-text')
        this.C_colorBarMortal = getComputedStyle(document.documentElement).getPropertyValue('--color-bar-mortal')
        this.C_colorBarHero = getComputedStyle(document.documentElement).getPropertyValue('--color-bar-hero')
        this.C_colorTsumogiri = getComputedStyle(document.documentElement).getPropertyValue('--color-tsumogiri')
        this.C_colorTileBg = getComputedStyle(document.documentElement).getPropertyValue('--color-tile-bg')
        this.C_colorOpps = [getComputedStyle(document.documentElement).getPropertyValue('--color-shimo'),
                            getComputedStyle(document.documentElement).getPropertyValue('--color-toimen'),
                            getComputedStyle(document.documentElement).getPropertyValue('--color-kami')]
        this.C_windStr = ['E', 'S', 'W', 'N']

        this.alphaTestMode = false
    }
    updateZoom() {
        if (screen.width > 900) {
            this.C_zoom = 1
        } else if (window.matchMedia("(orientation: portrait)").matches) {
            this.C_zoom = screen.width / 655
        } else {
            // reserve space for the phone status bar?
            this.C_zoom = (screen.height - 50) / 675
        }
        document.documentElement.style.setProperty('--zoom', this.C_zoom)
        this.C_zoomTiles =  (34*this.C_zoom - 4) / (34-4)
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
        this.doraIndicator = log[logIdx++]
        this.dora = this.doraIndicator.map(doraIndicator2dora)
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
        this.genbutsu = [new Set, new Set, new Set, new Set]
        this.discardsToRiichi = [[],[],[],[]]
        this.reach_accepted = [false, false, false, false]
        this.unseenTiles = []
        for (let pidx=0; pidx<4; pidx++) {
            this.unseenTiles[pidx] = initUnseenTiles(pidx, this)
        }
    }
}

class UI {
    constructor() {
        this.hands = [[],[],[],[]]
        this.calls = [[],[],[],[]]
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
        this.genericModal = document.getElementById('generic-modal')
        this.genericModalBody = document.querySelector('.generic-modal-body')
        this.optInfo = document.querySelector('.opt-info')
        this.setPovPidx(0)
    }
    setPovPidx(newPidx) {
        this.povPidx = newPidx
        for (let pidx=0; pidx<4; pidx++) {
            let tmpPovPidx = (4 + pidx - this.povPidx) % 4
            this.hands[pidx] = document.querySelector(`.hand-closed-p${tmpPovPidx}`)
            this.calls[pidx] = document.querySelector(`.hand-calls-p${tmpPovPidx}`)
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
    parseYakuString(yaku) {
        let s = yaku.split(/([\(\)])|([0-9]+)/)
        s = s.map(x => { return !x ? '' : x.match(/[0-9\-\(\)]/) ? x : i18next.t(x) })
        return s.join(' ')
    }
    getResultTypeStr() {
        let resultTypeStr = []
        for (let idx=0; idx==0||idx<GS.gs.winner.length; idx++) {
            if (GS.gs.result == '和了') {
                const winnerStr = relativeToHeroStr(GS.gs.winner[idx])
                if (GS.gs.winner[0] === GS.gs.payer[0]) {
                    resultTypeStr[idx] = i18next.t('tsumo-full', {winner:winnerStr})
                } else {
                    const loserStr = relativeToHeroStr(GS.gs.payer[idx])
                    resultTypeStr[idx] = i18next.t('ron-full', {winner:winnerStr, loser:loserStr})

                }
            } else {
                resultTypeStr[idx] = i18next.t(GS.gs.result)
            }
        }
        return resultTypeStr
    }
    getActionSpan(detail) {
        let actionSpan = document.createElement('span')
        let textContent = i18next.t(detail.action.type)
        if (detail.action.type == 'hora' && detail.action.actor != detail.action.target) {
           textContent = i18next.t('ron') // translate defaults to Tsumo. Change to Ron in this case            
        }
        actionSpan.innerHTML = textContent
        // Some kans include pai, some don't.
        let pai = detail.action.type.endsWith('kan') ? detail.action.consumed[0] : detail.action.pai
        if (pai) {
            let tiles = [pai]
            if (detail.action.consumed && !detail.action.type.endsWith('kan')) {
                tiles = detail.action.consumed
            }
            actionSpan.innerHTML += "&nbsp&nbsp&nbsp"
            for (let i=0; i<tiles.length; i++) {
                // let tileDiv = createTile(tenhou2str(detail.action.pai))
                let tileDiv = createTile(tenhou2str(tiles[i]))
                actionSpan.innerHTML += tileDiv.innerHTML
            }
        }
        return actionSpan
    }
    updateOptInfo() {
        let gameEvent = GS.ge[GS.hand_counter][GS.ply_counter]
        let mortalEval = gameEvent.mortalEval
        this.optInfo.replaceChildren()
        let actualTable = document.createElement("table")
        actualTable.classList.add('wider-table')
        actualTable.classList.add('hover-rows')
        this.optInfo.append(actualTable)
        let table = document.createElement("table")
        table.classList.add('wider-table')
        table.classList.add('hover-rows')
        this.optInfo.append(table)
        addTableRow(table, [i18next.t('Action'), i18next.t('Q'), i18next.t('P')])
        if (!GS.showMortal || !mortalEval) {
            addTableRow(actualTable, [i18next.t("Player"), ""])
            addTableRow(actualTable, [i18next.t("Mortal"), ""])
            return
        }

        addTableRow(actualTable, [i18next.t("Player"), this.getActionSpan(mortalEval.details[0])])
        addTableRow(actualTable, [i18next.t("Mortal"), this.getActionSpan(mortalEval.details[mortalEval.actual_index])])
    
        for (let [idx, detail] of mortalEval.details.entries()) {
            let actionSpan = this.getActionSpan(detail)
            let row = [actionSpan, detail.q_value.toFixed(2), (detail.prob*100).toFixed(2)]
            addTableRow(table, row)
        }
    }
    updateGridInfo() {
        this.clearDiscardBars()
        this.clearCallBars()
        let event = GS.ge[GS.hand_counter][GS.ply_counter]
        this.updateDiscardBars()
        this.updateCallBars()
        this.updateOptInfo()
        this.tilesLeft.append(`x${GS.gs.tilesLeft}`)
        if (event.mortalEval && event.mortalEval.tiles_left != GS.gs.tilesLeft) {
            console.log('tiles left mismatch:', event.mortalEval.tiles_left, GS.gs.tilesLeft)
        }
        for (let i=0; i<5; i++) {
            if (GS.gs.doraIndicator[i] == null || i > GS.gs.thisRoundExtraDoras) {
                this.doras.append(createTile('back'))
            } else {
                this.doras.append(createTile(tenhou2str(GS.gs.doraIndicator[i])))
            }
        }
        if (GS.gs.handOver) {
            this.infoThisRoundTable.replaceChildren()
            let table = document.createElement("table")
            let resultTypeStr = this.getResultTypeStr()
            for (let idx=0; idx==0||idx<GS.gs.winner.length; idx++) {
                if (idx>0) {
                    this.infoThisRoundTable.append(document.createElement("br"))
                }
                this.infoThisRoundTable.append(createParaElem(resultTypeStr[idx]))
                if (GS.gs.result == '和了') {
                    for (let yaku of GS.gs.yakuStrings[idx]) {
                        this.infoThisRoundTable.append(createParaElem(this.parseYakuString(yaku)))
                    }
                }
            }
            for (let pidx=0; pidx<4+1; pidx++) {
                let tr = table.insertRow()
                let cell = tr.insertCell()
                cell.textContent = `${relativeToHeroStr(pidx)}`
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
        svgElement.setAttribute('style', `transform-origin: top left; transform: scale(${GS.C_zoom}); position:absolute`)
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
        backgroundRect.setAttribute("rx", "2px")
        backgroundRect.setAttribute("ry", "2px")
        const tileSvg = document.createElementNS("http://www.w3.org/2000/svg", "image")
        tileSvg.setAttribute('href', `media/Regular_shortnames/${tenhou2str(tile)}.svg`)
        tileSvg.setAttribute("x", x)
        tileSvg.setAttribute("y", y)
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
        let [discardSvgElem, dangerSvgElem] = discardBars.children
        if (discardSvgElem) {
            discardSvgElem.replaceChildren()
            dangerSvgElem.replaceChildren()
            return
        }
        let svgElement = document.createElementNS("http://www.w3.org/2000/svg", "svg")
        svgElement.setAttribute("width", GS.C_db_totWidth)
        svgElement.setAttribute("height", GS.C_db_height)
        svgElement.setAttribute('style', `transform-origin: top left; transform: scale(${GS.C_zoom})`)
        svgElement.classList.add('discard-bars-svg')
        discardBars.replaceChildren(svgElement)
        svgElement = document.createElementNS("http://www.w3.org/2000/svg", "svg")
        svgElement.setAttribute("width", GS.C_db_totWidth)
        svgElement.setAttribute("height", GS.C_db_height)
        svgElement.setAttribute('style', `transform-origin: top left; transform: scale(${GS.C_zoom}, ${-GS.C_zoom}) translate(0, ${-1*(GS.C_db_height+GS.C_db_tileHeight)}px)`)
        svgElement.classList.add('danger-bars-svg')
        discardBars.append(svgElement)
    }
    updateDiscardBars() {
        let gameEvent = GS.ge[GS.hand_counter][GS.ply_counter]
        let mortalEval = gameEvent.mortalEval
        const discardBars = document.getElementById("discard-bars")
        let [discardSvgElem, dangerSvgElem] = discardBars.children
        if (!GS.showMortal) {
            discardSvgElem.appendChild(createSvgText(60,30,i18next.t("spoiler")))
            return
        }
        let showDangerBars = GS.showDealinRate && ('danger' in gameEvent)
        if (!mortalEval && !showDangerBars) {
            if (GS.showDealinRate) {
                dangerSvgElem.appendChild(createSvgText(60,30,i18next.t("dealin-riichi-only")))
                dangerSvgElem.lastChild.setAttribute('style', 'transform: translate(0, 50px) scale(1, -1)')
            }
            return // nothing to display
        }
        let atLeastOnedanger = false
        for (let i = -1; i < GS.gs.hands[GS.heroPidx].length; i++) {
            let tile = (i==-1) ? GS.gs.drawnTile[GS.heroPidx] : GS.gs.hands[GS.heroPidx][i]
            if (tile == null) {
                continue // on calls there was no drawnTile
            }
            let slot = (i !== -1) ? i : GS.gs.hands[GS.heroPidx].length+0.5
            let xloc = GS.C_db_handPadding + GS.C_db_tileWidth/2 + slot*GS.C_db_tileWidth
            if (mortalEval) {
                let matchingDetailIdx = mortalEval.details.findIndex(x => x.action && x.action.type == 'dahai' && x.action.pai && x.action.pai==tile)
                // TODO: Check code for this. For now assume due to illegal calls swaps
                if (matchingDetailIdx != -1) {
                    let matchingDetail = mortalEval.details[matchingDetailIdx]
                    let Pval = matchingDetail.normProb*100
                    if (matchingDetailIdx == mortalEval.actual_index) {
                        discardSvgElem.appendChild(createRect(
                            xloc-GS.C_db_heroBarWidth/2, GS.C_db_heroBarWidth, GS.C_db_height, 1, GS.C_colorBarHero
                        ))
                    }
                    discardSvgElem.appendChild(createRect(
                        xloc-GS.C_db_mortBarWidth/2, GS.C_db_mortBarWidth, GS.C_db_height, Pval/100*GS.C_cb_mortBarHeightRatio, GS.C_colorBarMortal
                    ));
                }
            }
            if (showDangerBars) {
                for (let tenpaiPidx=0; tenpaiPidx<4; tenpaiPidx++) {
                    if (tenpaiPidx == GS.heroPidx) {
                        continue
                    }
                    atLeastOnedanger = true
                    let relToHero = relativeToHero(tenpaiPidx)
                    let color = GS.C_colorOpps[relToHero-1]
                    let fakeDangers = false
                    // fakeDangers = true
                    let Pval
                    if (fakeDangers) {
                        Pval = 7*relToHero
                    } else {
                        let thisDanger = gameEvent['danger'][tenpaiPidx][GS.heroPidx]
                        if (!thisDanger) {
                            continue
                        }
                        let matchingCombo = thisDanger['combos'][normRedFive(tile)]
                        Pval = matchingCombo === undefined ? 0 : matchingCombo['all']/thisDanger['combos']['all']*100
                    }
                    let PvalZoom = Math.min(Pval*(100/GS.C_db_dealinMax), 100)
                    dangerSvgElem.appendChild(createRect(
                        xloc-(2.5-relToHero)*GS.C_db_mortBarWidth, GS.C_db_mortBarWidth, GS.C_db_height, PvalZoom/100*GS.C_cb_mortBarHeightRatio, color
                    ));
                }
            }
        }
        if (GS.showDealinRate && !atLeastOnedanger) {
            dangerSvgElem.appendChild(createSvgText(60,30,i18next.t("dealin-riichi-only")))
            dangerSvgElem.lastChild.setAttribute('style', 'transform: translate(0, 50px) scale(1, -1)')
        }
    }
    updateHandInfo() {
        for (let pidx=0; pidx<4; pidx++) {
            this.addHandTiles(pidx, 'hand', [], true)
            for (let tileInt of GS.gs.hands[pidx]) {
                // TODO: Draw and all tenpai could show the hands also?
                if (GS.showHands || (GS.gs.handOver && GS.gs.scoreChanges[pidx]>0) || pidx==GS.heroPidx) {
                    this.addHandTiles(pidx, 'hand', [tenhou2str(tileInt)], false)
                } else {
                    this.addHandTiles(pidx, 'hand', ['back'], false)
                }
            }
            this.addBlankSpace(pidx, true)
            if (GS.gs.drawnTile[pidx] != null) {
                if (GS.showHands || (GS.gs.handOver && GS.gs.scoreChanges[pidx]>0) || pidx==GS.heroPidx) {
                    this.addHandTiles(pidx, 'hand', [tenhou2str(GS.gs.drawnTile[pidx])], false)
                } else {
                    this.addHandTiles(pidx, 'hand', ['back'], false)
                }
            }
            if (GS.gs.calls[pidx].length > 0) {
                for (let tileInt of GS.gs.calls[pidx]) {
                    if (tileInt == 'rotate') {
                        this.rotateLastTile(pidx, 'hand')
                    } else if (tileInt == 'float') {
                        this.floatLastTile(pidx)
                    } else if (tileInt == 'back') {
                        this.addHandTiles(pidx, 'call', [tileInt], false)
                    } else {
                        this.addHandTiles(pidx, 'call', [tenhou2str(tileInt)], false)
                    }
                }
            }
        }
    }
    addHandTiles(pidx, type, tileStrArray, replace) {
        let div = type == 'call' ? this.calls[pidx] : this.hands[pidx]
        if (replace) {
            this.hands[pidx].replaceChildren()
            this.calls[pidx].replaceChildren()
        }
        for (let i in tileStrArray) {
            div.appendChild(createTile(tileStrArray[i]))
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
        let div = (type=='hand') ? this.calls[pidx] : this.discards[pidx]
        div.lastChild.lastChild.classList.add('rotate')
    }
    floatLastTile(pidx) {
        let div = this.calls[pidx]
        div.lastChild.lastChild.classList.add('float')
    }
    addBlankSpace(pidx, narrow) {
        this.addHandTiles(pidx, 'hand', ['Blank'], false)
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
    updateAbout() {
        let table = document.createElement("table")
        let metadata = document.querySelector('.about-metadata')
        metadata.replaceChildren(table)
        addTableRow(table, [i18next.t('Engine'), GS.fullData['engine']])
        addTableRow(table, [i18next.t('Model tag'), GS.fullData['review']['model_tag']])
        addTableRow(table, [i18next.t('Mjai-reviewer version'), GS.fullData['version']])
        addTableRow(table, [i18next.t('Game length'), i18next.t(GS.fullData['game_length'])])
        addTableRow(table, [i18next.t('Loading time'), GS.fullData['loading_time']])
        addTableRow(table, [i18next.t('Review time'), GS.fullData['review_time']])
        addTableRow(table, [i18next.t('Temperature'), GS.fullData['review']['temperature']])
        {
            let m = GS.fullData['review']['total_matches']
            let r = GS.fullData['review']['total_reviewed']
            let p = (m/r*100).toFixed(1)
            let s = `${m}/${r} = ${p}%`
            addTableRow(table, [i18next.t('Matches/total'), s])
        }
        addTableRow(table, [i18next.t('Rating'), (GS.fullData.review.rating*100).toFixed(1)])
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
                cell.textContent = `${relativeToHeroStr(pidx)}`
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
function createElemWithText(type, text) {
    let e = document.createElement(type)
    e.append(text)
    return e
}
function createParaElem(text) {
    return createElemWithText("p", text)
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
function relativeToHero(pidx) {
    let relIdx = pidx<4 ? (4 + GS.heroPidx - pidx) % 4 : pidx
    return relIdx
}
function relativeToHeroStr(pidx, English=0) {
    let relIdx = relativeToHero(pidx)
    let key = ['Hero', 'Kami', 'Toimen', 'Shimo', 'Pot'][relIdx]
    if (English) {
        return key
    }
    return i18next.t(`position-rel.${key}`)
}
function sum(a) {
    return a.reduce((a,b)=>a+b,0)
}
function addTableRow(table, values){
    let tr = table.insertRow()
    for (let v of values) {
        let cell = tr.insertCell()
        if (typeof v == 'object') {
            cell.appendChild(v)
        } else {
            cell.innerHTML = v
        }
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

function tenhou2strH(tileInt) {
    let output = tenhou2str(tileInt)
    if (tileInt >= 41 && tileInt <= 47) {
        output = i18next.t(output)
    }
    return output
}

function tenhou2strShort(tileInt) {
    if (tileInt >= 41 && tileInt <= 47) {
        return i18next.t(tenhou2str(tileInt))
    }
    return tileInt % 10
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

function normRedFive(t) {
    return t<51? t : t == 51 ? 15 : t == 52 ? 25 : t == 53 ? 35 : null
}

// 15 == 51, 25 == 52 (aka 5s are equal to normal 5s)
function fuzzyCompareTile(t1, t2) {
    let ft1 = normRedFive(t1)
    let ft2 = normRedFive(t2)
    return ft1 == ft2
}

function removeFromArray(array, value) {
    const indexToRemove = array.indexOf(value)
    if (indexToRemove === -1) { 
        throw new Error(`Value ${value} not in array ${array}`)
    }
    array.splice(indexToRemove, 1)
}

function onlyUpdateState() {
    GS.gs = new GameState(GS.fullData.split_logs[GS.hand_counter].log[0])
    for (let ply=0; ply <= GS.ply_counter; ply++) {
        let event = GS.ge[GS.hand_counter][ply]
        if (event.dora_marker) {
            GS.gs.thisRoundExtraDoras++
        }
        if (event.type == 'tsumo') {
            GS.gs.drawnTile[event.actor] = event.pai
            GS.gs.tilesLeft--
        } else if (event.type == 'chi' || event.type == 'pon' || event.type == 'daiminkan') {
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
                if (fromIdxRel+1 == i && event.type == 'daiminkan') {
                    newCall.push('rotate')
                    newCall.push('float')
                }
            }
            GS.gs.calls[event.actor] = newCall.concat(GS.gs.calls[event.actor])
        } else if (event.type == 'kakan') { // added kan
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
        } else if (event.type == 'ankan') { // closed kan
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
        } else if (event.type == 'hora' || event.type == 'ryukyoku') {
            GS.gs.handOver = true
        } else {
            console.log(event)
            throw new Error('unknown type')
        }
    }
    for (const hand of GS.gs.hands) {
        hand.sort(tileSort)
    }
}
function updateState() {
    onlyUpdateState()
    GS.ui.reset()
    GS.ui.updateHandInfo()
    GS.ui.updateDiscardPond()
    GS.ui.updateGridInfo()
    // discardOverflowTest()
}

const waitType = {
    ryanmen:0,
    kanchan:1,
    penchan:2,
    tanki:3,
    shanpon:4
}
Object.freeze(waitType)
function generateWaits() {
    let waitsArray = []
    for (let ryanmen of [[2,3],[3,4],[4,5],[5,6],[6,7],[7,8]]) {
        for (let suit=1; suit<=3; suit++) {
            let wait = {}
            wait.tiles = [suit*10+ryanmen[0], suit*10+ryanmen[1]]
            wait.waitsOn = [suit*10+ryanmen[0]-1, suit*10+ryanmen[1]+1]
            wait.type = waitType.ryanmen
            waitsArray.push(wait)
        }
    }
    for (let kanchan of [[1,3],[2,4],[3,5],[4,6],[5,7],[6,8],[7,9]]) {
        for (let suit=1; suit<=3; suit++) {
            let wait = {}
            wait.tiles = [suit*10+kanchan[0], suit*10+kanchan[1]]
            wait.waitsOn = [suit*10+kanchan[0]+1]
            wait.type = waitType.kanchan
            waitsArray.push(wait)
        }
    }
    // Beware this is getting a little more ad-hoc...
    for (let penchan of [[1,2,3],[8,9,7]]) {
        for (let suit=1; suit<=3; suit++) {
            let wait = {}
            wait.tiles = [suit*10+penchan[0], suit*10+penchan[1]]
            wait.waitsOn = [suit*10+penchan[2]]
            wait.type = waitType.penchan
            waitsArray.push(wait)
        }
    }
    for (let tankiShanpon of ([1,2,3,4,5,6,7,8,9])) {
        for (let type of [waitType.tanki, waitType.shanpon]) {
            for (let suit=1; suit<=4; suit++) {
                if (suit==4 && tankiShanpon>7) {
                    continue // honors are 41-47 only
                }
                let wait = {}
                wait.type = type
                wait.tiles = Array(type==waitType.tanki ? 1:2).fill(suit*10+tankiShanpon)
                wait.waitsOn = [suit*10+tankiShanpon]
                waitsArray.push(wait)
            }
        }
    }
    return waitsArray
}

function calcCombos(waitsArray, genbutsu, discardsToRiichi, heroUnseenTiles, dora) {
    let discardsToRiichiNormRedFive = discardsToRiichi.map(normRedFive)
    let combos = {'all':0}
    let riichiTile = discardsToRiichiNormRedFive.slice(-1)[0]
    for (let wait of waitsArray) {
        let thisGenbutsu = wait.waitsOn.reduce((accum,t) => accum || genbutsu.has(t), false)
        if (thisGenbutsu) {
            continue
        }
        let involvedTiles = [...wait.tiles, ...wait.waitsOn]
        wait.combos = 1
        wait.numUnseen = []
        for (let [i,t] of wait.tiles.entries()) {
            if (i>0 && wait.type==waitType.shanpon) {
                wait.combos *= heroUnseenTiles[t]-1 // Shanpons pull the same tile, so after the first one there is 1 less remaining
                wait.numUnseen.push(heroUnseenTiles[t]-1)
            } else {
                wait.combos *= heroUnseenTiles[t]
                wait.numUnseen.push(heroUnseenTiles[t])
            }
        }
        if (wait.type == waitType.shanpon) {
            // Shanpons: Order doesn't matter. Technically Math.exp(length) but it's always 2 for this case
            wait.combos /= wait.tiles.length 
        }
        // wait.origCombos = wait.combos
        // heuristic adjustment for waits that players tend to aim for
        let honorTankiShanpon = [waitType.shanpon, waitType.tanki].includes(wait.type) && wait.tiles[0] > 40
        let nonHonorTankiShanpon = [waitType.shanpon, waitType.tanki].includes(wait.type) && wait.tiles[0] < 40
        if (waitType.ryanmen == wait.type) {
            let uraSuji = false
            let matagiSujiEarly = false
            let matagiSujiRiichi = false
            for (let discard of discardsToRiichiNormRedFive) {
                if (wait.tiles.includes(discard)) { continue }
                for (let waitTile of wait.tiles) {
                    if (discard%10 >= 4 && discard%10 <= 6 && Math.abs(discard-waitTile) == 2) {
                        uraSuji = true
                        break
                    }
                }
            }
            for (let discard of discardsToRiichiNormRedFive) {
                if (wait.tiles.includes(discard)) {
                    if (discard == riichiTile) {
                        matagiSujiRiichi = true
                    } else {
                        matagiSujiEarly = true
                    }
                }
            }
            wait.combos *= GS.C_ccw_ryanmen
            if (uraSuji) { wait.combos *= GS.C_ccw_uraSuji }
            if (matagiSujiEarly) { wait.combos *= GS.C_ccw_matagiSujiEarly}
            if (matagiSujiRiichi) { wait.combos *= GS.C_ccw_matagiSujiRiichi}
        } else if (honorTankiShanpon) {
            wait.combos *= GS.C_ccw_honorTankiShanpon
        } else if (nonHonorTankiShanpon) {
            wait.combos *= GS.C_ccw_nonHonorTankiShanpon
        } else if (waitType.kanchan == wait.type) {
            if (riichiTile%10>=4 && riichiTile%10<=6 && Math.abs(wait.waitsOn[0]-riichiTile)==3) {
                wait.combos *= GS.C_ccw_kanchanRiichiSujiTrap
            } else {
                wait.combos *= GS.C_ccw_kanchan
            }
        }

        let doraInvolved = false
        for (let tile of involvedTiles) {
            if (tile == dora) {
                doraInvolved = true
                break
            }
        }
        if (doraInvolved) {
            wait.combos *= GS.C_ccw_doraGreed
        }

        let akaInvolved = false
        for (let discard of discardsToRiichi) {
            if (discard > 50) {
                let normedDiscard = normRedFive(discard)
                for (let tile of involvedTiles) {
                    if (tile == normedDiscard) {
                        akaInvolved = true
                        break
                    }
                }
            }
        }
        if (akaInvolved) {
            wait.combos *= GS.C_ccw_akaDiscard
        }

        combos['all'] += wait.combos
        if (wait.type==waitType.shanpon) {
            wait.combos *= 2 // Shanpons always have a partner pair, so multiply by 2 *after* adding the the 'all' combos denominator
        }
        for (let t of wait.waitsOn) {
            if (!combos[t]) { combos[t]={'all':0, 'types':[]} }
            combos[t]['all'] += wait.combos
            combos[t]['types'].push(wait)
        }
    }
    return combos
}
function doraIndicator2dora(doraIndicator) {
    doraIndicator = normRedFive(doraIndicator)
    if (doraIndicator%10 == 9) {
        return doraIndicator-8
    }
    if (doraIndicator == 44) {
        return 41
    }
    if (doraIndicator == 47) {
        return 45
    }
    return doraIndicator+1
}
function combo2strAndP(key, combos) {
    let keyCombo = combos[key]
    let k = `${String(tenhou2strH(key)).padStart(2)}`
    if (!(key in combos)) {
        return [`${k}:`, 0]
    }
    let prob = keyCombo['all']/combos['all']
    let p = `${String((prob*100).toFixed(1)).padStart(4)}`
    let str = ''
    str += `${k}: ${p}%`
    let str_all_combos = ''
    for (let type of keyCombo.types) {
        str_all_combos += ' '
        str_all_combos += type.tiles.map(x => tenhou2strShort(x)).join('')
        str_all_combos += ':'+type.numUnseen.join('*')
        str_all_combos += ` ${(type.combos/combos['all']*100).toFixed(1)}%`
    }
    str += str_all_combos
    return [str, prob]
}
function showSujis(genbutsu) {
    let tables = []
    for (let suit=1; suit<=3; suit++) {
        tables[suit-1] = []
        for (let ta of [[1,2,3], [4,5,6], [7,8,9]]) {
            let row = []
            for (let t of ta) {
                let tile = createTile(tenhou2str(suit*10+t))
                row.push(tile)
                if (genbutsu.has(suit*10+t)) {
                    tile.classList.add('called')
                }
            }
            tables[suit-1].push(row)
        }
    }
    let sujiCnt = 18
    for (let t of [4,5,6]) {
        for (let suit=1; suit<=3; suit++) {
            (genbutsu.has(suit*10+t) || genbutsu.has(suit*10+t-3)) && sujiCnt--
            (genbutsu.has(suit*10+t) || genbutsu.has(suit*10+t+3)) && sujiCnt--
        }
    }
    return [sujiCnt, tables]
}

// For now just return true if they called riichi
// Maybe could also do it for people who called twice?
// Or called dora pon?
function tenpaiEstimate(pidx) {
    return GS.gs.thisRoundSticks[pidx]
}

function initUnseenTiles(pidx, gs) {
    let allTiles = [11,12,13,14,15,16,17,18,19,21,22,23,24,25,26,27,28,29,31,32,33,34,35,36,37,38,39,41,42,43,44,45,46,47]
    let numT = {}
    for (let t of allTiles) {
        numT[t] = 4
    }
    let seenTiles = []
    seenTiles.push(...gs.hands[pidx])
    seenTiles.push(gs.doraIndicator[0])
    for (let t of seenTiles) {
        numT[normRedFive(t)]--
    }
    return numT
}

function weseeitnow(gs, tile, pidxAlreadySaw) {
    for (let pidx=0; pidx<4; pidx++) {
        if (pidx==pidxAlreadySaw) {
            continue
        }
        gs.unseenTiles[pidx][normRedFive(tile)]--
    }
}
function incrementalCalcDangerHelper(event, prevEvent, gs) {
    // process dahai and kakans the turn after they happen
    if (!prevEvent) {
        // do nothing if it's null
    } else if (prevEvent.type == 'kakan') {
        weseeitnow(gs, prevEvent.pai, prevEvent.actor)
        for (let pidx=0; pidx<4; pidx++) {
            // genbutsu if reach_accepted player doesn't Rob the Kan
            if (gs.reach_accepted[pidx]) {
                gs.genbutsu[pidx].add(normRedFive(prevEvent.pai))
            }
        }
    } else if (prevEvent.type == 'dahai') { // discard
        weseeitnow(gs, normRedFive(prevEvent.pai), prevEvent.actor)
        for (let pidx=0; pidx<4; pidx++) {
            /// genbutsu = we discarded it ourselves, or we reach_accepted and anyone discarded it
            if (prevEvent.actor == pidx || gs.reach_accepted[pidx]) {
                gs.genbutsu[pidx].add(normRedFive(prevEvent.pai))
            }
            if (prevEvent.actor == pidx && !gs.reach_accepted[pidx]) {
                gs.discardsToRiichi[pidx].push(prevEvent.pai)
            }
        }
    }

    // other events on the turn they happen
    if (event.dora_marker) {
        weseeitnow(gs, normRedFive(event.dora_marker), -1)
    }
    if (event.type == 'tsumo') { // draw
        gs.unseenTiles[event.actor][normRedFive(event.pai)]--
    } else if (['chi', 'pon', 'daiminikan', 'ankan'].includes(event.type)) {
        // the other players will see the consumed tiles
        for (let tile of event.consumed) {
            weseeitnow(gs, normRedFive(tile), event.actor)
        }
    } else if (event.type == 'reach_accepted') {
        gs.reach_accepted[event.actor] = true
    }
}
function doCalculateUkeire(finalHand, finalCalls, thisUnseenTiles) {
    let ukeireHand = Array(38).fill(0)
    for (let t of finalHand) {
        ukeireHand[normRedFive(t)-10]++
    }
    // For now we are only dealing with Riichi, so the only calls possible are ankans
    let ankans = new Set(finalCalls.filter(x => !isNaN(x)))
    for (const t of ankans) {
        ukeireHand[normRedFive(t)-10] += 3
    }
    let ukerieUnseen = []
    for (let i=0; i<38; i++) {
        ukerieUnseen[i] = i%10==0 ? 0 : thisUnseenTiles[i+10]
    }
    let ukeire = calculateUkeire(ukeireHand, ukerieUnseen, calculateMinimumShanten)
    return ukeire
}
function showDangers(thisPidx, tenpaiPidx, thisUnseenTiles, genbutsu, discardsToRiichi, event, dora, dangersDiv) {
    let combos = calcCombos(generateWaits(), genbutsu, discardsToRiichi, thisUnseenTiles, dora)
    dangersDiv.append(createElemWithText('p', i18next.t('Pusher') + ': ' + relativeToHeroStr(thisPidx)))
    dangersDiv.append(createElemWithText('p', i18next.t('Tenpai') + ': ' + relativeToHeroStr(tenpaiPidx)))
    dangersDiv.append(createElemWithText('pre', ' '))

    let [sujiCnt, sujiTables] = showSujis(genbutsu)
    dangersDiv.append(createElemWithText('p', `${i18next.t('sujis-tested')} ${18-sujiCnt}/18 (${i18next.t('suji-dealin-rate')} 1/${sujiCnt} = ${(1/sujiCnt*100).toFixed(1)}%)`))
    let span
    span = document.createElement("span")
    dangersDiv.append(span)
    span.style.display = "inline-block"
    for (let table of sujiTables) {
        let tableElem = document.createElement("table")
        span.append(tableElem)
        tableElem.style.display = "inline-block"
        tableElem.style.margin = "10px"
        for (let row of table) {
            addTableRow(tableElem, row)
        }
    }
    dangersDiv.append(createElemWithText('pre', ' '))

    dangersDiv.append(createElemWithText('p', `${i18next.t('Tile dealin rates')}`))
    span = document.createElement("span")
    dangersDiv.append(span)
    span.style.display = "inline-block"
    let tables = []
    for (let i=0; i<4; i++) {
        tables[i] = document.createElement("table")
        span.append(tables[i])
        tables[i].classList.add('hover-rows')
        tables[i].classList.add('wider-table')
        tables[i].style.display = "inline-block"
        tables[i].style.verticalAlign = "top"
        tables[i].style.margin = "10px"
    }
    let dangersDetailDiv = document.createElement("div")
    dangersDiv.append(dangersDetailDiv)
    for (let tile=11; tile<=47; tile++) {
        if (tile%10==0) { 
            continue
        }
        let suit = Math.floor(tile/10)
        let tileDiv = createTile(tenhou2str(tile)).innerHTML
        let k = `${String(tenhou2strH(tile))}`
        let probStr = '-'
        if (tile in combos) {
            let prob = combos[tile]['all']/combos['all']
            probStr = `${String((prob*100).toFixed(1))}`
        }
        addTableRow(tables[suit-1], [tileDiv,probStr])
        if (tile in combos) {
            tables[suit-1].lastChild.lastChild.addEventListener('click', (event) => {
                showDangersDetail(tile, combos, dangersDetailDiv)
            })
        }
    }
    dangersDiv.append(createElemWithText('pre', ' '))
    dangersDiv.append(createElemWithText('pre', ' '))
}
function showDangersDetail(keyTile, combos, dangersDetailDiv) {
    let table = document.createElement("table")
    table.classList.add('wider-table')
    let span = document.createElement('span')
    let tileDiv = createTile(tenhou2str(keyTile))
    span.innerHTML = tileDiv.innerHTML + ' ' + i18next.t('Details')
    dangersDetailDiv.replaceChildren(span)
    dangersDetailDiv.append(table)
    let keyCombo = combos[keyTile]
    let numRows = 0
    addTableRow(table, [i18next.t("Wait type"), i18next.t("Tiles"), i18next.t("Left"), "%"])
    table.lastChild.lastChild.style.borderBottom = `1px solid ${GS.C_colorText}`;
    for (let wait of keyCombo.types) {
        numRows++
        let row = []
        row.push(i18next.t(`waitTypeStr`, {returnObjects:true})[wait.type])
        row.push(wait.tiles.map(x => createTile(tenhou2str(x)).innerHTML).join(''))
        row.push(wait.numUnseen.join('*'))
        row.push(`${(wait.combos/combos['all']*100).toFixed(1)}`)
        addTableRow(table, row)
    }
    table.lastChild.lastChild.style.borderBottom = `1px solid ${GS.C_colorText}`;
    addTableRow(table, ["Total %", "", "", `${(keyCombo['all']/combos['all']*100).toFixed(1)}`])
    table = document.createElement("table")
    dangersDetailDiv.append(table)
    table.style.visibility = 'hidden'
    for (let i=0; i<5-numRows; i++) {
        addTableRow(table, ['-'])
    }
}
function testDangers() {
    // Pretend we don't see any tiles.
    GS.ui.genericModalBody.append(createElemWithText('pre', ('wait pattern combos:')))
    let sumP = 0
    let allTiles = [11,12,13,14,15,16,17,18,19,21,22,23,24,25,26,27,28,29,31,32,33,34,35,36,37,38,39,41,42,43,44,45,46,47]
    let numT = {}
    for (let t of allTiles) {
        numT[t] = 4
    }
    numT[47] = 1 // Test only 1 unseed Red dragon
    // riichi suji trap test
    // let combos = calcCombos(generateWaits(), [15,25,16,26,36], [25,16,26,36,15], numT, 46)
    // mostly flat test
    let combos = calcCombos(generateWaits(), [], [], numT, 46)
    for (let [key,combo] of Object.entries(combos)) {
        if (key=='all') {
            continue
        }
        sumP += combos[key]['all']
        GS.ui.genericModalBody.append(createElemWithText('pre', (combo2strAndP(key,combos))[0]))
    }
    GS.ui.genericModalBody.append(createElemWithText('pre', (`sumP ${String((sumP/combos['all']*100).toFixed(1)).padStart(4)}%`)))
}
function calcDanger() {
    console.time('calcDanger')
    let saveHand = GS.hand_counter
    let savePly = GS.ply_counter
    for (GS.hand_counter=0; GS.hand_counter < GS.ge.length; GS.hand_counter++) {
        GS.ply_counter = GS.ge[GS.hand_counter].length-1
        onlyUpdateState()
        let finalHands = GS.gs.hands // Beware: For now don't need a deep copy...
        let finalCalls = GS.gs.calls // Beware: For now don't need a deep copy...
        for (let ply=0; ply < GS.ge[GS.hand_counter].length; ply++) {
            let event = GS.ge[GS.hand_counter][ply]
            let prevEvent = GS.ge[GS.hand_counter][ply-1]
            let nextEvent = GS.ge[GS.hand_counter][ply+1]
            let gs = GS.gs
            incrementalCalcDangerHelper(event, prevEvent, gs)
            for (let tenpaiPidx=0; tenpaiPidx<4; tenpaiPidx++) {
                if (!gs.reach_accepted[tenpaiPidx] || event.actor === undefined) {
                    continue // skip non-tenpai players, and e.g. ryukyoku
                }
                for (let thisPidx=0; thisPidx<4; thisPidx++) {
                    let dangerousEvent = (event.type == 'dahai' || event.type=='kakan') && 
                                        event.actor != tenpaiPidx && event.actor == thisPidx
                    let tsumoAttempt = event.actor == tenpaiPidx && event.type == 'tsumo'
                    let thisUnseenTiles = gs.unseenTiles[thisPidx]
                    if (tsumoAttempt) {
                        let numUnseenTiles = sum(Object.values(thisUnseenTiles))
                        let ukeire = doCalculateUkeire(finalHands[tenpaiPidx], finalCalls[tenpaiPidx], thisUnseenTiles)
                        let success = nextEvent.type == 'hora'
                        event['tsumoAttempt'] = [success, ukeire['value'], numUnseenTiles]
                    }
                    if (thisPidx != GS.heroPidx && thisPidx != event.actor) {
                        continue
                    }
                    let thisDanger = {}
                    thisDanger['dangerousEvent'] = dangerousEvent
                    thisDanger['combos'] = calcCombos(generateWaits(), gs.genbutsu[tenpaiPidx], gs.discardsToRiichi[tenpaiPidx], thisUnseenTiles, gs.dora[0])
                    thisDanger['unseenTiles'] = {...thisUnseenTiles}
                    thisDanger['genbutsu'] = new Set(gs.genbutsu[tenpaiPidx])
                    thisDanger['discardsToRiichi'] = [...gs.discardsToRiichi[tenpaiPidx]]
                    thisDanger['event'] = event
                    thisDanger['ply'] = ply
                    thisDanger['dora'] = gs.dora[0]
                    if (!('danger' in event)) { event['danger'] = [[],[],[],[]]}
                    event['danger'][tenpaiPidx][thisPidx] = thisDanger
                }
            }

        }
    }
    GS.hand_counter = saveHand
    GS.ply_counter = savePly
    console.timeEnd('calcDanger')
}
function showDangerDetail() {
    GS.ui.genericModal.style.marginRight = '0px'
    GS.ui.genericModalBody.replaceChildren()
    GS.ui.genericModal.querySelector(".title").textContent = i18next.t("dealin-rate")
    const dangersDiv = document.createElement('div')
    GS.ui.genericModalBody.append(dangersDiv)
    let event = GS.ge[GS.hand_counter][GS.ply_counter]
    let foundone = false
    for (let tenpaiPidx=0; tenpaiPidx<4; tenpaiPidx++) {
        if (tenpaiPidx == event.actor || !event.danger || !event.danger[tenpaiPidx] || !event.danger[tenpaiPidx][event.actor]) {
            continue
        }
        foundone = true
        let d = event.danger[tenpaiPidx][event.actor]
        showDangers(event.actor, tenpaiPidx, d['unseenTiles'], d['genbutsu'], d['discardsToRiichi'], d['event'], d['dora'], dangersDiv)
    }
    if (foundone) {
        showModalAndWait(GS.ui.genericModal)
    } else {
        console.log('No danger')
    }
}

function showDangerTable() {
    GS.ui.genericModal.style.marginRight = '0px'
    GS.ui.genericModalBody.replaceChildren()
    GS.ui.genericModal.querySelector(".title").textContent = i18next.t("accum-dealin-rate")
    let resultTypeStr = GS.ui.getResultTypeStr()
    GS.ui.genericModalBody.append(createElemWithText('p', i18next.t('Final Result:')))
    for (let s of resultTypeStr) {
        GS.ui.genericModalBody.append(createElemWithText('p', s))
    }
    const dangersDiv = document.createElement('div')
    let table = document.createElement("table")
    table.classList.add('wider-table')
    table.classList.add('hover-rows')
    GS.ui.genericModalBody.append(table)
    addTableRow(table, [i18next.t('Pusher'), i18next.t('Tile'), i18next.t('Tenpai'), '%', i18next.t('Total %')])
    for (let thisPidx=0; thisPidx<4; thisPidx++) {
        let accumP = 0
        let firstRow = true
        for (let event of GS.ge[GS.hand_counter]) {
            let firstTenpai = true
            if ('danger' in event && event['danger'][thisPidx]) {
                for (let tenpaiPidx=0; tenpaiPidx<4; tenpaiPidx++) {
                    if (event['danger'][tenpaiPidx][thisPidx] && event['danger'][tenpaiPidx][thisPidx]['dangerousEvent']) {
                        let d = event['danger'][tenpaiPidx][thisPidx]
                        let tile = normRedFive(event.pai)
                        let p = (tile in d['combos']) ? d['combos'][tile]['all']/d['combos']['all'] : 0
                        accumP = accumP + (1-accumP)*p
                        let row = [relativeToHeroStr(thisPidx), createTile(tenhou2str(d['event'].pai)), relativeToHeroStr(tenpaiPidx), (p*100).toFixed(1), (accumP*100).toFixed(1)]
                        if (!firstTenpai) {
                            row[1] = '' // Don't repeat the tile
                            firstTenpai = false
                        }
                        firstTenpai = false
                        if (!firstRow) {
                            row[0] = '' // Don't repeat thisPidx
                        }
                        addTableRow(table, row)
                        if (firstRow) {
                            table.lastChild.lastChild.style.borderTop = `1px solid ${GS.C_colorText}`;
                            firstRow = false
                        }
                        table.lastChild.lastChild.addEventListener('click', (event) => {
                            GS.ply_counter = d['ply']-1
                            updateState()
                        })
                    }
                }
            }
            continue
        }
    }
    GS.ui.genericModalBody.append(createElemWithText('pre', ' '))
    table = document.createElement("table")
    GS.ui.genericModalBody.append(table)
    addTableRow(table, [i18next.t('Tenpai'), i18next.t('Tsumo'), '%', i18next.t('Total %')])
    for (let pidx=0; pidx<4; pidx++) {
        let accumP = 0
        let firstRow = true
        let who = relativeToHeroStr(pidx)
        for (let event of GS.ge[GS.hand_counter]) {
            if (event.actor == pidx && 'tsumoAttempt' in event) {
                let ta = event['tsumoAttempt']
                let p = ta[1]/ta[2]
                accumP = accumP + (1-accumP)*p
                let result = ta[0] ? i18next.t('hit') : i18next.t('miss')
                addTableRow(table, [who, result, (p*100).toFixed(1), (accumP*100).toFixed(1)])
                if (firstRow) {
                    table.lastChild.lastChild.style.borderTop = `1px solid ${GS.C_colorText}`;
                    firstRow = false
                }
            }
        }
    }
    GS.ui.genericModalBody.append(dangersDiv)
    // testDangers()
    showModalAndWait(GS.ui.genericModal)
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
    GS.ply_counter = GS.ge[GS.hand_counter].length-1
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
function toggleDealinRate() {
    GS.showDealinRate = !GS.showDealinRate
    localStorage.setItem("showDealinRate", GS.showDealinRate ? 1 : 0)
    updateState()
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
    const toggleDealinRateElem = i18nElem("toggle-dealin-rate")
    const about =  i18nElem("about")
    const aboutBody = [document.getElementById("about-body-0"), document.getElementById("about-body-1")]
    const langLabel = i18nElem("langLabel")
    const optionsLabel = i18nElem("options-label")
    let aboutBodyLists = [i18next.t("about-body-0", {returnObjects:true}), i18next.t("about-body-1", {returnObjects:true})]
    aboutBody[0].replaceChildren(document.createElement("ul"))
    for (let i=0; i<aboutBodyLists[0].length; i++) {
        let ul = document.createElement("li")
        let node = document.createElement("span")
        node.innerHTML = aboutBodyLists[0][i]
        ul.appendChild(node)
        aboutBody[0].appendChild(ul)
    }
    let table = document.createElement("table")
    aboutBody[1].replaceChildren(table)
    for (let i=0; i<aboutBodyLists[1].length; i++) {
        addTableRow(table, aboutBodyLists[1][i])
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
    const genericModalClose = document.getElementById('generic-modal-close')
    const genericModal = document.getElementById('generic-modal')
    const allModals = document.querySelectorAll('.modal')
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
    toggleDealinRateElem.addEventListener("click", () => {
        toggleDealinRate()
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
    genericModalClose.addEventListener("click", () => {
        genericModal.close()
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
    document.querySelector('.discard-bars-svg').addEventListener("click", () => {
        GS.showMortal = !GS.showMortal
        updateState()
    })
    document.querySelector('.danger-bars-svg').addEventListener("click", () => {
        if (GS.showDealinRate) {
            showDangerDetail()
        }
    })
    document.addEventListener('keydown', function(event) {
        // If any modal is open, close the modal instead of doing anything else
        for (let thisModal of allModals) {
            if (thisModal.open) {
                thisModal.close()
                return
            }
        }
        if (event.key == 'h') {
            GS.showHands = !GS.showHands
            updateState()
        } else if (event.key == 'm') {
            GS.showMortal = !GS.showMortal
            updateState()
        } else if (event.key == 'PageUp' || event.key == ',') {
            do {
                decPlyCounter();
            } while (!stopCondition(true))
            updateState()
        } else if (event.key == 'PageDown' || event.key == '.') {
            do {
                incPlyCounter();
            } while (!stopCondition(true))
            updateState()
        } else if (event.key == 'Home' || event.key == '[') {
            if (GS.ply_counter != 0) {
                GS.ply_counter = 0
            } else {
                decRoundCounter()
            }
            updateState()
        } else if (event.key == 'End' || event.key == ']') {
            if (GS.ply_counter != GS.ge[GS.hand_counter].length-1) {
                GS.ply_counter = GS.ge[GS.hand_counter].length-1
            } else {
                incRoundCounter()
            }
            updateState()
        } else if (event.key == 'ArrowDown') {
            do {
                incPlyCounter();
            } while (!stopCondition(false))
            updateState()
        } else if (event.key == 'ArrowUp') {
            do {
                decPlyCounter();
            } while (!stopCondition(false))
            updateState()
        } else if (event.key == 'ArrowRight') {
            incPlyCounter()
            updateState()
        } else if (event.key == 'ArrowLeft') {
            decPlyCounter()
            updateState()
        } else if (event.key == 'd') {
            toggleDealinRate()
        } else if (event.key == 'a') {
            if (GS.showDealinRate) {
                showDangerTable()
            }
        } else if (event.key == 'z') {
            if (GS.showDealinRate) {
                showDangerDetail()
            }
        } else if (event.key == 'b') {
            const urlParams = new URLSearchParams(window.location.search)
            urlParams.set('hand', GS.hand_counter)
            urlParams.set('ply', GS.ply_counter)
            urlParams.set('showMortal', GS.showMortal ? 1 : 0)
            window.location.href = window.location.pathname + '?' + urlParams.toString()
        } else if (event.key == '?') {
            showModalAndWait(aboutModal)
        }
    });
    document.addEventListener('wheel', function(event) {
        // TODO: I think the modals themselves should block propogation of events instead?
        // If any modal is open, close the modal instead of doing anything else
        for (let thisModal of allModals) {
            if (thisModal.open) {
                // Except don't close the danger modal, since we may need to scroll it
                if (!([genericModal, aboutModal, infoRoundModal].includes(thisModal))) {
                    thisModal.close()
                }
                return
            }
        }
        if (event.deltaY > 0) {
            incPlyCounter()
            updateState()
        } else if (event.deltaY < 0) {
            decPlyCounter()
            updateState()
        } else {
            console.log('Error? deltaY=0?')
            console.log(event)
        }
    })
    // window.matchMedia(`(max-width: ${GS.mediaBreak})`).onchange = (event) => {
    //     GS.updateZoom()
    //     updateState()
    // }
    window.matchMedia("(orientation: portrait)").onchange = (event) => {
        GS.updateZoom()
        updateState()
    }
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
            throw new Error()
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
    deepMap(data, 'dora_marker', tm2t)
    deepMap(data, 'consumed', convertConsumed)
}
function getBody(data) {
    const parser = new DOMParser()
    let body = parser.parseFromString(data, 'text/html').querySelector('body').textContent
    data = JSON.parse(body)
    return data
}
function parseMortalJsonStr(data) {
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
    calcDanger()
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
        // for (let i=0; i<27; i++) {
        for (let i=0; i<22; i++) {
            GS.ui.addDiscardTiles(pidx, ['1m'], false)
            if (i==15) {
                GS.ui.rotateLastTile(pidx, 'discard')
            }
        }
    }
    for (let pidx=0; pidx<4; pidx++) {
        GS.ui.addHandTiles(pidx, 'hand', [], true)
        GS.ui.addHandTiles(pidx, 'hand', ['6m'], false)
        GS.ui.addBlankSpace(pidx, true)
        GS.ui.addHandTiles(pidx, 'hand', ['7m'], false)

        for (let i=1; i<=4; i++) {
            console.log(i, tenhou2str(`${i}m`))
            GS.ui.addHandTiles(pidx, 'call', [`${i}m`], false)
            GS.ui.addHandTiles(pidx, 'call', [`${i}m`], false)
            GS.ui.addHandTiles(pidx, 'call', [`${i}m`], false)
            GS.ui.rotateLastTile(pidx, 'hand')
            GS.ui.addHandTiles(pidx, 'call', [`${i}m`], false)
            GS.ui.rotateLastTile(pidx, 'hand')
            GS.ui.floatLastTile(pidx)
        }
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

function parseUrl() {
    const urlParams = new URLSearchParams(window.location.search)
    let dataParam = urlParams.get('data')
    let hand_counter = Number(urlParams.get('hand'))
    let ply_counter = Number(urlParams.get('ply'))
    if (urlParams.get('showMortal')) {
        GS.showMortal = Number(urlParams.get('showMortal'))
    }
    if (urlParams.get('alphaTestMode')) {
        GS.alphaTestMode = true
    }
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
            GS.hand_counter = 0
            GS.ply_counter = 0
            if (hand_counter !== null && hand_counter < GS.ge.length) {
                GS.hand_counter = hand_counter
            }
            if (ply_counter !== null && ply_counter < GS.ge[GS.hand_counter].length) {
                GS.ply_counter = ply_counter
            }
            updateState()
            connectUI()
        } else {
            alert(`Invalid URL: ${dataParam} ${xhr.statusText}`)
        }
    };
    xhr.send();
}

const GS = new GlobalState
export default { main, GS, debugState } // So we can access these from dev console
function main() {
    const lang = ("lang" in localStorage) ? localStorage.getItem("lang") : "en"
    GS.showDealinRate = ("showDealinRate" in localStorage) ? localStorage.getItem("showDealinRate") : false
    i18next_data.lng = lang
    i18next.init(i18next_data).then(parseUrl(true))
}
main()

