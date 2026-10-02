import templates from "../html/templates.html?raw";

export function injectTemplates() {
    const div = document.createElement("div");
    div.innerHTML = templates;
    document.body.append(...div.querySelectorAll("template"));
}
