export const DATABASE_NAME = "SavingSeries";
export const OBJECT_STORE_NAME = "series";

// RUN - выходит и смотрится
// PAUSE - выходит, но на паузе, то есть временно не смотрится
// COMPLETED - просмотрен
// JUST_WATCH - вышел ранее, только смотрится
export const STATUS = {RUN: 0, PAUSE: 1, COMPLETED: 2, JUST_WATCH: 3};
export const STATUS_STRING = new Map();
STATUS_STRING.set(STATUS.RUN, "Выходит");
STATUS_STRING.set(STATUS.PAUSE, "На паузе");
STATUS_STRING.set(STATUS.COMPLETED, "Просмотрен");
STATUS_STRING.set(STATUS.JUST_WATCH, "Просматривается, но уже вышел");

export function getStatusOptionsHtml() {
    let s = "";
    for (const i in STATUS) {
        s += `<option value="${STATUS[i]}">${STATUS_STRING.get(STATUS[i])}</option>`;
    }
    return s;
}


// первый список - вышедшие сегодня и ранее
// второй список - просматривающиеся, но вышедшие давно
// третий список - выходящие в ближайшие 7 дней
// четвёртый список - с датой остальные
// пятый список - без даты
// шестой список - на паузе
// седьмой список - просмотренные
export const LIST_TYPE = {
    RELEASED: 0,
    RELEASED_LONG_AGO: 1,
    RELEASED_NEXT_7_DAYS: 2,
    WITH_DATE_OTHERS: 3,
    WITHOUT_DATE: 4,
    ON_PAUSE: 5,
    COMPLETED: 6
};

export const LIST_NAMES = new Map();
LIST_NAMES.set(LIST_TYPE.RELEASED, "Вышедшие");
LIST_NAMES.set(LIST_TYPE.RELEASED_LONG_AGO, "Просматривающиеся");
LIST_NAMES.set(LIST_TYPE.RELEASED_NEXT_7_DAYS, "Выходящие в ближайшие 7 дней");
LIST_NAMES.set(LIST_TYPE.WITH_DATE_OTHERS, "Остальные");
LIST_NAMES.set(LIST_TYPE.WITHOUT_DATE, "Без даты");
LIST_NAMES.set(LIST_TYPE.ON_PAUSE, "На паузе");
LIST_NAMES.set(LIST_TYPE.COMPLETED, "Завершённые");