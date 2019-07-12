const nameInput = document.getElementById("nameInput")
const completedInput = document.getElementById("completedInput")

const otherParametersDiv = document.getElementById("otherParametersDiv")

const siteInput = document.getElementById("siteInput")
const numberOfSeasonsInput = document.getElementById("numberOfSeasonsInput")

const numberOfEpisodesPerSeasonDiv = document.getElementById("numberOfEpisodesPerSeasonDiv")

const nextSeasonNumberInput = document.getElementById("nextSeasonNumberInput")
const nextEpisodeNumberInput = document.getElementById("nextEpisodeNumberInput")
const nextEpisodeDateInput = document.getElementById("nextEpisodeDateInput")


var numberOfEpisodesPerSeasonInnerDivs = []
var numberOfEpisodesPerSeasonInputs = []
var numberOfWatchedEpisodesPerSeasonInputs = []


function changeVisibilityOfOtherParametersDiv() {
    otherParametersDiv.style.display = completedInput.checked ? "none" : "block"
}


function deleteTo(to) {
    for (let i = numberOfEpisodesPerSeasonInnerDivs.length - 1; i >= to ; i--) {
        numberOfEpisodesPerSeasonInnerDivs[i].remove()
    }
    numberOfEpisodesPerSeasonInnerDivs = numberOfEpisodesPerSeasonInnerDivs.slice(0, to)
    numberOfEpisodesPerSeasonInputs = numberOfEpisodesPerSeasonInputs.slice(0, to)
    numberOfWatchedEpisodesPerSeasonInputs = numberOfWatchedEpisodesPerSeasonInputs.slice(0, to)
}


function numberOfSeasonsChange() {
    let numberOfSeasons = Number(numberOfSeasonsInput.value)
    let start = 0;
    if (numberOfSeasons > numberOfEpisodesPerSeasonInnerDivs.length) {
        start = numberOfEpisodesPerSeasonInnerDivs.length
    } else {
        deleteTo(numberOfSeasons)
        return;
    }

    for (let i = start; i < numberOfSeasons; i++) {
        let innerDiv = document.createElement("div")

        let numberOfEpisodesInput = document.createElement("input")
        numberOfEpisodesInput.id = i
        numberOfEpisodesInput.type = "number"
        numberOfEpisodesInput.min = "1"
        numberOfEpisodesInput.max = "50000"
        numberOfEpisodesInput.value = "1"
        numberOfEpisodesInput.oninput = print

        let numberOfWatchedEpisodesInput = document.createElement("input")
        numberOfWatchedEpisodesInput.type = "number"
        numberOfWatchedEpisodesInput.min = "0"
        numberOfWatchedEpisodesInput.max = "1"
        numberOfWatchedEpisodesInput.value = "0"

        numberOfEpisodesPerSeasonInputs.push(numberOfEpisodesInput)
        numberOfWatchedEpisodesPerSeasonInputs.push(numberOfWatchedEpisodesInput)

        innerDiv.append("Сезон " + (i + 1) + "\t")
        innerDiv.appendChild(numberOfEpisodesInput)
        innerDiv.appendChild(numberOfWatchedEpisodesInput)

        numberOfEpisodesPerSeasonInnerDivs.push(innerDiv)
        numberOfEpisodesPerSeasonDiv.appendChild(innerDiv)
    }
}

function print(event) {
    let element = event.srcElement
    let index = element.id
    if (element.checkValidity()) {
        numberOfWatchedEpisodesPerSeasonInputs[index].max = element.value
    } else {
        numberOfWatchedEpisodesPerSeasonInputs[index].max = "0"
    }
}


function add() {
    console.log(numberOfSeasonsInput.checkValidity())
    console.log(nextSeasonNumberInput.checkValidity())
    console.log(nextEpisodeNumberInput.checkValidity())
    console.log(nextEpisodeDateInput.checkValidity())
}