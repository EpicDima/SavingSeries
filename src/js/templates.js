export async function injectTemplates() {
    try {
        const response = await fetch("/src/html/templates.html");
        const htmlContent = await response.text();
        const div = document.createElement("div");
        div.innerHTML = htmlContent;
        const templates = div.querySelectorAll("template");
        templates.forEach(template => {
            document.body.appendChild(template);
        });
    } catch (error) {
        console.error("Error injecting templates:", error);
    }
}
