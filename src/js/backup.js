import Series from "./series";
import Dialog from "./dialog";
import {saveAs} from "file-saver";


export default class Backup {
    constructor(database, clear, initialize) {
        this.database = database;
        this.clear = clear;
        this.initialize = initialize;
    }


    getCreateBackupFunction() {
        return () => setTimeout(() => this.createBackup(), 0);
    }


    getLoadBackupFunction() {
        return () => setTimeout(() => this.loadBackup(), 0);
    }


    createBackup() {
        let request = this.database.getReadOnlyObjectStore().getAll();
        request.onsuccess = () => {
            const blob = new Blob([JSON.stringify(request.result)], {type: "text/plain;charset=utf-8"});
            saveAs(blob, "SavingSeries.backup")
        };
    }


    async loadBackup() {
        let dialog = new Dialog("Все имеющиеся данные будут очищены и заменены на новые");
        let result = await dialog.open();
        if (result) {
            let element = document.createElement("input");
            element.type = "file";
            element.onchange = (e) => this.onOpenFile(e);
            element.click();
        }
    }


    onOpenFile(event) {
        let reader = new FileReader();
        reader.onload = () => {
            try {
                let data = JSON.parse("" + reader.result);
                if (Array.isArray(data)) {
                    this.clear();
                    let counterId = 0;
                    let objectStore = this.database.getReadWriteObjectStore();
                    for (let series of data) {
                        let temp = Series.validate(series);
                        if (temp) {
                            temp.id = counterId++;
                            objectStore.add(temp);
                        }
                    }
                    this.initialize();
                    return;
                }
            } catch (e) {
            }
            alert("Содержимое файла повреждено!");
        };
        reader.readAsText(event.target.files[0]);
    }
}
