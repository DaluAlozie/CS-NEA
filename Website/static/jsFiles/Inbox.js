let socket = io.connect(`${window.origin}`);

socket.on("message", function(data) {
    data = JSON.parse(data);
    flashMessage(data.message, data.category);
});

function acceptClassRequest(Noti_ID) {

    let content = {
        type: "accept-class-request",
        Noti_ID: Noti_ID
    }
    let noti = document.getElementById(Noti_ID);
    fetch(`${window.origin}/inbox`, {
            method: "POST",
            body: JSON.stringify(content),
            headers: new Headers({ "content-type": "application/json" }),
        })
        .then((response) => response.json())
        .then((data) => {
            if (data.success) {
                if (unreadFilter.test(noti.className)) {
                    let inboxAlert = document.getElementById("inbox-alert");
                    inboxAlert.innerHTML = parseInt(inboxAlert.innerHTML) - 1;
                };
                noti.parentElement.removeChild(noti);
                flashMessage(`You have joined Class ${data.className}`, "success")

            } else {
                flashMessage(data.message, "danger")
            }
        })
        .catch(() => {
            flashMessage("Something went wrong", "danger")
        });
};

function markAsReadClassRequest(Noti_ID, event) {

    let notiContainer = event.target.parentElement.parentElement.parentElement;
    notiContainer.className = notiContainer.className.replace("classRequest0", "classRequest1");
    let content = {
        type: "mark-as-read-class-requests",
        Noti_ID: Noti_ID
    };
    fetch(`${window.origin}/inbox`, {
            method: "POST",
            body: JSON.stringify(content),
            headers: new Headers({ "content-type": "application/json" }),
        })
        .then((response) => response.json())
        .then(() => {
            event.target.disabled = true;
            let inboxAlert = document.getElementById("inbox-alert");
            inboxAlert.innerHTML = parseInt(inboxAlert.innerHTML) - 1;
        })
        .catch(() => {
            flashMessage("Something went wrong", "danger")
        });
};

function markAsReadForumInbox(Noti_ID, event) {
    let notiContainer = event.target.parentElement.parentElement.parentElement;

    notiContainer.className = notiContainer.className.replace("forumInbox0", "forumInbox1");

    let content = {
        type: "mark-as-read-forum-inbox",
        Noti_ID: Noti_ID
    };

    fetch(`${window.origin}/inbox`, {
            method: "POST",
            body: JSON.stringify(content),
            headers: new Headers({ "content-type": "application/json" }),
        })
        .then((response) => response.json())
        .then(() => {
            let inboxAlert = document.getElementById("inbox-alert");
            inboxAlert.innerHTML = parseInt(inboxAlert.innerHTML) - 1;
            event.target.disabled = true;
        })
        .catch(() => {
            flashMessage("Something went wrong", "danger")
        });
};

//Creates filters that will filter notofications 
function createFilter(filter) {

    function filterNotis() {
        let allNotiContainer = document.querySelector(".all-posts-container");


        [...allNotiContainer.children].forEach(noti => {
            if ((noti.tagName == "DIV" && filter.test(noti.className))) {
                noti.hidden = false;
            } else {
                noti.hidden = true;
            };
        });

    };
    return filterNotis;
};

function goToPost(event, postID) {

    event.preventDefault();

    let content = {
        type: "go-to-post",
        PostID: postID
    };

    //sets go to post and then redirects to forum 
    fetch(`${window.origin}/inbox`, {
            method: "POST",
            credentials: "include",
            body: JSON.stringify(content),
            cache: "no-cache",
            headers: new Headers({ "content-type": "application/json" }),
        })
        .then((response) => response.json())
        .then(() => {
            window.location.href = event.target.href;
        })
        .catch(() => {
            flashMessage("Something went wrong", "danger")
        });
};

function deleteForumNoti(notiID) {
    let content = {
        type: "delete-forum-noti",
        Noti_ID: notiID
    };
    fetch(`${window.origin}/inbox`, {
            method: "POST",
            credentials: "include",
            body: JSON.stringify(content),
            cache: "no-cache",
            headers: new Headers({ "content-type": "application/json" }),
        })
        .then((response) => response.json())
        .then(() => {
            let noti = document.getElementById(notiID);
            noti.parentElement.removeChild(noti);

            if (unreadFilter.test(noti.className)) {
                let inboxAlert = document.getElementById("inbox-alert");
                inboxAlert.innerHTML = parseInt(inboxAlert.innerHTML) - 1;
            };
        })
        .catch(() => {
            flashMessage("Something went wrong", "danger")
        });
};

function deleteClassNoti(notiID) {
    let content = {
        type: "delete-class-noti",
        Noti_ID: notiID
    };

    fetch(`${window.origin}/inbox`, {
            method: "POST",
            credentials: "include",
            body: JSON.stringify(content),
            cache: "no-cache",
            headers: new Headers({ "content-type": "application/json" }),
        })
        .then((response) => response.json())
        .then(() => {
            let noti = document.getElementById(notiID);
            noti.parentElement.removeChild(noti);

            if (unreadFilter.test(noti.className)) {

                let inboxAlert = document.getElementById("inbox-alert");
                inboxAlert.innerHTML = parseInt(inboxAlert.innerHTML) - 1;
            };
        })
        .catch(() => {
            flashMessage("Something went wrong", "danger")
        });
};

//Regex expressions that will check if a post is 
//read or unread, and a forum noti or a class request
const forumReplyFilter = new RegExp('(^| )forumInbox(0|1)($| )');
const clasRequestFilter = new RegExp('(^| )classRequest(0|1)($| )');
const readFilter = new RegExp('(^| )(classRequest|forumInbox)1($| )');
const unreadFilter = new RegExp('(^| )(classRequest|forumInbox)0($| )')
const clearFilter = new RegExp('.*')

//Creates filters
const filterForumReplies = createFilter(forumReplyFilter);
const filterClassRequests = createFilter(clasRequestFilter);
const filterRead = createFilter(readFilter);
const filterUnread = createFilter(unreadFilter);
const filterClear = createFilter(clearFilter);

window.onload = function() {
    const searchBar = document.getElementById("search-bar");
    searchBar.addEventListener("input", function(event) {
        searchPosts(".noti-container", ".noti-sender", ".noti-content", ".temp")
    });
};