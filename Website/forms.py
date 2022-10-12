from flask_wtf import FlaskForm
from wtforms import StringField, PasswordField, SubmitField, BooleanField,DateField,RadioField,FileField
from wtforms.validators import DataRequired, Length, EqualTo, Email, ValidationError
from wtforms_validators import ActiveUrl, Alpha, AlphaNumeric

import sqlite3
from badwordsAPI import *

def queryTable(table,field,value):
    
    with sqlite3.connect("Users.db") as conn:

        cursor = conn.cursor()
        
        value = [value]

        command = f"SELECT username FROM {table} WHERE {field} LIKE ? LIMIT 1"

        cursor.execute(command,value)
        

        count = cursor.fetchall()
        count = count[0][0] if count else 0

        conn.commit()

    return count
    
class RegistrationForm(FlaskForm):
    
    username = StringField('Username',
        validators=[DataRequired(),AlphaNumeric(message="Must only include Letters and Numbers")
                    ,Length(min=3,max=20)])

    date = DateField('Date of Birth',
        validators=[DataRequired()])

    email = StringField('Email',
        validators=[DataRequired(),Email()])

    confirm_password = PasswordField('Confirm Password',
        validators=[DataRequired(),EqualTo('password')])

    password = PasswordField('Password',
        validators=[DataRequired(),Length(min=8)])

    role = RadioField('Role', choices = ['Teacher','Student'],
            validators=[DataRequired()])

    submit = SubmitField('Sign Up')


    def validate_username(self,username):
        
        user = queryTable("UserInfo","username",username.data)

        if user:
            raise ValidationError("Username already taken")
        
        if checkBadwords(username.data):
            raise ValidationError("Inappropriate Username")


    def validate_email(self,email):
        

        user = queryTable("UserInfo","email",email.data)

        if user:
            raise ValidationError("Email already taken")

class LoginForm(FlaskForm):

    username = StringField('Username',
        validators=[DataRequired()])

    password = PasswordField('Password',
        validators=[DataRequired()])

    remember = BooleanField('Remember Me')

    submit = SubmitField('Login')


