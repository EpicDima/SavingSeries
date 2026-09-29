import Series from "./series";
import AlertDialog from "./alertDialog";
import Database from "./database";
import {isImage} from "./common";

// Когда скачивание прочитало blob, браузер не сообщает, а при «Спрашивать, куда сохранять» это бывает
// после закрытия диалога. Отзываем URL с запасом, как file-saver: держать память лишние секунды дёшево.
const REVOKE_BACKUP_URL_DELAY_MS = 40_000;

export default class Backup {
    constructor(database, onLoad) {
        this.database = database;
        this.onLoad = onLoad;
    }


    getCreateBackupFunction() {
        return () => setTimeout(() => this.createBackup(), 0);
    }


    getLoadBackupFunction() {
        return () => setTimeout(() => this.loadBackup(), 0);
    }


    createBackup() {
        if (!this.database.checkAvailable()) {
            return;
        }
        const metaRequest = this.database.getReadOnlyObjectStore(Database.SERIES_META_OBJECT_STORE_NAME).getAll();
        metaRequest.onsuccess = () => {
            const imagesRequest = this.database.getReadOnlyObjectStore(Database.SERIES_IMAGES_OBJECT_STORE_NAME).getAll();
            imagesRequest.onsuccess = () => {
                const series = metaRequest.result;
                const images = imagesRequest.result;
                const backup = series.map(meta => {
                    const image = images.find(image => image.id === meta.id);
                    return {...meta, ...(isImage(image?.image) && {image: image.image})};
                });

                const blob = new Blob([JSON.stringify(backup)], {type: "text/plain;charset=utf-8"});
                const link = document.createElement("a");
                link.href = URL.createObjectURL(blob);
                link.download = "SavingSeries.backup";
                link.click();
                setTimeout(() => URL.revokeObjectURL(link.href), REVOKE_BACKUP_URL_DELAY_MS);
            };
        };
    }


    async loadBackup() {
        if (!this.database.checkAvailable()) {
            return;
        }
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
        reader.onload = async () => {
            let records = [];
            try {
                let data = JSON.parse("" + reader.result);
                if (Array.isArray(data)) { // V1
                    records = data.map(series => Series.validate(series)).filter(Boolean);
                }
            } catch (e) {
                alert(window.i18n.t("backup_file_corrupted"));
                return;
            }
            try {
                await this.database.replaceAllSeries(records);
            } catch (error) {
                alert(window.i18n.t("backup_load_failed", {error: error.message}));
                return;
            }
            this.onLoad();
        };
        reader.readAsText(event.target.files[0]);
    }
}
