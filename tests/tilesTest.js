const numberInput = document.getElementById("numberInput")
const number2Input = document.getElementById("number2Input")
const tilesDiv = document.getElementById("tiles")


const tileSize = 45
tilesDiv.style.width = (tileSize + 8) * 10 + "px"


var tiles = []
var activeTiles = []


function onNumberInput() {
    number2Input.max = numberInput.checkValidity() ? numberInput.value : "0"
    let number = numberInput.value
    let start = 0;
    if (number > tiles.length) {
        start = tiles.length
    } else {
        for (let i = tiles.length - 1; i >= number ; i--) {
            tiles[i].remove()
        }
        tiles = tiles.slice(0, number)
        return;
    }
    for (let i = start; i < number; i++) {
        let tile = createTile(i + 1)
        tiles.push(tile)
        tilesDiv.appendChild(tile)
    }
}


function onNumber2Input() {
    if (number2Input.checkValidity()) {
        let number = number2Input.value
        activeTiles = []
        for (let i = 0; i < number; i++) {
            activeTiles.push(tiles[i])
        }
    } else {
        activeTiles = []
    }
    updateTilesColors()
}

function updateTilesColors() {
    tiles.forEach(tile => {
        tile.style.background = "#7b86d3"
    })
    activeTiles.forEach(tile => {
        tile.style.background = "repeating-linear-gradient(45deg, #7b86d3, #7b86d3 5px, #465298 5px, #465298 10px)"
    })
}


function createTile(number) {
    let tile = document.createElement("div")

    tile.style.display = "inline-block"
    tile.style.width = tileSize + "px"
    tile.style.height = tileSize + "px"
    tile.style.margin = "4px"
    tile.style.background = "#7b86d3"
    tile.style.textAlign = "center"
    tile.style.lineHeight = tileSize + "px"
    tile.innerText = number

    tile.onmouseout = divOnMouseOut
    tile.onmouseover = divOnMouseOver
    tile.onmouseup = divOnMouseUp

    return tile
}

function divOnMouseOut() {
    if (!activeTiles.includes(this)) {
        this.style.background = "#7b86d3";
    }
}


function divOnMouseOver() {
    this.style.background = "repeating-linear-gradient(45deg, #7b86d3, #7b86d3 5px, #465298 5px, #465298 10px)"
}


function divOnMouseUp() {
    index = activeTiles.indexOf(this)
    if (index == -1) {
        activeTiles.push(this)
    } else {
        activeTiles[index].style.backgroundColor = "#7b86d3";
        activeTiles.splice(index, 1)
    }
}