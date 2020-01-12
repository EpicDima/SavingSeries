const SORT_TYPES = {ID_UP:      0, ID_DOWN:      1,
                    NAME_UP:    2, NAME_DOWN:    3,
                    SEASON_UP:  4, SEASON_DOWN:  5,
                    EPISODE_UP: 6, EPISODE_DOWN: 7,
                    DATE_UP:    8, DATE_DOWN:    9};
const SORT_TYPE_KEY = "sort_type";

var database;
var counterId = 0;
var seriesList = [];
var cardList = [];
var currentSortType;

const search = document.getElementById("search");

connectDB(initialize);


function connectDB(func) {
    let request = indexedDB.open("SavingSeriesDb", 1);
    request.onerror = error => {
        console.log("connectDB error: " + error);
    }
    request.onsuccess = () => {
        func(request.result);
    }
    request.onupgradeneeded = event => {
        if (confirm("Данные будут храниться на вашем компьютере.\nВы согласны?")) {
            event.currentTarget.result.createObjectStore("series", {keyPath: "id"});
            connectDB(func);
        } else {
            indexedDB.deleteDatabase("SavingSeriesDb");
            document.getElementsByTagName("html")[0].remove();
        }
    }
}


function getSortType() {
    let sortType = localStorage.getItem(SORT_TYPE_KEY);
    if (sortType === null) {
        sortType = SORT_TYPES.ID_UP;
    } else {
        sortType = parseInt(sortType);
    }
    return sortType;
}

function scrollToTop() {
    window.scrollTo({top: 0, behavior: 'smooth'});
}


function initialize(db) {
    database = db;
    let request = database.transaction("series", "readonly").objectStore("series").getAll();
    request.onerror = event => {
        console.log("initialize error: " + event.target.error);
    }
    request.onsuccess = event => {
        scrollToTop();
        seriesList = event.target.result;
        if (seriesList.length > 0) {
            counterId = seriesList[seriesList.length - 1].id + 1;
        }
        sortSeries(getSortType());
    }
}


function createBackup() {
    let element = document.createElement("a");
    element.href = "data:text/plain;charset=utf-8,%EF%BB%BF" + encodeURIComponent(JSON.stringify(seriesList));
    element.download = "backup.bin";
    element.style.display = "none";
    document.body.appendChild(element);
    element.click();
    element.remove();
}


function loadBackup() {
    if (confirm("Все имеющиеся данные будут очищены и заменены на новые. Вы согласны?")) {
        let element = document.createElement("input");
        element.type = "file";
        element.style.display = "none";
        element.onchange = onOpenFile;
        document.body.appendChild(element);
        element.click();
        element.remove();
    }
}


function clearAll() {
    database.transaction("series", "readwrite").objectStore("series").clear();
    seriesList = [];
    cardList.forEach(card => {
        card.remove();
    })
    cardList = [];
    localStorage.removeItem(SORT_TYPE_KEY);
}


function onOpenFile(event) {
    let reader = new FileReader();
    reader.onloadend = event => {
        let data;
        try {
            data = JSON.parse(event.target.result);
        } catch (SyntaxError) {
            data = null;
        }
        if (!(data instanceof Array)) {
            alert("Содержимое файла повреждено!");
        } else {
            clearAll();
            seriesList = data;
            counterId = 0;
            let request = database.transaction("series", "readwrite").objectStore("series");
            for (let series of seriesList) {
                series.id = counterId++;
                if (series.date !== "") {
                    series.date = new Date(series.date);
                }
                request.add(series);
            }
            currentSortType = null;
            sortSeries(getSortType());
        }
    };
    reader.readAsText(event.target.files[0]);
}


function collapseAllContainers() {
    $(".show.collapse").collapse("hide");
}


function clearAddInputs() {
    let form = document.forms["add"];
    form.name.value = "";
    form.season.value = "1";
    form.episode.value = "1";
    form.date.value = "";
    form.site.value = "";
}


function nameExists() {
    let nameInput = document.forms["add"].name;
    let name = nameInput.value.trim();
    if (name.length === 0) {
        nameInput.value = "";
        return;
    }
    for (let i = 0; i < seriesList.length; i++) {
        if (name === seriesList[i].name) {
            nameInput.setCustomValidity("Пожалуйста, введите уникальное название.");
            return;
        }
    }
    nameInput.setCustomValidity("");
}


function addSeriesToList(series) {
    let card = createCard(series);
    cardList.push(card);
    document.getElementById("content").appendChild(card);
}


function siteToShortLink(site) {
    let link = "";
    if (site.length > 0) {
        let a = document.createElement("a");
        a.href = site;
        if (a.host.length > 0) {
            link = a.host;
        }
    }
    return link;
}


function dateToLocaleString(date) {
    return date === "" ? "" : date.toLocaleDateString("ru", {year: "numeric", month: "long", day: "numeric"});
}


function createLinkElement(site) {
    return `<a href="${site}" target="_blank" onclick="event.stopPropagation();">${siteToShortLink(site)}</a>`;
}


function createCard(series) {
    let card = document.createElement("div");
    card.className = "card";
    card.id = "card" + series.id;
    let linkElement = createLinkElement(series.site);
    card.innerHTML = `<div data-toggle="collapse" href="#change${series.id}" aria-expanded="false" aria-controls="change${series.id}" onclick="updateCardChangeContainer(${series.id})"><div class="card-header row"><h4 class="col">${series.name}</h4> <button type="button" class="close col-1" onclick="event.stopPropagation(); deleteSeries(${series.id})"><span>&times;</span></button></div><div class="card-body"><div class="row"><div class="col">Сезон</div><div class="col">Серия</div><div class="col" id="dateTitle${series.id}">${series.date === "" ? "" : "Дата"}</div><div class="col" id="siteTitle${series.id}">${series.site.length === 0 ? "" : "Сайт"}</div></div><div class="row"><div class="col" id="season${series.id}">${series.season}</div><div class="col" id="episode${series.id}">${series.episode}</div><div class="col" id="date${series.id}">${dateToLocaleString(series.date)}</div><div class="col" id="site${series.id}">${linkElement}</div></div></div></div><div class="collapse" id="change${series.id}" onclick="event.stopPropagation();"><br/><form name="changeForm${series.id}" onsubmit="return false;"><div class="form-group row"><label class="col col-form-label text-left ml-3">Сезон</label><div class="col mr-3"><input class="form-control" name="season" type="number" value="1" min="1" max="50" required/></div></div><div class="form-group row"><label class="col col-form-label text-left ml-3">Серия</label><div class="col mr-3"><input class="form-control" name="episode" type="number" value="1" min="1" max="50000" required/></div></div><div class="form-group row"><label class="col col-form-label text-left ml-3">Дата</label><div class="col mr-3"><input class="form-control" name="date" type="date" optional/></div></div><div class="form-group row"><label class="col col-form-label text-left ml-3">Сайт</label><div class="col mr-3"><input class="form-control" name="site" type="url" optional/></div></div><div class="form-group row justify-content-center"><button type="submit" class="btn btn-primary col-sm-5" onclick="changeSeries(${series.id})">Подтвердить</button></div></form></div>`;
    return card;
}


function updateCardChangeContainer(id) {
    if (document.getElementById("change" + id).classList.contains("show")) {
        return;
    }
    let form = document.forms["changeForm" + id];
    let series = seriesList.find(item => item.id === id);
    form.season.value = series.season;
    form.episode.value = series.episode;
    form.date.value = series.date === "" ? "" : series.date.toISOString().split("T")[0];
    form.site.value = series.site;
}


function addSeries() {
    let form = document.forms["add"];
    nameExists();
    if (form.checkValidity()) {
        $("#addModal").modal("hide");
        let series = {id: counterId++,
                      name: form.name.value.trim(),
                      season: form.season.value,
                      episode: form.episode.value,
                      date: form.date.value === "" ? "" : new Date(form.date.value),
                      site: form.site.value.trim()};

        let request = database.transaction("series", "readwrite").objectStore("series").add(series)
        request.onerror = event => {
            console.log("Что-то пошло не так!\n addSeries: " + event.target.error);
        }
        request.onsuccess = () => {
            seriesList.push(series);
            forcelySortSeries();
            let index = -1;
            seriesList.find((item, idx) => {
                index = idx;
                return item.id === series.id;
            });
            cardList[index].scrollIntoView({block: "center"});
        }
    }
}


function collapseChangeContainerById(id) {
    $("#change" + id).collapse("hide");
}


function changeSeries(id) {
    let form = document.forms["changeForm" + id];
    if (form.checkValidity()) {
        let series = seriesList.find(item => item.id === id);

        let noChanges = 0;
        let needToSort = false;

        if (series.season == form.season.value) {
            noChanges++;
        } else {
            needToSort = currentSortType === SORT_TYPES.SEASON_DOWN || currentSortType === SORT_TYPES.SEASON_UP || needToSort;
        }

        if (series.episode == form.episode.value) {
            noChanges++;
        } else {
            needToSort = currentSortType === SORT_TYPES.EPISODE_DOWN || currentSortType === SORT_TYPES.EPISODE_UP || needToSort;
        }

        if ((series.date === "" && form.date.value === "") || (series.date.toString() === new Date(form.date.value).toString())) {
            noChanges++;
        } else {
            needToSort = currentSortType === SORT_TYPES.DATE_DOWN || currentSortType === SORT_TYPES.DATE_UP || needToSort;
        }

        if (series.site === form.site.value) {
            noChanges++;
        }

        if (noChanges === 4) {
            collapseChangeContainerById(id);
            return;
        }

        series.season = form.season.value;
        series.episode = form.episode.value;
        if (form.date.value === "") {
            series.date = "";
        } else {
            series.date = new Date(form.date.value);
        }
        series.site = form.site.value;

        let request = database.transaction("series", "readwrite").objectStore("series").put(series);
        request.onerror = event => {
            console.log("Что-то пошло не так!\n changeSeries: " + event.target.error);
        };
        request.onsuccess = () => {
            document.getElementById("season" + series.id).innerHTML = series.season;
            document.getElementById("episode" + series.id).innerHTML = series.episode;

            let date = dateToLocaleString(series.date);
            document.getElementById("dateTitle" + series.id).innerHTML = date.length === 0 ? "" : "Дата";
            document.getElementById("date" + series.id).innerHTML = date;

            document.getElementById("siteTitle" + series.id).innerHTML = series.site.length === 0 ? "" : "Сайт";
            document.getElementById("site" + series.id).innerHTML = series.site.length === 0 ? "" : createLinkElement(series.site);

            collapseChangeContainerById(id);
            if (needToSort) {
                forcelySortSeries();
            }
        };
    }
}


function deleteSeries(id) {
    let index = -1;
    let series = seriesList.find((item, idx) => {
        index = idx;
        return item.id === id;
    });
    if (confirm(`Вы действительно хотите удалить "${series.name}"?`)) {
        let request = database.transaction("series", "readwrite").objectStore("series").delete(id);
        request.onerror = event => {
            console.log("Что-то пошло не так!\n deleteSeries: " + event.target.error);
        };
        request.onsuccess = () => {
            seriesList.splice(index, 1);
            cardList[index].remove();
            cardList.splice(index, 1);
        };
    }
}


function searchSeries() {
    let substr = search.value.trim().toLowerCase();
    if (substr.length === 0) {
        cardList.forEach(card => {
            card.style.display = "block";
        });
        return;
    }
    for (let i = 0; i < seriesList.length; i++) {
        if (seriesList[i].name.toLowerCase().search(substr) !== -1) {
            cardList[i].style.display = "block";
        } else {
            cardList[i].style.display = "none";
        }
    }
}


function updateSortType() {
    let elements = document.getElementsByClassName("sort-type");
    for (let i = 0; i < elements.length; i++) {
        elements[i].classList.remove("active");
    }
    elements[Math.floor(currentSortType / 2)].classList.add("active");
    document.getElementById("reverseSort").checked = currentSortType % 2 === 1;
}


function saveSortType() {
    let sortType;
    let elements = document.getElementsByClassName("sort-type");
    for (let i = 0; i < elements.length; i++) {
        if (elements[i].classList.contains("active")) {
            sortType = i * 2;
            break;
        }
    }
    sortType += document.getElementById("reverseSort").checked;
    sortSeries(sortType);
}


function sortCardList() {
    cardList.forEach(card => {
        card.remove();
    });
    cardList = [];
    seriesList.forEach(series => {
        addSeriesToList(series);
    })
}


function dateSort(predicate) {
    seriesList.sort((prev, next) => {
        if (prev.date === "") {
            return 1;
        } else if (next.date === "") {
            return -1;
        } else {
            return predicate(prev, next)
        }
    });
}


function sortSeries(sortType) {
    if (currentSortType !== sortType) {
        currentSortType = sortType;
        localStorage.setItem(SORT_TYPE_KEY, currentSortType);
        forcelySortSeries();
    }
    $("#sortModal").modal("hide");
}


function forcelySortSeries() {
    search.value = "";
    switch (currentSortType) {
        case SORT_TYPES.ID_UP:
            seriesList.sort((prev, next) => prev.id - next.id);
            break;
        case SORT_TYPES.ID_DOWN:
            seriesList.sort((prev, next) => next.id - prev.id);
            break
        case SORT_TYPES.NAME_UP:
            seriesList.sort((prev, next) => (prev.name < next.name) ? -1 : 1);
            break
        case SORT_TYPES.NAME_DOWN:
            seriesList.sort((prev, next) => (prev.name > next.name) ? -1 : 1);
            break;
        case SORT_TYPES.SEASON_UP:
            seriesList.sort((prev, next) => prev.season - next.season);
            break
        case SORT_TYPES.SEASON_DOWN:
            seriesList.sort((prev, next) => next.season - prev.season);
            break;
        case SORT_TYPES.EPISODE_UP:
            seriesList.sort((prev, next) => prev.episode - next.episode);
            break
        case SORT_TYPES.EPISODE_DOWN:
            seriesList.sort((prev, next) => next.episode - prev.episode);
            break;
        case SORT_TYPES.DATE_UP:
            dateSort((prev, next) => (prev.date < next.date) ? -1 : 1);
            break
        case SORT_TYPES.DATE_DOWN:
            dateSort((prev, next) => (prev.date > next.date) ? -1 : 1);
            break;
        default: 
            console.log("Неизвестный тип сортировки: " + sortType);
            break;
    }
    sortCardList();
}