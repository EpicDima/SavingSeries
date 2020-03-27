import Database from "./database";
import {AddingFullItem} from "./fullitem";
import * as constants from "./constants";
import HorizontalContainer from "./container";
import {getByQuery, getSeriesListType, resize} from "./common";
import Backup from "./backup";
import Series from "./series";
import {Menu} from "./menu";
import LocalStorage from "./localStorage";


export default class App {

    static #instance;

    constructor() {
        resize();

        this.database = Database.getInstance();
        this.containers = new Map();

        this.localStorage = new LocalStorage();
        this.backup = new Backup(this.database, () => this.clearAll(), () => this.initialize());

        Series.onItemClickListener = (id) => this.openFullitem(id);
        window.onresize = resize;

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
    }


    initialize() {
        let inner = [this.addingFullItem.getFragment()];
        for (let i in constants.LIST_TYPE) {
            let k = constants.LIST_TYPE[i];
            let container = new HorizontalContainer(k, constants.LIST_NAMES.get(k), this);
            this.containers.set(k, container);
            inner.push(container.getFragment());
        }
        this.main.append(...inner);
        this.database.foreach((series) => this.initialSplitSeries(series),
            (id) => this.onInitialSplitSeriesEnd(id));
        this.scrollToTop();
    }


    refresh() {
        this.menu.clear();
        for (let container of this.containers.values()) {
            container.clear();
        }
        this.database.foreach((series) => this.initialSplitSeries(series),
            (id) => this.onInitialSplitSeriesEnd(id));
        this.scrollToTop();
    }


    scrollToTop() {
        window.scrollTo({top: 0, behavior: 'smooth'});
    }


    clearAll() {
        this.clearRuntime();
        localStorage.clear();
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
}
