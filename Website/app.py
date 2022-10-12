from flask import Flask, render_template, url_for, flash, redirect, session, jsonify, make_response
from flask import json
from flask.globals import request
from flask.json import load
from flask_user import decorators
from flask_user.decorators import roles_required
from forms import RegistrationForm, LoginForm
import os
from datetime import datetime
from database import *
from flask_login import LoginManager, login_user,current_user,logout_user,login_required
from functools import total_ordering, wraps
from flask_socketio import SocketIO, emit,send,join_room, leave_room,disconnect
import socket
import time
import functools
import logging
from playGame import *

from engineio.payload import Payload

Payload.max_decode_packets = 100

#Creating instance for web application
app =Flask(__name__)
app.config['JSON_SORT_KEYS'] = False

SECRET_KEY = os.urandom(32)
app.config['SECRET_KEY'] = SECRET_KEY
socketio = SocketIO(app)

login_manager = LoginManager(app)

login_manager.login_view = "login"

login_manager.login_message_category = "info"

log = logging.getLogger('werkzeug')
log.setLevel(logging.ERROR)

@login_manager.user_loader
def load_user(user_id):
    try:
        return User.user_objects[str(user_id)]
    except:
        return None

#Copied from stack overflow
def authenticated_only(f):
    @functools.wraps(f)
    def wrapped(*args, **kwargs):
        if not current_user.is_authenticated:
            disconnect()
        else:
            return f(*args, **kwargs)
    return wrapped

def admin_only(f):
    @functools.wraps(f)
    def wrapped(*args, **kwargs):
        if not current_user.get_role3() == "admin":
            disconnect()
        else:
            return f(*args, **kwargs)
    return wrapped

#Defining Pages
#Route to get to this page(option)
@app.route('/')
def home():

    if current_user.is_authenticated:
        session["url"] = "home"

    return render_template('index.html', title="Home",onload="")
    #Onload takes a body onload function that will be defined
    #on the client side

@app.route('/games')
@login_required
def games():

    if current_user.get_role1() in ["student","teacher"]:

        session["url"] = "games"
        
        return render_template('games.html', title="Games",onload="")

    else:
        flash('Unauthorised Access', 'danger')
        return redirect(url_for(session["url"]))

@app.route('/forum',methods =['GET', 'POST'])
@login_required
def forum():
    
    session["url"] = "forum"
                
    if request.method == "POST":
        req = request.get_json() if request.get_json()  else {"category":""}
            
        if req["category"] == "reset-goToPost": 

            session["goToPostID"] = ""
            
        elif req["category"]== "delete-post":
            Post.instantDelete(req,current_user)
            return jsonify(True)
            
        elif req["category"]== "restore-post":
            Post.restorePost(req,current_user)
            return jsonify(True)

    return render_template('forum.html', title="Forum",onload="")
        
@app.route('/register',methods =['GET', 'POST'])
def register():
    form=RegistrationForm()

    if current_user.is_authenticated:
        return redirect(url_for('home'))

    if form.validate_on_submit():
        
        flash(f'Account created for {form.username.data} !', 'success')

        #Logs userin
        user = User.registerUser(form)
        
        login_user(user)
        
        session["user"] = current_user.get_username().upper()
        
        session["roomID"] = ""

        flash(f'Welcome {form.username.data} !', 'success')
        
        return redirect(url_for('home'))


    return render_template('register.html', title='Register', form=form,onload="")

@app.route('/login',methods =['GET', 'POST'])
def login():
    form=LoginForm()

    if current_user.is_authenticated:

        return redirect(url_for('home'))

    if form.validate_on_submit():

        if get_password(form.username.data) == customHash(form.password.data):
            
            #Gets user object, if another user is logged into the same account
            oldUser = User.find_user(form.username.data.upper())
                
            if oldUser:
                oldUser.logout()
                sid = oldUser.get_sid()

                socketio.emit("logout", json.dumps({"url": url_for("logout")}),room=sid)
                #json.dumps converts to json 
                                
                flash(f'Error Occurred. Try again', 'danger')
                
                return render_template('login.html', title='Login', form=form,onload="")

            #Adds url key to user's session
            session.update({"url":''})

            user = User.loginUser(form)
            
            login_user(user,form.remember.data)
               
            session["user"] = current_user.get_username().upper()
            
            session["roomID"] = ""

            flash(f'Welcome {form.username.data} !', 'success')
            
            return redirect(url_for('home'))

        else:
            flash(f'Login Unsuccessful. Please Check Username or Password', 'danger')
    
    return render_template('login.html', title='Login', form=form,onload="")

@app.route('/games/create-game',methods =['GET', 'POST'])
@login_required
def createGame():

    session["url"] = "createGame"

    if request.method == "POST":
        req = request.get_json() 
        if req:
            if req["type"] == "create-game":
                Game.saveGame(req,current_user)
                return jsonify(True)

            if req["type"] == "preview-game":
                Gameplay.previewGame(req,current_user)  
                return jsonify(True)

    return render_template('buildGame.html', title="Build Game",mode="Create",onload="")

@app.route('/games/edit-game',methods =['GET', 'POST'])
@login_required
def editGame():
    session["url"] = "editGame"

    if request.method == "POST":
        req = request.get_json() 
        if req:            
            if req["type"] == "edit-game":
                Game.editGame(req,current_user) 
                return jsonify(True)
                 
            elif req["type"] == "get-game-variables":
                    #Gets preview game variables 
                    packet = {
                        "name": current_user.get_gameToEdit().get_name(),
                        "map": current_user.get_gameToEdit().get_map(),
                        "questions": current_user.get_gameToEdit().get_questions(),
                        "duration": current_user.get_gameToEdit().get_duration(),
                        "speed": current_user.get_gameToEdit().get_speed()
                    }
                    return jsonify(packet)
    
    return render_template('buildGame.html', title="Edit Game", mode="Edit",onload="")

@app.route('/games/my-games',methods =['GET', 'POST'])
@login_required
def myGames():
    session["url"] = "myGames"

    if request.method == "POST":

        req = request.get_json() 

        if req:
            if req["type"] == "add-game":
                Class.addGameToClass(req,current_user)
                return jsonify(True)

            elif req["type"] == "remove-game":
                Class.removeGameFromClass(req,current_user)
                return jsonify(True)

            elif req["type"] == "delete-game":
                Game.deleteGame(req,current_user)
                return jsonify(True)

            elif req["type"] == "multiplayer":
                if current_user.get_room():
                    room=current_user.get_room()
                    room.remove_occupant(current_user)
                    
                user = User.find_user(session["user"])
                
                gameExists = Gameplay.setMultiplayerGame(req,user)
                if gameExists:
                    session["gameMode"] = "multiplayer"
                    session["roomID"] = current_user.get_room().get_roomID()
                    session["playerIndex"] = "1"
                    return jsonify(True)
                
            elif req["type"] == "singleplayer":
                gameExists = Gameplay.setSinglePlayerGame(req,current_user)
                if gameExists:
                    session["gameMode"] = "singleplayer"
                    session["playerIndex"] = "1"
                    return jsonify(True)
                
            elif req["type"] == "edit-game":
                Game.setGameToEdit(req,current_user)
                return jsonify(True)

    return render_template('myGames.html', title="My Games",user=current_user,onload="")

@app.route('/games/my-classes',methods =['GET', 'POST'])
@login_required
def myClasses():
    if current_user.get_role1() == "teacher":

        session["url"] = "myClasses"

        if request.method == "POST":
            req = request.get_json() 
            if req:
                if req["type"] == "remove-student":
                    Class.removeStudent(req,current_user)
                    return jsonify(success=True)

                elif req["type"] == "delete-class":
                    Class.deleteClass(req,current_user)
                    return jsonify(success=True)
                
                elif req["type"] == "create-class":
#                    
                    classObj = Class.createClass(req,current_user)
                    
                    #If classObj is none then there was and error
                    packet = {
                        "success": True if classObj else False, 
                        "id": classObj.get_displayID() if classObj else False,
                        "name": classObj.get_name() if classObj else False
                    }
                    return jsonify(packet)

        return render_template('myClasses.html', title="MyClasses",user=current_user,onload="")

    else:
        flash('Unauthorised Access', 'danger')
        return redirect(url_for(session["url"]))

@app.route('/inbox',methods =['GET', 'POST'])
@login_required
def inbox():

    session["url"] = "inbox"
    if request.method == "POST":
        req = request.get_json() 

        if req:
            if req["type"]== "mark-as-read-forum-inbox":
                ForumInbox.markAsRead(req,current_user)
                return jsonify(True)
                
            elif req["type"]== "mark-as-read-class-requests":
                ClassRequest.markAsRead(req,current_user)
                return jsonify(True)
                
            elif req["type"] == "go-to-post":
                session["goToPostID"] = req["PostID"]
                return jsonify(True)

            elif req["type"] == "delete-forum-noti":
                ForumInbox.deleteNoti(req,current_user)
                return jsonify(True)

            elif req["type"] == "delete-class-noti":
                ClassRequest.deleteNoti(req,current_user)
                return jsonify(True)
            
            elif req["type"] == "accept-class-request":
                message,className = Class.addStudentToClass(req,current_user)
                packet = {
                    "success": False if message else True,
                    "message": message,
                    "className": className.upper()
                }                
                return jsonify(packet)
            
                

    return render_template('inbox.html', title="Inbox",onload="")

@app.route('/manage-reports',methods =['GET', 'POST'])
@login_required
def manageReports():
    if current_user.get_role2() == "moderator":

        session["url"] = "inbox"
        if request.method == "POST":
            req = request.get_json() 
            
            if current_user.get_role2() != "moderator":
                flash("Unauthorised Access")
                return redirect(url_for(session["url"]))
            if req:
                if req["type"] == "delete-post":
                    Report.markPostAsDeleted(req,current_user)
                    return jsonify(True)
                    
                elif req["type"] == "dismiss-report":
                    Report.dismissPost(req,current_user)
                    return jsonify(True)
                    
        allReports = Report.allReports
        
        allReports = sortDateTime(allReports)
        
        allReports.reverse()
        
        return render_template('reports.html', title="Reports",allReports=allReports,onload="")
        
    else:
        flash('Unauthorised Access', 'danger')
        return redirect(url_for(session["url"]))

@app.route('/manage-moderators',methods =['GET', 'POST'])
@login_required
def manageModerators():
    if current_user.get_role3() == "admin":
        session["url"] = "inbox"
        if request.method == "POST":
            req = request.get_json() 
            if req:
                if req["type"]== "assign-moderator":
                    feedback = Role.assignModerator(req,current_user)
                    packet = {
                        "success": False if feedback else True,
                        "feedback": feedback
                    }
                    return jsonify(packet)
                    
                elif req["type"]== "demote-moderator":
                    Role.demoteModerator(req,current_user)
                    return jsonify(True)
                    
        allModerators = Role.allModerators
        return render_template('makeModerator.html', 
                               title="Assign Moderators",
                               onload="",allModerators=allModerators)
    else:
        flash('Unauthorised Access', 'danger')
        return redirect(url_for(session["url"]))

@socketio.on('connect')
def test_connect():
    if current_user.is_authenticated:
        current_user.set_sid(request.sid)
                        
        deleteInactiveRooms()
    
@app.route('/logout')
@login_required
def logout():
        
    room=current_user.get_room()
    if room:
        room.remove_occupant(current_user)

    current_user.logout()
    session.clear()
    logout_user()
    
    flash(f'Logout Successful', 'success')
    return redirect(url_for('login'))
    

#Main Game Pages
@app.route('/games/multiplayer-game',methods =['GET', 'POST'])
@login_required
def multiPlayer():
    user = current_user
    room = user.get_room()
    if room:
        game = room.get_game()
        if game:
            if room.get_playerJoined():
                if game.get_charactersSelected():
                    session["url"] = "multiPlayer"
                    return render_template('mainGame.html', title="Multiplayer Game",mode="multiplayer",onload="getGameVariables()")
    return redirect(url_for("myGames"))
 
@app.route('/games/singleplayer-game',methods =['GET', 'POST'])
@login_required
def singlePlayer():
    room = current_user.get_room()
    if room:
        game = room.get_game()
        if game:
            if room.get_playerJoined():
                if game.get_charactersSelected():
                    
                    session["url"] = "singlePlayer"

                    return render_template('mainGame.html', title="Single Player Game",mode="singleplayer",onload="getGameVariables()")
    
    return redirect(url_for("myGames"))

@app.route('/games/join-game',methods =['GET', 'POST'])
@login_required
def joinGame():

    session["url"] = "joinGame"
    
    session["gameMode"] = "multiplayer"

    return render_template('joinGame.html', title="Join Game")

@app.route('/games/choose-character',methods =['GET', 'POST'])
@login_required
def chooseCharacter():
 
    room = current_user.get_room()
    if room:
        game = room.get_game()
        if game:
            if room.get_playerJoined():
                if not game.get_charactersSelected():
                    
                    playerIndex = room.getPlayerIndex(current_user)
                    session["playerIndex"] = str(playerIndex+1)
                    session["roomID"] = room.get_roomID()

                    return render_template('chooseCharacter.html', 
                                           title="Choose Character",
                                           onload=f"joinRoom('{session['roomID']}')")

    return redirect(url_for("myGames"))

@app.route('/games/waiting-for-player',methods =['GET', 'POST'])
@login_required
def waitingForPlayer():
    room = current_user.get_room()
    if room:
        game = room.get_game()
        if game:
            session["gameMode"] = "multiplayer"
            
            room.set_waitingForPlayer(True)

            session["url"] = "waitingForPlayer"

            return render_template('waitingForPlayer.html',
                                   title="Waiting for Player",
                                   onload=f"joinRoom(`{session['roomID']}`)" )

    return redirect(url_for("myGames"))

@app.route('/games/preview-game',methods =['GET', 'POST'])
@login_required
def previewGame():

    session["url"] = "previewGame"
    
    return render_template('mainGame.html', title="Preview Game",
                           mode="preview",onload="getPreviewVariables()")
   

#Socket Events For Main Game
    
@socketio.on('joinPrivateRoom')
@authenticated_only
def joinPrivateRoom(data):
    if session["roomID"]: leave_room(session["roomID"])

    data = json.loads(data)
    user = User.find_user(session["user"])
    
    if user.get_room():
        room=user.get_room()
        room.remove_occupant(user)
        
    room = Room.findPrivateRoom(data["roomID"],user)

    if room:
        Room.joinRoom(user,room)

        session["roomID"] = room.get_roomID()
                
        join_room(room.get_roomID())

        emit("joinedRoom",json.dumps({"name":user.get_username()}),room=room.get_roomID())                
    
    else:
        emit("noGame",broadcast=False)

        
@socketio.on('joinPublicRoom')
@authenticated_only
def joinPublicRoom():
    if session["roomID"]: leave_room(session["roomID"])

    user = User.find_user(session["user"])
        
    if user.get_room():
        room=user.get_room()
        room.remove_occupant(user)
        
    room = Room.findPublicRoom()
    
    if room:

        Room.joinRoom(user,room)
        
        session["roomID"] = room.get_roomID()
        
        join_room(room.get_roomID())

        emit("joinedRoom",json.dumps({"name":user.get_username()}),room=room.get_roomID())
    else:
        emit("noGame")
           
@socketio.on('join')
def on_join(data):
    data = json.loads(data)
    join_room(data["room"])

@socketio.on('character-selected')
@authenticated_only
def chooseCharacter(player):   

    player = json.loads(player)
    
    room = current_user.get_room()
    
    if not room:
        return -1
    
    game = room.get_game()

    if not game.get_started():
        game.set_playerSprite(session["playerIndex"],player["sprite"])
        
        if game.get_mode() == "singleplayer":
            emit("character-selected",broadcast=False)   

        if not session["playerIndex"] in game.get_readyPlayers():
            game.add_readyPlayer(session["playerIndex"])
            
            if len(game.get_readyPlayers()) == 2:
                game.set_charactersSelected(True)
                    
                if game.get_mode() == "multiplayer":
                    emit("character-selected",room=session["roomID"])   

    room.set_timeStamp()
      
@socketio.on('establishGame')
@authenticated_only
def establishGame(data):
    data = json.loads(data)

    room = current_user.get_room()
    
    if not room:
        return -1
    
    game = room.get_game()
    
    game.set_houseQuestions(data["houses"])
    
    if game.get_mode() == "multiplayer":
        emit("establishGame",json.dumps(data),room=session["roomID"])
        
    current_user.get_room().set_timeStamp()

@socketio.on('getPreviewVariables')
@authenticated_only
def getPreviewVariables():
    
    sid = current_user.get_sid()
    
    emit("previewVariables",json.dumps(current_user.get_previewGameState()),room=sid)
    
@socketio.on('getGameVariables')
@authenticated_only
def getGameVariables():
    
    data = {}
    room = current_user.get_room()
    
    if not room:
        return -1
    
    game = room.get_game()
    data["gameState"] = game.get_state()
    data["playerIndex"] = session['playerIndex']
    data["gameStarted"] = game.get_started() 
    data["roomID"] = room.get_roomID()
    data["gameMode"] = session['gameMode']
        
    sid = current_user.get_sid()

    emit("gameVariables",json.dumps(data),room=sid)     

@socketio.on('updateTime')
@authenticated_only
def updateTime(data):

    data = json.loads(data)
    room = current_user.get_room()
    
    if not room:
        return -1
    
    game = room.get_game()

    if  session["playerIndex"] == "1":
        game.set_gameTime(data["minutes"],data["seconds"])
    
    if game.get_mode() == "multiplayer":
        emit("updateTime",json.dumps(data),room=session["roomID"])

    current_user.get_room().set_timeStamp()

@socketio.on('updatePlayer')
@authenticated_only
def updatePlayer(data):

    data = json.loads(data)

    room = current_user.get_room()
    
    if not room:
        return -1

    game = room.get_game()
    
    game.set_playerState(session["playerIndex"],
                         data["x"],
                         data["y"],
                         data["walkCount"],
                         data["direction"],
                         data["currentRoad"],
                         data["marginTop"],
                         data["marginLeft"]
                         )

    if game.get_mode() == "multiplayer":
        emit("updatePlayer",json.dumps(data),room=session["roomID"])
        
    current_user.get_room().set_timeStamp()

@socketio.on('startGame')
@authenticated_only
def startGame():
    
    room = current_user.get_room()
    
    if not room:
        return -1
    
    game = room.get_game()

    game.set_started(1) 
    
    game.set_startStamp(time.time())
    
    if game.get_mode() == "multiplayer":
        emit("startGame",room=session["roomID"])
      
    current_user.get_room().set_timeStamp()

@socketio.on('updateScore')
@authenticated_only
def updateScore(data):

    data = json.loads(data)

    room = current_user.get_room()

    if not room:
        return -1

    game = room.get_game()
        
    game.set_playerScore(session["playerIndex"],data["score"],data["question"]
                         ,data["allQuestions"],data["assignedQuestions"],data["answered"])

    if game.get_mode() == "multiplayer":
        emit("updateScore",json.dumps(data),room=session["roomID"])

    current_user.get_room().set_timeStamp()

@socketio.on('finishGame')
@authenticated_only
def finishGame(data):

    data = json.loads(data)
    
    winner  = str(data["winner"])
        
    room = current_user.get_room()
    
    if not room:
        return -1
    
    game = room.get_game()

    game.set_finishStamp()
    
    if winner == "1":
        if data["gameCompleted"]:
            Gameplay.updateLeaderboard(game.get_player1())

    elif winner == "2":
        if data["gameCompleted"]:
            Gameplay.updateLeaderboard(game.get_player2())
    else:
        winner = "0"
    
    data["winner"] = winner
        
    game.set_winner(winner)

    emit("finishGame",json.dumps(data),room=session["roomID"])
    
    room.set_timeStamp()

@socketio.on('restartGame')
@authenticated_only
def restartGame():
    
    user = current_user
    
    room = user.get_room()
    if not room:
        return -1
    game = room.get_game()
    mode = game.get_mode()
    toRestartGame = game.get_toRestartGame()
            
    if user.get_username() not in toRestartGame:
        game.add_toRestartGame(user.get_username())
        if mode == "multiplayer":
            send(json.dumps({"message":"Your Opponent wants to play again ?","category":"info"})
                 ,room=session["roomID"],include_self=False)      
            
    if len(toRestartGame) == 2 or mode == "singleplayer":

        game.restart()
            
        if mode == "multiplayer":
            emit("restartGame",room=session["roomID"])
            return ""
        else:
            sid = current_user.get_sid()
            if sid:
                emit("restartGame",room=sid)
    user.get_room().set_timeStamp()
      
@socketio.on('leaveGame')
@authenticated_only
def leaveGame():
    
    room = current_user.get_room()
    game = room.get_game()

    if game.get_mode() == "multiplayer":
        send(json.dumps({"message":current_user.get_username() + ' has left the Game.',"category":"info"}), room=session["roomID"],include_self=False)

    room=current_user.get_room()
    leave_room(session["roomID"])
    session["roomID"]=""
    room.remove_occupant(current_user)
    
@socketio.on('leave')
@authenticated_only
def on_leave(data):
    username = data['username']
    room = data['room']

@socketio.on('disconnect')
def test_disconnect():   
    if current_user.is_authenticated:
        pass
    print('Client disconnected')


#Socket Events For Forum
@socketio.on('startThread')
@authenticated_only
def startThread(data):
    data = json.loads(data)
    threadObject,feedback = Post.startThread(data,current_user)
    
    if threadObject:
        emit("startThread",json.dumps(threadObject),broadcast=False)
    else:
        sid = current_user.get_sid()
        if sid:
            if feedback == "language": emit("inappropriatePost",room=sid)
            else: emit("invalid-post",room=sid)

@socketio.on('reply')
@authenticated_only
def reply(data):
    
    data = json.loads(data)
    
    replyObject,threadID,parentPostUsername,feedback = Post.reply(data,current_user)
    
    if replyObject:   
        dataPacket = {
            "reply": replyObject,
            "threadID": threadID
        }
        sid = current_user.get_sid()
        if sid:
            emit("reply",json.dumps(dataPacket),room=sid)
        
        if parentPostUsername: 
            user = User.find_user(parentPostUsername.upper())
            
            sid = user.get_sid() if user else None
            if sid:
                emit("updateInboxAlert",json.dumps({"type":"forumInbox","value":1}),room=sid)
                message = f"{current_user.get_username().upper()} has replied to your post !!"
                emit("flashMessage",json.dumps({"message":message,"category":"info"}), room=sid)
    else:
        sid = current_user.get_sid()
        if sid:
            if feedback == "language": emit("inappropriatePost",room=sid)
            elif feedback == "invalid" : emit("invalid-post",room=sid)
            elif feedback == "not-exist": emit("not-exist",room=sid)
              
@socketio.on('report')
@authenticated_only
def report(data):
    
    data = json.loads(data)

    feedback = Post.report(data,current_user)
    sid = current_user.get_sid()        
    if sid:
        if feedback:
            emit("report-feedback",json.dumps({"message":feedback,"category": "danger"}),room=sid)
        else:
            emit("report-feedback",json.dumps({"message":"Thank you for your concern","category": "success"}),room=sid)    
                    
@socketio.on('sort-threads')
@authenticated_only
def sortThreads(data):
    data = json.loads(data)
    
    current_user.set_sortThreadsBy(data["sortBy"])
        
    emit("sort",room=current_user.get_sid())

@socketio.on('sort-replies')
@authenticated_only
def sortReplies(data):
    data = json.loads(data)
    
    current_user.set_sortRepliesBy(data["sortBy"])

    emit("sort",room=current_user.get_sid())

@socketio.on('loadForum')
@authenticated_only
def sendForum(): 
    
    user = User.find_user(session["user"])
    threads,replies = Post.getPosts(user)
    packet = {
        "replies": replies,
        "threads": threads
    }
    sid = current_user.get_sid()      
    if sid:
        emit("loadForum",json.dumps(packet),room=sid)
 

#Socket Events For Class Managaement
@socketio.on('sendClassRequest')
@authenticated_only
def sendClassRequest(data):
    
    data = json.loads(data)
    message = ClassRequest.sendClassRequest(data,current_user)
    emit("classRequestFeedback",json.dumps({"message":message}),room=request.sid)
    if not message:
        user =  User.find_user(data["studentName"].upper())
        sid = user.get_sid() if user else None
        if sid:
            emit("updateInboxAlert",json.dumps({"type":"classRequest","value":1}),room=sid)
            message = f"{current_user.get_username().upper()} has invited you to join their Class !!"
            emit("flashMessage",json.dumps({"message":message,"category":"info"}), room=sid)

#Socket Events For Inbox
@socketio.on('acceptClassRequest')
@authenticated_only
def acceptClassRequest(data):

    data = json.loads(data)
    message,className = Class.addStudentToClass(data,current_user)
    
    category = "danger" if message else "success"
    message = message if message else f"You have been successfully added to Class {className.upper()}"
    
    sid = current_user.get_sid()        
    if sid: 
        send(json.dumps({"category": category,"message": message}),room=sid)
        emit("updateInboxAlert",json.dumps({"type":"classRequest","value":-1}),room=sid)

@socketio.on('updateInboxAlert')
@authenticated_only
def updateInboxAlert():
    
    sid = current_user.get_sid()  
    if sid:
        emit("updateInboxAlert",json.dumps({"type":"classRequest","value":-1}),room=sid)
            

def deleteInactiveRooms():
    inactiveRooms = Room.getInactiveRooms()
    for room in inactiveRooms:
        for username in room.get_occupants():
            user = User.find_user(username)
            if user:
                sid = user.get_sid()
                emit("idleRoom",room=sid)
                room.remove_occupant(user)          

s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
s.connect(('8.8.8.8', 1))  # connect() for UDP doesn't send packets
local_ip_address = s.getsockname()[0]
port = 5000
print(f"{local_ip_address}:{port}")

Post.loadForum()
Report.loadReports()
Role.set_moderators()

if __name__== '__main__':
    socketio.run(app,host=local_ip_address,port=port,debug=True)
