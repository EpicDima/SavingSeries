function createBackup() {
    let element = document.createElement("a");
    element.href = "data:text/plain;charset=utf-8,%EF%BB%BF" + encodeURIComponent(JSON.stringify(Array.from(seriesList.values())));
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
            counterId = 0;
            let request = database.transaction("series", "readwrite").objectStore("series");
            for (let series of data) {
                series.id = counterId++;
                if (series.date !== "") {
                    series.date = new Date(series.date);
                }
                request.add(series);
                seriesList.set(series.id, series);
            }
            currentSortType = null;
            sortSeries(getSortType());
            updateCardListWarning();
        }
    };
    reader.readAsText(event.target.files[0]);
}