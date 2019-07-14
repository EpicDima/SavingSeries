const settingsButton = document.getElementById("settings")
const plusButton = document.getElementById("plus")
const sortButton = document.getElementById("sort")

const settingsMenu = document.getElementById("settings-menu")
const addContainer = document.getElementById("add-container")
const sortTypes = document.getElementById("sort-types")
const contentContainer = document.getElementById("content-container")



document.addEventListener("click", event => {
    let target = event.target
    
    if (settingsButton.contains(target)) {
        settingsMenu.style.display = (settingsMenu.style.display == "block") ? "none" : "block"
    } else {
        settingsMenu.style.display = "none"
    }

    if (plusButton.contains(target)) {
        addContainer.style.display = (addContainer.style.display == "block") ? "none" : "block"
    } else if (!addContainer.contains(target)) {
        addContainer.style.display = "none"
    }

    if (sortButton.contains(target)) {
        sortTypes.style.display = (sortTypes.style.display == "block") ? "none" : "block"
    } else {
        sortTypes.style.display = "none"
    }
});


function addNew() {
    let card = document.createElement("div")
    card.className = "card"
    card.onclick = openChangeContainer

    let cross = document.createElement("div")
    cross.className = "card-cross"
    cross.innerHTML = "<svg class=\"card-cross-svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\"><path d=\"M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z\"/><path d=\"M0 0h24v24H0z\" fill=\"none\"/></svg>"
    cross.onclick = onCrossClick

    let name = document.createElement("div")
    name.className = "card-name"
    name.innerText = "Назв ssssssssss sssdss sssss ssssss sddddddddd ddан ие dfsff ffffff fffff Назвssss sssssssssd ssssss sssssss sdd dddddd dddание dfsf ffffffff fff"

    let table = document.createElement("table")
    table.className = "card-table"

    // логика проверки существования даты и ссылки
    let tr1 = document.createElement("tr")
    let td11 = document.createElement("td")
    td11.innerText = "Сезон"
    let td12 = document.createElement("td")
    td12.innerText = "Серия"
    let td13 = document.createElement("td")
    td13.innerText = "Дата"
    let td14 = document.createElement("td")
    td14.innerText = "Ссылка"

    tr1.appendChild(td11)
    tr1.appendChild(td12)
    tr1.appendChild(td13)
    tr1.appendChild(td14)

    table.appendChild(tr1)

    let tr2 = document.createElement("tr")
    let td21 = document.createElement("td")
    td21.innerText = "1"
    let td22 = document.createElement("td")
    td22.innerText = "23"
    let td23 = document.createElement("td")
    td23.innerText = "12.12.2019"
    let td24 = document.createElement("td")
    let a = document.createElement("a")
    a.href = "https://yandex.by/search/?text=javascript%20%D0%BD%D0%B0%D0%B7%D0%B2%D0%B0%D0%BD%D0%B8%D0%B5%20%D1%81%D0%B0%D0%B9%D1%82%D0%B0%20%D0%B8%D0%B7%20%D1%81%D1%81%D1%8B%D0%BB%D0%BA%D0%B8&lr=155&clid=2186621"
    a.innerText = a.host
    a.target = "_blank"
    td24.appendChild(a)

    tr2.appendChild(td21)
    tr2.appendChild(td22)
    tr2.appendChild(td23)
    tr2.appendChild(td24)

    table.appendChild(tr2)

    card.appendChild(cross)
    card.appendChild(name)
    card.appendChild(table)

    contentContainer.appendChild(card)
    addContainer.style.display = "none"
    card.scrollIntoView()
}


function onCrossClick(event) {
    console.log(this)
}


function openChangeContainer(event) {
    let changeContainer = document.getElementById("change-container")
    if (changeContainer != null) {
        if (this.contains(changeContainer)) {
            if (!changeContainer.contains(event.target)) {
                changeContainer.remove()
            }
            return;
        } else {
            changeContainer.remove()
        }
    }
    
    changeContainer = document.createElement("div")
    changeContainer.id = "change-container"
    changeContainer.style.width = "100%";
    changeContainer.style.backgroundColor = "#ff0000"

    let ul = document.createElement("ul")
    let li1 = document.createElement("li")
    li1.innerText = "Сезон"
    let input1 = document.createElement("input")
    input1.id = "season-input-change"
    input1.type = "number"
    input1.value = "1"
    input1.min = "1"
    input1.max = "50"
    input1.required = true
    li1.appendChild(input1)

    let li2 = document.createElement("li")
    li2.innerText = "Серия"
    let input2 = document.createElement("input")
    input2.id = "episode-input-change"
    input2.type = "number"
    input2.value = "1"
    input2.min = "1"
    input2.max = "50000"
    input2.required = true
    li2.appendChild(input2)

    let li3 = document.createElement("li")
    li3.innerText = "Дата"
    let input3 = document.createElement("input")
    input3.id = "date-input-change"
    input3.type = "date"
    li3.appendChild(input3)

    let li4 = document.createElement("li")
    li4.innerText = "Сайт"
    let input4 = document.createElement("input")
    input4.id = "site-input-change"
    input4.type = "url"
    li4.appendChild(input4)

    let bottomDiv = document.createElement("div")
    bottomDiv.id = "bottom"
    let changeOkButton = document.createElement("button")
    changeOkButton.id = "change-ok"
    changeOkButton.innerText = "Подтвердить"
    changeOkButton.onclick = changeAccept
    bottomDiv.appendChild(changeOkButton)

    ul.appendChild(li1)
    ul.appendChild(li2)
    ul.appendChild(li3)
    ul.appendChild(li4)

    changeContainer.appendChild(ul)
    changeContainer.appendChild(bottomDiv)

    this.appendChild(changeContainer)
    //changeContainer.scrollIntoView()
}


function changeAccept(event) {
    let changeContainer = document.getElementById("change-container")
    changeContainer.remove()
    event.stopPropagation()
}