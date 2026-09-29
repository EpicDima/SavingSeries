import Series from "./series";
import AlertDialog from "./alertDialog";
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


    async createBackup() {
        if (!this.database.checkAvailable()) {
            return;
        }
        let series;
        try {
            series = await this.database.getAllSeries();
        } catch (error) {
            alert(window.i18n.t("backup_create_failed", {error: error.message}));
            return;
        }
        const backup = series.map(({image, ...meta}) => ({...meta, ...(isImage(image) && {image})}));

        const blob = new Blob([JSON.stringify(backup)], {type: "text/plain;charset=utf-8"});
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "SavingSeries.backup";
        link.click();
        setTimeout(() => URL.revokeObjectURL(link.href), REVOKE_BACKUP_URL_DELAY_MS);
    }


    async loadBackup() {
        if (!this.database.checkAvailable()) {
            return;
        }
        const dialog = new AlertDialog(window.i18n.t("backup_load_confirm"));
        if (await dialog.open()) {
            const input = document.createElement("input");
            input.type = "file";
            input.onchange = () => this.loadBackupFile(input.files[0]);
            input.click();
        }
    }


    async loadBackupFile(file) {
        let records;
        try {
            records = Backup.readRecords(JSON.parse(await file.text()));
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
    }


    // Невалидные записи отбрасываются, но файл совсем без годных записей — не backup
    static readRecords(data) {
        if (!Array.isArray(data)) { // V1
            throw new TypeError("Not a backup");
        }
        const records = data.map(series => Series.validate(series)).filter(Boolean);
        if (data.length > 0 && records.length === 0) {
            throw new TypeError("No valid series");
        }
        // id из файла могут повторяться или быть не числами, а новый id — последний + 1
        return records.map((record, index) => ({...record, id: index + 1}));
    }
}
