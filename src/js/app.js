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

    database;

    static #instance;

    constructor() {
        this.database = Database.getInstance();
        this.containers = new Map();

        this.localStorage = new LocalStorage();
        this.backup = new Backup(this.database, () => this.clearAll(), () => this.initialize());

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
        for (const k of Object.values(constants.LIST_TYPE)) {
            const container = new HorizontalContainer(k, constants.getListNames().get(k), this);
            this.containers.set(k, container);
            fragment.append(container.getFragment());
        }
        this.main.append(fragment);
        this.database.foreach((series) => this.initialSplitSeries(series),
            (id) => this.onInitialSplitSeriesEnd(id));
        App.scrollToTop();
        window.i18n.applyTo(document.body);
    }


    refresh() {
        this.menu.clear();
        for (let container of this.containers.values()) {
            container.clear();
        }
        this.addingFullItem.close();
        this.database.foreach((series) => this.initialSplitSeries(series),
            (id) => this.onInitialSplitSeriesEnd(id));
        App.scrollToTop();
    }


    static scrollToTop() {
        window.scrollTo({top: 0, behavior: "smooth"});
    }


    clearAll() {
        this.clearRuntime();
        this.localStorage.clear();
        this.database.clear();
    }


    clearRuntime() {
        this.addingFullItem.remove();
        for (let container of this.containers.values()) {
            container.remove();
        }
        this.containers.clear();
    }


    setDayTimer() {
        let tomorrow = new Date();
        tomorrow.setHours(0, 0, 1);
        tomorrow.setDate(tomorrow.getDate() + 1);
        setTimeout(() => {
            this.clearRuntime();
            this.initialize();
            this.setDayTimer();
        }, tomorrow - new Date());
    }


    openAddingElement() {
        this.addingFullItem.open();
    }


    openFullitem(id) {
        for (let container of this.containers.values()) {
            if (container.showFullItemIfExists(id)) {
                return;
            }
        }
    }


    initialSplitSeries(series) {
        series = Series.create(series);
        this.containers.get(getSeriesListType(series)).simplyAddSeries(series);
    }


    onInitialSplitSeriesEnd(id) {
        this.addingFullItem.setSeriesId(id + 1);
        for (let container of this.containers.values()) {
            container.initialAdditionFinish();
        }
    }


    relocateSeries(series, listType = null) {
        if (!listType) {
            listType = getSeriesListType(series);
        }
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
