 socket = io.connect(`${window.origin}`);

function addGame(gameID,inputID) {

    let classID = document.getElementById(inputID).value;
    let classContainer = document.getElementById(classID);

    if (!classContainer) return -1;
    let classContentContainer = classContainer.querySelector(".class-content-container");

    let gameName = document.querySelector(`.${gameID}`).querySelector(".game-label").innerHTML.toUpperCase();
    let className = document.getElementById(classID).querySelector(".class-name").innerHTML;    
      
    let content =  {
        type:"add-game",
        GameID: gameID,
        ClassID: classID
    };

    let gameContainer = classContentContainer.querySelector(".game-row");

    if (gameContainer.querySelectorAll(`.${gameID}`).length){
        
        flashMessage(`${gameName} is already in ${className}`,"danger");

        return false;
    }
    else {
        fetch(`${window.origin}/games/my-games`,{
            method: "POST",
            body: JSON.stringify(content),
            headers: new Headers({"content-type" : "application/json"}),
        })
        .then((response) => response.json())
        .then(() =>{
            let sameGame = document.querySelector(`.${gameID}`).parentElement;

            let newGame = sameGame.cloneNode(true);
        
            let deleteBtn = document.createElement("button");
            deleteBtn.className = "play-button removeGameFromClassBtn";
        
            deleteBtn.onclick = ()=>(removeGame(`${gameID}`,`${classID}`));
            deleteBtn.innerHTML = "Remove From Class";
    
            let bottomRow = newGame.querySelector(".game-bottom-row");
            bottomRow.parentElement.removeChild(bottomRow)
    
            gameContainer.appendChild(newGame);
            newGame.querySelector(".game-container").appendChild(deleteBtn)
    
            flashMessage(`${gameName} was Successfully Added to ${className}`,"success");       
         })
        .catch(()=>{
            flashMessage("Something went wrong","danger")
        }); 
    };
};

function removeGame(gameID,classID) {

    let gameName = document.querySelector(`.${gameID}`).querySelector(".game-label").innerHTML.toUpperCase();
    let className = document.getElementById(classID).querySelector(".class-name").innerHTML;
     
    let content =  {
        type:"remove-game",
        GameID: gameID,
        ClassID: classID
    };

    fetch(`${window.origin}/games/my-games`,{
        method: "POST",
        body: JSON.stringify(content),
        headers: new Headers({"content-type" : "application/json"}),
    }) 
    .then((response) => response.json())
    .then(() =>{
        let classContainer = document.getElementById(classID)

        let gameContainer = classContainer.querySelector(".class-content-container")
            .querySelector(".game-row");
    
        let gameElement = gameContainer.querySelector(`.${gameID}`);
    
        let gameWrapper = gameElement.parentElement;
    
        gameWrapper.parentElement.removeChild(gameWrapper);
    
        flashMessage(`${gameName} was successfully removed From ${className}`,"success");
    })
    .catch(()=>{
        flashMessage("Something went wrong","danger")
    });
};

function deleteGame(gameID) {
    let gameName = document.querySelector(`.${gameID}`).querySelector(".game-label").innerHTML.toUpperCase()
     
    let content =  {
        type:"delete-game",
        GameID: gameID,
    };

    function temp() {
        fetch(`${window.origin}/games/my-games`,{
            method: "POST",
            body: JSON.stringify(content),
            headers: new Headers({"content-type" : "application/json"}),
        })
        .then((response) => response.json())
        .then(() =>{
            let gameElements = document.querySelectorAll(`.${gameID}`);

            gameElements.forEach(element => {
                gameWrapper = element.parentElement;
                gameWrapper.parentElement.removeChild(gameWrapper);
            });
            flashMessage(`${gameName} was successfully deleted`,"success");  
        })
        .catch(()=>{
            flashMessage("Something went wrong","danger")
        });
    };
    altConfirm(temp,"Are you sure you want to Delete this game ?");
};

function multiplayerGame(gameID,event) {

    let scopeToggler = event.target.parentElement.querySelector(".scope-toggle-btn");

    //Gets scope of game
    let scope = (scopeToggler.classList.contains("public")? "public":"private");

    var content =  {
        type: "multiplayer",
        GameID: gameID,
        Scope: scope
    };
    
    fetch(`${window.origin}/games/my-games`,{
        method: "POST",
        body: JSON.stringify(content),
        headers: new Headers({"content-type" : "application/json"}),
    })
    .then((response) => response.json())
    .then(() =>{
        location.replace(`${window.origin}/games/waiting-for-player`)
    })
    .catch(()=>{
        flashMessage("Something went wrong","danger")
    });
};

function singlePlayerGame(gameID) {

    var content =  {
        type: "singleplayer",
        GameID: gameID
    };

    fetch(`${window.origin}/games/my-games`,{
        method: "POST",
        body: JSON.stringify(content),
        headers: new Headers({"content-type" : "application/json"}),
    })
    .then((response) => response.json())
    .then(() =>{
        location.replace(`${window.origin}/games/choose-character`)
    })
    .catch(()=>{
        flashMessage("Something went wrong","danger")
    }); 
};

function editGame(gameId) {

    var content = {
      type: "edit-game",
      GameID: gameId
    }
    fetch(`${window.origin}/games/my-games`,{
      method: "POST",
      body: JSON.stringify(content),
      headers: new Headers({"content-type" : "application/json"}),
    });
    return true    
};

function toggleGameScope(e) {
    let target = e.target;

    if (target.tagName == "IMG") {
        target = target.parentElement;
    };

    //Toggles scope and changes content of togglers info box
    let scopeToggler = target.parentElement.querySelector(".scope-toggle-btn");
    scopeToggler.classList.toggle("public");
    let parent = target.parentElement;
    let infoBox = parent.querySelector(".info-box");

    if (scopeToggler.classList.contains("public")) {
        target.firstElementChild.src = document.getElementById("globe-icon").src;
        infoBox.innerHTML = "Currently Public Game";
    }
    else{
        target.firstElementChild.src = document.getElementById("lock-icon").src;
        infoBox.innerHTML = "Currently Private Game";
    };  
};