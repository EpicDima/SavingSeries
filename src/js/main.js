import "../css/style.css";
import App from "./app";
import {injectTemplates} from "./templates";

async function startApp() {
    await injectTemplates();
    App.createApp();
}

startApp()
    .then(_ => {
    });
