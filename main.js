// Основные переменные
var counter = 0      // счётчик для установки id
var seriesList = []  // список объектов сериалов
var divList = []     // список элементов div
var activeList = []  // список активных элементов div

// Режим страницы - без режима, удаление, изменение
const Mode = {NONE: 0, REMOVING: 1, CHANGING: 2} 
var currentMode = Mode.NONE


// Цвета карточек
const defaultDivColor = "yellow";
const hoverDivColor = "blue";
const onUpDivColor = "red";


// Основные элементы пользовательского интерфейса
// Кнопки
const addButton = document.getElementById("addButton")
const removeButton = document.getElementById("removeButton")
const changeButton = document.getElementById("changeButton")

const okButton = document.getElementById("okButton")
const cancelButton = document.getElementById("cancelButton")

const createBackupButton = document.getElementById("createBackupButton")
const openBackupButton = document.getElementById("openBackupButton")

// Элемент со списком серий
const seriesListDiv = document.getElementById("seriesListDiv")

// Поля ввода
const nameInput = document.getElementById("nameInput")
const seasonNumberInput = document.getElementById("seasonNumberInput")
const serialNumberInput = document.getElementById("serialNumberInput")
const siteInput = document.getElementById("siteInput")
const nextReleaseDateInput = document.getElementById("nextReleaseDateInput")
const completedInput = document.getElementById("completedInput")

// База данных Indexed DB
var database;



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
            addSeriesToListDiv(series)
        });
    }
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

function openBackup() {
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
            seriesList.sort((prev, next) => prev.id - next.id);
            counter = seriesList[seriesList.length - 1].id + 1
            seriesList.forEach(series => {
                addSeriesToListDiv(series)
                database.transaction("series", "readwrite").objectStore("series").add(series).onerror = function(event) {
                    alert("Что-то пошло не так!\nonOpenFile: " + event.target.error);
                }
            });
        }
    };
    reader.readAsText(event.target.files[0]);
}

/*
function openImage() {
    let file = document.getElementById("imageInput").files[0]
    let series = {id: counter++,
        name: nameInput.value,
        number: serialNumberInput.value,
        image: file}
    database.transaction("series", "readwrite").objectStore("series").add(series).onerror = function(event) {
            alert("Что-то пошло не так!\naddNew: " + event.target.error);
    }
}
*/

function clearAll() {
    database.transaction("series", "readwrite").objectStore("series").clear()
    seriesList = []
    divList.forEach(div => {
        div.remove()
    })
    divList = []
    activeList = []   
}

function addNew() {
    console.log("addNew")

    let series = {id: counter++,
                  name: nameInput.value,
                  seasonNumber: seasonNumberInput.value,
                  serialNumber: serialNumberInput.value,
                  site: siteInput.value,
                  nextDate: nextReleaseDateInput.value,
                  completed: completedInput.checked}

    seriesList.push(series)
    
    addSeriesToListDiv(series)

    database.transaction("series", "readwrite").objectStore("series").add(series).onerror = function(event) {
        alert("Что-то пошло не так!\naddNew: " + event.target.error);
    }
}

function createSeries() {
    
}


function siteChecker(site) {
    if (site == null || site == "") {
        return "";
    } else if (site.startsWith("http://") || site.startsWith("https://")) {
        return site;
    } else {
        return "http://" + site;
    }
}


function addSeriesToListDiv(series) {
    let div = createDiv(series)
    divList.push(div)
    seriesListDiv.appendChild(div)
}


function createDiv(series)
{
    let div = document.createElement("div")
    div.style.width = "300px";
    div.style.height = "100px";
    div.style.background = defaultDivColor

    divInner(div, series)
    
    div.onmouseout = divOnMouseOut
    div.onmouseover = divOnMouseOver

    return div
}


function divInner(div, series) {
    let inner = "<b>" + series.name + "</b>"
    if (series.completed) {
        inner += "</br>Сериал завершён"
    } else {
        inner += "</br>Сезон: " + series.seasonNumber
        inner += "</br>Серия: " + series.serialNumber
        inner += "</br>Дата выхода следующей серии: " + series.nextDate + "</br>"
        inner += "Ссылка: <a href=" + siteChecker(series.site) + ">" + series.site + "</a>"
    }
    div.innerHTML = inner
}

function divOnMouseOut() {
    if (!activeList.includes(this)) {
        this.style.backgroundColor = defaultDivColor;
    }
}


function divOnMouseOver() {
    if (!activeList.includes(this)) {
        this.style.backgroundColor = hoverDivColor;
    }
}


function divOnMouseUp() {
    index = activeList.indexOf(this)
    if (index == -1) {
        if (currentMode == Mode.CHANGING) {
            if (activeList != 0) {
                activeList[0].style.backgroundColor = defaultDivColor;
                activeList.pop()
            }
        }
        activeList.push(this)
        this.style.backgroundColor = onUpDivColor;
    } else {
        activeList[index].style.backgroundColor = defaultDivColor;
        activeList.splice(index, 1)
    }
}

function beforeRemove() {
    console.log("before remove")

    if (currentMode == Mode.REMOVING) {
        cancelRemove()
        return
    } else if (currentMode == Mode.CHANGING) {
        return;
    }
    currentMode = Mode.REMOVING

    divList.forEach(div => {
        div.onmouseup = divOnMouseUp
    });

    okButton.onclick = remove
    cancelButton.onclick = cancelRemove
}

function cancelRemove() {
    console.log("cancel remove")

    divList.forEach(div => {
        div.onmouseup = null
        div.style.backgroundColor = defaultDivColor
    });

        
    activeList = []

    currentMode = Mode.NONE

    okButton.onclick = null
    cancelButton.onclick = null
}

function remove() {
    console.log("remove")

    activeList.forEach(div => {
        let index = divList.indexOf(div)
        database.transaction("series", "readwrite").objectStore("series").delete(seriesList[index].id)
        seriesList.splice(index, 1)
        divList.splice(index, 1)
        div.remove()
    });

    cancelRemove()
}


function beforeChange() {
    console.log("before change")

    if (currentMode == Mode.CHANGING) {
        cancelChange()
        return
    } else if (currentMode == Mode.REMOVING) {
        return;
    }

    currentMode = Mode.CHANGING

    divList.forEach(div => {
        div.onmouseup = divOnMouseUp
    });

    okButton.onclick = change
    cancelButton.onclick = cancelChange
}


function cancelChange() {
    console.log("cancel change")

    divList.forEach(div => {
        div.onmouseup = null
        div.style.backgroundColor = defaultDivColor
    });

        
    activeList = []

    currentMode = Mode.NONE

    okButton.onclick = null
    cancelButton.onclick = null
}


function change() {
    console.log("change")

    activeList.forEach(div => {
        let index = divList.indexOf(div)
        seriesList[index].name = nameInput.value
        seriesList[index].number = serialNumberInput.value
        seriesList[index].site = siteInput.value
        seriesList[index].nextDate = nextReleaseDateInput.value
        database.transaction("series", "readwrite").objectStore("series").put(seriesList[index])
        divInner(divList[index], seriesList[index])
    });

    cancelChange()
}