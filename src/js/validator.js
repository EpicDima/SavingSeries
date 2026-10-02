export function setValidator(input) {
    input.oninput = () => validate(input);
}

export function resetValidation(root) {
    root.querySelectorAll(".fullitem-input-label.invalid").forEach(label => label.classList.remove("invalid"));
    root.querySelectorAll(".invalid-tooltip > .error").forEach(error => error.textContent = "");
}

document.addEventListener("languagechange", () => {
    document.querySelectorAll(".fullitem-input-label.invalid > .fullitem-input").forEach(input => input.oninput?.());
});

export function validate(input) {
    const inputLabel = input.closest(".fullitem-input-label");
    const error = input.closest(".input").querySelector(".error");
    const validState = input.validity;
    inputLabel.classList.remove("invalid");
    error.textContent = "";
    if (validState.valid) {
        return;
    }
    inputLabel.classList.add("invalid");
    if (validState.valueMissing || validState.patternMismatch && !input.value.trim()) {
        error.textContent = window.i18n.t("validation_field_required");
    } else if (validState.typeMismatch || validState.patternMismatch) {
        if (input.type === "number") {
            error.textContent = window.i18n.t("validation_enter_number");
        } else if (input.type === "date") {
            error.textContent = window.i18n.t("validation_enter_valid_date");
        } else if (input.type === "url") {
            error.textContent = window.i18n.t("validation_enter_valid_url");
        } else {
            error.textContent = window.i18n.t("validation_enter_valid_value");
        }
    } else if (validState.rangeUnderflow) {
        error.textContent = window.i18n.t("validation_number_greater_or_equal", {value: input.min});
    } else if (validState.rangeOverflow) {
        error.textContent = window.i18n.t("validation_number_less_or_equal", {value: input.max});
    } else if (validState.tooLong) {
        error.textContent = window.i18n.t("validation_max_length", {value: input.maxLength});
    } else {
        error.textContent = window.i18n.t("validation_enter_valid_value");
    }
}
