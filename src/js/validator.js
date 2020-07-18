import {addClass, removeClass} from "./common";


export function setValidator(input, error) {
    input.oninput = () => validate(input, error);
}


export function validate(input, error) {
    let validState = input.validity;
    if (validState.valid) {
        removeClass(input, "error");
        error.innerText = "";
        return;
    }
    if (validState.valueMissing) {
        error.innerText = "Это поле необходимо заполнить.";
    } else if (validState.typeMismatch) {
        if (input.type === "number") {
            error.innerText = "Пожалуйста, введите число.";
        } else if (input.type === "date") {
            error.innerText = "Пожалуйста, введите корректную дату.";
        } else if (input.type === "url") {
            error.innerText = "Пожалуйста, введите корректный URL.";
        } else {
            error.innerText = "Пожалуйста, введите правильное значение.";
        }
    } else if (validState.rangeUnderflow) {
        error.innerText = `Пожалуйста, введите число, большее или равное {0}.`.replace("{0}", input.min);
    } else if (validState.rangeOverflow) {
        error.innerText = `Пожалуйста, введите число, меньшее или равное {0}.`.replace("{0}", input.max);
    } else if (validState.tooLong) {
        error.innerText = `Пожалуйста, введите не более {0} символов.`.replace("{0}", input.maxLength);
    } else {
        error.innerText = "Пожалуйста, введите правильное значение.";
    }
    addClass(input, "error");
}
