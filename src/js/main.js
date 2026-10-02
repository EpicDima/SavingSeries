import "../css/style.css";
import App from "./app";
import {injectTemplates} from "./templates";
import {setUpKeyboardControls} from "./common";

injectTemplates();
setUpKeyboardControls();
App.createApp();
