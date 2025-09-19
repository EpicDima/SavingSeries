export function setValidator(input) {
    input.oninput = validate;
}

document.addEventListener("languagechange", function () {
    const errorElements = document.querySelectorAll(".error");
    errorElements.forEach(function (errorElement) {
        if (errorElement.innerText && errorElement.innerText.trim() !== "") {
            const inputContainer = errorElement.closest(".input");
            if (inputContainer) {
                const input = inputContainer.querySelector("input, select, textarea");
                if (input) {
                    const event = new Event("input", {bubbles: true});
                    input.dispatchEvent(event);
                }
            }
        }
    });
});

function validate(event) {
    const input = event.target;
    const parent = input.closest(".input");
    if (!parent) {
        return;
    }
    const inputLabel = input.closest(".fullitem-input-label");
    const error = parent.querySelector(".error");
    const validState = input.validity;
    inputLabel.classList.remove("invalid")
    error.innerText = "";
    if (validState.valid) {
        return;
    }
    inputLabel.classList.add("invalid")
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
