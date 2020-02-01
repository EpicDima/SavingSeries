var indexedDB = window.indexedDB;

function findImageAndSave(element) {
    let reader = new FileReader();
    reader.onloadend = function(event) {
        saveImage(event.target.result)
    }
    reader.readAsDataURL(element.files[0]); // конвертирует Blob в base64 и вызывает onload
}

// Create/open database
var request = indexedDB.open("SavingSeries", 1),
    db,
    createObjectStore = function (dataBase) {
        // Create an objectStore
        console.log("Creating objectStore")
        dataBase.createObjectStore("images");
    };

function continuation(blob) {
    // Open a transaction to the database
    var transaction = db.transaction(["images"], 'readwrite');
    var put = transaction.objectStore("images").put(blob, "image");

    // Retrieve the file that was just stored
    transaction.objectStore("images").get("image").onsuccess = function (event) {
        console.log("Got elephant! " );
        // Create and revoke ObjectURL


        // Set img src to ObjectURL
        var imgElephant = document.getElementById("img1");
        imgElephant.setAttribute("src", event.target.result);

    };
}

request.onerror = function (event) {
    console.log("Error creating/accessing IndexedDB database");
}

request.onsuccess = function (event) {
    console.log("Success creating/accessing IndexedDB database");
    db = request.result;

    db.onerror = function (event) {
        console.log("Error creating/accessing IndexedDB database");
    };
    
    // Interim solution for Google Chrome to create an objectStore. Will be deprecated
    if (db.setVersion) {
        if (db.version != dbVersion) {
            var setVersion = db.setVersion(dbVersion);
            setVersion.onsuccess = function () {
                createObjectStore(db);
            };
        }
    }
}

// For future use. Currently only in latest Firefox versions
request.onupgradeneeded = function (event) {
    createObjectStore(event.target.result);
};