// Основные переменные
var counter = 0      // счётчик для установки id
var seriesList = []  // список объектов сериалов
var cardList = []     // список элементов div

// База данных Indexed DB
var database;



// Основные неизменяемые элементы пользовательского интерфейса
// Кнопки
const settingsButton = document.getElementById("settings")
const plusButton = document.getElementById("plus")
const sortButton = document.getElementById("sort")

const addAcceptButton = document.getElementById("add-accept")

// Показывающиеся при нажатии элементы
const settingsMenu = document.getElementById("settings-menu")
const addContainer = document.getElementById("add-container")
const sortTypes = document.getElementById("sort-types")

// Элемент для хранения карточек серий
const contentContainer = document.getElementById("content-container")

// Поля ввода для добавления
const nameInput = document.getElementById("name-input")
const seasonInput = document.getElementById("season-input")
const episodeInput = document.getElementById("episode-input")
const dateInput = document.getElementById("date-input")
const siteInput = document.getElementById("site-input")

// Поисковая строка
const searchInput = document.getElementById("search-input")



onClickOutside()
resetAddInputs()
connectDB(initialize)



function connectDB(func) {
    let request = indexedDB.open("SavingSeriesDb", 1);
    
	request.onerror = function(err) {
		console.log(err);
    }
    
	request.onsuccess = function() {
		func(request.result);
    }
    
	request.onupgradeneeded = function(event) {
        if (!confirm("Данные будут храниться на вашем компьютере.\nВы согласны?")) {
            window.close()
            return;
        }
		event.currentTarget.result.createObjectStore("series", {keyPath: "id"});
		connectDB(func);
	}
}


function initialize(db) {
    database = db;

    let request = database.transaction("series", "readonly").objectStore("series").getAll()

    request.onerror = function(event) {
        console.log("initialize: " + event.target.error);
    }

    request.onsuccess = function(event) {
        seriesList = event.target.result
        if (seriesList.length != 0) {
            counter = seriesList[seriesList.length - 1].id + 1
        }
        seriesList.forEach(series => {
            addSeriesToList(series)
        });
        window.scrollTo(0, 0)
    }

    searchInput.value = ""
}


function onClickOutside() {
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

        let changeContainer = document.getElementById("change-container")
        if (changeContainer != null) {
            for (let i = 0; i < cardList.length; i++) {
                if (cardList[i].contains(target)) {
                    return;
                }
            }
            changeContainer.remove()
        }
    });
}


function createBackup() {
    let element = document.createElement("a")
    element.href = "data:text/plain;charset=utf-8,%EF%BB%BF" + encodeURIComponent(JSON.stringify(seriesList))
    element.download = "backup.bin"
    element.style.display = "none"
    document.body.appendChild(element)
    element.click()
    element.remove()
}


function loadBackup() {
    if (!confirm("Все имеющиеся данные будут очищены и заменены на новые. Вы согласны?")) {
        return;
    }

    let element = document.createElement("input")
    element.type = "file"
    element.style.display = "none"
    element.onchange = onOpenFile
    document.body.appendChild(element)
    element.click()
    element.remove()
}


function clearAll() {
    database.transaction("series", "readwrite").objectStore("series").clear()
    seriesList = []
    cardList.forEach(card => {
        card.remove()
    })
    cardList = []
}


function onOpenFile(event) {
    let reader = new FileReader();
    reader.onloadend = function(event) {
        let data;
        try {
            data = JSON.parse(event.target.result)
        } catch (SyntaxError) {
            data = null;
        }
        if (!(data instanceof Array)) {
            alert("Неправильное содержимое файла!")
        } else {
            clearAll()
            seriesList = data
            for (let i = 0; i < seriesList.length; i++) {
                seriesList[i].id = i;
            }
            counter = seriesList.length
            seriesList.forEach(series => {
                if (series.date != "") {
                    series.date = new Date(series.date)
                }
                addSeriesToList(series)
                database.transaction("series", "readwrite").objectStore("series").add(series).onerror = function(event) {
                    alert("Что-то пошло не так!\nonOpenFile: " + event.target.error);
                }
            });
        }
    };
    reader.readAsText(event.target.files[0]);
}


function resetAddInputs() {
    nameInput.value = ""
    seasonInput.value = "1"
    episodeInput.value = "1"
    dateInput.value = ""
    siteInput.value = ""
}


function getSeriesValuesFromInput() {
    return {name: nameInput.value,
            season: seasonInput.value,
            episode: episodeInput.value,
            date: dateInput.value,
            site: siteInput.value}
}


function nameExistenceValidator() {
    let name = nameInput.value.trim()
    for (let i = 0; i < seriesList.length; i++) {
        if (name == seriesList[i].name) {
            nameInput.setCustomValidity("Сериал с таким названием уже существует")
            return;
        }
    }
    nameInput.setCustomValidity("")
}


function addSeriesValidator(series, callback) {
    if (!nameValidator(series, callback)) {
        return null;
    } else if (!seasonValidator(series, callback)) {
        return null;
    } else if (!episodeValidator(series, callback)) {
        return null;
    } else if (!dateValidator(series, callback)) {
        return null;
    } else if (!siteValidator(series, callback)) {
        return null;
    }
    return series;
}


function nameValidator(series, callback) {
    series.name = series.name.trim()
    if (series.name.length == 0) {
        callback("Некорректное название")
        return false;
    } 
    else {
        for (let i = 0; i < seriesList.length; i++) {
            if (seriesList[i].name == series.name) {
                callback("Сериал с таким названием уже существует")
                return false;
            }
        }
    }
    return true;
}


function seasonValidator(series, callback) {
    if (series.season.length == 0) {
        callback("Некорректное число сезонов")
        return false;
    } else {
        series.season = Number.parseInt(series.season)
        if (isNaN(series.season)) {
            callback("Некорректное число сезонов")
            return false;
        } else if (series.season <= 0) {
            callback("Число сезонов не может быть меньшим либо равным нуля")
            return false;
        } else if (series.season > 50) {
            callback("Число сезонов не может быть больше 50")
            return false;
        }
    }
    return true;
}


function episodeValidator(series, callback) {
    if (series.episode.length == 0) {
        callback("Некорректное число серий")
        return false;
    } else {
        series.episode = Number.parseInt(series.episode)
        if (isNaN(series.episode)) {
            callback("Некорректное число серий")
            return false;
        } else if (series.episode <= 0) {
            callback("Число серий не может быть меньшим либо равным нуля")
            return false;
        } else if (series.episode > 50000) {
            callback("Число сезонов не может быть больше 50000")
            return false;
        }
    }
    return true;
}


function dateValidator(series, callback) {
    if (series.date != "") {
        series.date = new Date(series.date);
        if (isNaN(series.date)) {
            callback("Некорректная дата")
            return false;
        }
    }
    return true;
}


function siteValidator(series, callback) {
    if (series.site != "") {
        if (series.site.length == 0) {
            callback("Некорректная ссылка на сайт")
            return false;
        }
    }
    return true;
}


function addNew() {
    let series = addSeriesValidator(getSeriesValuesFromInput(), alert)
    if (series == null) {
        return;
    }
    series.id = counter++;

    seriesList.push(series)
    
    addSeriesToList(series)

    database.transaction("series", "readwrite").objectStore("series").add(series).onerror = function(event) {
        alert("Что-то пошло не так!\naddNew: " + event.target.error);
    }
    addContainer.style.display = "none"
    resetAddInputs()
    cardList[cardList.length - 1].scrollIntoView()
}


function addSeriesToList(series) {
    let card = createCard(series)
    cardList.push(card)
    contentContainer.appendChild(card)
}


function createCard(series)
{
    let card = document.createElement("div")
    card.className = "card"
    card.onclick = openChangeContainer

    let cross = document.createElement("div")
    cross.className = "card-cross"
    cross.innerHTML = "<svg class=\"card-cross-svg\" width=\"28\" height=\"28\" viewBox=\"0 0 24 24\"><path d=\"M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z\"/><path d=\"M0 0h24v24H0z\" fill=\"none\"/></svg>"
    cross.onclick = remove

    let name = document.createElement("div")
    name.className = "card-name"
    name.innerText = series.name

    let table = document.createElement("table")
    table.className = "card-table"

    let tr1 = document.createElement("tr")
    let tr2 = document.createElement("tr")

    let td11 = document.createElement("td")
    td11.innerText = "Сезон"
    let td12 = document.createElement("td")
    td12.innerText = "Серия"

    let td21 = document.createElement("td")
    td21.innerText = series.season
    let td22 = document.createElement("td")
    td22.innerText = series.episode

    tr1.appendChild(td11)
    tr1.appendChild(td12)

    tr2.appendChild(td21)
    tr2.appendChild(td22)

    let td13 = document.createElement("td")
    let td23 = document.createElement("td")
    if (series.date != "") {
        td13.innerText = "Дата"
        td23.innerText = series.date.toLocaleDateString("ru", {
            year: "numeric",
            month: "long",
            day: "numeric"
        });
    }
    tr1.appendChild(td13)
    tr2.appendChild(td23)

    let td14 = document.createElement("td")
    let td24 = document.createElement("td")
    if (series.site != "") {
        td14.innerText = "Ссылка"
        
        let a = document.createElement("a")
        a.href = series.site
        a.onclick = (event) => {
            event.stopPropagation()
        }
        
        if (a.host == "") {
            a.innerText = a.href
        } else {
            a.innerText = a.host
        }
        
        a.target = "_blank"
        td24.appendChild(a)
    }
    tr1.appendChild(td14)
    tr2.appendChild(td24)

    table.appendChild(tr1)   
    table.appendChild(tr2)

    card.appendChild(cross)
    card.appendChild(name)
    card.appendChild(table)

    return card
}


function searchSeries() {
    let substr = searchInput.value.trim().toLowerCase()
    if (substr.length == 0) {
        cardList.forEach(div => {
            div.style.display = "block"
        })
        return;
    }
    for (let i = 0; i < seriesList.length; i++) {
        if (seriesList[i].name.toLowerCase().search(substr) != -1) {
            cardList[i].style.display  = "block"
        } else {
            cardList[i].style.display  = "none"
        }
    }
}


function sortCardList() {
    cardList.forEach(card => {
        card.remove()
    });
    cardList = []
    seriesList.forEach(series => {
        addSeriesToList(series)
    })
}


function sortSeries(sortType) {
    switch (sortType) {
        case 1: // по названию
            seriesList.sort((prev, next) => (prev.name < next.name) ? -1 : 1);
            break;
        case 2: // по номеру сезона
            seriesList.sort((prev, next) => next.season - prev.season);
            break;
        case 3: // по номеру серии
            seriesList.sort((prev, next) => next.episode - prev.episode);
            break;
        case 4: // по дате
            seriesList.sort((prev, next) => {
                if (prev.date == "") {
                    return 1;
                } else if (next.date == "") {
                    return -1;
                } else {
                    return prev.date - next.date;
                }
            });
            break;
        default:
            alert("sortSeries. Как возможен default????")
            break;
    }
    searchInput.value = ""
    sortCardList()
}


function remove(event) {
    for (let i = 0; i < cardList.length; i++) {
        if (cardList[i].contains(this)) {
            event.stopPropagation()
            if (!confirm("Все точно хотите удалить этот сериал?")) {
                return;
            }
            database.transaction("series", "readwrite").objectStore("series").delete(seriesList[i].id)
            seriesList.splice(i, 1)
            cardList[i].remove()
            cardList.splice(i, 1)
        }
    }
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

    let series = seriesList[cardList.indexOf(this)]
    
    changeContainer = document.createElement("div")
    changeContainer.id = "change-container"

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
    input1.value = series.season
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
    input2.value = series.episode
    li2.appendChild(input2)

    let li3 = document.createElement("li")
    li3.innerText = "Дата"
    let input3 = document.createElement("input")
    input3.id = "date-input-change"
    input3.type = "date"
    let date = series.date
    if (!(series.date instanceof Date)) {
        date = Date.parse(date)
    }
    if (!isNaN(date)) {
        input3.value = date.toISOString().split("T")[0];
    }
    li3.appendChild(input3)

    let li4 = document.createElement("li")
    li4.innerText = "Сайт"
    let input4 = document.createElement("input")
    input4.id = "site-input-change"
    input4.type = "url"
    input4.value = series.site
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
}


function getSeriesValuesFromChangeInput() {
    return {season: document.getElementById("season-input-change").value,
            episode: document.getElementById("episode-input-change").value,
            date: document.getElementById("date-input-change").value,
            site: document.getElementById("site-input-change").value}
}


function changeSeriesValidator(series, callback) {
    if (!seasonValidator(series, callback)) {
        return null;
    } else if (!episodeValidator(series, callback)) {
        return null;
    } else if (!dateValidator(series, callback)) {
        return null;
    } else if (!siteValidator(series, callback)) {
        return null;
    }
    return series;
}


function changeAccept(event) {
    event.stopPropagation()
    let changeContainer = document.getElementById("change-container")

    let index = -1;
    for (let i = 0; i < cardList.length; i++) {
        if (cardList[i].contains(changeContainer)) {
            index = i;
            break;
        }
    }

    let series = changeSeriesValidator(getSeriesValuesFromChangeInput(), alert)
    if (series == null) {
        return;
    }

    seriesList[index].season = series.season;
    seriesList[index].episode = series.episode;
    seriesList[index].date = series.date;
    seriesList[index].site = series.site;

    database.transaction("series", "readwrite").objectStore("series").put(seriesList[index])
    cardList[index].innerHTML = createCard(seriesList[index]).innerHTML

    changeContainer.remove()
}