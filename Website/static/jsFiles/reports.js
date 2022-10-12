let socket = io.connect(`${window.origin}`);

let inboxAlert = document.getElementById("inbox-alert");

function deletePost(id){
    let content =  {
        type:"delete-post",
        id: id
    };
    function temp() {
        
        fetch(`${window.origin}/manage-reports`,{
            method: "POST",
            body: JSON.stringify(content),
            headers: new Headers({"content-type" : "application/json"}),
        })
        .then((response) => response.json())
        .then(() =>{
            //Deletes report element and seperator
            let report = document.getElementById(id);
            report.parentElement.removeChild(report);
            let seperator = document.getElementById(`${id}seperator`);
            seperator.parentElement.removeChild(seperator); 
        })
        .catch(()=>{
            flashMessage("Something went wrong","danger")
        });
    };
    //Creates pop up 
    altConfirm(temp,"Are you sure you want to Delete this report ?");
};

function dismissReport(id){
    let content =  {
        type:"dismiss-report",
        id: id
    };

    function temp() {
        fetch(`${window.origin}/manage-reports`,{
            method: "POST",
            body: JSON.stringify(content),
            headers: new Headers({"content-type" : "application/json"}),
        })
        .then((response) => response.json())
        .then(() =>{
            let report = document.getElementById(id);
            report.parentElement.removeChild(report);
            let seperator = document.getElementById(`${id}seperator`);
            seperator.parentElement.removeChild(seperator); 
        })
        .catch(()=>{
            flashMessage("Something went wrong","danger")
        });   
    };
    //Creates pop up
    altConfirm(temp,"Are you sure you want to Dismiss this report ?");
};