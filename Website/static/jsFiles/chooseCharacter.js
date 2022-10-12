let socket = io.connect(`${window.origin}`);

let roomID;
let player;

const choiceTable = document.querySelector(".road-option-container");
let chosenElement = document.getElementById("1");
let playerSprite = "1";
chosenElement.classList.add("chosen");

function joinRoom(roomID) {
    socket.emit("join", JSON.stringify({ room: roomID }))
};

//Highlights and chanages character choice
function selectCharacter(event) {
    let value = event.target.id
    if (value) {
        chosenElement.classList.remove("chosen");
        chosenElement = event.target;
        playerSprite = value;
    };
    chosenElement.classList.add("chosen");
};

//Sends charcater choice to server
function confirmCharacter(event) {
    let content = {
        num: player,
        sprite: playerSprite
    };

    let parent = event.target.parentNode;
    parent.removeChild(event.target);
    choiceTable.removeEventListener("mousedown", selectCharacter);
    parent.innerHTML = "Waiting for Player....";
    socket.emit("character-selected", JSON.stringify(content));
};

choiceTable.addEventListener("mousedown", selectCharacter);

socket.on("character-selected", function() {

    flashMessage("Game Starting........", "info")

    let mode = document.getElementById("mode").innerHTML;
    setTimeout(() => {
        location.replace(`${window.origin}/games/${mode}-game`);

    }, 800);
});

//This listnener kicks cliebt from room if idle
socket.on("idleRoom", function() {

    flashMessage("This Room will be terminated for inactivity in 5 seconds.....", "info")

    setTimeout(() => {

        location.replace(`${window.origin}/games/my-games`)

    }, 5000);

});
