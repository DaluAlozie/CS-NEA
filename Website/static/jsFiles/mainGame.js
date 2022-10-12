const socket = io.connect(`${window.origin}`);

//Dimensions of canvas grid 
const gridWidth  = 6390;
const gridHeight  = 3950;

//Dimensinons of canvas element 
const canvas_width = 5700;
const canvas_height = 3000;

//Dimensions of sprites
const cellWidth = 52;
const cellHeight = 72;

//The coordinates the map will start on the canvas grid
const gridStartX = 95;
const gridStartY = 150;


//Styles for question and answer displays
const fill_color = "#ff8f8f";
const border_color = "#ff0000";
const text_color = "#000000";

//Road and house sprite images
const characterSpritesheet = document.getElementById("characterSprites"); 
const roadSpritesheet = document.getElementById("roadSprites");
const houseSpritesheet = document.getElementById("houseSprites");

const junctionUp = document.getElementById("junction-up");
const junctionDown = document.getElementById("junction-down");
const junctionRight = document.getElementById("junction-right");
const junctionleft = document.getElementById("junction-left");

//Backround music
const gameAudio = {
    1: document.getElementById("audio1"),
    2: document.getElementById("audio2"),
    3: document.getElementById("audio3"),
    4: document.getElementById("audio4"),
    5: document.getElementById("audio5"),
    6: document.getElementById("audio6"),
    7: document.getElementById("audio7"),
    8: document.getElementById("audio8"),
    9: document.getElementById("audio9"),
    10: document.getElementById("audio10"),
    11: document.getElementById("audio11"),
    12: document.getElementById("audio12"),
    13: document.getElementById("audio13"),
    14: document.getElementById("audio14"),
    15: document.getElementById("audio15"),
    16: document.getElementById("audio16"),
    17: document.getElementById("audio17"),
    18: document.getElementById("audio18"),
    19: document.getElementById("audio19"),
};

//Sets audio and audio volume

const gameMusicVolume = 0.3;
const scoreVolume = 0.4;
const wrongAnswerVolume = 0.4;
const footstepVolume = 0.9;

for (const [key, value] of Object.entries(gameAudio)) {
    value.volume = gameMusicVolume;
};

const scoreAudio = document.getElementById("score");
scoreAudio.volume = scoreVolume;

const wrongAudio = document.getElementById("wrong");
wrongAudio.volume = wrongAnswerVolume;

const footstepAudio = document.getElementById("footstep");
footstepAudio.volume = footstepVolume;
footstepAudio.playbackRate = 15/8.9;

const frameRate = 5;

//Canvas element
const canvas = document.getElementById("canvas");

//The are of the map visible to the player
const canvas_container = document.querySelector(".visible-map");

const game_screen = document.querySelector(".game-display");

//Gets dimensions of the visbile area on the map
const visible_width = parseInt( window.getComputedStyle(canvas_container).getPropertyValue("width") );
const visible_height = parseInt( window.getComputedStyle(canvas_container).getPropertyValue("height") );

//Gets the dimaensions of canvas element
const canvas_style_width = parseInt( window.getComputedStyle(canvas).getPropertyValue("width") );
const canvas_style_height = parseInt( window.getComputedStyle(canvas).getPropertyValue("height") );

const context = canvas.getContext("2d");

//The keys that will do something in the game
const gameKeys = ["a","w","s","d","ArrowUp","ArrowDown","ArrowLeft","ArrowRight"];

//sets canvas grid dimensions
canvas.width = gridWidth;
canvas.height = gridHeight;


let player1;
let player2;
let game;
let gameVariables;
let waitingForPlayer;

//Thsi will be used to prevent key spam
let keylock = false;

//Checks whether a backgroud song has been chosen
let audioChosen = false;

//Mute button
const mute = document.getElementById("mute");
const unmute = document.getElementById("unmute");

socket.on("message",function (data) {
    data = JSON.parse(data);
    flashMessage(data.message,data.category)
});

socket.on("idleRoom",function () {

    flashMessage("This Room will be terminated for inactivity in 5 seconds.....","info")

    setTimeout(() => {
        
        location.replace(`${window.origin}/games/my-games`)

    }, 5000);
    
});

function joinRoom(roomID) {

    socket.emit("join",JSON.stringify({room:roomID}));   
};

//Sets lisnters and variables for game
function checkGameStart(data,playerNum,gameStarted,roomID,mode) {

    if (mode == "multiplayer") {
        joinRoom(roomID);
    };

    socket.on("updatePlayer",function (data) {
        data = JSON.parse(data);

        if (!(data.playerNum == player1))game.updatePlayer(data,game);
    });
    
    socket.on("startGame",function () {
        clearInterval(waitingForPlayer)
        game.assignPlayerQuestions()
        
        startGame();
    });
    
    socket.on("finishGame",function (data) {
        data = JSON.parse(data);
        game.set_winner(data.winner);
    });
    
    socket.on("updateHouse",function (data) {
        data = JSON.parse(data);

        if (player1 == "2"){
            game.updateHouse(data);
        };
    });
        
    socket.on("updateTime",function (data) {
        data = JSON.parse(data);    
        if (player1 == "2") game.updateTime(data,game);  
    });

    socket.on("updateScore",function (data) {
        data = JSON.parse(data);
        if (!(data.playerNum == player1)) game.set_score(data,game);
    });

    socket.on("restartGame",function () {
        window.location.reload();
    });

    socket.on("leaveGame",function () {
        ""
    });

    gameVariables = data;

    //this will store the index of the player
    player1 = playerNum;

    player2 = (player1 == "1")?"2":"1";

    //sets game variale
    game = setGameVariables();


    //if the game has already started game has started - load the game
    if (gameStarted) startGame();

    else{
        // if the client is the host 
        if (player1  == "1") {

            game.assignHouseQuestions();

            let data = {
                houses: game.sendHouse(),
                assignedQuestions: game.get_assignedQuestions(),
                questionList: game.get_questionList()
            };

            if (game.get_mode() == "multiplayer") {
                
                waitingForPlayer = setInterval(() => {
                    socket.emit("establishGame",JSON.stringify(data))
                }, 1000)   
            }
            else{

                socket.emit("establishGame",JSON.stringify(data))
                game.updateHouse(data.houses);
                game.assignPlayerQuestions()
                socket.emit("startGame")
                startGame();
            };
        };
        if (player1 == "2") {
            //Creates map for player two then starts the game
            socket.on("establishGame",function (data) {
                data = JSON.parse(data);
                game.updateHouse(data.houses);
                game.set_assignedQuestions(data.assignedQuestions);
                game.set_questionList(data.questionList);
                socket.emit("startGame")
            });  
        };
    };
};

//Sets player movement events and chooses background music
function startGame() {
    let mode = game.get_mode();

    window.onkeydown = function Movecharacter(event){
        if (!audioChosen && !(mode == "preview")) {
            setTimeout(() => {
                if (!audioChosen) {
                    let audioIndex = getRandomInt(1,20);
                    gameAudio[audioIndex].play();
                    audioChosen = true;                  
                };
            }, 1000);
        };

        const scoreboard = game.get_player1().get_scoreboard();

        if (gameKeys.includes(event.key)){

            event.preventDefault();
        };

        if (!Boolean(game.get_winner()) && !keylock){
            switch (event.key) {
            
                case "w": case "ArrowUp":
                    event.preventDefault();

                    //Changes direction character is facing
                    game.get_player1().set_directionSprite(
                        game.get_player1().get_characterSprite().get_walkNorth());

                    game.get_player1().set_direction("north");

                    //This loop makes the player go as close to the edge of the road as possible
                    for (let i = 0; i < game.get_player1().get_vel(); i++) {
                        // if the move is allowed...
                        if (game.checkPlayerBounds(
                                game.get_player1().get_x(),
                                game.get_player1().get_y()-(game.get_player1().get_vel()-i),
                                "up")){
        
                            game.get_player1().set_y(game.get_player1().get_y() - (game.get_player1().get_vel()-i));
                            //moves player's y coordinate

                            game.get_player1().set_keyPressed("w"); 
                            
                            //moves the visible area of the map 
                            if (game.get_player1().get_y() < gridHeight/1.08) {

                                const screen_vel = (game.get_player1().get_vel()-i)*1.4;
                                const top = parseInt(window.getComputedStyle(canvas).getPropertyValue("margin-top"));
                                canvas.style.marginTop = ((top + screen_vel) >= 0)? `0`:`${top + screen_vel}px`;
                                scoreboard.set_y(((top + screen_vel) >= 0)? 
                                0: scoreboard.get_y() - screen_vel/1.41025641026);
                            };
                            //increments walk count to change walking frame of sprite
                            game.get_player1().set_walkCount(
                                ("w" == game.get_player1().get_keyPressed())?  
                                game.get_player1().get_walkCount() + 1: frameRate
                                );  
                            playFootstep();  

                            if (!(mode == "preview")){
                                game.sendPlayer();
                            };
                            break;
                        };                 
                    };
                    break;            
           
                case "s": case "ArrowDown":
                    event.preventDefault();

                    game.get_player1().set_directionSprite(
                        game.get_player1().get_characterSprite().get_walkSouth());

                    game.get_player1().set_direction("south");   
        
                    for (let i = 0; i < game.get_player1().get_vel(); i++) {
                        if (game.checkPlayerBounds(
                                game.get_player1().get_x(),
                                game.get_player1().get_y()+(game.get_player1().get_vel()-i),
                                "down"
                                )
                            ) {

                            game.get_player1().set_y(
                                game.get_player1().get_y() + (game.get_player1().get_vel()-i));

                            game.get_player1().set_keyPressed("s");

                            if (game.get_player1().get_y() > gridHeight/15) {

                                const screen_vel = (game.get_player1().get_vel()-i)*1.4;
                                const top = parseInt(window.getComputedStyle(canvas).getPropertyValue("margin-top"));
                                canvas.style.marginTop = (top - screen_vel <= -canvas_style_height + visible_height )?
                                 `${top}`:`${top - screen_vel}px`;
                                 
                                scoreboard.set_y((top - screen_vel<= -canvas_style_height + visible_height )? 
                                scoreboard.get_y(): scoreboard.get_y() + (screen_vel/1.41025641026));
                            };
                            game.get_player1().set_walkCount(("s" == game.get_player1().get_keyPressed())?  game.get_player1().get_walkCount() + 1: frameRate);

                            playFootstep();   

                            if (!(mode == "preview")){
                                game.sendPlayer();
                            };
                            break;
                        };     
                    };
                    break;
        
                case "a": case "ArrowLeft":
                    event.preventDefault();

                    game.get_player1().set_directionSprite(
                        game.get_player1().get_characterSprite().get_walkWest());

                    game.get_player1().set_direction("west");
        
                    for (let i = 0; i < game.get_player1().get_vel(); i++) {
                        if (game.checkPlayerBounds(
                                game.get_player1().get_x()-(game.get_player1().get_vel()-i),
                                game.get_player1().get_y(),
                                "left")
                            ) {
                            
                            game.get_player1().set_x(
                                game.get_player1().get_x() - (game.get_player1().get_vel()-i));
                                
                            game.get_player1().set_keyPressed("a");

                            if (game.get_player1().get_x() < gridWidth/1.1) {

                                const screen_vel = (game.get_player1().get_vel()-i)*1.25
                                const left = parseInt(window.getComputedStyle(canvas).getPropertyValue("margin-left"));
                                canvas.style.marginLeft = ((left + screen_vel) >= 0)? 
                                    `0`:`${left + screen_vel}px`;  

                                scoreboard.set_x(((left + screen_vel) >= 0)? 
                                    0 : scoreboard.get_x() - screen_vel/1.253);  
                            };  
                            game.get_player1().set_walkCount(
                                ("a" == game.get_player1().get_keyPressed())?  
                                game.get_player1().get_walkCount() + 1: frameRate);

                            playFootstep();

                            if (!(mode == "preview")){
                                game.sendPlayer();
                            };
                            break;
                        };                 
                    };

                    break;
        
                case "d": case "ArrowRight":
                    event.preventDefault();
                    game.get_player1().set_directionSprite(
                        game.get_player1().get_characterSprite().get_walkEast());

                    game.get_player1().set_direction("east");
        
                    for (let i = 0; i < game.get_player1().get_vel(); i++) {
                        if (game.checkPlayerBounds(
                                game.get_player1().get_x()+(game.get_player1().get_vel()-i),
                                game.get_player1().get_y(),
                                "right")) {

                            game.get_player1().set_x(
                                game.get_player1().get_x() + (game.get_player1().get_vel()-i));

                            game.get_player1().set_keyPressed("d");

                            if (game.get_player1().get_x() > gridWidth/15) {

                                const screen_vel =  (game.get_player1().get_vel()-i)*1.3 
                                const left = parseInt(window.getComputedStyle(canvas).getPropertyValue("margin-left"));

                                canvas.style.marginLeft = (left - screen_vel <= -canvas_style_width + visible_width )?
                                 `${left}`:`${left - screen_vel}px`;

                                scoreboard.set_x((left - screen_vel <= -canvas_style_width + visible_width )?
                                 scoreboard.get_x(): scoreboard.get_x() + screen_vel/1.26984126984);
                            };
                            game.get_player1().set_walkCount(
                                ("d" == game.get_player1().get_keyPressed())?  
                                game.get_player1().get_walkCount() + 1: frameRate);

                            playFootstep();

                            if (!(mode == "preview")){
                                game.sendPlayer();
                            };  
                            break;
                        };            
                    };
                    break;
            };
        };
    };
    
    window.onkeyup = (event) => {
        if (gameKeys.includes(event.key)){
            game.get_player1().set_walkCount(frameRate);
            lockKey();
        };
    };

    window.requestAnimationFrame(function loop() {

        context.clearRect(0,0,canvas.width,canvas.height);
    
        game.get_map().drawMap();
        
        // game.get_map().drawBoarder();
        // game.get_player1().drawBoarder();

        if (mode == "multiplayer"){
            game.get_player2().drawSelf();
            // game.get_player2().drawBoarder();

        };

        game.get_player1().drawSelf();

        if (Boolean(game.get_winner())){
            game.displayWinner();
        };
        window.requestAnimationFrame(loop);
    });    
};

function playScore() {
    let tempScoreAudio = scoreAudio.cloneNode(true);
    tempScoreAudio.volume = scoreVolume;
    tempScoreAudio.play();
    wrongAudio.volume = 0
    setTimeout(() => {
        wrongAudio.volume = wrongAnswerVolume;
    }, 300);
};

function playIncorrect() {
    wrongAudio.play();
};

function playFootstep() {

    footstepAudio.play();
};

function playBackgroundMusic() {
    setTimeout(() => {
        let audioIndex = getRandomInt(1,20);
        gameAudio[audioIndex].play();
        audioChosen = true;                    
        
    }, 500);
};

//sets preview game variables
function previewGame(gameVariables) {
    
    let map_grid = gameVariables.map_grid;
    let speed = gameVariables.speed;
    let questionAnswers = gameVariables.questionAnswers;

    game = new Game(map_grid,1,2,speed,questionAnswers,"left","right",0,0,150,200,-1000,-10000,[],"preview",questionAnswers);

    game.assignHouseQuestions();

    let allQuestions = {};

    game.get_map().get_houseList().forEach((house,index)=>{
        allQuestions[`${index}`] = house.get_questionAnswer();
    });
    
    game.set_allQuestions(allQuestions);


    game.assignPlayerQuestions();
    game.get_map().set_currentRoad(game.get_map().get_roadList()[0]);
    startGame();
};

//gets game variables from server
function getGameVariables() {
    socket.emit("getGameVariables");
}

function setGameVariables() {

    let map_grid = gameVariables.map_grid;
    let questions = gameVariables[player1].allQuestions;
    let minutes = gameVariables.minutes;
    let seconds = gameVariables.seconds;
    let assignedQuestions = gameVariables[player1]["assignedQuestions"];

    let vel = gameVariables.speed;
    let sprite1 = gameVariables[player1].sprite;
    let sprite2 = gameVariables[player2].sprite;
    let position1 = gameVariables[player1]["position"];
    let position2 = gameVariables[player2]["position"];
    let x1 = gameVariables[player1]["x"];
    let y1 = gameVariables[player1]["y"];
    let x2 = gameVariables[player2]["x"];
    let y2 = gameVariables[player2]["y"];
    
    game = new Game(map_grid,sprite1,sprite2,vel,questions,position1,position2,minutes,seconds,x1,y1,x2,y2,assignedQuestions,gameVariables.mode);

    game.get_player1().set_x(gameVariables[player1]["x"]);
    game.get_player1().set_y(gameVariables[player1]["y"]);
    game.get_player1().set_walkCount(gameVariables[player1]["walkCount"]);
    game.get_player1().set_direction(gameVariables[player1]["direction"]);
    game.get_player1().set_answered(gameVariables[player1]["answered"]);
    game.get_player1().set_answeredCount(gameVariables[player1]["score"]);
    game.get_player1().get_scoreboard().set_score(`${game.get_player1().get_answeredCount()}`);
    game.get_map().set_currentRoad(game.get_map().get_roadList()[gameVariables[player1]["currentRoad"]]);

    game.updateHouse(gameVariables.houseQuestions);
    game.get_player1().set_question(gameVariables[player1]["question"]);
    
    switch (game.get_player1().get_direction()) {
        case "east":
            game.get_player1().set_directionSprite(game.get_player1().get_characterSprite().get_walkEast());
            break;
    
        case "west":
            game.get_player1().set_directionSprite(game.get_player1().get_characterSprite().get_walkWest());
            break;

        case "north":
            game.get_player1().set_directionSprite(game.get_player1().get_characterSprite().get_walkNorth());
            break;

        case "south":
            game.get_player1().set_directionSprite(game.get_player1().get_characterSprite().get_walkSouth());
            break;
    
    };

    if (gameVariables.mode == "multiplayer") {
        switch (game.get_player2().get_direction()) {
            case "east":
                game.get_player2().set_directionSprite(game.get_player2().get_characterSprite().get_walkEast());
                break;
        
            case "west":
                game.get_player2().set_directionSprite(game.get_player2().get_characterSprite().get_walkWest());
                break;
    
            case "north":
                game.get_player2().set_directionSprite(game.get_player2().get_characterSprite().get_walkNorth());
                break;
    
            case "south":
                game.get_player2().set_directionSprite(game.get_player2().get_characterSprite().get_walkSouth());
                break;   
        };
    
        game.get_player2().set_question(gameVariables[player2]["question"]);
        game.get_player2().set_x(gameVariables[player2]["x"]);
        game.get_player2().set_y(gameVariables[player2]["y"]);
        game.get_player2().set_walkCount(gameVariables[player2]["walkCount"]);
        game.get_player2().set_direction(gameVariables[player2].direction);
        game.get_player2().set_answered(gameVariables[player2]["answered"]);
        game.get_player2().set_answeredCount(gameVariables[player2]["score"]);
        game.get_player2().get_scoreboard().set_score(`${game.get_player2().get_answeredCount()}`);
    };

    var marginTop = gameVariables[player1]["marginTop"];
    var marginLeft = gameVariables[player1]["marginLeft"];

    canvas.style.marginTop = `${marginTop}px`;
    canvas.style.marginLeft = `${marginLeft}px`;

    game.set_winner(gameVariables.winner);

    return game;    
};

//Checks if a range of numbers is between two other numbers
function inBounds(array,l_bound,u_bound) {
    return Boolean(array[0] <= l_bound && u_bound <= array[1]);  
};

//This gets a random number between two numbers
function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min) + min); 
    //The maximum is exclusive and the minimum is inclusive
};

function restart(){
    socket.emit("restartGame");
};

function leaveGame(){

    socket.emit("leaveGame");
    location.replace(`${window.origin}/games/my-games`);
};

function getPreviewVariables() {
    socket.emit("getPreviewVariables");
};

function stopMusic() {
    unmute.hidden = !unmute.hidden;
    mute.hidden = !mute.hidden;

    if (unmute.hidden){
        for (const [key, value] of Object.entries(gameAudio)) {
            value.volume = 0;
        };
    }
    else{
        for (const [key, value] of Object.entries(gameAudio)) {
            value.volume = gameMusicVolume;
        };
    };
};

function lockKey() {
    if (!keylock){
        keylock = true;
        setTimeout(() => {
            keylock = false;
        }, 50);
    };
};

socket.on("previewVariables",function (data) {
    data = JSON.parse(data);
    previewGame(data);
});

socket.on("gameVariables",function (data) {
    data = JSON.parse(data);
    checkGameStart(data.gameState,data.playerIndex,data.gameStarted,data.roomID,data.gameMode);
});

class Player{
    #x;
    #y;
    #height;
    #width;
    #vel;
    #walkCount;
    #characterSprite;
    #directionSprite;
    #direction;
    #keyPressed;
    #question;
    #answered;
    #answeredCount;
    #scoreboard; 
    #questionsLeft;
    #fontSize;
 
    constructor(vel,sprite,position,x,y){
    
        this.#x = x;
        this.#y = y;
        this.#height = 50;
        this.#width = 40;
        this.#vel = vel;
        this.#walkCount = 1;
        this.#characterSprite = sprite;
        this.#directionSprite = this.#characterSprite.get_walkNorth();
        this.#direction = "north";
        this.#keyPressed = "";
        this.#question = "";
        this.#answered = [];
        this.#answeredCount = 0;
        this.#scoreboard = new Scoreboard(position);
        this.#questionsLeft = [];
        this.#fontSize = undefined;
    };

    //Getters

    get_x(){
        return this.#x;
    };

    get_y(){
        return this.#y;
    };

    get_height(){
        return this.#height;
    };

    get_width(){
        return this.#width;
    };

    get_vel(){
        return this.#vel;
    };

    get_walkCount(){
        return this.#walkCount;
    };

    get_characterSprite(){
        return this.#characterSprite;
    };

    get_directionSprite(){
        return this.#directionSprite;
    };

    get_direction(){
        return this.#direction;
    };

    get_keyPressed(){
        return this.#keyPressed;
    };

    get_answered(){
        return this.#answered;
    };

    get_answeredCount(){
        return this.#answeredCount;
    };

    get_scoreboard(){
        return this.#scoreboard;
    };

    get_questionsLeft(){
        return this.#questionsLeft;
    };

    get_fontSize(){
        return this.#fontSize;
    };

    get_question(){
        return this.#question;
    };

    //Setters

    set_x(x){
        this.#x = x;
    };

    set_y(y){
        this.#y = y;
    };

    set_walkCount(walkCount){
        this.#walkCount = walkCount;
    };

    set_directionSprite(directionSprite){
        this.#directionSprite = directionSprite;
    };

    set_direction(direction){
        this.#direction = direction;
    };

    set_keyPressed(value){
        this.#keyPressed = value;
    };

    set_answeredCount(value){
        this.#answeredCount = value;
    };

    set_answered(answeredList){
        this.#answered = answeredList;
    };
    
    set_questionsLeft(questionList){
        this.#questionsLeft = questionList;
    };

    set_question(question){
        this.#question = question;
    };

    set_fontSize(size){
        this.#fontSize = size;
    };

    add_answeredQuestion(question){
        this.#answered.push(question);
    };

    add_answerCount(value){
        this.#answeredCount += value;
    };


    drawSelf(){
        context.drawImage(
            characterSpritesheet,
            this.#directionSprite[Math.floor(this.#walkCount/frameRate) % 4 ][1],
            this.#directionSprite[Math.floor(this.#walkCount/frameRate) % 4 ][2],
            this.#directionSprite[Math.floor(this.#walkCount/frameRate) % 4 ][3],
            this.#directionSprite[Math.floor(this.#walkCount/frameRate) % 4 ][4],
            this.#x,
            this.#y,
            this.#width,
            this.#height
        );

        if (!this.#question) this.#question = "";
        

        //Main Rect

        var rect_width1 = 150;
        var rect_height1 = rect_width1*0.35;

        var border_thickness = rect_width1*0.08;

        var rectX1 = (this.#x - rect_width1/2)+this.#width/2;
        var rectY1 = (this.#y-rect_height1)-border_thickness;
        context.beginPath();
        context.fillStyle = fill_color;
        context.fillRect(rectX1, rectY1, rect_width1, rect_height1);
        context.closePath();


        //Left Border
        var rect_height2 = rect_height1;
        var rect_width2 = border_thickness;
        var rectX2 = rectX1-rect_width2+1;
        var rectY2 = rectY1;
        context.beginPath();
        context.fillStyle = border_color;
        context.fillRect(rectX2, rectY2, rect_width2, rect_height2);
        context.closePath();

        //Right Border
        var rect_height3 = rect_height1;
        var rect_width3 = border_thickness+1;
        var rectX3 = rectX1 + rect_width1-1;
        var rectY3 = rectY1;
        context.beginPath();
        context.fillStyle = border_color;
        context.fillRect(rectX3, rectY3, rect_width3, rect_height3);
        context.closePath();

        //Top Border
        var rect_height4 = border_thickness;
        var rect_width4 = rect_width1;
        var rectX4 = rectX1;
        var rectY4 = rectY1 - rect_height4+1;
        context.beginPath();
        context.fillStyle = border_color;
        context.fillRect(rectX4, rectY4, rect_width4, rect_height4);
        context.closePath();


        //Bottom Border
        var rect_height5 = border_thickness;
        var rect_width5 = rect_width1;
        var rectX5 = rectX1;
        var rectY5 = rectY1 + rect_height1-1;
        context.beginPath();
        context.fillStyle = border_color;
        context.fillRect(rectX5, rectY5, rect_width5, rect_height5);
        context.closePath();

        context.lineWidth = 4;
        context.strokeStyle = text_color;
        context.fillStyle = "#abc";

        if (!this.#fontSize) {

            var font = 80;
            context.font=`${font}px pixel2`;

            let textWidth = context.measureText(this.#question).width;

            while (rect_width1 < textWidth) {
                font -= 1;
                context.font=`${font}px pixel2`;
                textWidth = context.measureText(this.#question).width;
            };
            this.#fontSize = font;
        }
        context.font=`${this.#fontSize}px pixel2`;

        context.textAlign="center"; 
        context.textBaseline = "middle";
        context.fillStyle = text_color;
        context.fillText(this.#question,rectX1+(rect_width1/2),rectY1+(rect_height1/2));
    };

    drawBoarder(){
        context.beginPath();
        context.strokeStyle = "red";
        context.rect(this.#x, this.#y, this.#width, this.#height);
        context.stroke();
    };
};

class Scoreboard{

    #width;
    #height;
    #x;
    #y;
    #value;
    #position;
    #element;

    constructor(position){
        this.#width = 200;
        this.#height = 100;
        var converter = {
            left: "scoreboard1",
            right: "scoreboard2"
        };
        this.#x = converter[position];
        this.#y = 0;
        this.#value = "0";
        this.#position = position;
        this.#element = document.getElementById(converter[position]);
    };

    //Getters

    get_width(){
        return this.#width;
    };

    get_height(){
        return this.#height;
    };

    get_x(){
        return this.#x;
    };

    get_y(){
        return this.#y;
    };

    get_value(){
        return this.#value;
    };
    
    get_position(){
        return this.#position;
    };

    get_element(){
        return this.#element;
    };


    //Setters

    set_x(x){
        this.#x = x
    };

    set_y(y){
        this.#y = y
    };

    set_score(newValue){        

        this.#value = `${newValue}`;

        this.#element.innerHTML = `${this.#value}`;  
    };

};

class MapItem{
    #above;
    #below;
    #left;
    #right;
    #x;
    #y;
    #xBounds;
    #yBounds;
    #house;
  
    constructor(above,below,left,right){
        this.#above = above;
        this.#below = below;
        this.#left = left;
        this.#right = right;
        this.#x = "";
        this.#y = "";
        this.#xBounds = [["",""]];
        this.#yBounds = [["",""]];
        this.#house = "";
    };

    //Getters 

    get_above(){
        return this.#above;
    };

    get_below(){
        return this.#below;
    };

    get_left(){
        return this.#left;
    };

    get_right(){
        return this.#right;
    };

    get_x(){
        return this.#x;
    };

    get_y(){
        return this.#y;
    };

    get_xBounds(){
        return this.#xBounds;
    };

    get_yBounds(){
        return this.#yBounds;
    };

    get_house(){
        return this.#house;
    };

    //Setters

    set_x(x){
        this.#x = x;
    };

    set_y(y){
        this.#y = y;
    };

    set_xBounds(bounds){
        this.#xBounds = bounds;
    };

    set_yBounds(bounds){
        this.#yBounds = bounds;
    };

    set_house(house){
        this.#house = house;
    };    
};

class Road extends MapItem {

    #direction;
    #hasHouse;
  
    constructor(direction,above,below,left,right,hasHouse){
        super(above,below,left,right);
        this.#direction = direction;
        this.#hasHouse = hasHouse;
    };

    //Getters 

    get_hasHouse(){
        return this.#hasHouse;
    };

    get_direction(){
        return this.#direction;
    };
  
};

class House extends MapItem {

    #width;
    #height;
    #hasQuestion;
    #questionAnswer;
    #fontSize;

    constructor(above,below,left,right){
        super(above,below,left,right)

        this.#width = 166;
        this.#height = 166;
        this.#hasQuestion = false;
        this.#questionAnswer = "";
        this.#fontSize = undefined;
    };

    //Getters

    get_width(){
        return this.#width;
    };

    get_height(){
        return this.#height;
    };

    get_hasQuestion(){
        return this.#hasQuestion;
    };

    get_questionAnswer(){
        return this.#questionAnswer;
    };

    get_fontSize(){
        return this.#fontSize;
    };

    //Setters

    set_hasQuestion(state){
        this.#hasQuestion = state;
    };

    set_questionAnswer(questionAnswer){
        this.#questionAnswer = questionAnswer;
    };

    set_fontSize(size){
        this.#fontSize = size;
    };
};

class MapGrid{

    #aList;
    #roadList;
    #houseList;
    #current_x;
    #current_y;
    #currentRoad;

    constructor(){
        this.#aList  = [];
        this.#roadList = [];
        this.#houseList = [];
        this.#current_x = 0;
        this.#current_y = 0;
        this.#currentRoad  = "";
    };


    //Getters

    get_aList(){
        return this.#aList;
    };

    get_roadList(){
        return this.#roadList;
    };

    get_houseList(){
        return this.#houseList;
    };

    get_currentRoad(){
        return this.#currentRoad;
    };

    //Setters

    set_currentRoad(road){
        this.#currentRoad = road;
    };

    add_road(road){
        this.#roadList.push(road);
    };

    add_mapItem(mapItem){
        this.#aList.push(mapItem);
    };

    add_house(house){
        this.#houseList.push(house);
    };

    //Sets bounds and coordinates of roads and houses
    set_map(){

        for (let i = 0; i < this.#aList.length;i++) {

            let currentCell = this.#aList[i];            
     
            let className  = currentCell.constructor.name;

            if (className == "Road" || className == "House") {
                   
                currentCell.set_x(this.#current_x + gridStartX);
        
                currentCell.set_y(this.#current_y + gridStartY);

                currentCell.set_xBounds([[currentCell.get_x(),currentCell.get_x()+165]]);
                currentCell.set_yBounds([[currentCell.get_y(),currentCell.get_y()+165]]);      
            };

            if (className == "Road") {
                switch (currentCell.get_direction()) {
                    case "horizontal":
                        currentCell.set_yBounds([[currentCell.get_y()+30,currentCell.get_y()+135]]);

                        break;
                
                    case "vertical":
                        currentCell.set_xBounds([[currentCell.get_x()+30,currentCell.get_x()+135]]);

                        break;
                    
                    case "north-east":
                        currentCell.set_xBounds([[currentCell.get_x()+30,currentCell.get_x()+135],[currentCell.get_x()+30,currentCell.get_x()+165]]);
                        currentCell.set_yBounds([[currentCell.get_y(),currentCell.get_y()+135],[currentCell.get_y()+30,currentCell.get_y()+135]]);
    
                        break;
    
                    case "north-west":
                        currentCell.set_xBounds([[currentCell.get_x()+30,currentCell.get_x()+135],[currentCell.get_x(),currentCell.get_x()+135]]);
                        currentCell.set_yBounds([[currentCell.get_y(),currentCell.get_y()+135],[currentCell.get_y()+30,currentCell.get_y()+135]]);
    
                        break;
    
                    case "south-west":
                        currentCell.set_xBounds([[currentCell.get_x()+30,currentCell.get_x()+135],[currentCell.get_x(),currentCell.get_x()+135]]);
                        currentCell.set_yBounds([[currentCell.get_y()+30,currentCell.get_y()+165],[currentCell.get_y()+30,currentCell.get_y()+135]]);
    
                        break;
    
                    case "south-east":
                        currentCell.set_xBounds([[currentCell.get_x()+30,currentCell.get_x()+135],[currentCell.get_x()+30,currentCell.get_x()+165]]);
                        currentCell.set_yBounds([[currentCell.get_y()+30,currentCell.get_y()+165],[currentCell.get_y()+30,currentCell.get_y()+135]]);
    
                        break;
                     
                    case "junction":
                        currentCell.set_xBounds([[currentCell.get_x(),currentCell.get_x()+165],[currentCell.get_x()+30,currentCell.get_x()+135]]);
                        currentCell.set_yBounds([[currentCell.get_y()+30,currentCell.get_y()+135],[currentCell.get_y(),currentCell.get_y()+165]]);
    
                        break;
    
                    case "junction-up":
                        currentCell.set_xBounds([[currentCell.get_x(),currentCell.get_x()+165],[currentCell.get_x()+30,currentCell.get_x()+135]]);
                        currentCell.set_yBounds([[currentCell.get_y()+30,currentCell.get_y()+135],[currentCell.get_y(),currentCell.get_y()+135]]);
    
                        break;
    
                    case "junction-down":
                        currentCell.set_xBounds([[currentCell.get_x(),currentCell.get_x()+165],[currentCell.get_x()+30,currentCell.get_x()+135]]);
                        currentCell.set_yBounds([[currentCell.get_y()+30,currentCell.get_y()+135],[currentCell.get_y()+30,currentCell.get_y()+165]]);
    
                        break;
    
                    case "junction-left":
                        currentCell.set_xBounds([[currentCell.get_x(),currentCell.get_x()+135],[currentCell.get_x()+30,currentCell.get_x()+135]]);
                        currentCell.set_yBounds([[currentCell.get_y()+30,currentCell.get_y()+135],[currentCell.get_y(),currentCell.get_y()+165]]);
                        break;
    
                    case "junction-right":
                        currentCell.set_xBounds([[currentCell.get_x()+30,currentCell.get_x()+165],[currentCell.get_x()+30,currentCell.get_x()+135]]);
                        currentCell.set_yBounds([[currentCell.get_y()+30,currentCell.get_y()+135],[currentCell.get_y(),currentCell.get_y()+165]]);

                        break;
                }; 

                if (currentCell.get_hasHouse()) currentCell.set_house(this.#aList[currentCell.get_above()]);
                this.#roadList.push(currentCell)   
            }

            else if(className == "House"){
                this.#houseList.push(currentCell);

                currentCell.set_x(this.#current_x + gridStartX);
    
                currentCell.set_y(this.#current_y + gridStartY + 40) ;

                currentCell.set_xBounds([[currentCell.get_x(),currentCell.get_x()+165]]);
                currentCell.set_yBounds([[currentCell.get_y(),currentCell.get_y()+172]]);
            };
                  
            this.#current_x = (this.#current_x + 165) % (165*38); 
            //Increments the x coordinate for the next map item, which will reset
            //everytime its setting the map item on a new row

            this.#current_y = Math.floor((i+1)/38)*165;
            //increments the y value of the map item every time there's a new row
        };
        this.#currentRoad = this.#aList[0];
    };   
    
    //Draws map 
    drawMap(){
      
        for (let i = 0; i < this.#roadList.length; i++) {
            
            let currentCell = this.#roadList[i];

            switch (currentCell.get_direction()) {
                case "vertical":

                    context.drawImage(roadSpritesheet,10,0,110,90,currentCell.get_x(),currentCell.get_y(),166,167); //Vertical
                    break;
            
                case "horizontal":
    
                    context.drawImage(roadSpritesheet,130,0,100,110,currentCell.get_x()-2,currentCell.get_y(),170,166); //Horizontal
                    break;
                        
                case "north-east":
    
                    context.drawImage(roadSpritesheet,360,0,110,110,currentCell.get_x(),currentCell.get_y(),166,166); //North-East
                    break;
    
                case "north-west":
    
                    context.drawImage(roadSpritesheet,240,0,110,110,currentCell.get_x(),currentCell.get_y(),166,166); //North-West
                    break;
                
                case "south-west":
    
                    context.drawImage(roadSpritesheet,240,120,110,110,currentCell.get_x(),currentCell.get_y(),166,166); //South-West
                    break;
                
                case "south-east":
    
                    context.drawImage(roadSpritesheet,360,120,110,110,currentCell.get_x(),currentCell.get_y(),166,166); //South-East
                    break;

                case "junction":
                    context.drawImage(roadSpritesheet,10,220,110,110,currentCell.get_x(),currentCell.get_y(),166,166); //Junction
                    break;

                case "junction-up":
                    context.drawImage(junctionUp,5,1,110,110,currentCell.get_x(),currentCell.get_y(),166,166); //Horizontal
                    break;

                case "junction-down":
                    context.drawImage(junctionDown,4,0,110,110,currentCell.get_x(),currentCell.get_y(),166,166); //Horizontal
                    break;

                case "junction-right":
                    context.drawImage(junctionRight,0,5,110,110,currentCell.get_x(),currentCell.get_y(),166,166); //Junction
                    break;
                
                case "junction-left":
                    context.drawImage(junctionleft,1,4,110,110,currentCell.get_x(),currentCell.get_y(),166,166); //Junction
                    break;
            };
        };

        for (let i = 0; i < this.#houseList.length; i++) {
            
            var currentCell = this.#houseList[i];

            context.drawImage(houseSpritesheet,110,35.5,85,100,currentCell.get_x(),currentCell.get_y(),166,170); //House Facing Down  
            var answer;
            if (!currentCell.get_questionAnswer()) answer= "";

            else answer = currentCell.get_questionAnswer().answer;

    
            //Main Rect
    
            let rect_width1 = 140;
            let rect_height1 = rect_width1*0.35;
    
            let border_thickness = rect_width1*0.08;

            let rectX1 = (currentCell.get_x() - rect_width1/2)+currentCell.get_width()/2;
            let rectY1 = (currentCell.get_y()-rect_height1)-border_thickness+4;

            context.beginPath();
            context.fillStyle = fill_color;
            context.fillRect(rectX1, rectY1, rect_width1, rect_height1);
            context.closePath();
    
    
            //Left Border
            let rect_height2 = rect_height1;
            let rect_width2 = border_thickness;
            let rectX2 = rectX1-rect_width2+1;
            let rectY2 = rectY1;
            context.beginPath();
            context.fillStyle = border_color;
            context.fillRect(rectX2, rectY2, rect_width2, rect_height2);
            context.closePath();
    
            //Right Border
            let rect_height3 = rect_height1;
            let rect_width3 = border_thickness+1;
            let rectX3 = rectX1 + rect_width1-1;
            let rectY3 = rectY1;
            context.beginPath();
            context.fillStyle = border_color;
            context.fillRect(rectX3, rectY3, rect_width3, rect_height3);
            context.closePath();
    
            //Top Border
            let rect_height4 = border_thickness;
            let rect_width4 = rect_width1;
            let rectX4 = rectX1;
            let rectY4 = rectY1 - rect_height4+1;
            context.beginPath();
            context.fillStyle = border_color;
            context.fillRect(rectX4, rectY4, rect_width4, rect_height4);
            context.closePath();
    
    
            //Bottom Border
            let rect_height5 = border_thickness;
            let rect_width5 = rect_width1;
            let rectX5 = rectX1;
            let rectY5 = rectY1 + rect_height1-1;
            context.beginPath();
            context.fillStyle = border_color;
            context.fillRect(rectX5, rectY5, rect_width5, rect_height5);
            context.closePath();
    
            context.lineWidth = 4;
            context.strokeStyle = text_color;
            context.fillStyle = "#abc";
            context.textAlign="center"; 
            context.textBaseline = "middle";
            context.fillStyle = text_color;
          
            if (!currentCell.get_fontSize()) {

                let font = 80;
                context.font=`${font}px pixel2`;

                let textWidth = context.measureText(answer).width;
    
                while (rect_width1 < textWidth) {
                    font -= 1;
                    context.font=`${font}px pixel2`;
                    textWidth = context.measureText(answer).width;
                };

                currentCell.set_fontSize(font);
            };
            context.font=`${currentCell.get_fontSize()}px pixel2`;

            context.fillText(answer,rectX1+(rect_width1/2),rectY1+(rect_height1/2));
        };
    };

    //draws bounds on map
    //This isnt used in the actual game but it was used when implementing the game
    drawBoarder(){
        for (let i = 0; i < this.#roadList.length; i++) {
            
            var currentCell = this.#roadList[i]

            for (let j = 0; j < currentCell.get_xBounds().length; j++) {
                context.beginPath();
                context.strokeStyle = "red";
                context.rect(currentCell.get_xBounds()[j][0],currentCell.get_yBounds()[j][0], 
                    currentCell.get_xBounds()[j][1]-currentCell.get_xBounds()[j][0], currentCell.get_yBounds()[j][1] - currentCell.get_yBounds()[j][0] );
                context.stroke();
            }; 
        
        };

        for (let i = 0; i < this.#houseList.length; i++) {
            
            var currentCell = this.#houseList[i]

            for (let j = 0; j < currentCell.get_xBounds().length; j++) {
                context.beginPath();
                context.strokeStyle = "red";
                context.rect(currentCell.get_xBounds()[j][0],currentCell.get_yBounds()[j][0], 
                    currentCell.get_xBounds()[j][1]-currentCell.get_xBounds()[j][0], currentCell.get_yBounds()[j][1] - currentCell.get_yBounds()[j][0] );
                context.stroke();
            }; 
        
        };
    };
};

class CharacterSprite{

    #walkSouth;
    #walkWest;
    #walkEast;
    #walkNorth;

    constructor(crop_x,crop_y){

        crop_x +=6
        crop_y +=6  


        //Theese arrays will be used to crop the spritesheet to only show thw frames
        // of the character for walking north 
        this.#walkSouth = [
            [characterSpritesheet,crop_x,crop_y,40,70,0,0,65,72],
            [characterSpritesheet,crop_x + cellWidth,crop_y,40,70,0,0,65,72],
            [characterSpritesheet,crop_x + 2*cellWidth,crop_y,40,70,0,0,65,72],
            [characterSpritesheet,crop_x + cellWidth,crop_y,40,70,0,0,65,72]
        ];
        this.#walkWest = [
            [characterSpritesheet,crop_x,crop_y + cellHeight,40,70,0,0,65,72],
            [characterSpritesheet,crop_x + cellWidth,crop_y + cellHeight,40,70,0,0,65,72],
            [characterSpritesheet,crop_x + 2*cellWidth,crop_y + cellHeight,40,70,0,0,65,72],
            [characterSpritesheet,crop_x + cellWidth,crop_y + cellHeight,40,70,0,0,65,72]
        ];
        this.#walkEast = [
            [characterSpritesheet,crop_x,crop_y + 2*cellHeight,40,70,0,0,65,72],
            [characterSpritesheet,crop_x + cellWidth,crop_y + 2*cellHeight,40,70,0,0,65,72],
            [characterSpritesheet,crop_x + 2*cellWidth,crop_y + 2*cellHeight,40,70,0,0,65,72],
            [characterSpritesheet,crop_x + cellWidth,crop_y + 2*cellHeight,40,70,0,0,65,72]
        ];
        this.#walkNorth = [
            [characterSpritesheet,crop_x,crop_y + 3*cellHeight,40,70,0,0,65,72],
            [characterSpritesheet,crop_x + cellWidth,crop_y + 3*cellHeight,40,70,0,0,65,72],
            [characterSpritesheet,crop_x + 2*cellWidth,crop_y + 3*cellHeight,40,70,0,0,65,72],
            [characterSpritesheet,crop_x + cellWidth,crop_y + 3*cellHeight,40,70,0,0,65,72],
        ];
    };

    get_walkSouth(){
        return this.#walkSouth;
    };

    get_walkWest(){
        return this.#walkWest;
    };

    get_walkEast(){
        return this.#walkEast;
    };

    get_walkNorth(){
        return this.#walkNorth;
    };
};

class Game{

    #timerElement;
    #map;
    #player1;
    #player2;
    #questionList;
    #assignedQuestions;
    #minutes;
    #seconds;
    #winner;
    #mode;
    #timer;
    #allQuestions;
    
    constructor(map,sprite1,sprite2,vel,questionList,position1,position2,minutes,seconds,
        x1,y1,x2,y2,assignedQuestions,mode){  

        this.#timerElement = document.getElementById("timer");

        this.#timerElement.innerHTML = (seconds<10)? `${minutes}:0${seconds}`:`${minutes}:${seconds}`;

        this.#map = new MapGrid();

        this.#player1 = new Player(vel,characters[sprite1],position1,x1,y1);

        if (mode == "multiplayer") this.#player2 = new Player(vel,characters[sprite2],position2,x2,y2);

        this.#questionList = questionList;
        
        //Holds a list of questions and answers  that have been assigned to houses
        this.#assignedQuestions = assignedQuestions;

        this.#minutes = minutes;

        this.#seconds = seconds;

        this.#winner = false;
        
        this.#mode = mode;

        this.parseMap(map,this.#map);
        
        this.#map.set_map();

        this.#winner = false;

        if (!(mode == "preview")){  
            if (player1 == "1") {
                //the timer interval
                this.#timer = setInterval(()=> {
            
                    this.#seconds = (this.#seconds-1<0)?(this.#minutes<=0)?0:59:this.#seconds-1;    

                    this.#minutes = (this.#seconds>=59)?(this.#seconds-1<=0)?0:(this.#minutes>0)?this.#minutes-1:0:this.#minutes;

                    if (this.#minutes==0 && this.#seconds==0) this.finishGame(false);
        
                    this.#timerElement.innerHTML = (this.#seconds<10)? `${this.#minutes}:0${this.#seconds}`:`${this.#minutes}:${this.#seconds}`;

                }, 1000);

                this.sendTimeInterval = setInterval(() => {
                    this.sendTime(this);
                }, 800);  
            };
        };
    };

    //Getters

    get_map(){
        return this.#map;
    };

    get_player1(){
        return this.#player1;
    };

    get_player2(){
        return this.#player2;
    };

    get_winner(){
        return this.#winner;
    };

    get_mode(){
        return this.#mode;
    };

    get_questionList(){
        return this.#questionList;
    };

    get_assignedQuestions(){
        return this.#assignedQuestions
    };

    //Setters

    set_winner(winner){
        this.#winner = winner;
    };

    set_questionList(questionList){
        this.#questionList = questionList;
    };

    set_assignedQuestions(questionList){
        this.#assignedQuestions = questionList;
    };

    set_allQuestions(questionList){
        this.#allQuestions = questionList;
    };

    //Converts 2d map array to an adjacency list that contains map item object
    parseMap(grid,mapObject) {

        for (let i = 0; i < 23; i++) {
        
            for (let j = 0; j < 38; j++) {
            
                let type;
                let above;
                let below;
                let left;
                let right;

                //Gets indexes of the cells connected to the current cell
                //would have in the adjacency list, if there are any cells
                //in that direcion
                let belowPos = (i == 22)? false: j + ((i+1)*38);
                let abovePos = (i == 0)? false: j + ((i-1)*38);
                let leftPos = (j == 0)? false: j-1 + (i*38);
                let rightPos = (j == 37)? false: j+1 + (i*38);
            
                //if the current cell is a road
                if (grid[i][j]== 2) {

                    //Checks if there are roads connected to the cuurent cell
                    //in every direction

                    above = (i == 0)? false: (grid[i-1][j] == 2)? true: false;
                    below = (i == 22)? false: (grid[i+1][j] == 2)? true: false;
                    right = (j == 37)? false: (grid[i][j+1] == 2)? true: false;
                    left = (j == 0)? false: (grid[i][j-1] == 2)? true: false;

                    let hasHouse = (i == 0)? false: (grid[i-1][j] == 1)? true: false;

                    //Determining type of road based on its connections 
                    
                    if (left && !right && !above && below) type = "south-west";
                    else if (!left && right && !above && below) type = "south-east";
                    else if (left && !right && above && !below) type = "north-west";
                    else if (!left && right && above && !below) type = "north-east";
                    else if (!left && !right && above && below) type = "vertical";
                    else if (!left && !right && above && !below) type = "vertical";
                    else if (!left && !right && !above && below) type = "vertical";
                    else if (left && right && !above && !below) type = "horizontal";

                    else if (left && right && above && !below) type = "junction-up";
                    else if (left && !right && above && below) type = "junction-left";
                    else if (left && right && !above && below) type = "junction-down";
                    else if (!left && right && above && below) type = "junction-right";
                    else if (left && right && above && below) type = "junction";

                    else if (!left && !right && ((!above && below) || (above && !below))) type = "vertical";
                    else if (((!left && right)  || (left && !right)  ) && !above && !below) type = "horizontal";

                    else type = false
                    
                    //Adds road to adjacency list
                    mapObject.add_mapItem(new Road(type,abovePos,belowPos,leftPos,rightPos,hasHouse));
                }
                //if the current cell is a house
                else if(grid[i][j]== 1) {

                    mapObject.add_mapItem(new House(abovePos,belowPos,leftPos,rightPos));
                }
                else mapObject.add_mapItem({});
            };
        };
    };

    checkPlayerBounds(x,y,direction) {
        let player = this.#player1;

        if(this.#mode == "multiplayer") {
            if (this.checkPlayerCollisions(x,y,player.get_height(),player.get_width())) return false;
       };

        let map = this.#map;

        let currentRoad = map.get_currentRoad();

        //This gets the shirtest x and y bounds of the current road

        let minIntervalY = currentRoad.get_yBounds()[0];
        let minIntervalX = currentRoad.get_xBounds()[0];

        currentRoad.get_yBounds().forEach(array => {
            if(array[1]-array[0] < minIntervalY[1]-minIntervalY[0] ) minIntervalY = array;
        });

        currentRoad.get_xBounds().forEach(array => {
            if(array[1]-array[0] < minIntervalX[1]-minIntervalX[0] ) minIntervalX = array;
        });

        //Checks if the player is in the bounds of the curent road
        for (let i = 0; i < currentRoad.get_xBounds().length; i++) {

            if (inBounds(currentRoad.get_xBounds()[i],x,x+player.get_width()) 
            && inBounds(currentRoad.get_yBounds()[i],y+15,y+player.get_height())){
                return true; 
            };
        };

        switch (direction) {
            //if the direction is up
            case "up":
                this.checkHouse(currentRoad)
                //checks if their is any map item above the current road
                if (currentRoad.get_above() || currentRoad.get_above() === 0 ) {

                    //Gets map item above the current road, from map's adjaceny list
                    let mapItem = this.#map.get_aList()[currentRoad.get_above()];

                    let className  = mapItem.constructor.name;

                    //Checks if thier is a road item above the current road
                    if (className == "Road") {

                        //Gets road item above the current road, from map's adjaceny list
                        let aboveRoad = this.#map.get_aList()[currentRoad.get_above()];


                        // Gets shortest xbound of aboveRoad

                        let aboveRoad_minInterval = aboveRoad.get_xBounds()[0];
                        let aboveRoad_minInterval_pos = 0;

                        aboveRoad.get_xBounds().forEach((array,i) => {
                            if(array[1]-array[0] < aboveRoad_minInterval[1]-aboveRoad_minInterval[0] ) {
                                aboveRoad_minInterval = array;
                                aboveRoad_minInterval_pos = i;
                            };
                        });

                        //Checks if the player has fully transitioned roads
                        if (inBounds(aboveRoad_minInterval,x,x+player.get_width())) {
                            if (inBounds(aboveRoad.get_yBounds()[aboveRoad_minInterval_pos ],y+15,y+player.get_height())){
                               
                                map.set_currentRoad(aboveRoad);
                            };
                            return true;
                        };   
                    };   
                };

                //Checks if player is between two roads and is not trying to transition roads
                //And checks if the move is valid


                if (inBounds(minIntervalY,y+15,y+player.get_height())) return true;

                if (y>minIntervalY[0]) return true;

                break;
        
            case "down":
                if (currentRoad.get_below()) {
                    let mapItem = this.#map.get_aList()[currentRoad.get_below()];
                    let className  = mapItem.constructor.name;

                    if (className == "Road") {
                        let belowRoad = this.#map.get_aList()[currentRoad.get_below()];

                        let belowRoad_minInterval = belowRoad.get_xBounds()[0];
                        let belowRoad_minInterval_pos = 0;

                        belowRoad.get_xBounds().forEach((array,i) => {
                            if(array[1]-array[0] < belowRoad_minInterval[1]-belowRoad_minInterval[0] ) {
                                belowRoad_minInterval = array;
                                belowRoad_minInterval_pos = i;
                            };
                        });
                        
                        if (inBounds(belowRoad_minInterval ,x,x+player.get_width())) {
                            if (inBounds(belowRoad.get_yBounds()[belowRoad_minInterval_pos],y+15,y+player.get_height())){

                                map.set_currentRoad(belowRoad);
                            };
                            return true;  
                        };
                    };   
                };
                    
                if (inBounds(minIntervalY,y,y+player.get_height())) return true;

                if (y+player.get_height()<minIntervalY[1]) return true;
    
                break;

            case "left":
                if (currentRoad.get_left() || currentRoad.get_left() === 0 ) {
                    let mapItem = this.#map.get_aList()[currentRoad.get_left()];
                    let className  = mapItem.constructor.name;

                    if (className == "Road") {
                        let leftRoad = this.#map.get_aList()[currentRoad.get_left()];

                        let leftRoad_minInterval = leftRoad.get_yBounds()[0]
                        let leftRoad_minInterval_pos = 0
                        
                        leftRoad.get_yBounds().forEach((array,i) => {
                            if(array[1]-array[0] < leftRoad_minInterval[1]-leftRoad_minInterval[0] ) {
                                leftRoad_minInterval = array;
                                leftRoad_minInterval_pos = i;
                            };
                        });
                    
                        if (inBounds(leftRoad_minInterval,y+15,y+player.get_height())) {
                            if (inBounds(leftRoad.get_xBounds()[leftRoad_minInterval_pos],x,x+player.get_width())) map.set_currentRoad(leftRoad);
                            
                            return true;
                        };
                    }; 
                };
                
                if (inBounds(minIntervalX,x,x+player.get_width())) return true;

                if (x>minIntervalX[0]) return true;

                break;

            case "right":
                if (currentRoad.get_right()) {
                    let mapItem = this.#map.get_aList()[currentRoad.get_right()];
                    let className  = mapItem.constructor.name;

                    if (className == "Road") {

                        let rightRoad = this.#map.get_aList()[currentRoad.get_right()];

                        let rightRoad_minInterval = rightRoad.get_yBounds()[0]
                        let rightRoad_minInterval_pos = 0

                        rightRoad.get_yBounds().forEach((array,i) => {
                            if(array[1]-array[0] < rightRoad_minInterval[1]-rightRoad_minInterval[0] ) {
                                rightRoad_minInterval = array;
                                rightRoad_minInterval_pos = i;
                            };
                        });
                    
                        if (inBounds(rightRoad_minInterval,y+15,y+player.get_height())) {
                            if (inBounds(rightRoad.get_xBounds()[rightRoad_minInterval_pos],x,x+player.get_width())){

                                map.set_currentRoad(rightRoad);
                            };
                            return true;
                        };
                    };        
                };

                if (inBounds(minIntervalX,x,x+player.get_width())) return true;

                if (x+player.get_width()<minIntervalX[1]) return true;

                break;
        };
        return false;
    };

    //Checks answer if the house the player visits,  has the answer to their question
    checkAnswer(house) {

        let player = this.#player1;

        let playerAnswer = "";

        for (const [key, value] of Object.entries(this.#allQuestions)) {
            if (value.question == player.get_question()) {
                playerAnswer = value.answer;
                break            
            };   
        };
        
        if (playerAnswer == house.get_questionAnswer().answer) {
            
            playScore();

            player.add_answeredQuestion(house.get_questionAnswer().question);
        
            player.add_answerCount(1);

            this.#player1.get_scoreboard().set_score(`${this.#player1.get_answered().length}`); 

            if (!(this.#mode == "preview")) {
                if (!this.#assignedQuestions.length)this.finishGame(true);
            };
            this.assignPlayerQuestions();
        }
        else{
            playIncorrect();
        };
    };

    //Checks if player is visiting a house
    checkHouse(road) {
        let player = this.#player1;

        if (road.get_house()){
            if(inBounds(road.get_house().get_xBounds()[0],player.get_x(),player.get_x()+player.get_width())){
                if(inBounds(road.get_house().get_yBounds()[0],player.get_y(),player.get_y())){
                    this.checkAnswer(road.get_house());
                };
            };
        }; 
    };

    //Checks if the two players are colliding
    checkPlayerCollisions(x,y,height,width,) {  
        let player2 = this.#player2   
        if (inBounds([player2.get_x(),player2.get_x() + player2.get_width()],x,x) || inBounds([player2.get_x(),player2.get_x() + player2.get_width()],x+width,x + width) ) {
            if (inBounds([player2.get_y(),player2.get_y() + player2.get_height()],y,y) || inBounds([player2.get_y(),player2.get_y() + player2.get_height()],y+height,y+height) ) {
                return true
            };
        };
        return false; 
    };

    assignHouseQuestions(){

        let questionList = this.#questionList;
        let houseList = this.#map.get_houseList();

        houseList.forEach((house,i) => {

            let questionPos = getRandomInt(0,questionList.length);
            
            if (questionList.length) {
                house.set_questionAnswer(questionList[questionPos]);
                this.#assignedQuestions.push(questionList[questionPos])
    
                let index = questionList.indexOf(house.get_questionAnswer());
    
                questionList.splice(index,1);
                
            };
        });
    };

    assignPlayerQuestions(){

        let player = this.#player1
        let questionList = this.#assignedQuestions;
        player.set_question ("");

        if (questionList.length){
            
            let questionPos = getRandomInt(0,questionList.length);
            let question = questionList[questionPos].question;

            player.set_question(question);

            questionList.splice(questionPos,1)
        };

        player.set_fontSize(undefined);

        if (!(this.#mode == "preview")) {
            this.sendScore(this)  
        };
    };

    finishGame(gameCompleted){

        let winner = '1';

        if (this.#mode == "singleplayer") {
            game.set_winner("1");
            this.displayWinner();
        }
        else{
            if (this.#player1.get_answeredCount() > this.#player2.get_answeredCount()){
                winner = player1;
            }
    
            else if (this.#player2.get_answeredCount() > this.#player1.get_answeredCount()){
                winner = player2;
            }
            else winner = "draw";
        };
            
        let data = {
            gameCompleted: gameCompleted,
            winner: winner,
        };
        socket.emit("finishGame",JSON.stringify(data))
    };

    displayWinner(){

        let div = document.createElement("div");

        let message;
        
        div.className = "winner-display";
        
        if (game.get_winner() == player1) message = "You Win !!! :)";

        else if (game.get_winner() == "0") message = "Its a Draw :/";

        else{
            message = "You Lose:(";
        }

        if (this.#mode == "singleplayer") message  = "Game Completed";

        div.innerHTML = message;

        canvas_container.style.filter = `blur(10px)`;

        game_screen.appendChild(div);

        game.addPlayAgain();

        if (player1 == "1") {
            clearInterval(this.#timer);
        };
    };

    //Only player 2 uses this, which updates their timer
    updateTime(data){

        this.#minutes = data["minutes"];
        this.#seconds = data["seconds"];
        this.#timerElement.innerHTML = (this.#seconds<10)? `${this.#minutes}:0${this.#seconds}`:`${this.#minutes}:${this.#seconds}`;
    };

    sendTime(){
        if (!game.get_winner()){
            var packet = {
                minutes: this.#minutes,
                seconds: this.#seconds,
            };
            socket.emit("updateTime",JSON.stringify(packet));
        };
    };

    //this updates the position and frame of the other player in the game
    updatePlayer(data){

        this.#player2.set_x(data.x);
        this.#player2.set_y(data.y);
        this.#player2.set_walkCount(data.walkCount);
        this.#player2.set_direction(data.direction);

    
        //sets direction sprite of other player 
        switch (this.#player2.get_direction()) {
            case "east":
                this.#player2.set_directionSprite(this.#player2.get_characterSprite().get_walkEast());
                break;
        
            case "west":
                this.#player2.set_directionSprite(this.#player2.get_characterSprite().get_walkWest());
                break;

            case "north":
                this.#player2.set_directionSprite(this.#player2.get_characterSprite().get_walkNorth());
                break;

            case "south":
                this.#player2.set_directionSprite(this.#player2.get_characterSprite().get_walkSouth());
                break;
        };          
    };
    //Sends state of player to server
    sendPlayer(){
        let packet = {
            playerNum: player1,
            x: this.#player1.get_x(),
            y: this.#player1.get_y(),
            score: this.#player1.get_answeredCount(),
            answered: this.#player1.get_answered(),
            question: this.#player1.get_question() || " ",
            walkCount: this.#player1.get_walkCount(),
            direction: this.#player1.get_direction(),
            allQuestions: this.#questionList, 
            assignedQuestions: this.#assignedQuestions,
            currentRoad: this.#map.get_roadList().findIndex(this.findRoad),
            marginLeft: parseInt(window.getComputedStyle(canvas).getPropertyValue("margin-left")),
            marginTop: parseInt(window.getComputedStyle(canvas).getPropertyValue("margin-top"))
        };
        socket.emit("updatePlayer",JSON.stringify(packet));
    };

    sendScore(){
        let packet = {
            playerNum: player1,
            score: this.#player1.get_answeredCount(),
            answered: this.#player1.get_answered(),
            question: this.#player1.get_question() || "",
            allQuestions: this.#questionList, 
            assignedQuestions: this.#assignedQuestions,
        };
        socket.emit("updateScore",JSON.stringify(packet));
    };

    updateHouse(data){
        for (const [key, value] of Object.entries(data)) {
            this.#map.get_houseList()[key].set_questionAnswer(value);
        };
        this.#allQuestions = data;
    };

    sendHouse(){
        var houseQuestions = {};

        this.#map.get_houseList().forEach((house,index)=>{
            houseQuestions[`${index}`] = house.get_questionAnswer();
        });
        this.#allQuestions = houseQuestions;

        return houseQuestions;
    };

    set_score(data){
        this.#player2.set_answeredCount(data.score);
        this.#player2.set_question(data.question);
        this.#player2.get_scoreboard().set_score(this.#player2.get_answeredCount());
        this.#player2.set_fontSize(undefined);
    };

    findRoad(road){
        return road == game.get_map().get_currentRoad();
    };
    
    addPlayAgain(){
        let finishGameDiv = document.getElementById("ifGameFinished");
        finishGameDiv.hidden = false;  
    };
};

// Create CharacterSprite objects for all the characters
const blackBoy = new CharacterSprite(0,0);

const blondeGirl = new CharacterSprite(3*cellWidth,0);

const blondeBoy = new CharacterSprite(6*cellWidth,0);

const brunetteGirl = new CharacterSprite(9*cellWidth,0);

const ash = new CharacterSprite(0,4*cellHeight);

const baldGuy = new CharacterSprite(3*cellWidth,4*cellHeight);

const redHair = new CharacterSprite(6*cellWidth,4*cellHeight);

const warriorGirl = new CharacterSprite(9*cellWidth,4*cellHeight);

const characters = {
    "1": blackBoy,
    "2": blondeGirl,
    "3": brunetteGirl,
    "4": ash,
    "5": baldGuy,
    "6": redHair,
    "7": warriorGirl,
    "8": blondeBoy
};

