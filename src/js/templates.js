import templates from "../html/templates.html?raw";

export function injectTemplates() {
    const div = document.createElement("div");
    div.innerHTML = templates;
    div.querySelectorAll("template").forEach(template => {
        document.body.appendChild(template);
    });
}
