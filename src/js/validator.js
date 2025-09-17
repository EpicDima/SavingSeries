export function setValidator(input, error) {
    input.oninput = () => validate(input, error);
}

export function validate(event) {
    const input = event.target;
    let parent = input;
    while (parent.tagName !== "LABEL") {
        parent = parent.parentElement;
    }
    const error = parent.querySelector(".error-message");
    const validState = input.validity;
    input.classList.remove("invalid")
    error.innerText = "";
    if (validState.valid) {
        return;
    }
    input.classList.add("invalid")
    if (validState.valueMissing) {
        error.innerText = window.i18n.t("validation_field_required");
    } else if (validState.typeMismatch) {
        if (input.type === "number") {
            error.innerText = window.i18n.t("validation_enter_number");
        } else if (input.type === "date") {
            error.innerText = window.i18n.t("validation_enter_valid_date");
        } else if (input.type === "url") {
            error.innerText = window.i18n.t("validation_enter_valid_url");
        } else {
            error.innerText = window.i18n.t("validation_enter_valid_value");
        }
    } else if (validState.rangeUnderflow) {
        error.innerText = window.i18n.t("validation_number_greater_or_equal", {value: input.min});
    } else if (validState.rangeOverflow) {
        error.innerText = window.i18n.t("validation_number_less_or_equal", {value: input.max});
    } else if (validState.tooLong) {
        error.innerText = window.i18n.t("validation_max_length", {value: input.maxLength});
    } else {
        error.innerText = window.i18n.t("validation_enter_valid_value");
    }
}

