export async function injectTemplates() {
    try {
        const templatesUrl = new URL('../html/templates.html', import.meta.url).href;
        const response = await fetch(templatesUrl);
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
