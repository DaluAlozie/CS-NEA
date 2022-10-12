let socket = io.connect(`${window.origin}`);

let inboxAlert = document.getElementById("inbox-alert");

function assignModerator() {
    let username = document.getElementById("newModerator").value;
    
    // trim removes trailing and leading spaces
    if (!username.trim()) {
        errorSpan.innerHTML = "Invalid Message";
        return -1;
    };
    let content = {
        type: "assign-moderator",
        username: username.toUpperCase()
    };
    document.getElementById("newModerator").value = ""
    
    fetch(`${window.origin}/manage-moderators`,{
        method: "POST",
        body: JSON.stringify(content),
        headers: new Headers({"content-type" : "application/json"}),
    }) 
    .then((response) => response.json())
    .then((data) =>{

        if (data.success) {
            //Get template name and add the new moderators details
            let moderartorList = document.getElementById("moderatorList");
            let template = document.getElementById("newModeratorTemplate");
        
            let newModerator = template.cloneNode(true);
            let removeModeratorBtn = newModerator.querySelector(".remove-item-btn");
            let name = newModerator.querySelector(".class-student-name") ;
        
            let hr = document.createElement("hr");
            hr.className = "reply-seperator";
        
            removeModeratorBtn.onclick = ()=>{
                demoteUser(event,username.toUpperCase());
            };
        
            name.innerHTML = username.toUpperCase();
            newModerator.hidden = false;
            
            moderartorList.prepend(hr);    
            moderartorList.prepend(newModerator); 
        }
        else{
            flashMessage(data.feedback,"danger");
        };
    })
    .catch(()=>{
        flashMessage("Something went wrong","danger")
    });
};

function demoteUser(e,username) {

    let content = {
        type: "demote-moderator",
        username: username.toUpperCase()
    };

    fetch(`${window.origin}/manage-moderators`,{
        method: "POST",
        body: JSON.stringify(content),
        headers: new Headers({"content-type" : "application/json"}),
    }) 
    .then((response) => response.json())
    .then(() =>{
        //remove name from list
        let moderator = e.target.parentElement;
        let hr = moderator.nextElementSibling;
        moderator.parentElement.removeChild(moderator);
        hr.parentElement.removeChild(hr);   
    })
    .catch(()=>{
        flashMessage("Something went wrong","danger")
    });
};
