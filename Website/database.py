import sqlite3

from flask_login import UserMixin

import datetime

from wtforms.validators import ValidationError

import time

import random

import json

from utilities import *

from badwordsAPI import checkBadwords

import base64



sortDateTime=sortBy(original_function = timSort,attribute = ".get_dateTime()")
sortReply=sortBy(original_function = timSort,attribute = ".get_replyCount()")
sortDateTimeDict=sortBy(original_function = timSort,attribute = "['dateTime']")


class User(UserMixin):
    user_objects = {}
    allUsers = []
    requestIDs = {}

    def __init__(self,form,username,password):

        self.__sortThreadsBy = "0"
        
        self.__sortRepliesBy = "0"

        self.__username = username.upper()
        
        self.__id = username

        User.allUsers.append(self)

        self.__role1 = None
        
        self.__role2 = None
        
        self.__role3 = None
        
        self.__allRoles = [self.__role1,self.__role2,self.__role2]

        self.__games = []

        self.__classes = []

        self.__previewGameState = {}

        self.__gameToEdit = object()
        
        self.__room = None
        
        self.__unreadInboxCount = 0
                    
        self.__inbox = []
        
        self.__classRequests = []
        
        self.__forumInbox = []
        
        self.__sid = None    
        
        self.set_id()

        self.set_roles()

        self.set_games()

        self.set_classes()
        
        self.set_inbox()
            
    #Getters
    
    def get_id(self):
        return self.__id 
    
    def get_username(self):
        return self.__username
    
    def get_games(self):
        return self.__games
      
    def get_classes(self):
        return self.__classes 
     
    def get_room(self):
        return self.__room   
    
    def get_allRole(self):
        return self.__allRoles  
    
    def get_classRequests(self):
        return self.__classRequests
    
    def get_forumInbox(self):
        return self.__forumInbox
    
    def get_gameToEdit(self):
        return self.__gameToEdit
    
    def get_previewGameState(self):
        return self.__previewGameState
    
    def get_sortThreadsBy(self):
        return self.__sortThreadsBy
    
    def get_sortRepliesBy(self):
        return self.__sortRepliesBy
    
    def get_unreadInboxCount(self):
        return self.__unreadInboxCount

    def get_inbox(self):
        return self.__inbox
    

    def get_role1(self):
        return self.__role1
    
    def get_role2(self):
        return self.__role2
    
    def get_role3(self):
        return self.__role3
    
    def get_sid(self):
        return self.__sid
    
    #Setters
    def set_sid(self,sid):
        self.__sid = sid
        
    def set_roles(self):
        with sqlite3.connect("Users.db") as conn:
            cursor = conn.cursor()
            
            command = f"""SELECT Roles.Name FROM UserInfo,Roles 
            WHERE Username LIKE ? 
            AND (Roles.ID = UserInfo.Role1
            OR Roles.ID = UserInfo.Role2
            OR Roles.ID = UserInfo.Role3)
           """
            cursor.execute(command,[self.__username])
            roles = cursor.fetchall()
            
            self.__role1 = roles[0][0]
            self.__role2 = roles[1][0] if len(roles) > 1 else None
            self.__role3 = roles[2][0] if len(roles) > 2 else None

            conn.commit()
      
    def set_id(self):

        with sqlite3.connect("Users.db") as conn:
            cursor = conn.cursor()

            cursor.execute(f"""SELECT ID FROM UserInfo WHERE Username LIKE ? """,[self.__username])

            id = cursor.fetchall()[0][0]

            conn.commit()

        self.__id = int(id)
        User.user_objects[str(self.__id)] = self

    def set_games(self):
        self.__games = []

        findGame = findObject(Game.allGames)

        with sqlite3.connect("Users.db") as conn:
            cursor = conn.cursor()

            cursor.execute(f"""SELECT * FROM  Games WHERE CreatorID = {self.__id}""")
        
            allGames = cursor.fetchall()
            for game in allGames:
                targetGame = findGame("id",game[0])
                
                targetGame = targetGame if targetGame else Game(game[0],game[1],
                                                                game[2],game[3],
                                                                game[4],game[5],
                                                                self.__id)

                self.__games.append(targetGame)
            conn.commit()

    def set_classes(self):
        self.__classes = []

        findClass = findObject(Class.allClasses)

        with sqlite3.connect("Users.db") as conn:
            cursor = conn.cursor()

            cursor.execute(f"""SELECT Classes.*,Username  FROM Classes 
                                INNER JOIN ClassStudents ON 
                                Classes.ID = ClassStudents.ClassID 
                                AND ClassStudents.StudentID = {self.__id}
                                INNER JOIN UserInfo ON Classes.TeacherID = UserInfo.ID""")
            
            allClasses = cursor.fetchall()
            for classRecord in allClasses:
                targetClass= findClass("id",classRecord[0])
                if not targetClass:
                    targetClass = Class(classRecord[0],classRecord[1],classRecord[2],classRecord[3])
                    targetClass.set_games()
                    targetClass.set_students()

                self.__classes.append(targetClass)

            if self.__role1 == "teacher":
                cursor.execute(f"""SELECT Classes.*,Username 
                               FROM Classes INNER JOIN UserInfo ON TeacherID=UserInfo.ID
                               AND TeacherID = {self.__id}""")
        
                allClasses = cursor.fetchall()
                for classRecord in allClasses:
                    targetClass= findClass("id",classRecord[0])
                    if not targetClass:
                        targetClass = Class(classRecord[0],classRecord[1],
                                            classRecord[2],classRecord[3])
                        targetClass.set_games()
                        targetClass.set_students()

                    self.__classes.append(targetClass)
  
            conn.commit()

    def set_inbox(self):
        with sqlite3.connect("Users.db") as conn:
            cursor = conn.cursor()      
            
            classRequests = cursor.execute(f"""SELECT ClassRequests.*,Name,Username
                                           FROM ClassRequests,Classes,UserInfo 
                                           WHERE StudentID = {self.__id} 
                                           AND Classes.ID = ClassRequests.ClassID
                                           AND UserInfo.ID = TeacherID""").fetchall()
            
            forumInbox = cursor.execute(f"""SELECT ForumInbox.*, Username, Content
                                        FROM ForumInbox,UserInfo,Posts 
                                        WHERE ForumInbox.UserID = {self.__id} 
                                        AND ForumInbox.postID = Posts.ID
                                        AND Posts.UserID = UserInfo.ID""").fetchall()
 
            
            for record in classRequests:
                self.__classRequests.append(ClassRequest(record[0],record[1],
                                                         record[2],record[3],
                                                         record[4],record[5]))
 
            for record in forumInbox:
                self.__forumInbox.append(ForumInbox(record[0],
                                                    record[1],record[2],
                                                    record[3],record[4],
                                                    record[5]))
                

            self.__inbox.extend(self.__classRequests)
            self.__inbox.extend(self.__forumInbox)
            
            for noti in self.__inbox:
                if not noti.get_read():
                    self.__unreadInboxCount += 1

         
            self.__inbox = sortDateTime(self.__inbox)
            self.__inbox.reverse()

    def set_room(self,room):
        self.__room = room   

    def set_unreadInboxCount(self,value):
        self.__unreadInboxCount += value
        
    def set_gameToEdit(self,game):
        self.__gameToEdit = game
        
    def set_previewGameState(self,map_grid,speed,questions):
        self.__previewGameState["map_grid"] = map_grid
        self.__previewGameState["speed"] = speed
        self.__previewGameState["questionAnswers"] = questions
            
    def set_sortThreadsBy(self,value):
        self.__sortThreadsBy = value
        
    def set_sortRepliesBy(self,value):
        self.__sortRepliesBy = value
        
    def set_player(self,index):
        self.player = index

    def set_role1(self,role):
        self.__role1 = role
        
    def set_role2(self,role):
        self.__role2 = role
    
    def set_role3(self,role):
        self.__role3 = role
    
    def add_classRequest(self,classRequest):
        self.__classRequests.insert(0,classRequest)          

    def add_forumInbox(self,replyNoti):
        self.__forumInbox.append(replyNoti)
                 
    def add_notification(self,noti):
        self.__inbox.insert(0,noti)
        
    def add_game(self,game): 
        self.__games.append(game)
      
    def add_class(self,classObj):
        self.__classes.insert(0,classObj)  
    
    def remove_inbox(self,noti):
        self.__inbox.remove(noti)
       
    def remove_class(self,classObj):
        self.__classes.remove(classObj)
       
    def remove_game(self,game):
        self.__games.remove(game)

    def remove_forumNoti(self,attribute,value):
        findForumNoti = findObject(self.__forumInbox)
        targetNoti = findForumNoti(attribute,value)
        if not targetNoti: return -1
        self.remove_inbox(targetNoti)
        self.__forumInbox.remove(targetNoti)
        
        isRead = targetNoti.get_read()
        unreadInboxCount = self.__unreadInboxCount
        
        self.__unreadInboxCount = unreadInboxCount if isRead else unreadInboxCount-1
        
        del targetNoti
             
    def remove_classRequest(self,attribute,value):
        findClassRequest = findObject(self.__classRequests)
        targetNoti = findClassRequest(attribute,value)
        if not targetNoti: return -1
        self.remove_inbox(targetNoti)
        self.__classRequests.remove(targetNoti)
        
        isRead = targetNoti.get_read()
        unreadInboxCount = self.__unreadInboxCount
        
        self.__unreadInboxCount = unreadInboxCount if isRead else unreadInboxCount-1
        
        del targetNoti
        
    def logout(self):
        if self in User.allUsers:
            User.allUsers.remove(self)
        if User.user_objects.get(str(self.__id)):
            User.user_objects.pop(str(self.__id))
        
        if User.requestIDs.get(self.__username.upper()):
            User.requestIDs.pop(self.__username.upper())
        del self 

    @staticmethod
    def find_user(username):

        return findUser("username",username)
    
    @staticmethod
    def registerUser(form):

        with sqlite3.connect("Users.db") as conn:
            cursor = conn.cursor()

            command = f"""INSERT INTO UserInfo 
                        (Username, Password, Email, DOB, Role1) 
                        VALUES(?, ?, ?, ?, ?);"""
            
            roleID = cursor.execute(f"""SELECT ID From Roles 
                                    WHERE Name = '{form.role.data.lower()}' """
                                    ).fetchall()[0][0]

            values = (f'{form.username.data}',f'{customHash(form.password.data)}',f'{form.email.data}',f'{form.date.data}',roleID)
           
            cursor.execute(command,values) 

            conn.commit()
            
        user = User.loginUser(form)
        
        Game.saveGame(defaultGame,user)
        
        return user

    @staticmethod
    def addRequestSid(username,sid):
        User.requestIDs[username.upper()] = sid
     
    @staticmethod
    def loginUser(form):
        user = User(form=form,username=form.username.data,password=form.password.data)
        return user
          
class Role():

    allRoles = {}
    allModerators = []

    def __init__(self,id,name):
        self.__id = id
        
        self.__name = name

        Role.allRoles[self.__name] = self
        
    def get_id(self):
        return self.__id
        
    def get_name(self):
        return self.__name
       
    @staticmethod
    def assignModerator(obj,user):
        with sqlite3.connect("Users.db") as conn:
            cursor = conn.cursor()
            
            name = obj["username"]
            values = (name,)
            
            if not user.get_role3():
                return "Action Denied"
                
            userExists = cursor.execute(f"""SELECT Username FROM UserInfo 
                                        WHERE Username  LIKE ? LIMIT 1"""
                                        ,values).fetchall()
            
            if userExists:
                command = f"""SELECT Roles.Name,UserInfo.ID 
                                FROM UserInfo,Roles 
                                WHERE (Role1 = Roles.ID OR Role2 = Roles.ID) 
                                AND UserInfo.Username LIKE ?
                            """

                userInfo = cursor.execute(command,values).fetchall()

                userID = userInfo[0][1]
                userRole1 = userInfo[0][0]
                userRole2 = userInfo[1][0] if len(userInfo) > 1 else False
                                                
                if userID == user.get_id():
                    return "You are already a Moderator"

                elif userRole2 == "moderator": 
                    return f"{name.upper()} is already a Moderator"

                else:
                    cursor.execute(f"""UPDATE UserInfo 
                                   SET Role2 = {moderator_role.get_id()} 
                                   WHERE ID = {userID}""")
                    
                    if not (name in Role.allModerators):
                        Role.allModerators.insert(0,name)
                    
                    targetUser = findUser("id",userID)
                    
                    if targetUser:
                        targetUser.set_role2(moderator_role.get_name())
            else:
                return "Username not Recognised"

            conn.commit()
            return None
       
    @staticmethod
    def demoteModerator(obj,user):
        with sqlite3.connect("Users.db") as conn:
                                    
            cursor = conn.cursor()
            
            name = obj["username"]
            values = (name,)
            
            if not user.get_role3():
                return "Action Denied"

            command = f"""SELECT Roles.Name,UserInfo.ID 
                                FROM UserInfo,Roles 
                                WHERE (Role1 = Roles.ID OR Role2 = Roles.ID) 
                                AND UserInfo.Username LIKE ?
                            """

            userInfo = cursor.execute(command,values).fetchall()

            userID = userInfo[0][1]
            userRole2 = userInfo[1][0] if len(userInfo) > 1 else False
                
            if userID == user.get_id():
                return "You cannot demote yourself"

            elif userRole2 == "moderator": 
    
                cursor.execute(f"UPDATE UserInfo SET Role2 = NULL WHERE ID = {userID}")
                if name in Role.allModerators:
                    Role.allModerators.remove(name)
                    
                targetUser = findUser("id",userID)
                
                if targetUser:
                    targetUser.set_role2(None)
            else:
                return f"{name.upper()} is not a Moderator"
        
            conn.commit()
            
            return None
       
    @staticmethod
    def set_moderators():
        with sqlite3.connect("Users.db") as conn:
            cursor = conn.cursor()
            
            cursor.execute(f"SELECT Username FROM Userinfo WHERE Role2 == {moderator_role.get_id()}")
            
            allUsers = cursor.fetchall()
            
            for user in allUsers:
                Role.allModerators.append(user[0].upper())
                
            Role.allModerators.reverse()

            conn.commit()
           
class Post():

    allPosts = []
    threads = []
    replies = []

    def __init__(self,id,content,tags,dateTime,attachment,
                 attachmentHeader,type,userID,threadID,deleted):
        self.__id = id

        self.__content  = content

        self.__tags = tags
        
        self.__attachment = attachment
        
        self.__attachmentHeader = attachmentHeader
                
        self.__base64File = base64.b64encode(self.__attachment).decode("utf-8") if attachment else ""
        
        self.__dateTime = datetime.datetime.strptime(dateTime,"%Y-%m-%d %H:%M:%S.%f")
        self.__displayDate = datetime.date.strftime( self.__dateTime, '%d/%m/%Y')
        self.__displayTime = datetime.date.strftime( self.__dateTime, '%H:%M')

        self.__type = type

        self.__userID = int(userID)

        self.__user = self.set_user()
        
        self.__replies = []

        self.__replyCount = 0

        self.__displayID = customHash(str(self.__id))
        
        self.__threadID = threadID
        
        self.__deleted = deleted
        
        if self.__type.lower() == "thread":
            Post.threads.append(self)
            
        if self.__type.lower() == "reply":
            Post.replies.append(self)
        
        Post.allPosts.append(self)
        
        
    #Getters
    def get_id(self):
        return self.__id
    
    def get_content(self):
        return self.__content
    
    def get_tags(self):
        return self.__tags
    
    def get_dateTime(self):
        return self.__dateTime
    
    def get_displayDate(self):
        return self.__displayDate
    
    def get_displayTime(self):
        return self.__displayTime
    
    def get_type(self):
        return self.__type
    
    def get_userID(self):
        return self.__userID
    
    def get_user(self):
        return self.__user
    
    def get_replies(self):
        return self.__replies
    
    def get_replyCount(self):
        return self.__replyCount
    
    def get_displayID(self):
        return self.__displayID
    
    def get_threadID(self):
        return self.__threadID

    def get_attachment(self):
        return self.__attachment  
    
    def get_attachmentHeader(self):
        return self.__attachmentHeader  
    
    def get_base64File(self):
        return self.__base64File  

    def get_deleted(self):
        return self.__deleted
    #Setters
    
    def set_deleted(self,value):
        self.__deleted = value
    
    def set_content(self,value):
        self.__content = value
    
    def set_attachment(self,value):
        self.__attachment = value
        
    def set_attachmentHeader(self,value):
        self.__attachmentHeader = value
        
    def set_tags(self,value):
        self.__tags = value
    
    def set_content(self,value):
        self.__content = value
    
    def set_user(self):

        with sqlite3.connect("Users.db") as conn:
            cursor = conn.cursor()

            command = f""" SELECT Username FROM UserInfo WHERE ID = {self.__userID}"""

            user = cursor.execute(command).fetchall()[0][0]

            conn.commit()

        return user

    def set_replies(self):
        with sqlite3.connect("Users.db") as conn:
            cursor = conn.cursor()

            command = f"""SELECT ID FROM Posts 
                        WHERE ThreadID = {self.__id} 
                        ORDER BY datetime(datetime)"""

            replyIDs = cursor.execute(command).fetchall()

            self.__replies = [arr[0] for arr in replyIDs]
            
            conn.commit()

        self.__replies = [findPost("id",id) for id in self.__replies]
        self.__replyCount = len(self.__replies)
    
    def add_reply(self,reply):
        self.__replies.append(reply)
        self.__replyCount += 1
    
    @staticmethod
    def loadForum():
    
        with sqlite3.connect("Users.db") as conn:
            cursor = conn.cursor()

            cursor.execute(f"""SELECT * FROM  Posts""")

            allRecords = cursor.fetchall()

            for record in allRecords: 
                Post(id=record[0],
                    content=record[1],
                    tags=record[2].split(" "),
                    attachment=record[3],
                    attachmentHeader=record[4],
                    dateTime=record[5],
                    type=record[6],
                    userID=record[7],
                    threadID = record[8],
                    deleted=record[9]
                    )
                    
                
            Post.setAllReplies()       

    @staticmethod
    def getPosts(user):

        threads = Post.threads.copy()
        replies = Post.replies.copy()
                
       
        if user.get_sortThreadsBy() == "2": 
            threads = sortReply(threads)
            
        elif user.get_sortThreadsBy() == "3":
            threads = sortReply(threads)
            threads.reverse()

             
        else:
            threads = sortDateTime(threads)
            
            if user.get_sortThreadsBy() == "1": 
                threads.reverse()
                
        replyDict = {}
        threadDict = {}
        
        for thread in threads:
            postObject = {}
            postObject["content"] = thread.get_content()
            postObject["tags"] = thread.get_tags()
            postObject["displayDate"] = thread.get_displayDate()
            postObject["replyCount"] = thread.get_replyCount()
            postObject["attachment"] = thread.get_base64File()
            postObject["attachmentHeader"] = thread.get_attachmentHeader()
            postObject["deleted"] = thread.get_deleted()
            postObject["user"] = thread.get_user()
            
            if user.get_sortRepliesBy() == "2": 
                threadReplies = sortReply(thread.get_replies())
                
            elif user.get_sortRepliesBy() == "3":
                threadReplies = sortReply(thread.get_replies())
                threadReplies.reverse()
                
            else:
                threadReplies = sortDateTime(thread.get_replies())
                
                if user.get_sortRepliesBy() == "1": 
                    threadReplies.reverse()
            
  
            postObject["replies"] = [reply.get_displayID() for reply in threadReplies]

            postObject["id"] = thread.get_displayID()
            
            threadDict[thread.get_displayID()] = postObject
            
        for post in replies:
            postObject = {}
            postObject["content"] = post.get_content()
            postObject["tags"] = post.get_tags()
            postObject["displayDate"] = post.get_displayDate()
            postObject["replyCount"] = post.get_replyCount()
            postObject["attachment"] =  post.get_base64File()
            postObject["attachmentHeader"] = post.get_attachmentHeader()
            postObject["deleted"] = post.get_deleted()
            postObject["user"] = post.get_user()
                
            if user.get_sortRepliesBy() == "2": 
                postReplies = sortReply(post.get_replies())
                
            elif user.get_sortRepliesBy() == "3":
                postReplies = sortReply(post.get_replies())
                postReplies.reverse()
                
            else:
                postReplies = sortDateTime(post.get_replies())
                
                if user.get_sortRepliesBy() == "1": 
                    postReplies.reverse()

            postObject["replies"] = [reply.get_displayID() for reply in postReplies]
            
            postObject["id"] = post.get_displayID()
                        
            replyDict[post.get_displayID()] = postObject

        return threadDict,replyDict

    @staticmethod
    def startThread(obj,user):
        
        if not obj["message"].strip(): return False,"invalid"
        
        if checkBadwords(f'{obj["message"]} {obj["tags"]}'): return False,"language"
        
        with sqlite3.connect("Users.db") as conn:
            
            if obj["file"]:
                byteImage = base64.decodebytes(obj["file"].encode('utf-8'))
                obj["file"] = byteImage

            cursor = conn.cursor()

            values = (obj["message"],obj["tags"],
                      obj["file"],obj["fileHeader"],
                      str(datetime.datetime.now()),"Thread",user.get_id())
            
            command = f"""INSERT INTO Posts (Content, Tags, 
                            Attachment, AttachmentHeader, 
                            DateTime, Type, UserID ) 
                            VALUES(?, ?, ?, ?, ?, ?, ?) RETURNING *"""

            cursor.execute(command, values)

            new_post_record = cursor.fetchall()[0]
                        
            new_post = Post(id=new_post_record[0],
                content=new_post_record[1],
                tags=new_post_record[2].split(" "),
                attachment=new_post_record[3],
                attachmentHeader=new_post_record[4],
                dateTime=new_post_record[5],
                type=new_post_record[6],
                userID=new_post_record[7],
                threadID=new_post_record[8],
                deleted=new_post_record[9]
            )

            conn.commit()
        
        new_post.set_replies() 
        
        threadObject = {}
        threadObject["content"] = new_post.get_content()
        threadObject["tags"] = new_post.get_tags()
        threadObject["displayDate"] = new_post.get_displayDate()
        threadObject["replyCount"] = new_post.get_replyCount()
        threadObject["user"] = new_post.get_user()
        threadObject["attachment"] = new_post.get_base64File()
        threadObject["attachmentHeader"] = new_post.get_attachmentHeader()
        threadObject["replies"] = [reply.get_displayID() for reply in new_post.get_replies()]
        threadObject["deleted"] = new_post.get_deleted()
        threadObject["id"] = new_post.get_displayID()
        
        return threadObject,None

    @staticmethod
    def reply(obj,user):
        if not obj["message"].strip(): return False,False,False,"invalid"
        
        if checkBadwords(f'{obj["message"]} {obj["tags"]}'): return False,False,False,"language"
  
        parentPost = findPost("displayID",obj["id"])
        
        if not parentPost: return False,False,False,"not-exist"

        with sqlite3.connect("Users.db") as conn:

            cursor = conn.cursor()

            #Add post to database
            
            if obj["file"]:
                byteImage = base64.decodebytes(obj["file"].encode('utf-8'))
                obj["file"] = byteImage
            
            values = (obj["message"],obj["tags"],
                      obj["file"],obj["fileHeader"],
                      str(datetime.datetime.now()),"Reply",user.get_id(),
                      parentPost.get_id())

            command = f"""INSERT INTO Posts (Content, Tags, 
                        Attachment, AttachmentHeader, 
                        DateTime, Type, UserID, ThreadID)
                        VALUES(?, ?, ?, ?, ?, ?, ?, ?) RETURNING *"""

            cursor.execute(command,values)
            
            new_post_record = cursor.fetchall()[0]
            
            new_post_id = new_post_record[0]
            
            #Add to Forum Inbox
            notiRecord = None
            if parentPost.get_userID() != user.get_id():
                command = f"""INSERT INTO ForumInbox 
                    (PostID, UserID, DateTime) 
                    VALUES(?, ?, ?) RETURNING * """
                
                cursor.execute(command, [new_post_id,
                                         int(parentPost.get_userID()),
                                         str(datetime.datetime.now())])                
                notiRecord = cursor.fetchall()[0]

            conn.commit()

        # create new post object and updates post variables
        new_post = Post(id=new_post_record[0],
            content=new_post_record[1],
            tags=new_post_record[2].split(" "),
            attachment=new_post_record[3],
            attachmentHeader=new_post_record[4],
            dateTime=new_post_record[5],
            type=new_post_record[6],
            userID=new_post_record[7],
            threadID=new_post_record[8],
            deleted=new_post_record[9]
            )
        
        parentPost.add_reply(new_post) 
        
        replyObject = {}
        replyObject["content"] = new_post.get_content()
        replyObject["tags"] = new_post.get_tags()
        replyObject["displayDate"] = new_post.get_displayDate()
        replyObject["replyCount"] = new_post.get_replyCount()
        replyObject["user"] = new_post.get_user()
        replyObject["attachment"] = new_post.get_base64File()
        replyObject["attachmentHeader"] = new_post.get_attachmentHeader()
        replyObject["replies"] = [reply.get_displayID() for reply in new_post.get_replies()]
        replyObject["deleted"] = new_post.get_deleted()
        replyObject["id"] = new_post.get_displayID()
                
        parentPostUser = findUser("id",parentPost.get_userID()) 
        
        parentPostUsername = None 
        
        if parentPostUser and ( parentPost.get_userID() != user.get_id()):
            
            parentPostUser.set_unreadInboxCount(1)
            
            parentPostUsername = parentPostUser.get_username()
            
            forumNoti = ForumInbox(notiRecord[0],
                                   notiRecord[1],
                                   notiRecord[2],
                                   notiRecord[3],
                                   user.get_username(),
                                   new_post.get_content())

            parentPostUser.add_forumInbox(forumNoti)

            parentPostUser.add_notification(forumNoti)
        
        return replyObject,parentPost.get_displayID(),parentPostUsername,None
    
    @staticmethod 
    def report(obj,user):
        
        if not obj["message"].strip(): return object()

        post = findPost("displayID",obj["id"])

        with sqlite3.connect("Users.db") as conn:
            
            if not post: return "Post doesn't exist"
            
            if post.get_deleted(): return "Post was deleted"

            cursor = conn.cursor()
            
            values = (obj["message"], user.get_id(), post.get_id(), str(datetime.datetime.now()))
            
            command = f"""INSERT INTO Reports 
                        (Reason, ReporterID, PostID, DateTime) 
                        VALUES(?, ?, ?, ?) RETURNING * """

            cursor.execute(command,values)
                        
            record = cursor.fetchall()[0]
            Report(
                    id=record[0],
                    reason=record[1],
                    reporterID=record[2],
                    postID=record[3],
                    dateTime=record[4],
                    resolved=record[5]
                    )   
            
            conn.commit()

    @staticmethod
    def setAllReplies():
        for post in Post.allPosts:
            post.set_replies()
            
    @staticmethod
    def instantDelete(obj,user):
        if not user.get_role3():
            return False
        
        post = findPost("displayID",obj["id"])
        
        if not post:
            return -1
        
        with sqlite3.connect("Users.db") as conn:
            
            cursor = conn.cursor()
                            
            cursor.execute(f"""
                           UPDATE Posts SET 
                           Deleted = 1
                           WHERE ID = {post.get_id()}
                           """
                           )
            
            cursor.execute(f"""
                        UPDATE Reports SET 
                        Resolved = 1
                        WHERE PostID = {post.get_id()}
                        """
                        )
            
            conn.commit()
                
        post.set_deleted(1)     
        
        allReports = findAllReports("postID",post.get_id())
        
        for report in allReports:
            report.set_resolved(1)             

    @staticmethod
    def restorePost(obj,user):
        if not user.get_role3():
            return False
        
        post = findPost("displayID",obj["id"])
        
        if not post:
            return -1
        
        with sqlite3.connect("Users.db") as conn:
            
            cursor = conn.cursor()
                            
            cursor.execute(f"""
                           UPDATE Posts SET 
                           Deleted = 0
                           WHERE ID = {post.get_id()}
                           """
                           )
            
            conn.commit()
                
        post.set_deleted(0)          
        
class Game():
    allGames = []
    def __init__(self,id,name,map,questions,duration,speed,creatorID):
        self.__id = id
        self.__name = name
        self.__map = eval(map)
        self.__questions = json.loads(questions)
        self.__duration = duration
        self.__speed = speed
        self.__creatorID = creatorID
        displayID = customHash(f"{self.__id}")
        self.__displayID = f"game{displayID}"
        self.__leaderboard = ""
        self.__averageTime = ""
        Game.allGames.append(self)

        self.set_averageTime()
        
        self.set_leaderboard()  
        
    #Getters
    def get_id(self):
        return self.__id
    
    def get_name(self):
        return self.__name
    
    def get_map(self):
        return self.__map

    def get_questions(self):
        return self.__questions
    
    def get_speed(self):
        return self.__speed
    
    def get_duration(self):
        return self.__duration
    
    def get_averageTime(self):
        return self.__averageTime
    
    def get_leaderboard(self):
        return self.__leaderboard
    
    def get_displayID(self):
        return self.__displayID
    
    def get_creatorID(self):
        return self.__creatorID
    
               
    #Setters
    
    def set_averageTime(self):
        with sqlite3.connect("Users.db") as conn:
            cursor = conn.cursor()

            command = (f"""SELECT AVG(Time) FROM  LeaderBoards WHERE GameID = {self.__id} """)
            
            cursor.execute(command)
            
            averageTime = cursor.fetchall()[0][0]

            conn.commit()
            
        self.__averageTime = round(averageTime,2) if bool(averageTime) else "-----------" 
    
    def set_leaderboard(self):
        with sqlite3.connect("Users.db") as conn:
            cursor = conn.cursor()

            command = (f"""SELECT Username,MIN(Time) 
                       FROM UserInfo INNER JOIN LeaderBoardS ON 
                       PlayerID = UserInfo.ID AND GameID = {self.__id}
                       GROUP BY PlayerID  
                       ORDER BY MIN(Time)""")
            
            cursor.execute(command)
            
            leaderboard = cursor.fetchall()
            
            tempLeaderboard = [(leaderboard[i][0],round(leaderboard[i][1],2)) 
                               if i < len(leaderboard) else "----------------" 
                               for i in range(len(leaderboard))]

            conn.commit()
            
        self.__leaderboard = tempLeaderboard
    
    def clear_averageTime(self):
        self.__averageTime = "---------"

    def clear_leaderboard(self):
        self.__leaderboard = ["---------------------" for i in range(5)]

    def set_name(self,name):
        self.__name = name
        
    def set_map(self,map):
        self.__map = map        
        
    def set_speed(self,speed):
        self.__speed = speed      
    
    def set_duration(self,duration):
        self.__duration = duration  
            
    def set_questions(self,questions):
        self.__questions = questions      
        

    @staticmethod
    def saveGame(obj,user):
        with sqlite3.connect("Users.db") as conn:

            cursor = conn.cursor()

            map = obj["map"]
            questions = obj["questions"]

            values = (obj["name"],f"{map}",
                      json.dumps(questions),obj["duration"],
                      obj["speed"],user.get_id())

            command = f"""INSERT INTO Games (Name,Map,Questions,Duration,Speed,CreatorID) 
                        VALUES(?,?,?,?,?,?) RETURNING *"""
                 
            cursor.execute(command, values)
            gameRecord = cursor.fetchall()[0]
            game  = Game(gameRecord[0],
                 gameRecord[1],
                 gameRecord[2],
                 gameRecord[3],
                 gameRecord[4],
                 gameRecord[5],
                 gameRecord[6])

            conn.commit()
        user.add_game(game)

    @staticmethod
    def deleteGame(obj,user):
        
        with sqlite3.connect("Users.db") as conn:
            cursor = conn.cursor()


            findGame = findObject(user.get_games())
            targetGame = findGame("displayID",obj["GameID"])
            
            if not targetGame: return -1
            
            if targetGame.get_creatorID() != user.get_id(): return - 1

            cursor.execute(f"""DELETE FROM ClassGames WHERE GameID = {targetGame.get_id()}""")
            
            cursor.execute(f"""DELETE FROM Leaderboards WHERE GameID = {targetGame.get_id()}""")

            cursor.execute(f"""DELETE FROM Games WHERE ID = {targetGame.get_id()}""")

            conn.commit()

        user.remove_game(targetGame)

        for userClass in user.get_classes():
            if targetGame in userClass.get_games():
                userClass.remove_game(targetGame)

    @staticmethod
    def editGame(obj,user):
        with sqlite3.connect("Users.db") as conn:
            cursor = conn.cursor()

            findGame = findObject(user.get_games())
            targetGame = findGame("displayID",obj["GameID"])
            
            if not targetGame: return -1 
            
            if targetGame.get_creatorID() != user.get_id(): return -1 
            
            targetGame.set_name(obj["name"])
            targetGame.set_map(obj["map"])
            targetGame.set_questions(obj["questions"])
            targetGame.set_duration(obj["duration"])
            targetGame.set_speed(obj["speed"])

            values = (targetGame.get_name(),f'{targetGame.get_map()}',
                      json.dumps(targetGame.get_questions()),
                      targetGame.get_duration(),
                      targetGame.get_speed())

            cursor.execute(f"""UPDATE Games SET Name = ? ,Map = ? 
                           ,Questions = ? ,Duration = ? ,Speed = ?
                           WHERE ID = {targetGame.get_id()}""",values)
            
            cursor.execute(f"""DELETE FROM Leaderboards WHERE GameID = {targetGame.get_id()}""")

            conn.commit()
        
        targetGame.clear_averageTime() 
        targetGame.clear_leaderboard()

    @staticmethod
    def setGameToEdit(obj,user):
        findGame = findObject(user.get_games())
        game = findGame("displayID",obj["GameID"])
        if not game: return -1
        user.set_gameToEdit(game)

class Class():
    allClasses=[]
    def __init__(self,id,name,teacherID,teacherUsername):
        self.__id = id
        self.__name = name
        self.__teacherID = teacherID
        self.__teacherName = teacherUsername
        self.__games = []
        self.__students = []
        displayID = customHash(f"{self.__id}")
        self.__displayID = f"class{displayID}"

        Class.allClasses.append(self)

    #Getters
    
    def get_id(self):
        return self.__id
    
    def get_name(self):
        return self.__name
    
    def get_teacherID(self):
        return self.__teacherID
    
    def get_teacherName(self):
        return self.__teacherName
    
    def get_games(self):
        return self.__games
    
    def get_students(self):
        return self.__students
    
    def get_displayID(self):
        return self.__displayID
        

    #Setters

    def set_games(self):

        findGame = findObject(Game.allGames)

        with sqlite3.connect("Users.db") as conn:
            cursor = conn.cursor()

            cursor.execute(f"""SELECT Games.* FROM Games 
                           INNER JOIN ClassGames ON Games.ID = ClassGames.GameID 
                           AND ClassGames.ClassID = {self.__id}""")
            
            allGames = cursor.fetchall()
            for game in allGames:
                targetGame = findGame("id",game[0])
                
                targetGame = targetGame if targetGame else Game(game[0],
                                                                game[1],
                                                                game[2],
                                                                game[3],
                                                                game[4],
                                                                game[5],
                                                                game[6])

                self.__games.append(targetGame)

            conn.commit()

    def set_students(self):
        self.__students = []

        with sqlite3.connect("Users.db") as conn:
            cursor = conn.cursor()

            cursor.execute(f"""SELECT UserInfo.Username 
                           FROM UserInfo INNER JOIN ClassStudents 
                           ON UserInfo.ID = ClassStudents.StudentID 
                           AND ClassStudents.ClassID = {self.__id}""")
            
            allStudents = cursor.fetchall()
            for student in allStudents:
                self.__students.append(
                    student[0]
                    
                )
            conn.commit()
  
    def add_student(self,student):
        self.__students.append(student)
    
    def add_game(self,game):
        self.__games.append(game)
    
    def remove_student(self,student):
        self.__students.remove(student)

    def remove_game(self,game):
        self.__games.remove(game)
   
    @staticmethod
    def removeGameFromClass(obj,user):
        with sqlite3.connect("Users.db") as conn:
            cursor = conn.cursor()

            findClass = findObject(user.get_classes())

            targetClass = findClass("displayID",obj["ClassID"])
            if not targetClass: return -1
            
            if targetClass.get_teacherID() != user.get_id(): return -1 


            findGame = findObject(targetClass.get_games())
            targetGame = findGame("displayID",obj["GameID"])
            
            if not targetGame: return -1
            
            if targetGame.get_creatorID() != user.get_id(): return -1 


            cursor.execute(F"""DELETE FROM ClassGames 
                           WHERE GameID = {targetGame.get_id()}
                           AND ClassID = {targetClass.get_id()} """)

            conn.commit()

        targetClass.remove_game(targetGame)
    
    @staticmethod
    def addGameToClass(obj,user):

        with sqlite3.connect("Users.db") as conn:

            cursor = conn.cursor()

            findClass = findObject(user.get_classes())
            findGame = findObject(user.get_games())

            targetClass = findClass("displayID",obj["ClassID"])
            targetGame = findGame("displayID",obj["GameID"])  
            
            if not (targetGame and targetClass): return -1
            
            if targetGame.get_creatorID() != user.get_id(): return - 1
            
            if targetClass.get_teacherName().upper() != user.get_username().upper():
                return -1
            
            count = cursor.execute(f"""SELECT ClassID FROM ClassGames 
                                   WHERE ClassID = {targetClass.get_id()} 
                                   AND GameID = {targetGame.get_id()} LIMIT 1""").fetchall()

            if not count:
                cursor.execute(f"""INSERT INTO ClassGames (ClassID,GameID) 
                               VALUES({targetClass.get_id()},{targetGame.get_id()})""")

            conn.commit()
        
        targetClass.add_game(targetGame)
    
    @staticmethod
    def createClass(obj,user):
        with sqlite3.connect("Users.db") as conn:

            cursor = conn.cursor()

            values = (obj["name"],user.get_id(),)
            
            if checkBadwords(obj["name"]):
                return None

            count = cursor.execute(f"""SELECT Name FROM Classes 
                                   WHERE  Name LIKE ?  AND TeacherID = ? LIMIT 1""",values).fetchall()

            if not count:
                command = f"""INSERT INTO Classes (Name,TeacherID) VALUES(?,?) RETURNING *"""

                cursor.execute(command, values )

                classRecord = cursor.fetchall()[0]
                
                targetClass = Class(classRecord[0],classRecord[1],classRecord[2],user.get_username())
                
                user.add_class(targetClass)
                
                conn.commit()
                
                return targetClass

    @staticmethod
    def removeStudent(obj,user):
        with sqlite3.connect("Users.db") as conn:
            cursor = conn.cursor()

            findClass = findObject(user.get_classes())
            targetClass = findClass("displayID",obj["ClassID"])
            
            if not targetClass: return -1
            
            if targetClass.get_teacherName().upper() != user.get_username().upper():
                return -1

            command = """DELETE FROM ClassStudents 
                WHERE StudentID IN (SELECT ID FROM UserInfo WHERE Username LIKE ?) 
                AND ClassID = ? """
                
            values = (obj["studentName"],targetClass.get_id())
            cursor.execute(command,values)

            conn.commit()

        targetClass.remove_student(obj["studentName"])

        targetStudent = findUser("username",obj["studentName"])
        if targetStudent:
            targetStudent.remove_class(targetClass)

    @staticmethod
    def deleteClass(obj,user):
        
        with sqlite3.connect("Users.db") as conn:
            cursor = conn.cursor()

            findClass = findObject(user.get_classes())
            targetClass = findClass("displayID",obj["ClassID"])
            
            if not targetClass: return -1
            
            if targetClass.get_teacherName().upper() != user.get_username().upper():
                return -1
            
            studentsWithNoti = cursor.execute(f"""SELECT StudentID 
                                              FROM ClassRequests 
                                              WHERE ClassID = {targetClass.get_id()}""").fetchall()
            
            cursor.execute(f"""DELETE FROM ClassGames WHERE ClassID = {targetClass.get_id()}""")
            
            cursor.execute(f"""DELETE FROM ClassRequests WHERE ClassID = {targetClass.get_id()}""")

            cursor.execute(f"""DELETE FROM ClassStudents WHERE ClassID = {targetClass.get_id()}""")

            cursor.execute(f"""DELETE FROM Classes WHERE ID = {targetClass.get_id()}""")

            conn.commit()

        user.remove_class(targetClass)
        
        for student in studentsWithNoti:
            targetStudent = findUser("id",student[0])
            if targetStudent:
                targetStudent.remove_classRequest("classID",targetClass.get_id())

        for student in targetClass.get_students():
            targetStudent = findUser("username",student)
            if targetStudent:
                targetStudent.remove_class(targetClass)
                
    @staticmethod
    def addStudentToClass(obj,user):
        accepted = False

        with sqlite3.connect("Users.db") as conn:
            cursor = conn.cursor()

            findNoti = findObject(user.get_classRequests())
            targetNoti = findNoti("displayID",obj["Noti_ID"])
            if not targetNoti: return -1
            
            classExists = cursor.execute(f"""SELECT ID FROM Classes 
                                         WHERE ID == {targetNoti.get_classID()} 
                                         LIMIT 1""").fetchall()

            if classExists:
                findClass = findObject(Class.allClasses)
                targetClass = findClass("id",targetNoti.get_classID())
                        
                isInClass = cursor.execute(f"""SELECT StudentID FROM ClassStudents 
                                           WHERE StudentID = {user.get_id()} 
                                           AND ClassID = {targetNoti.get_classID()} 
                                           LIMIT 1""").fetchall()

                if not isInClass:
                    accepted = True
                    
                    cursor.execute(f"""INSERT INTO ClassStudents (StudentID,ClassID) 
                                   VALUES({user.get_id()},{targetNoti.get_classID()})""")
                    
                    if not targetClass:
                        
                        cursor.execute(f"""SELECT Classes.*,Username 
                                       FROM Classes INNER JOIN UserInfo ON  TeacherID = UserInfo.ID 
                                       AND Classes.ID = {targetNoti.get_classID()}""")

                        classRecords = cursor.fetchall()
                        if classRecords:
                            
                            classRecord = classRecords[0]
                            targetClass = Class(classRecord[0],
                                                classRecord[1],
                                                classRecord[2],
                                                classRecord[3])
                            targetClass.set_games()
                            targetClass.set_students()
                        
                    targetClass.add_student(user.get_username())
                    
                    user.add_class(targetClass)
                else:
                    return "You are already in this Class",""
            else:
                return "Class Doesn't Exist",""     
            
            conn.commit()
            
        if accepted:
            ClassRequest.deleteNoti(obj,user)
            
        return None,targetClass.get_name()

class ClassRequest():
    def __init__(self,classID,studentID,read,time,className,teacher) -> None:
        self.__classID = classID
        self.__studentID = studentID
        self.__read = read
        self.__dateTime = datetime.datetime.strptime(time,"%Y-%m-%d %H:%M:%S.%f")
        self.__displayDate = datetime.date.strftime( self.__dateTime, '%d/%m/%Y')
        self.__displayTime = datetime.date.strftime( self.__dateTime, '%H:%M')
        
        self.__displayID = customHash(classID)+customHash(studentID)
        self.__teacher = teacher
        self.__type = "classRequest"
        self.__className = className
      
    #Getters
        
    def get_classID(self):
        return self.__classID
    
    def get_studentID(self):
        return self.__studentID
    
    def get_teacher(self):
        return self.__teacher
    
    def get_read(self):
        return self.__read
    
    def get_displayDate(self):
        return self.__displayDate
    
    def get_displayTime(self):
        return self.__displayTime
    
    def get_dateTime(self):
        return self.__dateTime
    
    def get_displayID(self):
        return self.__displayID
    
    def get_type(self):
        return self.__type
    
    def get_className(self):
        return self.__className
    
    #Setters
    
    def set_read(self,value):
        self.__read = value
        
    @staticmethod
    def markAsRead(obj,user):

        with sqlite3.connect("Users.db") as conn:
            cursor = conn.cursor()

            findNoti = findObject(user.get_classRequests())
            targetNoti = findNoti("displayID",obj["Noti_ID"])
            
            if not targetNoti: return -1
            
            targetNoti.set_read(1)
                        
            user.set_unreadInboxCount(-1)
                     
            cursor.execute(f"""UPDATE ClassRequests SET Read = 1 
                           WHERE ClassID = {targetNoti.get_classID()} 
                           AND StudentID = {user.get_id()}""")
            conn.commit()
    
    @staticmethod
    def sendClassRequest(obj,user):
        
        with sqlite3.connect("Users.db") as conn:
            cursor = conn.cursor()
            
            findClass = findObject(user.get_classes())
            targetClass = findClass("displayID",obj["ClassID"])
            
            if not targetClass: return -1

            name = obj["studentName"]
            values = (name,)

            studentInfo = cursor.execute(f"""SELECT ID FROM UserInfo 
                                         WHERE Username  LIKE ? LIMIT 1"""
                                         ,values).fetchall()
            
            if studentInfo:

                studentID = studentInfo[0][0]
                
                if studentID != user.get_id():
                    
                    isInClass = cursor.execute(f"""SELECT StudentID FROM ClassStudents
                                               WHERE StudentID = {studentID} 
                                               AND ClassID = {targetClass.get_id()} 
                                               LIMIT 1""").fetchall()
                    
                    hasSentRequest  = cursor.execute(f"""SELECT StudentID FROM ClassRequests 
                                                     WHERE StudentID = {studentID} 
                                                     AND ClassID = {targetClass.get_id()} 
                                                     LIMIT 1""").fetchall()
                    
                    if hasSentRequest: 
                        return f"""{name.upper()} has already been asked to join Class
                                    {targetClass.get_name().upper()}"""
                        
                    elif isInClass:
                        return f"{name.upper()} is already in {targetClass.get_name().upper()}"
                    
                    else:
                        values = (targetClass.get_id(),studentID,str(datetime.datetime.now()))
                        classRequestRecord = cursor.execute(f"""INSERT INTO ClassRequests
                                                            (ClassID,StudentID,DateTime) 
                                                            VALUES(?, ?, ?) RETURNING *"""
                                                            ,values).fetchall()[0]
                        
                        targetStudent = findUser("username",obj["studentName"])
                        if targetStudent:     
                
                            classRequest = ClassRequest(classRequestRecord[0],
                                                        classRequestRecord[1],
                                                        classRequestRecord[2],
                                                        classRequestRecord[3],
                                                        targetClass.get_name(),
                                                        user.get_username())
                            
                            targetStudent.add_classRequest(classRequest)            
                            targetStudent.add_notification(classRequest)
                            targetStudent.set_unreadInboxCount(1)
                
                else:
                    return "Cant add yourself to your class"          
            else:
                return "Username not Recognised"
 
            conn.commit()
            
        return False
    
    @staticmethod
    def deleteNoti(obj,user):

        with sqlite3.connect("Users.db") as conn:
            cursor = conn.cursor()

            findNoti = findObject(user.get_classRequests())
            
            targetNoti = findNoti("displayID",obj["Noti_ID"])
            
            if not targetNoti: return -1
                                                
            cursor.execute(f"""DELETE FROM ClassRequests 
                           WHERE ClassID = {targetNoti.get_classID()}
                           AND StudentID = {targetNoti.get_studentID()} """)
            
            user.remove_classRequest("displayID",targetNoti.get_displayID())
                        
            conn.commit()

class ForumInbox():
    def __init__(self,postID,userID,read,time,respondent,preview) -> None:
        self.__postID = postID
        self.__userID = userID
        self.__post = findPost("id",postID)
        self.__read = read
        self.__dateTime = datetime.datetime.strptime(time,"%Y-%m-%d %H:%M:%S.%f")
        self.__displayDate = datetime.date.strftime( self.__dateTime, '%d/%m/%Y')
        self.__displayTime = datetime.date.strftime( self.__dateTime, '%H:%M')
        self.__displayID = customHash(postID) + customHash(userID)
        self.__respondent = respondent
        self.__type = "forumInbox"
        self.__preview = preview[:100]
    
    #Getters
    
    def get_postID(self):
        return self.__postID
    
    def get_userID(self):
        return self.__userID
    
    def get_post(self):
        return self.__post
    
    def get_read(self):
        return self.__read
    
    def get_displayDate(self):
        return self.__displayDate
    
    def get_displayTime(self):
        return self.__displayTime
    
    def get_dateTime(self):
        return self.__dateTime
    
    def get_displayID(self):
        return self.__displayID
    
    def get_respondent(self):
        return self.__respondent
    
    def get_type(self):
        return self.__type
    
    def get_preview(self):
        return self.__preview
    
    #Setters
    def set_read(self,value):
        self.__read = value
    
    @staticmethod 
    def markAsRead(obj,user):

        with sqlite3.connect("Users.db") as conn:
            cursor = conn.cursor()

            findNoti = findObject(user.get_forumInbox())
            
            targetNoti = findNoti("displayID",obj["Noti_ID"])
            
            if not targetNoti: return -1
            
            targetNoti.set_read(1)
            
            user.set_unreadInboxCount(-1)
                        
            cursor.execute(f"""UPDATE ForumInbox SET Read = 1 
                           WHERE PostID = {targetNoti.get_postID()}
                           AND UserID = {targetNoti.get_userID()}""")           
            conn.commit()
    
    @staticmethod
    def deleteNoti(obj,user):

        with sqlite3.connect("Users.db") as conn:
            cursor = conn.cursor()

            findNoti = findObject(user.get_forumInbox())
            
            targetNoti = findNoti("displayID",obj["Noti_ID"])
            
            if not targetNoti: return -1
                                    
            cursor.execute(f"""DELETE FROM ForumInbox WHERE 
                           PostID = {targetNoti.get_postID()}
                           AND UserID = {targetNoti.get_userID()}""")
            
            user.remove_forumNoti("displayID",targetNoti.get_displayID())
            
            del targetNoti
            
            conn.commit()
    
class Report():
    allReports = []
    def __init__(self,id,reason,reporterID,postID,dateTime,resolved):
        self.__id = id
        self.__reason = reason
        self.__reporterID = reporterID
        self.__postID = postID
        
        self.__dateTime = datetime.datetime.strptime(dateTime,"%Y-%m-%d %H:%M:%S.%f")
        self.__displayDate = datetime.date.strftime( self.__dateTime, '%d/%m/%Y')
        self.__displayTime = datetime.date.strftime( self.__dateTime, '%H:%M')
        
        self.__resolved = resolved
        self.__reporterName = ""
        self.__post = findPost("id",postID)
        self.__displayID = customHash(self.__id)
        Report.allReports.append(self)
        
        self.set_reporterName()
    
    #Getters
    
    def get_id(self):
        return self.__id
    
    def get_reason(self):
        return self.__reason
    
    def get_reporterID(self):
        return self.__reporterID
    
    def get_postID(self):
        return self.__postID
    
    def get_dateTime(self):
        return self.__dateTime
    
    def get_displayDate(self):
        return self.__displayDate
    
    def get_displayTime(self):
        return self.__displayTime
    
    def get_resolved(self):
        return self.__resolved
    
    def get_reporterName(self):
        return self.__reporterName
    
    def get_post(self):
        return self.__post
    
    def get_displayID(self):
        return self.__displayID
    
    def set_resolved(self,value):
        self.__resolved = value
    
    def deletePost(self):        
        
        with sqlite3.connect("Users.db") as conn:
            
            cursor = conn.cursor()
                            
            cursor.execute(f"""
                           UPDATE Posts SET 
                           Deleted = 1
                           WHERE ID = {self.__post.get_id()}
                           """
                           )
            
            cursor.execute(f"""
                        UPDATE Reports SET 
                        Resolved = 1
                        WHERE ID = {self.__id}
                        """
                        )
            
            conn.commit()
            
        self.__post.set_deleted(1)     
        
        allReports = findAllReports("postID",self.__post.get_id())
        
        for report in allReports:
            report.set_resolved(1)  
    
    def dismiss(self):
        with sqlite3.connect("Users.db") as conn:
            
            cursor = conn.cursor()
            
            cursor.execute(f"""
                        UPDATE Reports SET 
                        Resolved = 1
                        WHERE ID = {self.__id}
                        """
                        )
    
            conn.commit()
            
        allReports = findAllReports("postID",self.__post.get_id())
        
        for report in allReports:
            report.set_resolved(1)  
    
   
    #Setters
    def set_reporterName(self):
        
        with sqlite3.connect("Users.db") as conn:
            cursor = conn.cursor()
            
            command = f"SELECT Username FROM UserInfo WHERE UserInfo.ID = {self.__reporterID}"                     
            cursor.execute(command)
            username = cursor.fetchall()[0][0]
            self.__reporterName = username
            conn.commit()
    
    @staticmethod
    def markPostAsDeleted(obj,user):
        if not user.get_role2():
            return -1
        
        report = findReport("displayID",obj["id"])
        if report: report.deletePost()
        
    @staticmethod
    def dismissPost(obj,user):
        if not user.get_role2():
            return -1
        
        report = findReport("displayID",obj["id"])
        if report: report.dismiss()

    @staticmethod
    def loadReports():
        with sqlite3.connect("Users.db") as conn:
            cursor = conn.cursor()

            cursor.execute(f"""SELECT * FROM  Reports""")

            allRecords = cursor.fetchall()

            for record in allRecords: 
                Report(
                    id=record[0],
                    reason=record[1],
                    reporterID=record[2],
                    postID=record[3],
                    dateTime=record[4],
                    resolved=record[5]
                    )
            
def get_password(username):
    with sqlite3.connect("Users.db") as conn:
        cursor = conn.cursor()

        password = [""]

        value = [username]
  
        cursor.execute( "SELECT password FROM UserInfo WHERE username LIKE ?",value)
        
        password = cursor.fetchall()
        
        if password:
            password = password[0][0]
        else:
            password = False

        conn.commit()

    return password

  
findUser = findObject(User.allUsers) #Finds user object
findPost  = findObject(Post.allPosts) #Finds post object
findReport  = findObject(Report.allReports) #Finds report object

findAllUsers = findAllObjects(User.allUsers) #finds all user objects
findAllPosts  = findAllObjects(Post.allPosts) #finds all post objects
findAllReports = findAllObjects(Report.allReports) #finds all report objects

#Creates Role object's for each roll
teacher_role = Role(id=0,name="teacher")
student_role = Role(id=1,name="student")
moderator_role = Role(id=2,name='moderator')
admin_role = Role(id=3,name="student")


#Default Game

defaultName="default"
defaultQuestions = [
    {"question": '1+1', "answer": '2'},
    {"question": '3x3', "answer": '9'},
    {"question": '2+2', "answer": '4'},
    {"question": '6+6', "answer": '12'},
    {"question": '10/2', "answer": '5'},
    {"question": '4-4', "answer": '0'},
    {"question": '4x2', "answer": '8'}
]
defaultDuration= 5
defaultSpeed = 15
defaultMap = [ [2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 2, 2, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]]

defaultGame = dict(
    name = defaultName,
    questions = defaultQuestions,
    map = defaultMap,
    speed = defaultSpeed,
    duration = defaultDuration
)