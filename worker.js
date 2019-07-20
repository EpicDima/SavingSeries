if ('serviceWorker' in navigator) {
    // Регистрация service worker-а, расположенного в корне сайта
    // за счет использования дефолтного scope (не указывая его)
    navigator.serviceWorker.register('worker.js').then(function(registration) {
        console.log('Service worker зарегистрирован:', registration);
    }).catch(function(error) {
        console.log('Ошибка при регистрации service worker-а:', error);
    });
} else {
    // Текущий браузер не поддерживает service worker-ы.
    console.log('Текущий браузер не поддерживает service worker-ы');
}