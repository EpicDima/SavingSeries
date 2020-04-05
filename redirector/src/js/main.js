import "../css/style.scss";

const VERSION_KEY = "version";

init();


function init() {
    let number = localStorage.getItem(VERSION_KEY);
    if (number) {
        goToApp(number);
    }
}


window.choose = function(version) {
    saveInLocalStorage(version);
    goToApp(version);
};


function goToApp(version) {
    history.replaceState({}, "", `v${version}/`);
    location.reload();
}


function saveInLocalStorage(number) {
    if (document.getElementById("save").checked) {
        localStorage.setItem(VERSION_KEY, number);
    } else {
        localStorage.removeItem(VERSION_KEY);
    }
}