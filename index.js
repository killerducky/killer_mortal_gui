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

createElements()

{/* <span class="grid-discard grid-discard-self"><img src="media/tiles/2z.svg"><img src="media/tiles/2z.svg"><img src="media/tiles/3z.svg"></span>
 */}

function createTile(tileStr) {
    const tileImg = document.createElement('img')
    tileImg.src = `media/tiles/${tileStr}.svg`
    return tileImg
}

function addTiles(container, tileStrArray) {
    for (i in tileStrArray) {
        container.appendChild(createTile(tileStrArray[i]))
    }   
}

function convertTileStr(str) {
    let output = []
    let suit = ''
    for (i=str.length; i>=0; i--) {
        if (!isNaN(str[i])) {
            if (suit == '') {
                console.log(`error in string: ${str}`)
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
        discards.replaceChildren()
        addTiles(discards, convertTileStr('123m456s789p1234z') )
        selfHand = document.querySelector(`.grid-hand-p${pnum}`)
        selfHand.replaceChildren()
        addTiles(selfHand, convertTileStr('123m456s789p1234z') )
    }
}

