let socket = io.connect(`${window.origin}`);

let focusedThread = "";

//Holds the reply containers that are not collapsed
let openReplyDict = {};

let extensionFilter = new RegExp(/.(png|jpg|gif)$/);
let base64HeaderFilter = new RegExp("^data:image/(gif|png|jpeg);base64,");

let loadingForum;

// Holds clients role 
let role;

let deletedPosts = {};

//Collapses and expands reply contianers
function toggleReplyCollapse(id, class1, class2) {
    toggleTwo(id, class1, class2);
    let replyToggler = document.getElementById(id);
    let generalID = id.replace("Toggler", "").replace("replyPost", "");

    let replyContainer = document.getElementById(`replyPost${generalID}`);

    if (replyContainer.classList.contains("show")) {
        replyToggler.classList.remove("arrow-down");
        replyToggler.classList.add("arrow-up");
        openReplyDict[generalID] = "collapsed";
    } else {
        replyToggler.classList.remove("arrow-up");
        replyToggler.classList.add("arrow-down");
        openReplyDict[generalID] = "open";
    };
};

//Changes direction of toggle button when it is pressed
function toggleAttachmentCollapse(id, class1, class2) {
    toggleTwo(id, class1, class2);
    let attachmentToggler = document.getElementById(id);
    let generalID = id.replace("Toggler", "").replace("attachment", "");

    let attachmentContainer = document.getElementById(`attachment${generalID}`);

    if (attachmentContainer.classList.contains("show")) {
        attachmentToggler.classList.remove("arrow-down");
        attachmentToggler.classList.add("arrow-up");
    } else {
        attachmentToggler.classList.remove("arrow-up");
        attachmentToggler.classList.add("arrow-down");
    };
};

function toggleClass(elementID, classToToggle) {

    //GETS ELEMENT AND TOGGLES CLASS

    const element = document.getElementById(elementID);

    element.classList.toggle(classToToggle);
};

function submitPost(e, threadID, type) {
    /* GETS THE CURRENT DAY, MONTH AND YEAR AND THE TIME ADDS IT TO AN OBJECT*/

    let errorSpan = document.getElementById("postErrorSpan");

    let textarea_value = strip(document.getElementById("postMessage").value);
    let fileInput = document.getElementById("realFileBtn");
    let tag_value = strip(document.getElementById("postTags").value);

    let files = fileInput.files;

    let firstFile = files[0];

    if (firstFile) {
        if (firstFile.size) {
            if (firstFile.size > 515000) {
                errorSpan.innerHTML = "Attachments must not exceed 500 KB !!!";
                return -1;
            };
        };
    };

    let fileReader = new FileReader();

    let content = {
        category: "forum-post",
        id: threadID,
        tags: tag_value,
        message: textarea_value,
        file: "",
        fileHeader: "",
        type: type
    };

    //Converts loaded file to base64 string
    fileReader.onload = (event) => {
        let file_value = event.target.result;

        if (!extensionFilter.test(fileInput.value)) {
            errorSpan.innerHTML = "File extension must be: png, jpg or gif";
            return -1
        };

        let fileHeader = file_value.match(base64HeaderFilter)[0];

        file_value = file_value.replace(base64HeaderFilter, "");

        if (!textarea_value.trim()) {
            errorSpan.innerHTML = "Invalid Message";
            return -1;
        };

        let tempImage = new Image();
        tempImage.src = `${file_value}`;

        content.file = file_value;

        content.fileHeader = fileHeader;

        e.target.disabled = true;

        closePostModal();

        socket.emit(type, JSON.stringify(content));
    };

    if (fileInput.value) {
        fileReader.readAsDataURL(firstFile);
    } else {
        if (!textarea_value.trim()) {
            errorSpan.innerHTML = "Invalid Message";
            return -1;
        };

        e.target.disabled = true;
        closePostModal();
        socket.emit(type, JSON.stringify(content));
    };
};

function submitReport(postID) {

    let textarea_value = document.getElementById("reportMessage").value;

    let content = {
        category: "forum-post",
        message: strip(textarea_value),
        type: "Report",
        id: postID,
    };

    if (!textarea_value.trim()) {
        let errorSpan = document.getElementById("reportErrorSpan");
        errorSpan.innerHTML = "Invalid Message";
        return -1;
    };

    function temp() {
        socket.emit("report", JSON.stringify(content));
    };
    closeReportModal();
    altConfirm(temp, "Are you sure you want to Report this post ?");
};

//Creates reply pop up
function startReply(postID) {
    clearPost();

    document.getElementById("postHeading").innerHTML = "Reply";
    let submitBtn = document.getElementById("submitPost");
    submitBtn.onclick = () => {
        submitPost(event, postID, "reply")
    };
    submitBtn.disabled = false;

    let post = document.getElementById("postModal")
    post.style.display = "block";
};

//Creates thread pop up
function startThread() {
    clearPost();

    document.getElementById("postHeading").innerHTML = "Thread";
    let submitBtn = document.getElementById("submitPost");
    submitBtn.onclick = () => {
        submitPost(event, "", "startThread")
    };
    submitBtn.disabled = false;
    let post = document.getElementById("postModal")
    post.style.display = "block";
};

//Creates report pop up
function startReport(postID) {
    document.getElementById("reportMessage").value = "";

    let submitBtn = document.getElementById("submitReport");

    submitBtn.onclick = () => {
        submitReport(postID);
    };
    submitBtn.disabled = false;

    let report = document.getElementById("reportModal")
    report.style.display = "block";
};

function clearPost() {
    document.getElementById("postErrorSpan").innerHTML = "";
    document.getElementById("postMessage").value = "";
    document.getElementById("postTags").value = "";
    document.getElementById("altFileBtn").style.border = "none";

    let fileBtn = document.getElementById("realFileBtn");
    fileBtn.type = "text";
    fileBtn.type = "file";
};

function closePostModal() {
    let post = document.getElementById("postModal");
    post.style.display = "none";
};

function closeReportModal() {
    let report = document.getElementById("reportModal");
    report.style.display = "none";
};

function altButton(idReal, idCustom) {

    //GETS THE ELEMENT OF THE REAL BUTTON AND THE ALTERNATIVE BUTTON

    let realFileBtn = document.getElementById(idReal);
    let customBtn = document.getElementById(idCustom);

    //ACTIVATES REAL BUTTON WHEN ALTERNATIVE BUTTON IS PRESSED

    customBtn.addEventListener('mousedown', function(e) {

        realFileBtn.click();
    })

    //CHANGES THE ELEMENTS BORDER WHEN IT CONTAINS DATA

    realFileBtn.addEventListener("change", function() {

        if (realFileBtn.value != "") {

            customBtn.style.border = "2px solid orange"
        } else {
            customBtn.style.border = "none"
        }

    })

};

function clearFilters() {
    document.getElementById("filter-username").value = "";
    document.getElementById("filter-tags").value = "";
    document.getElementById("filter-date").value = "";

    let allPosts = [...document.querySelectorAll(".post-container-thread")];

    allPosts.forEach(post => {
        post.hidden = false
    });
};

function sortThreads(e) {
    sort_value = document.getElementById("thread-sort").value;

    let content = {
        sortBy: sort_value
    };

    loadingForum = false;

    socket.emit("sort-threads", JSON.stringify(content));
};

function sortReplies(e) {

    sort_value = document.getElementById("reply-sort").value;

    let content = {
        sortBy: sort_value
    };
    socket.emit("sort-replies", JSON.stringify(content));
};

//Tree traversal algorthim that displays the forum
function displayForum(replyDict, threadDict, loadingForum) {
    clearForum();
    deletedPosts = {};

    var parent = document.querySelector(".all-posts-container")
    let stack = [];

    for (const [key, value] of Object.entries(threadDict)) {
        stack.push({ id: key, parentElement: parent })
    };  

    while (stack.length != 0) {

        let currentFrame = stack.pop();
        let parentElement = currentFrame.parentElement;
        let currentPost = replyDict[currentFrame.id] || threadDict[currentFrame.id];

        if (currentPost.deleted) {
            deletedPosts[currentPost.id] = currentPost;
        };

        let type = "reply";

        if (threadDict[currentFrame.id]) type = "thread";

        let returnedContainers = addPost(currentPost, type, loadingForum);

        let postContainer = returnedContainers[0];
        let replyContainer = returnedContainers[1];

        parentElement.appendChild(postContainer);
        parentElement.appendChild(replyContainer);

        let replyFrames = [...currentPost.replies.map(function(id) { return { id: id, parentElement: replyContainer } })];
        stack = stack.concat(replyFrames);
    };

    //Focuses previously focused post
    if (focusedThread.length) {

        let thread = document.getElementById(focusedThread);

        if (thread) {
            focusThread(thread.id);
            focusThread(thread.id);

            openThread(thread.parentElement.id);
        };
    };

    let goToBtn = document.getElementById("goToPost");
    let id = goToBtn.href.replace(`${window.origin}/forum#`, "");

    if (id) {
        let postElement = document.getElementById(id);
        postElement.classList.add("post-highlight")
        openThread(postElement.parentElement.id);
        setTimeout(() => {
            //Goes to post that that was selected in the inbox
            goToBtn.click()
        }, 600);
    };
    searchPosts(".post-container-thread", ".post-sender", ".post-content", ".post-tag")
};

function usernameFilter(username) {

    document.getElementById("filter-username").value = username;
    document.getElementById("filter-tags").value = "";
    document.getElementById("filter-date").value = "";

    filterPosts()
};

function tagFilter(tag, ) {

    document.getElementById("filter-username").value = "";
    document.getElementById("filter-tags").value = tag;
    document.getElementById("filter-date").value = "";

    filterPosts()
};

function dateFilter(date) {
    document.getElementById("filter-username").value = "";
    document.getElementById("filter-tags").value = "";
    document.getElementById("filter-date").value = date;
    filterPosts()
};

//Adds new thread to forum 
function addThread(threadObject) {
    let allPostContainer = document.querySelector(".all-posts-container");

    let returnedContainers = addPost(threadObject, "thread", 0);

    let postContainer = returnedContainers[0];
    let replyContainer = returnedContainers[1];

    allPostContainer.insertBefore(replyContainer, allPostContainer.firstElementChild);
    allPostContainer.insertBefore(postContainer, allPostContainer.firstElementChild);
};

//Adds new reply to forum 
function addReply(dataPacket) {
    let replyObject = dataPacket.reply;
    let threadID = dataPacket.threadID;

    let threadReplyContainer = document.getElementById(`replyPost${threadID}`);

    let threadReplyToggler = document.getElementById(`replyPost${threadID}Toggler`);
    threadReplyToggler.hidden = false

    let returnedContainers = addPost(replyObject, "reply", 0);

    let postContainer = returnedContainers[0];
    let replyContainer = returnedContainers[1];

    if (threadID == focusedThread) {
        postContainer.classList.add("focused-reply");
    };

    threadReplyContainer.insertBefore(replyContainer, threadReplyContainer.firstChild);
    threadReplyContainer.insertBefore(postContainer, threadReplyContainer.firstChild);

    let parentElement = document.getElementById(`${threadID}`);

    let replyCountValue = parentElement.querySelector(".reply-count");
    replyCountValue.innerHTML = parseInt(replyCountValue.innerHTML) + 1;

    openThread(postContainer.parentElement.id)
};

//Gets template post element and adds the actual post's content 
function addPost(currentPost, type, loadingForum) {
    
    let seperator = document.createElement("hr");
    seperator.className = `${type}-seperator`;

    let postContainer = document.getElementById("postContainerClone").cloneNode(true)
    postContainer.id = `${currentPost.id}`
    postContainer.className = "post-container-thread"

    postContainer.setAttribute("deleted", currentPost.deleted);

    postContainer.appendChild(seperator);

    postContainer.hidden = false


    //Toggle Replies Btn
    var toggleReplyBtn = postContainer.querySelector("#replyTogglerClone");
    toggleReplyBtn.id = `replyPost${currentPost.id}Toggler`
    toggleReplyBtn.setAttribute("data-target", `#replyPost${currentPost.id}`);
    toggleReplyBtn.setAttribute("aria-controls", `replyPost${currentPost.id}`);

    toggleReplyBtn.onclick = () => {
        toggleReplyCollapse(`replyPost${currentPost.id}Toggler`, 'arrow-down', 'arrow-up');
    };


    //Post Content
    let postContent = postContainer.querySelector("#postContentClone");

    postContent.innerHTML = `${currentPost.content}`;

    //Attachment
    let attachmentContainer = postContainer.querySelector("#attachmentContainerClone");
    attachmentContainer.id = `attachment${currentPost.id}`;
    let attachment = postContainer.querySelector("#attachmentClone");
    attachment.src = currentPost.attachmentHeader + currentPost.attachment;

    //Attachment Toggler

    let toggleAttachmentBtnContainer = postContainer.querySelector("#attachmentContainerTogglerClone");
    toggleAttachmentBtnContainer.id  = `attachmentContainerToggler${currentPost.id}`

    let toggleAttachmentBtn = postContainer.querySelector("#attachmentTogglerClone")
    toggleAttachmentBtn.id = `attachment${currentPost.id}Toggler`;
    toggleAttachmentBtn.setAttribute("data-target", `#attachment${currentPost.id}`);
    toggleAttachmentBtn.setAttribute("aria-controls", `attachment${currentPost.id}`);



    toggleAttachmentBtn.onclick = () => {
        toggleAttachmentCollapse(`attachment${currentPost.id}Toggler`, 'arrow-down', 'arrow-up');
    };

    //Focus Button
    let focusBtn = postContainer.querySelector("#focusBtnClone")
    focusBtn.onclick = () => (focusThread(`${currentPost.id}`));

    if (!currentPost.attachment) {
        toggleAttachmentBtn.disabled = true;
        toggleAttachmentBtn.hidden = true;
    };


    //Reply Button
    let replyButton = postContainer.querySelector("#replyBtnClone");

    replyButton.onclick = () => {
        startReply(`${currentPost.id}`)
    };


    //Report Button

    let reportButton = postContainer.querySelector("#reportBtnClone");
    reportButton.id = `reportBtn${currentPost.id}`;
    reportButton.onclick = () => {
        startReport(`${currentPost.id }`)
    };


    //Restore Button

    let restoreButton = postContainer.querySelector("#restoreBtnClone");
    restoreButton.id = `restoreBtn${currentPost.id}`;
    restoreButton.onclick = () => {
        restorePost(`${currentPost.id }`)
    };

    //Posted By

    let postedByBtn = postContainer.querySelector("#senderClone");
    postedByBtn.innerHTML = `<span class="post-sender">${currentPost.user}</span>`;


    //Date Posted

    let datePostedBtn = postContainer.querySelector("#dateClone");
    datePostedBtn.innerHTML = `<span class="post-content post-date">${currentPost.displayDate}</span>`;;


    //Replies
    let replyCountValue = postContainer.querySelector("#replyCountClone");
    replyCountValue.innerHTML = `${currentPost.replyCount}`;

    //Tags
    let tagsValue = postContainer.querySelector("#tagsClone");

    if (currentPost.tags) {
        currentPost.tags.forEach(tag => {
            let tagBtn = document.createElement("button");
            tagBtn.innerHTML = `<span class="post-tag">${tag}</span>`;
            tagsValue.appendChild(tagBtn);
            tagBtn.className = "metadata-btn";

            if (type == "thread") tagBtn.onclick = () => { tagFilter(tag, "threads") };

            else tagBtn.onclick = () => { tagFilter(tag, "replies") };
        });
    };

    if (type == "thread") {
        postedByBtn.onclick = () => { usernameFilter(currentPost.user, "threads") };
        datePostedBtn.onclick = () => { dateFilter(currentPost.displayDate, "threads") };
    } else {
        postedByBtn.onclick = () => { usernameFilter(currentPost.user, "replies") };
        datePostedBtn.onclick = () => { dateFilter(currentPost.displayDate, "replies") };
    };

    let deleteButton = postContainer.querySelector("#deleteBtnClone");

    if ((role.toLowerCase() == "admin") && !(currentPost.deleted)) {

        deleteButton.id = `deleteBtn${currentPost.id}`;
        deleteButton.onclick = () => {
            deletePost(`${currentPost.id }`)
        };
    }

    //Reply Conatiner

    let replyContainer = document.createElement("div");
    replyContainer.id = `replyPost${currentPost.id}`;
    replyContainer.className = "post-replies-container";


    if (loadingForum == 1) openReplyDict[currentPost.id] = "collapsed";

    if (currentPost.replyCount) {

        if (openReplyDict[currentPost.id] == "collapsed") {
            replyContainer.classList.add("collapse");
        } else {
            toggleReplyBtn.classList.remove('arrow-up');
            toggleReplyBtn.classList.add('arrow-down');
            replyContainer.classList.add("show");
        };
    };
    if (currentPost.deleted) {

        postContent.innerHTML = "( This post was deleted due to inappropriate content )";
        postContent.classList.add("deleted-post");
        tagsValue.innerHTML = "";
        attachmentContainer.innerHTML = "";
        toggleAttachmentBtn.parentElement.removeChild(toggleAttachmentBtn);
        reportButton.hidden = true;
        restoreButton.hidden = false;
    } else {
        restoreButton.hidden = true;
    };
    if (!(role.toLowerCase() == "admin")) {
        restoreButton.parentElement.removeChild(restoreButton)
        deleteButton.parentElement.removeChild(deleteButton)
    };
    if (!parseInt(currentPost.replyCount)) {
        toggleReplyBtn.hidden = true;
    }
    return [postContainer, replyContainer]
};

function clearForum() {
    let forum = document.querySelector(".all-posts-container");
    forum.innerHTML = "";
};

function filterPosts() {
    let usernameFilters = document.getElementById("filter-username").value.toLowerCase().trim().split(",");
    usernameFilters = usernameFilters.map(username => username.trim())
    usernameFilters = usernameFilters.filter(username => username != "")

    let tagFilters = document.getElementById("filter-tags").value.toLowerCase().trim().split(",");
    tagFilters = tagFilters.map(tag => tag.replace(/^#/, "").trim())
    tagFilters = tagFilters.filter(tag => tag != "")

    let dateFilters = document.getElementById("filter-date").value.toLowerCase().trim().split(",");
    dateFilters = dateFilters.map(date => date.trim())
    dateFilters = dateFilters.filter(date => date != "")

    let allPosts = [...document.querySelectorAll(".post-container-thread")];

    let validPosts = []


    allPosts.forEach(post => {


        let sender = post.querySelector(".post-sender").innerHTML.toLowerCase();
        let allTags = [...post.querySelectorAll(".post-tag")];
        allTags = allTags.map(tagSpan => tagSpan.innerHTML.toLowerCase().replace(/^#/, ""))
        allTags = allTags.filter(tag => tag != "")
        let date = post.querySelector(".post-date").innerHTML.toLowerCase();

        post.hidden = true
        let usernameTrue = true;
        let dateTrue = true;
        let tagTrue = true;

        if (usernameFilters.length) {
            if (usernameFilters.includes(sender)) {
                validPosts.push(post);
            }
            else usernameTrue = false
        }

        if (dateFilters.length) {
            if (dateFilters.includes(date) ) {
                validPosts.push(post);
            }        
            else dateTrue = false
        }

        if (tagFilters.length) {
            tagTrue = false
            for (let i = 0; i < allTags.length; i++) {
                const tag = allTags[i];
                if (tag != "" && tagFilters.includes(tag)) { 
                    validPosts.push(post);
                    tagTrue = true;
                    break
                }
            }
        } 
        post.hidden = (usernameTrue && dateTrue && tagTrue)? !(usernameTrue && dateTrue && tagTrue): isReplyValid(validPosts, post)
    });
};

function resetGoToPost() {
    var content = {
        category: "reset-goToPost",
    };

    fetch(`${window.origin}/forum`, {
        method: "POST",
        credentials: "include",
        body: JSON.stringify(content),
        cache: "no-cache",
        headers: new Headers({ "content-type": "application/json" }),
    });
};


//Higlights post and all its replies
function focusThread(id) {
    let thread = document.getElementById(id);
    let replyContainer = document.getElementById(`replyPost${id}`);

    if (id == focusedThread) {

        [...replyContainer.children].forEach(post => {
            if (!post.classList.contains("post-replies-container")) {
                post.classList.toggle("focused-reply");
            };
        });
        thread.classList.toggle("focused-thread");
        focusedThread = "";
    } else {
        let oldReplyContainer = document.getElementById(`replyPost${focusedThread}`);
        let oldThread = document.getElementById(focusedThread);

        if (oldThread) {
            if (oldReplyContainer) {
                [...oldReplyContainer.children].forEach(post => {
                    post.classList.remove("focused-reply");
                });

                oldThread.classList.remove("focused-thread");
            };
        };


        [...replyContainer.children].forEach(post => {
            if (!post.classList.contains("post-replies-container")) {
                post.classList.add("focused-reply");
            };
        });

        thread.classList.add("focused-thread");
        focusedThread = id;
    };
};

function deletePost(id) {
    let content = {
        category: "delete-post",
        id: id
    };

    function temp() {
        fetch(`${window.origin}/forum`, {
                method: "POST",
                credentials: "include",
                body: JSON.stringify(content),
                cache: "no-cache",
                headers: new Headers({ "content-type": "application/json" }),
            })
            .then((response) => response.json())
            .then(() => {
                let postContainer = document.getElementById(id);
                let postMessage = postContainer.querySelector(".post-message");
                let tagContainer = postContainer.querySelector(".tags");
                let attachmentContainer = postContainer.querySelector(".forum-attachment-container");
                let attachmentToggler = document.getElementById(`attachment${id}Toggler`);
                let reportBtn = document.getElementById(`reportBtn${id}`);
                let restoreBtn = document.getElementById(`restoreBtn${id}`);
                let deleteBtn = document.getElementById(`deleteBtn${id}`);
                postContainer.setAttribute("deleted", "1");


                postMessage.innerHTML = "( This Post was deleted due to inappropriate content )";
                postMessage.classList.add("deleted-post");

                tagContainer.innerHTML = "";
                attachmentContainer.innerHTML = "";
                attachmentToggler.parentElement.removeChild(attachmentToggler);
                reportBtn.hidden = true;

                if (restoreBtn) {
                    restoreBtn.hidden = false;
                };

                if (deleteBtn) {
                    deleteBtn.parentElement.removeChild(deleteBtn);
                };
            })
            .catch(() => {
                flashMessage("Something went wrong", "danger")
            });
    };

    altConfirm(temp, "Are you sure you want to delete this post ?");
};

function restorePost(id) {
    let content = {
        category: "restore-post",
        id: id
    };

    function temp() {
        fetch(`${window.origin}/forum`, {
                method: "POST",
                credentials: "include",
                body: JSON.stringify(content),
                cache: "no-cache",
                headers: new Headers({ "content-type": "application/json" }),
            })
            .then((response) => response.json())
            .then(() => {
                loadingForum = false;
                socket.emit("loadForum");
            })
            .catch(() => {
                flashMessage("Something went wrong", "danger")
            });
    };
    altConfirm(temp, "Are you sure you want to restore this post ?");
};

function filterOutDeleted() {
    let allPosts = document.querySelectorAll(".post-container-thread");
    allPosts = [...allPosts];

    allPosts.forEach(post => {
        if (post.getAttribute("deleted") == "1") {
            post.hidden = true;
        }
    });
};

function unfilterDeleted() {
    let allPosts = document.querySelectorAll(".post-container-thread");

    allPosts = [...allPosts];

    allPosts.forEach(post => {
        if (post.getAttribute("deleted") == "1") {
            post.hidden = false;
        };
    });
};

window.onload = () => {

    replyObjects = {};
    threadObjects = {};

    role = document.getElementById("role").innerHTML;

    socket.emit("loadForum");

    loadingForum = true;

    let searchBar = document.getElementById("search-bar");

    searchBar.addEventListener("input", () => { searchPosts(".post-container-thread", ".post-sender", ".post-content", ".post-tag") });
};

//socket listeners 

socket.on("startThread", function(data) {
    data = JSON.parse(data);
    addThread(data);
});

socket.on("reply", function(data) {
    data = JSON.parse(data);
    addReply(data);
});

socket.on("report-feedback", function(data) {
    data = JSON.parse(data);
    flashMessage(data.message, data.category)
});

socket.on("inappropriatePost", function() {
    flashMessage("Message not posted due to Inapproprate Language", "danger")
});

socket.on("invalid-post", function() {
    flashMessage("Post is Invalid", "danger")
});

socket.on("not-exist", function() {
    flashMessage("Thread was deleted", "danger")
});

socket.on("loadForum", function(data) {
    data = JSON.parse(data);
    displayForum(data.replies, data.threads, loadingForum);
});

socket.on("filter-threads", function() {
    socket.emit("loadForum");
});

socket.on("sort", function() {
    socket.emit("loadForum");
});