let socket = io.connect(`${window.origin}`);
//Creates a scoket connection with the server

//This 
let selectedIcon = {
    type: "",
    source: ""
};

let chosenElement = document.getElementById("tempElement");
//This will hold the element of the chosen character

chosenElement.classList.add("chosen");
//Highlights default selected brush

//The name of the brush images
const roadSource = "black-square.png";
const houseSource = "map-grid-house.png";

//This will be the drawing canvas 
const table = document.getElementById("game-map");
table.className = "game-map-grid";

//This the 2d array that will homld the map
let map_grid = [];

//The
let previousTarget = "";

//The mode the page is opened in, edit or create
const mode = document.getElementById("mode").innerHTML;

//Holds a dictionary of superscript characters 
const superscripts = {
    "48": "⁰",
    "49": "¹",
    "50": "²",
    "51": "³",
    "52": "⁴",
    "53": "⁵",
    "54": "⁶",
    "55": "⁷",
    "56": "⁸",
    "57": "⁹",
    "45": "⁻",
    "43": "⁺",
    "40": "⁽",
    "41": "⁾"
};

//Holds a dictionary of subscript characters 
const subscripts = {
    "48": "₀",
    "49": "₁",
    "50": "₂",
    "51": "₃",
    "52": "₄",
    "53": "₅",
    "54": "₆",
    "55": "₇",
    "56": "₈",
    "57": "₉",
    "45": "₋",
    "43": "₊",
    "40": "₍",
    "41": "₎"
};

//This creates emty cells in the 2d array
function createGrid() {
    for (let i = 0; i < 23; i++) {

        var row = document.createElement("tr");
        row.className = "map-grid-row"

        table.appendChild(row)
        map_grid.push([])


        for (let j = 0; j < 38; j++) {
            var data = document.createElement("td");

            data.className = "grid-cell"

            row.appendChild(data)
            map_grid[i].push(0)

        };
    };
};
createGrid();

//Sets the top eight corner of the canvas to a road
function setFirstRoad() {
    var first_row = table.children[0];
    var first_element = first_row.children[0];
    var image = document.createElement("img");

    image.src = document.getElementById("Road").src;

    image.className = "map-icon";
    image.id = "permanantImage"

    first_element.appendChild(image);
    first_element.id = "permanant1"
};
setFirstRoad();

//The brush choice comtainer
const mapChoice = document.querySelector(".road-option-container");

//Adds event to select brush
mapChoice.addEventListener("mousedown", function selectIcon(event) {

    selectedIcon.type = event.target.getAttribute("iconType");
    selectedIcon.source = event.target.src;

    if (event.target.getAttribute("iconType")) {
        chosenElement.classList.remove("chosen");
        chosenElement = event.target.parentNode;
        chosenElement.classList.add("chosen");

    };
});

//Adds listner that allows brush to be dragged across canvas
table.addEventListener("mousedown", function addDragEvent(event) {
    addIcon(event)
    table.addEventListener("mouseover", addIcon);

    table.addEventListener("mouseup", function removeDragListener() { table.removeEventListener("mouseover", addIcon) })
});

//Adds or removes image from selected cell
function addIcon(event) {
    event.preventDefault()

    event.stopPropagation()

    switch (selectedIcon.type) {

        case "image":

            if (event.target.tagName == "TD" && !event.target.hasChildNodes()) {

                var image = document.createElement("img");

                image.src = selectedIcon.source;

                image.className = "map-icon"

                event.target.appendChild(image)
            };
            break;

        case "eraser":

            var parent = event.target.parentNode;

            if (event.target.tagName = "IMG" && parent.tagName == "TD") {

                if (!(event.target.id == "permanantImage")) parent.removeChild(parent.firstChild);
            }
            break;
    }
};

//Converts map canvas to 2d array
function getMap() {

    for (let i = 0; i < table.children.length; i++) {

        var currentChild = table.children[i]

        for (let j = 0; j < currentChild.children.length; j++) {
            map_grid[i][j] = 0
            if (currentChild.children[j].firstChild) {

                if (currentChild.children[j].firstChild.src.includes(houseSource)) map_grid[i][j] = 1;

                else if (currentChild.children[j].firstChild.src.includes(roadSource)) map_grid[i][j] = 2;
            };
        };
    };
};

function saveGame() {

    let questionError = false;
    let titleError = false;

    const questionAnswers = saveQuestions();

    getMap();

    let questionForm = document.getElementById("questions");
    var errorElement = questionForm.querySelector(".text-danger");

    if (questionAnswers.length <= 1) {

        errorElement.innerHTML = "Not enough questions";
        questionError = true;
    } else {
        errorElement.innerHTML = "";
    };

    var duration = parseInt(document.getElementById("duration").value);

    var speed = parseInt(document.getElementById("speed").value);

    var gameTitle = document.getElementById("gameTitle").value;

    if (mode == "Create") {
        var content = {
            type: "create-game",
            name: strip(gameTitle), //removes any html syntax
            map: map_grid,
            questions: questionAnswers,
            duration: duration,
            speed: speed
        };
    } else {
        var gameID = document.getElementById("GameID").innerHTML;
        var content = {
            type: "edit-game",
            name: strip(gameTitle),
            map: map_grid,
            questions: questionAnswers,
            duration: duration,
            speed: speed,
            GameID: gameID
        };
    };

    let gameVariableForm = document.getElementById("game-variables");
    var errorElement = gameVariableForm.querySelector(".text-danger");

    //Displays errors if there are any
    if (!content.name.replace(/\s+/g, '')) {
        errorElement.innerHTML = "Invalid Title";
        titleError = true;
    } else errorElement.innerHTML = "";

    // sends game to server 
    if (!(titleError || questionError)) {
        if (mode == "Create") {
            fetch(`${window.origin}/games/create-game`, {
                    method: "POST",
                    credentials: "include",
                    body: JSON.stringify(content),
                    cache: "no-cache",
                    headers: new Headers({ "content-type": "application/json" }),
                })
                .then((response) => response.json())
                .then(() => {
                    document.getElementById("gameTitle").value = "";
                    flashMessage("Game Saved", "success");
                })
                .catch(() => {
                    flashMessage("Something went wrong", "danger")
                });
        } else {
            fetch(`${window.origin}/games/edit-game`, {
                    method: "POST",
                    credentials: "include",
                    body: JSON.stringify(content),
                    cache: "no-cache",
                    headers: new Headers({ "content-type": "application/json" }),
                })
                .then((response) => response.json())
                .then(() => {
                    flashMessage("Game Updated", "success");
                })
                .catch(() => {
                    flashMessage("Something went wrong", "danger")
                });
        };
    } else return false;
};

function saveQuestions() {
    let container = document.querySelector(".question-container");

    let questionAnswers = [];
    for (let i = 0; i < container.children.length; i++) {
        var child = container.children[i];

        var questionValue = child.querySelector(".question").value;
        var answerValue = child.querySelector(".answer").value;

        if (questionValue && answerValue) {

            questionAnswers.push({
                question: questionValue.trim(),
                answer: answerValue.trim()

            });
        };
    };
    return questionAnswers;
};

function removeQuestion(event) {
    let parent = event.target.parentNode;
    let grandParent = parent.parentNode;

    grandParent.removeChild(parent);
};

function loadGame(name, map, questions, duration, speed) {

    let titleContainer = document.getElementById("gameTitle");
    let durationContainer = document.getElementById("duration");
    let speedContainer = document.getElementById("speed");

    titleContainer.value = name;
    durationContainer.value = duration;
    speedContainer.value = speed;

    loadQuestions(questions);
    loadMap(map);
};

function loadMap(map) {
    map_grid = map;

    var houseImg = document.getElementById("House").src;
    var roadImg = document.getElementById("Road").src;

    for (let i = 0; i < table.children.length; i++) {

        var currentChild = table.children[i]

        for (let j = 0; j < currentChild.children.length; j++) {

            if (!(i == 0 && j == 0)) {
                switch (map[i][j]) {
                    case 1:
                        var image = document.createElement("img");



                        image.src = houseImg;

                        image.className = "map-icon"

                        currentChild.children[j].appendChild(image)


                        break;

                    case 2:
                        var image = document.createElement("img");

                        image.src = roadImg;

                        image.className = "map-icon"

                        currentChild.children[j].appendChild(image)

                        break;
                };
            };
        };
    };



};

function loadQuestions(questions) {
    var container = document.querySelector(".question-container");
    container.innerHTML = "";

    questions.forEach(obj => {
        addQuestion(obj.question, obj.answer)

    });

};

function toggleScript(event) {
    var toggler = event.target
    var state = parseInt(toggler.getAttribute("state"));

    state = (state + 1) % 3;

    toggler.setAttribute("state", `${state}`);
    switch (state) {
        case 0:

            toggler.innerHTML = "Sub";
            break;

        case 1:

            toggler.innerHTML = "Sup"
            break;

        case 2:

            toggler.innerHTML = "off"
            break;
    }
};

function addQuestion(question, answer) {
    var container = document.querySelector(".question-container");

    var row = document.createElement("div");
    container.appendChild(row);

    row.classList.add("row");
    row.classList.add("form-group");

    var removeButton = document.createElement("button");
    removeButton.type = "button";
    row.appendChild(removeButton);
    removeButton.classList.add("form-control");
    removeButton.classList.add("form-submit");
    removeButton.style.width = "50px";
    removeButton.style.height = "50px";
    removeButton.style.marginTop = "25px";
    removeButton.innerHTML += "-";
    removeButton.onclick = removeQuestion;

    var column1 = document.createElement("div");
    row.appendChild(column1);

    column1.classList.add("col");
    column1.classList.add("form-group");

    var questionLabel = document.createElement("label");
    questionLabel.innerHTML += "Question"
    column1.appendChild(questionLabel);

    var questionInput = document.createElement("input");
    column1.appendChild(questionInput);
    questionInput.type = "text";
    questionInput.minLength = 3;
    questionInput.classList.add("form-control");
    questionInput.classList.add("question");
    questionInput.value = question;

    var column2 = document.createElement("div");
    row.appendChild(column2);

    column2.classList.add("col");
    column2.classList.add("form-group");

    var answerLabel = document.createElement("label");
    answerLabel.innerHTML += "Answer"
    column2.appendChild(answerLabel);

    var answerInput = document.createElement("input");
    column2.appendChild(answerInput);
    answerInput.type = "text";
    answerInput.minLength = 1;

    answerInput.classList.add("form-control");
    answerInput.classList.add("answer");

    answerInput.value = answer;
};

window.onkeypress = function changeInput(event) {

    var toggler = document.getElementById("scriptToggler");

    var state = parseInt(toggler.getAttribute("state"));

    var startPos = event.target.selectionEnd;

    if (superscripts[`${event.keyCode}`] && state != 2) {

        event.preventDefault();

        var valueToInput = `${event.keyCode - 48}`;

        var position = `${event.keyCode}`;

        switch (state) {

            case 0:
                var valueToInput = subscripts[position];
                break;

            case 1:
                var valueToInput = superscripts[position];
                break;
        };
        inputIntoTextbox(valueToInput, event.target, startPos)
    };
};

function inputIntoTextbox(value, input_box, startPos) {

    var text_content = input_box.value.split("");

    text_content.splice(startPos, 0, value);

    input_box.value = text_content.join("");

    input_box.selectionEnd = startPos + value.length;

    input_box.focus();
};

function previewGame(e) {
    e.preventDefault()
    let speed = parseInt(document.getElementById("speed").value);

    getMap();
    let questionAnswers = saveQuestions();
    let content = {
        type: "preview-game",
        map: map_grid,
        speed: speed,
        questionAnswers: questionAnswers
    };

    fetch(`${window.origin}/games/create-game`, {
            method: "POST",
            credentials: "include",
            body: JSON.stringify(content),
            cache: "no-cache",
            headers: new Headers({ "content-type": "application/json" }),
        })
        .then((response) => response.json())
        .then(() => {
            window.open(e.target.href, '_blank');
        })
        .catch(() => {
            flashMessage("Something went wrong", "danger")
        });
};

if (mode == "Edit") {
    let content = {
        type: "get-game-variables",
    };
    fetch(`${window.origin}/games/edit-game`, {
            method: "POST",
            credentials: "include",
            body: JSON.stringify(content),
            cache: "no-cache",
            headers: new Headers({ "content-type": "application/json" }),
        })
        .then((response) => response.json())
        .then((data) => {
            loadGame(data.name, data.map, data.questions, data.duration, data.speed);
        })
        .catch(() => {
            flashMessage("Something went wrong", "danger")
        });
};