import sqlite3

with sqlite3.connect("Users.db") as conn:
    cursor = conn.cursor()
    
    #Creates tables
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS "Roles" (
            "ID"	INTEGER NOT NULL UNIQUE,
            "Name"	TEXT NOT NULL UNIQUE,
            PRIMARY KEY("ID" AUTOINCREMENT)
            );            
    """)
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS "UserInfo" (
            "ID"	INTEGER NOT NULL UNIQUE,
            "Username"	TEXT,
            "Email"	TEXT,
            "Password"	TEXT,
            "DOB"	TEXT,
            "Role1"	INTEGER NOT NULL,
            "Role2"	INTEGER,
            "Role3"	INTEGER,
            FOREIGN KEY("Role1") REFERENCES "Roles"("ID"),
            FOREIGN KEY("Role3") REFERENCES "Roles"("ID"),
            FOREIGN KEY("Role2") REFERENCES "Roles"("ID"),
            PRIMARY KEY("ID" AUTOINCREMENT)
        );
        """)
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS "Posts" (
            "ID"	INTEGER NOT NULL UNIQUE,
            "Content"	TEXT NOT NULL,
            "Tags"	TEXT,
            "Attachment"	BLOB,
            "AttachmentHeader"	TEXT,
            "DateTime"	TEXT NOT NULL,
            "Type"	TEXT NOT NULL,
            "UserID"	INTEGER NOT NULL,
            "ThreadID"	INTEGER,
            "Deleted"	INTEGER NOT NULL DEFAULT 0,
            FOREIGN KEY("UserID") REFERENCES "UserInfo"("ID"),
            PRIMARY KEY("ID" AUTOINCREMENT)
        );   
        """)
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS "Reports" (
            "ID"	INTEGER NOT NULL UNIQUE,
            "Reason"	TEXT NOT NULL,
            "ReporterID"	INTEGER NOT NULL,
            "PostID"	INTEGER NOT NULL,
            "DateTime"	TEXT NOT NULL,
            "Resolved"	INTEGER NOT NULL DEFAULT 0,
            FOREIGN KEY("PostID") REFERENCES "Posts"("ID"),
            FOREIGN KEY("ReporterID") REFERENCES "UserInfo"("ID"),
            PRIMARY KEY("ID" AUTOINCREMENT)
        );      
        """)
    
    cursor.execute("""  
        CREATE TABLE IF NOT EXISTS "ForumInbox" (
            "PostID"	INTEGER NOT NULL,
            "UserID"	INTEGER NOT NULL,
            "Read"	INTEGER NOT NULL DEFAULT 0,
            "DateTime"	TEXT NOT NULL,
            FOREIGN KEY("PostID") REFERENCES "Posts"("ID"),
            FOREIGN KEY("UserID") REFERENCES "UserInfo"("ID"),
            PRIMARY KEY("PostID","UserID")
        );
        """)
    
        
    cursor.execute("""  
        CREATE TABLE IF NOT EXISTS "Classes" (
            "ID"	INTEGER NOT NULL UNIQUE,
            "Name"	TEXT NOT NULL,
            "TeacherID"	INTEGER NOT NULL,
            PRIMARY KEY("ID" AUTOINCREMENT),
            FOREIGN KEY("TeacherID") REFERENCES "UserInfo"("ID")
        );
        """)
    
        
    cursor.execute("""  
        CREATE TABLE IF NOT EXISTS "ClassStudents" (
            "StudentID"	INTEGER NOT NULL,
            "ClassID"	INTEGER NOT NULL,
            PRIMARY KEY("StudentID","ClassID"),
            FOREIGN KEY("ClassID") REFERENCES "Classes"("ID"),
            FOREIGN KEY("StudentID") REFERENCES "UserInfo"("ID")
        );
        """)

    
    cursor.execute("""  
       CREATE TABLE IF NOT EXISTS "ClassRequests" (
            "ClassID"	INTEGER NOT NULL,
            "StudentID"	INTEGER NOT NULL,
            "Read"	INTEGER NOT NULL DEFAULT 0,
            "DateTime"	INTEGER NOT NULL,
            PRIMARY KEY("StudentID","ClassID"),
            FOREIGN KEY("StudentID") REFERENCES "UserInfo"("ID"),
            FOREIGN KEY("ClassID") REFERENCES "Classes"("ID")
        );
        """)
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS "Games" (
            "ID"	INTEGER NOT NULL UNIQUE,
            "Name"	TEXT NOT NULL,
            "Map"	TEXT NOT NULL,
            "Questions"	TEXT NOT NULL,
            "Duration"	INTEGER NOT NULL,
            "Speed"	INTEGER NOT NULL,
            "CreatorID"	INTEGER NOT NULL,
            PRIMARY KEY("ID" AUTOINCREMENT),
            FOREIGN KEY("CreatorID") REFERENCES "UserInfo"("ID")
        );
        """)
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS "ClassGames" (
        "ClassID"	INTEGER NOT NULL,
        "GameID"	INTEGER NOT NULL,
        PRIMARY KEY("GameID","ClassID"),
        FOREIGN KEY("ClassID") REFERENCES "Classes"("ID"),
        FOREIGN KEY("GameID") REFERENCES "Games"("ID")
    );
    """)
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS "Leaderboards" (
            "ID"	INTEGER NOT NULL UNIQUE,
            "Time"	REAL NOT NULL,
            "DateTime"	TEXT NOT NULL,
            "GameID"	INTEGER NOT NULL,
            "PlayerID"	INTEGER NOT NULL,
            FOREIGN KEY("GameID") REFERENCES "Games"("ID"),
            FOREIGN KEY("PlayerID") REFERENCES "UserInfo"("ID"),
            PRIMARY KEY("ID" AUTOINCREMENT)
        );
        """)    
    
    #Inserts Roles
    
    cursor.execute("""
                   INSERT OR REPLACE INTO Roles(ID, Name) VALUES(0,'teacher')
                   """)
    cursor.execute("""
                   INSERT OR REPLACE INTO Roles(ID, Name) VALUES(1,'student')
                   """)
    cursor.execute("""
                   INSERT OR REPLACE INTO Roles(ID, Name) VALUES(2,'moderator')
                   """)
    cursor.execute("""
                   INSERT OR REPLACE INTO Roles(ID, Name) VALUES(3,'admin')
                   """)
    
    conn.commit()



  