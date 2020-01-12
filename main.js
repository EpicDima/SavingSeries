// Основные переменные
var counter = 0       // счётчик для установки id
var seriesList = []   // список объектов сериалов
var cardList = []     // список элементов div

// Виды сортировок
const SORT_TYPES = {ID_UP: 1, ID_DOWN: 2,
                    NAME_UP: 3, NAME_DOWN: 4,
                    SEASON_UP: 5, SEASON_DOWN: 6,
                    EPISODE_UP: 7, EPISODE_DOWN: 8,
                    DATE_UP: 9, DATE_DOWN: 10}

// Текущий используемый вид сортировки
var currentSortType = SORT_TYPES.ID_UP


// База данных Indexed DB
var database;

// Элемент для хранения карточек серий
const contentContainer = document.getElementById("content")

// Поисковая строка
const search = document.getElementById("search")



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
        if (confirm("Данные будут храниться на вашем компьютере.\nВы согласны?")) {
            event.currentTarget.result.createObjectStore("series", {keyPath: "id"});
            connectDB(func);
        } else {
            indexedDB.deleteDatabase("SavingSeriesDb");
            document.getElementsByTagName("html")[0].remove()
        }
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

    search.value = ""
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



function addNew() {
    let series = addSeriesValidator(getSeriesValuesFromInput(), showAddError)
    if (series == null) {
        return;
    }
    series.id = counter++;

    seriesList.push(series)
    
    addSeriesToList(series)

    database.transaction("series", "readwrite").objectStore("series").add(series).onerror = function(event) {
        alert("Что-то пошло не так!\naddNew: " + event.target.error);
    }
    backgroundAddContainer.style.display = "none"
    resetAddInputs()
    cardList[cardList.length - 1].scrollIntoView()
    currentSortType = SORT_TYPES.NONE
}


function addSeriesToList(series) {
    let card = document.createElement("div");
    card.className = "card";
    card.id = "id" + series.id;
    card.innerHTML = createCard(series);
    cardList.push(card)
    contentContainer.appendChild(card)
}

function createCard(series)
{
    let link = "";
    if (series.site !== "") {
        let a = document.createElement("a");
        a.href = series.site;
        if (a.host !== "") {
            link = a.host;
        }
    }
    
    return `<div data-toggle="collapse" href="#change${series.id}" aria-expanded="false" aria-controls="change${series.id}"><div class="card-header row"><h4 class="col">${series.name}</h4> <button type="button" class="close col-1" onclick="event.stopPropagation(); deleteSeries(${series.id})"><span>&times;</span></button></div><div class="card-body"><div class="row"><div class="col">Сезон</div><div class="col">Серия</div><div class="col">${series.date === "" ? "" : "Дата"}</div><div class="col">${series.site === "" ? "" : "Сайт"}</div></div><div class="row"><div class="col">${series.season}</div><div class="col">${series.episode}</div><div class="col">${series.date !== "" ? series.date.toLocaleDateString("ru", {year: "numeric", month: "long", day: "numeric"}) : ""}</div><div class="col"><a href="${series.site}" target="_blank" onclick="event.stopPropagation();">${link}</a></div></div></div></div><div class="collapse" id="change${series.id}" onclick="event.stopPropagation();"><br/><form name="changeForm${series.id}"><div class="form-group row"><label class="col col-form-label text-left ml-3">Сезон</label><div class="col mr-3"><input class="form-control" id="inputSeason" name="season" value="${series.season}" type="number" value="1" min="1" max="50" required/></div></div><div class="form-group row"><label class="col col-form-label text-left ml-3">Серия</label><div class="col mr-3"><input class="form-control" id="inputEpisode" name="episode" value="${series.episode}" type="number" value="1" min="1" max="50000" required/></div></div><div class="form-group row"><label class="col col-form-label text-left ml-3">Дата</label><div class="col mr-3"><input class="form-control" id="inputDate" name="date" type="date" value="${series.date === "" ? "" : new Date(series.date).toISOString().split("T")[0]}" optional/></div></div><div class="form-group row"><label class="col col-form-label text-left ml-3">Сайт</label><div class="col mr-3"><input class="form-control" id="inputSite" name="site" type="url" value="${series.site}" optional/></div></div><div class="form-group row justify-content-center"><button type="submit" class="btn btn-primary col-sm-5" onclick="changeSeries(${series.id})">Подтвердить</button></div></form></div>`;
}


function searchSeries() {
    let substr = search.value.trim().toLowerCase()
    if (substr.length == 0) {
        cardList.forEach(card => {
            card.style.display = "block"
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


function dateSort(predicate) {
    seriesList.sort((prev, next) => {
        if (prev.date == "") {
            return 1;
        } else if (next.date == "") {
            return -1;
        } else {
            return predicate(prev, next)
        }
    });
}


function sortSeries(sortType) {
    if (currentSortType == sortType) {
        return;
    }
    switch (sortType) {
        case 1: // по названию
            seriesList.sort((prev, next) => (prev.name < next.name) ? -1 : 1);
            currentSortType = SORT_TYPES.NAME_UP
            break;
        case 2:
            seriesList.sort((prev, next) => (next.name < prev.name) ? -1 : 1);
            currentSortType = SORT_TYPES.NAME_DOWN
            break
        case 3: // по номеру сезона
            seriesList.sort((prev, next) => next.season - prev.season);
            currentSortType = SORT_TYPES.SEASON_UP
            break
        case 4:
            seriesList.sort((prev, next) => prev.season - next.season);
            currentSortType = SORT_TYPES.SEASON_DOWN
            break;
        case 5: // по номеру серии
            seriesList.sort((prev, next) => prev.episode - next.episode);
            currentSortType = SORT_TYPES.EPISODE_UP
            break
        case 6:
            seriesList.sort((prev, next) => next.episode - prev.episode);
            currentSortType = SORT_TYPES.EPISODE_DOWN
            break;
        case 7: // по дате
            dateSort((prev, next) => prev.date - next.date)
            currentSortType = SORT_TYPES.DATE_UP
            break
        case 8:
            dateSort((prev, next) => next.date - prev.date)
            currentSortType = SORT_TYPES.DATE_DOWN
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
    currentSortType = SORT_TYPES.NONE
}