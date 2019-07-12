function plusClick() {
    //document.getElementById("sort-types").style.display = "none"
    //let element = document.getElementById("add-container")
    //element.style.display = (element.style.display == "block") ? "none" : "block"

    
    let div = document.createElement("div")
    div.style.height = "70px"
    div.style.margin = "5px"
    div.style.background = "gold"
    document.getElementById("content-container").appendChild(div)
    div.scrollIntoView()
}


function sortClick() {
    document.getElementById("add-container").style.display = "none"
    let element = document.getElementById("sort-types")
    element.style.display = (element.style.display == "block") ? "none" : "block"
}
