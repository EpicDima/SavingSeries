const errorMessages = new WeakMap();

export function setValidator(input) {
    input.oninput = () => validate(input);
}

export function resetValidation(root) {
    root.querySelectorAll(".fullitem-input-label.invalid").forEach(label => label.classList.remove("invalid"));
    root.querySelectorAll(".invalid-tooltip > .error").forEach(error => {
        errorMessages.delete(error);
        error.textContent = "";
    });
}

document.addEventListener("languagechange", () => {
    document.querySelectorAll(".invalid-tooltip > .error").forEach(showErrorMessage);
});

export function validate(input) {
    setError(input, getErrorMessage(input));
}

export function setError(input, message = null) {
    const error = input.closest(".input").querySelector(".error");
    input.closest(".fullitem-input-label").classList.toggle("invalid", message !== null);
    errorMessages.set(error, message);
    showErrorMessage(error);
}

function showErrorMessage(error) {
    const message = errorMessages.get(error);
    error.textContent = message ? window.i18n.t(message.key, message.params) : "";
}

function getErrorMessage(input) {
    const validState = input.validity;
    if (validState.valid) {
        return null;
    }
    // Раньше valueMissing: неразобранный ввод браузер считает пустым
    if (validState.badInput) {
        return {key: input.type === "date" ? "validation_enter_valid_date" : "validation_enter_number"};
    }
    if (validState.valueMissing || validState.patternMismatch && !input.value.trim()) {
        return {key: "validation_field_required"};
    }
    if (validState.typeMismatch || validState.patternMismatch) {
        return {key: input.type === "url" ? "validation_enter_valid_url" : "validation_enter_valid_value"};
    }
    if (validState.stepMismatch) {
        return {key: "validation_enter_whole_number"};
    }
    if (validState.rangeUnderflow) {
        return {key: "validation_number_greater_or_equal", params: {value: input.min}};
    }
    if (validState.rangeOverflow) {
        return {key: "validation_number_less_or_equal", params: {value: input.max}};
    }
    if (validState.tooLong) {
        return {key: "validation_max_length", params: {value: input.maxLength}};
    }
    return {key: "validation_enter_valid_value"};
}
