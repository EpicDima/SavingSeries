import Series from "./series";
import {saveAs} from "file-saver";
import AlertDialog from "./alertDialog";
import Database from "./database";


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
        const metaRequest = this.database.getReadOnlyObjectStore(Database.SERIES_META_OBJECT_STORE_NAME).getAll();
        metaRequest.onsuccess = () => {
            const imagesRequest = this.database.getReadOnlyObjectStore(Database.SERIES_IMAGES_OBJECT_STORE_NAME).getAll();
            imagesRequest.onsuccess = () => {
                const series = metaRequest.result.map(meta => {
                    const image = imagesRequest.result.find(image => image.id === meta.id);
                    return {
                        ...meta,
                        image: image?.image
                    };
                });
                const blob = new Blob([JSON.stringify(series)], {type: "text/plain;charset=utf-8"});
                saveAs(blob, "SavingSeries.backup");
            };
        };
    }


    async loadBackup() {
        let dialog = new AlertDialog(window.i18n.t("backup_load_confirm"));
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
                    let metaObjectStore = this.database.getReadWriteObjectStore(Database.SERIES_META_OBJECT_STORE_NAME);
                    let imagesObjectStore = this.database.getReadWriteObjectStore(Database.SERIES_IMAGES_OBJECT_STORE_NAME);
                    for (let series of data) {
                        let temp = Series.validate(series);
                        if (temp) {
                            const {image, ...meta} = temp;
                            metaObjectStore.add(meta);
                            if (image) {
                                imagesObjectStore.add({id: meta.id, image: image});
                            }
                        }
                    }
                    this.initialize();
                    return;
                }
            } catch (e) {
            }
            alert(window.i18n.t("backup_file_corrupted"));
        };
        reader.readAsText(event.target.files[0]);
    }
}
