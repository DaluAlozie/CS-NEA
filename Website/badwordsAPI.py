import requests
import json

from sqlalchemy import false

url = "https://api.promptapi.com/bad_words?censor_character={censor_character}"

def checkBadwords(message):
    
    try:
        payload = message.encode("utf-8")
        headers = {
            "apikey": "UyW8O8a9hCm9S1A2D0tp4ssRX6KWDvW0"
        }

        #posts request to api and gets response
        response = requests.request("POST", url, headers=headers, data = payload)

        status_code = response.status_code
        result = response.content
            
        return bool(json.loads(result).get('bad_words_total'))
        #returns true if there are bad words
        
    except:
        return False
    

