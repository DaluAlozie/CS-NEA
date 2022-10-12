import random

def insertionSort(arr):
    currentIndex = 0 
    
    while currentIndex < len(arr):
    
        currentItem = arr[currentIndex]
        currentItemIndex = 0
        for index in range (len(arr[:currentIndex])-1,-1,-1):
            if arr[index]>=currentItem:
                arr[index+1] = arr[index]
                currentItemIndex = index
            else:
                currentItemIndex = index +1
                break
        
        arr[currentItemIndex] = currentItem
        currentIndex+=1
    
    return arr

def mergeSort(arr):
    if len(arr) >1:
        leftArr = mergeSort(arr[:len(arr)//2])
        rightArr = mergeSort(arr[len(arr)//2:])
    else:
        return arr
    
    i = 0 
    j = 0 
    sortedArr = []
    
    while (i < len(leftArr)) & (j < len(rightArr)):
        if leftArr[i]>rightArr[j]:
            sortedArr.append(rightArr[j])
            j+=1
            
        else:
            sortedArr.append(leftArr[i])
            i+=1
            
    if i >= len(leftArr):
        sortedArr.extend(rightArr[j:])
    else:
        sortedArr.extend(leftArr[i:])
        
    return sortedArr

def timSort(arr,run):
     
    for i in range(0,len(arr),run):
        arr[i:i+run] = insertionSort(arr[i:i+run])  
    runInc = run 
    
    while runInc < len(arr):
    
        for j in range(0,len(arr),2*runInc):
            arr[j:j+2*runInc] = mergeSort(arr[j:j+2*runInc])
            
        runInc *= 2

    return arr

def customHash(string):
    return "e" + "".join([str(ord(character)) 
                          for character in "".join([str(ord(character)) 
                                                    for character in str(string)])]) 

def sortBy(attribute,original_function):
    def wrapper(objectList):
        
        #Gets the attribute of all the objects and sorts the list of attributes
        ordered_list = original_function([eval(f"item{attribute}") for item in objectList],32)

        i = 0 
        #Matches the attribute to the object that had the attribute
        while i < len(objectList):
            for x in range(len(ordered_list)):
                if eval(f"objectList[i]{attribute}") == ordered_list[x]:
                    ordered_list[x] = objectList[i]
                    i += 1
                    break

        return ordered_list
    return wrapper

def findObject(objectList):
    def wrapper(attribute,value):
        
        for obj in objectList: 
            #Checks if the objects attribute matches the value

            if eval(f"obj.get_{attribute}()") ==  value:
                return obj

            elif not str(eval(f"obj.get_{attribute}()")).isnumeric():
                if str(eval(f"obj.get_{attribute}()")).upper() == value.upper():
                    return obj
        return None
    
    return wrapper

def findAllObjects(objectList):

    def wrapper(attribute,value):
        allObjects = []
        for obj in objectList: 
            if eval(f"obj.get_{attribute}()") ==  value:
                allObjects.append(obj)
            elif not str(eval(f"obj.get_{attribute}()")).isnumeric():
                if str(eval(f"obj.get_{attribute}()")).upper() == value.upper():
                    allObjects.append(obj)
                    
        return allObjects
    
    return wrapper

def generateCode(length):
    def wrapper():
        code = ""
        for i in range(length):
            code += str(random.randint(0,9))    
        return code
    return wrapper

