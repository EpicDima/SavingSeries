import Database from "./database";
import {AddingFullItem} from "./fullitem";
import * as constants from "./constants";
import HorizontalContainer from "./container";
import {getByQuery, getSeriesListType} from "./common";
import Backup from "./backup";
import Series from "./series";
import {Menu} from "./menu";
import LocalStorage from "./localStorage";


export default class App {

    static #instance;

    constructor() {
        this.database = Database.getInstance();
        this.containers = new Map();

        this.localStorage = new LocalStorage();
        this.backup = new Backup(this.database, () => this.onBackupLoad());

        Series.onItemClickListener = (id) => this.openFullitem(id);

        this.menu = new Menu(this);
        this.addingFullItem = new AddingFullItem((series) => this.relocateSeries(series), this.database);

        this.main = document.createElement("main");
        getByQuery("body").append(this.menu.getFragment(), this.main);

        this.onCreate();
    }


    static createApp() {
        if (!App.#instance) {
            App.#instance = new App();
        }
    }


    onCreate() {
        this.database.connect(() => this.initialize());
        this.setDayTimer();
        // Во сне компьютера таймер стоит, и полночь могла пройти без него
        document.addEventListener("visibilitychange", () => {
            if (!document.hidden) {
                this.relocateOutdatedSeries();
            }
        });
        document.addEventListener("languagechange", () => {
            this.updateContainerTitles();
            for (const container of this.containers.values()) {
                for (const series of container.map.values()) {
                    series.retranslate();
                }
            }
        });
    }


    initialize() {
        const fragment = new DocumentFragment();
        fragment.append(this.addingFullItem.getFragment());
        const listNames = constants.getListNames();
        for (const listType of Object.values(constants.LIST_TYPE)) {
            const container = new HorizontalContainer(listType, listNames.get(listType), this);
            this.containers.set(listType, container);
            fragment.append(container.getFragment());
        }
        this.main.append(fragment);
        this.loadSeries();
        window.i18n.applyTo(document.body);
    }


    refresh() {
        if (!this.database.checkAvailable()) {
            return;
        }
        this.menu.clear();
        for (const container of this.containers.values()) {
            container.clear();
        }
        this.addingFullItem.close();
        this.loadSeries();
    }


    // Новая загрузка (двойной клик по логотипу) отменяет ещё идущую, иначе карточки задвоятся
    loadSeries() {
        const load = Symbol();
        this.currentLoad = load;
        this.database.foreach((series) => {
            if (load === this.currentLoad) {
                this.initialSplitSeries(series);
            }
        }, () => {
            if (load === this.currentLoad) {
                this.onInitialSplitSeriesEnd();
            }
        });
        App.scrollToTop();
    }


    static scrollToTop() {
        window.scrollTo({top: 0, behavior: "smooth"});
    }


    onBackupLoad() {
        this.menu.clear();
        this.clearRuntime();
        this.localStorage.clear();
        this.initialize();
    }


    clearRuntime() {
        for (const container of this.containers.values()) {
            container.remove();
        }
        this.containers.clear();
    }


    setDayTimer() {
        const tomorrow = new Date();
        tomorrow.setHours(0, 0, 1);
        tomorrow.setDate(tomorrow.getDate() + 1);
        setTimeout(() => {
            this.relocateOutdatedSeries();
            this.setDayTimer();
        }, tomorrow - new Date());
    }


    relocateOutdatedSeries() {
        for (const container of this.containers.values()) {
            for (const series of [...container.map.values()]) {
                const listType = getSeriesListType(series);
                if (listType !== container.id) {
                    container.releaseSeries(series);
                    this.containers.get(listType).insertSeries(series);
                }
            }
        }
    }


    toggleAddingElement() {
        this.addingFullItem.toggle();
    }


    openFullitem(id) {
        for (const container of this.containers.values()) {
            if (container.showFullItemIfExists(id)) {
                return;
            }
        }
    }


    initialSplitSeries(record) {
        const series = Series.create(record);
        if (series) {
            this.containers.get(getSeriesListType(series)).simplyAddSeries(series);
        }
    }


    onInitialSplitSeriesEnd() {
        for (const container of this.containers.values()) {
            container.initialAdditionFinish();
        }
    }


    relocateSeries(series, listType = getSeriesListType(series)) {
        this.containers.get(listType).addSeries(series);
    }


    onSearchItemClick(id) {
        document.activeElement.blur();
        this.openFullitem(id);
    }


    updateContainerTitles() {
        const listNames = constants.getListNames();
        for (const [id, container] of this.containers.entries()) {
            container.updateTitle(listNames.get(id));
        }
    }
}
