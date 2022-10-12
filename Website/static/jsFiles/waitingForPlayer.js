var socket = io.connect(`${window.origin}`);

function joinRoom(roomID) {
    socket.emit("join", JSON.stringify({ room: roomID }))
};

socket.on("joinedRoom", function(data) {
    data = JSON.parse(data);

    const half2 = document.getElementById("half2")
    half2.innerHTML = data.name

    setTimeout(() => {
        location.replace(`${window.origin}/games/choose-character`)
    }, 2000);

});

socket.on("idleRoom", function() {
    flashMessage("This Room will be terminated for inactivity in 5 seconds.....", "info")
    setTimeout(() => {
        location.replace(`${window.origin}/games/my-games`)
    }, 5000);

});