// RUN - выходит и смотрится
// PAUSE - выходит, но на паузе, то есть временно не смотрится
// COMPLETED - просмотрен
// JUST_WATCH - вышел ранее, только смотрится
export const STATUS = {RUN: "0", PAUSE: "1", COMPLETED: "2", JUST_WATCH: "3"};

export function getStatusOptions() {
    return [
        {value: STATUS.RUN, text: window.i18n.t("status_run")},
        {value: STATUS.PAUSE, text: window.i18n.t("status_pause")},
        {value: STATUS.COMPLETED, text: window.i18n.t("status_completed")},
        {value: STATUS.JUST_WATCH, text: window.i18n.t("status_just_watch")}
    ];
}


// первый список - вышедшие сегодня и ранее
// второй список - просматривающиеся, но вышедшие давно
// третий список - выходящие в ближайшие 7 дней
// четвёртый список - с датой остальные
// пятый список - без даты
// шестой список - на паузе
// седьмой список - просмотренные
export const LIST_TYPE = {
    RELEASED: 1,
    RELEASED_LONG_AGO: 2,
    RELEASED_NEXT_7_DAYS: 3,
    WITH_DATE_OTHERS: 4,
    WITHOUT_DATE: 5,
    ON_PAUSE: 6,
    COMPLETED: 7
};

export function getListNames() {
    const LIST_NAMES = new Map();
    LIST_NAMES.set(LIST_TYPE.RELEASED, window.i18n.t("list_name_released"));
    LIST_NAMES.set(LIST_TYPE.RELEASED_LONG_AGO, window.i18n.t("list_name_released_long_ago"));
    LIST_NAMES.set(LIST_TYPE.RELEASED_NEXT_7_DAYS, window.i18n.t("list_name_released_next_7_days"));
    LIST_NAMES.set(LIST_TYPE.WITH_DATE_OTHERS, window.i18n.t("list_name_with_date_others"));
    LIST_NAMES.set(LIST_TYPE.WITHOUT_DATE, window.i18n.t("list_name_without_date"));
    LIST_NAMES.set(LIST_TYPE.ON_PAUSE, window.i18n.t("list_name_on_pause"));
    LIST_NAMES.set(LIST_TYPE.COMPLETED, window.i18n.t("list_name_completed"));
    return LIST_NAMES;
}
