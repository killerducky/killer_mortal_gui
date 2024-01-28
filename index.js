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

function createTile(tileStr) {
    const tileElem = document.createElement('span')
    const tileImg = document.createElement('img')
    tileElem.classList.add('tile-container')
    tileImg.src = `media/tiles/${tileStr}.svg`
    tileImg.style.width = '2em'
    tileElem.appendChild(tileImg)
    return tileElem
}

function createElements() {
    const tileContainerElem = document.querySelector('.hand-container')
    const tilesElem = document.createElement('span')
    const tileElem = createTile('6p')
    tilesElem.appendChild(tileElem)
    tilesElem.appendChild(createTile('7p'))
    tileContainerElem.appendChild(tilesElem)
}

