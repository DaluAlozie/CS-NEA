let socket = io.connect(`${window.origin}`);

function joinPrivateGame() {
    const ID = `${document.getElementById("roomID").value.trim()}`;
    socket.emit("joinPrivateRoom",JSON.stringify({roomID:ID}))
};

function joinPublicGame() {
    socket.emit("joinPublicRoom")
};

const loadingInterval = setInterval(() => {
    
}, 1000);


socket.on("joinedRoom",function () {

    flashMessage("Joining Game........","info")
    setTimeout(() => {
        location.replace(`${window.origin}/games/choose-character`)
    }, 2000);
});

socket.on("noGame",function () {

    flashMessage("No Game Found","danger")
});
