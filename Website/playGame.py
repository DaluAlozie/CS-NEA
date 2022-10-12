import copy
import random

import datetime

from wtforms.validators import ValidationError
from utilities import *
import time

from utilities import *

import sqlite3

from database import Game

createRoomID = generateCode(6)

class Room():

    activeRooms = []
    publicRooms = []
    privateRooms = []
    allRooms = []
    maxOccupants = 2
    roomObjects = {}
    
    def __init__(self,mode,scope):
        
        self.__timeStamp = time.time()
        
        self.__scope = scope
        
        self.__waitingForPlayer = False
        
        self.__playerJoined = False
        
        self.__mode = mode
 
        if mode == "multiplayer":
            self.__roomID = createRoomID()
            
            while str(self.__roomID) in Room.activeRooms:
                self.__roomID = createRoomID()

            self.__roomID = str(self.__roomID)
            if scope == "public":
                Room.publicRooms.append(self.__roomID)
                
            if scope == "private":
                Room.privateRooms.append(self.__roomID)
                
            Room.activeRooms.append(self.__roomID)
            Room.roomObjects[self.__roomID] = self
            
        elif mode == "singleplayer":
            self.__roomID = -1

        Room.allRooms.append(self)
        self.__occupants = []
        self.__game = ""
     
    #Getters
    
    def get_roomID(self):
        return self.__roomID
           
    def get_mode(self):
        return self.__mode   
    
    def get_scope(self):
        return self.__scope
    
    def get_waitingForPlayer(self):
        return self.__waitingForPlayer
    
    def get_playerJoined(self):
        return self.__playerJoined
    
    def get_timeStamp(self):
        return self.__timeStamp
    
    def get_occupants(self):
        return self.__occupants
    
    def get_game(self):
        return self.__game
    
    
    #Setters
    
    def set_waitingForPlayer(self,state):
        self.__waitingForPlayer = state
        
    def set_playerJoined(self,state):
        self.__playerJoined = state
        
    def set_game(self,game):
        self.__game = game
        
    def set_timeStamp(self):
        self.__timeStamp = time.time()

    def add_occupant(self,player):
        self.__occupants.append(player)

    def remove_occupant(self,player):
        player.set_room(None)
        player.set_player(None)

        self.__occupants.remove(player.get_username())
        if self.isEmpty():
            if self.__roomID in Room.activeRooms: 
                Room.activeRooms.remove(self.__roomID) 
                
                if self.__scope == "private":
                    Room.privateRooms.remove(self.__roomID) 

                elif self.__scope == "public":
                    Room.publicRooms.remove(self.__roomID)
            
            Room.allRooms.remove(self)
                    
            del self
            
    
    def isFull(self):
        return len(self.__occupants) >= Room.maxOccupants

    def isEmpty(self):
        return len(self.__occupants) == 0

    def getPlayerIndex(self,player):
        return self.__occupants.index(player.get_username())

    @staticmethod
    def getRoom(roomID):
        return Room.roomObjects[roomID]

    @staticmethod
    def findPublicRoom():
        chosen = False
        checked = []
        room = ""            
        loopCount = 0

        while not chosen:
            if not len(Room.publicRooms):
                break
            index = random.randint(0,len(Room.publicRooms)-1)
            
            roomID = Room.publicRooms[index]
            
            if not roomID in checked: #if room hasnt already been checked

                checked.append(roomID)
                
                room = Room.roomObjects[str(roomID)]
                
                if (not room.get_playerJoined()) and (not room.get_game().get_started()):
                    chosen = True
            #if all the public rooms are full 
            if all([Room.roomObjects[str(roomID)].isFull() for roomID in Room.publicRooms]):
                room = ""
                break
            
            if len(checked) > len(Room.publicRooms):
                room = ""
                break
            
            if loopCount > len(Room.publicRooms):
                room = ""
                break
            
            loopCount +=1
                               
        return room

    @staticmethod
    def findPrivateRoom(roomCode,user):
        
        if roomCode in Room.privateRooms:
            room = Room.roomObjects[roomCode] 
            if (not room.isFull()) & (not room.get_game().get_started()):  
                    if not user.get_username() in room.get_occupants():                
                        Room.joinRoom(user,room)
                        return room
        return False

    @staticmethod
    def getInactiveRooms():
        currentTime = time.time()
        return [room for room in Room.allRooms if abs(currentTime - room.get_timeStamp()) >= 900 ]
    
    @staticmethod
    def joinRoom(user,room):
        room.get_game().set_player2(user)

        room.add_occupant(user.get_username())
        
        room.set_playerJoined(True)
        
        room.set_waitingForPlayer(False)
        
        user.set_room(room)
                
        user.get_room().set_timeStamp()
        
class Gameplay():

    def __init__(self, map,questions,duration,speed,mode,gameRecordID):
        self.__started = 0
        self.__charactersSelected = False
        self.__mode = mode
        self.__state = {
            "mode": mode,
            "map_grid": map,
            "minutes": duration,
            "seconds": 0,
            "speed": speed,
            "houseQuestions": {},
            "winner": 0,
            "1": {
                "x": 130,
                "y": 200,
                "sprite": "",
                "position": "left",
                "question": "",
                "answered": [],
                "score": 0,
                "allQuestions": questions,
                "assignedQuestions": [],
                "walkCount": 0,
                "direction": "north",
                "currentRoad": 0,
                "marginLeft": 0,
                "marginTop": 0,
            },
            "2": {
                "x": 180,
                "y": 200,
                "sprite": "",
                "position": "right",
                "question": "",
                "answered": [],
                "score": 0,
                "allQuestions": questions,
                "assignedQuestions": [],
                "walkCount": 0,
                "direction": "north",
                "currentRoad": 0,
                "marginLeft": 0,
                "marginTop": 0
            }
        }

        self.__initialState = copy.deepcopy(self.__state)
        self.__readyPlayers = []    
        self.__gameRecordID = gameRecordID
        self.__toRestartGame = []
        self.__player1 = None
        self.__player2 = None
        self.__startStamp = 0
        self.__finishStamp = 0
         
    #Getters
    
    def get_started(self):
        return self.__started
    
    def get_state(self):
        return self.__state
    
    def get_charactersSelected(self):
        return self.__charactersSelected
    
    def get_readyPlayers(self):
        return self.__readyPlayers
    
    def get_gameRecordID(self):
        return self.__gameRecordID
    
    def get_toRestartGame(self):
        return self.__toRestartGame
    
    def get_startStamp(self):
        return self.__startStamp
    
    def get_finishStamp(self):
        return self.__finishStamp
    
    def get_player1(self):
        return self.__player1
    
    def get_player2(self):
        return self.__player2
    
    def get_mode(self):
        return self.__mode
    
    #Setters
    def set_started(self,state):
        self.__started = state
        
    def set_charactersSelected(self,state):
        self.__charactersSelected = state
        
    def add_readyPlayer(self,player):
        self.__readyPlayers.append(player)
        
    def add_toRestartGame(self,player):
        self.__toRestartGame.append(player)
        
    def set_startStamp(self,time):
        self.__startStamp = time
    
    def set_finishStamp(self):
        self.__finishStamp = time.time() 
        
    def set_player1(self,player):
        self.__player1 = player
        
    def set_player2(self,player):
        self.__player2 = player
        
    def set_gameTime(self,minutes,seconds):
        self.__state["minutes"]  = minutes
        self.__state["seconds"]  = seconds

    def set_winner(self,winner):
        self.__state["winner"]  = winner
        
    def set_playerState(self,playerIndex,x,y,walkCount,direction,currentRoad,marginTop,marginLeft):
        self.__state[playerIndex]["x"] = x
        self.__state[playerIndex]["y"] = y
        self.__state[playerIndex]["walkCount"]  = walkCount
        self.__state[playerIndex]["direction"]  = direction
        self.__state[playerIndex]["currentRoad"]  = currentRoad
        self.__state[playerIndex]["marginTop"]  = marginTop
        self.__state[playerIndex]["marginLeft"]  = marginLeft
        
    def set_playerScore(self,playerIndex,score,question,allQuestions,assignedQuestions,answered):

        self.__state[playerIndex]["score"]  = score
        self.__state[playerIndex]["question"]  = question
        self.__state[playerIndex]["allQuestions"]  = allQuestions
        self.__state[playerIndex]["assignedQuestions"]  = assignedQuestions
        self.__state[playerIndex]["answered"]  = answered
        
    def set_playerSprite(self,playerIndex,sprite):
        
        self.__state[playerIndex]["sprite"] = sprite
        self.__initialState[playerIndex]["sprite"] = sprite
    
    def set_houseQuestions(self,houseQuestions):
        self.__state["houseQuestions"] = houseQuestions

    def restart(self):
        self.__started = 0
        self.__toRestartGame = []
        self.__state = copy.deepcopy(self.__initialState) 
    
    @staticmethod   
    def updateLeaderboard(winner):
        with sqlite3.connect("Users.db") as conn:
            cursor = conn.cursor()

            game = winner.get_room().get_game()
            gameID = game.get_gameRecordID()
            

            findGame = findObject(Game.allGames)
            targetGame = findGame("id",gameID)
            
            if targetGame:
                
                command = (f"""INSERT INTO LeaderBoards 
                           (Time, DateTime, GameID, PlayerID) 
                           VALUES (?, ?, ?, ?) """)
                timeTaken = game.get_finishStamp() - game.get_startStamp()
                values = (timeTaken, str(datetime.datetime.now()), 
                          targetGame.get_id(), winner.get_id())
                
                cursor.execute(command,values)

            conn.commit()
            
            if targetGame:
                targetGame.set_averageTime()
                targetGame.set_leaderboard()
    
    @staticmethod
    def setMultiplayerGame(obj,user):
    
        findGame = findObject(Game.allGames)
        gameRecord = findGame("displayID",obj["GameID"])
        if not gameRecord:
            return False
        
        game = Gameplay(
            gameRecord.get_map(),
            gameRecord.get_questions(),
            gameRecord.get_duration(),
            gameRecord.get_speed(),
            "multiplayer",
            gameRecord.get_id()
        )     
        
        game.set_player1(user)
        
        room = Room("multiplayer",obj["Scope"])
        room.add_occupant(user.get_username())
        room.set_game(game)
        
        user.set_room(room)
        
        return True

    @staticmethod
    def setSinglePlayerGame(obj,user):
        
        findGame = findObject(Game.allGames)
        gameRecord = findGame("displayID",obj["GameID"])
        if not gameRecord:
            return False
        
        game = Gameplay(
            gameRecord.get_map(),
            gameRecord.get_questions(),
            gameRecord.get_duration(),
            gameRecord.get_speed(),
            "singleplayer",
            gameRecord.get_id()
            ) 
            
        game.add_readyPlayer("temp")
        game.set_player2(object())
        game.set_player1(user)
        
    
        room = Room("singleplayer","")
        room.set_playerJoined(True)
        room.set_waitingForPlayer(False)
        room.add_occupant(user.get_username())
        room.set_game(game)
        
        user.set_room(room)
        
        return True   
        
    @staticmethod
    def previewGame(obj,user):
        user.set_previewGameState(obj["map"],obj["speed"],obj["questionAnswers"])
  