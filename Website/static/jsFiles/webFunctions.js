//Flashes message with specific colour
var flashMessage = (message, category) => {
    let flashData = document.getElementById("flash-message");

    if (flashData.classList.contains(`alert-success`)) flashData.classList.remove(`alert-success`);
    if (flashData.classList.contains(`alert-danger`)) flashData.classList.remove(`alert-danger`);
    if (flashData.classList.contains(`alert-info`)) flashData.classList.remove(`alert-info`);
    if (flashData.classList.contains(`fade-out`)) flashData.classList.remove(`fade-out`);

    flashData.innerHTML = `<strong>${message}</strong>`;

    flashData.classList.add(`alert-${category}`);

    setTimeout(() => {
        let flashData = document.getElementById("flash-message");

        flashData.classList.add("fade-out");
    }, 3000);
};

var toggleTwo = (id, class1, class2) => {
    var wrapper = document.getElementById(id);

    if (wrapper.classList.contains(class1)) {

        wrapper.classList.remove(class1);
        wrapper.classList.add(class2);
    } else {
        wrapper.classList.add(class1);
        wrapper.classList.remove(class2);

    };
    return true;
};

//This function creates a custom pop up
//The ifYes parameter specifies what should happen if yes is pressed
var altConfirm = (ifYes, question) => {
    let yesBtn = document.getElementById("modalYes");
    yesBtn.onclick = () => {
        ifYes()
        closeModalDiv();
    };
    modal.style.display = "block";
    if (question) {
        modalQuestion.innerHTML = question
    } else {
        modalQuestion.innerHTML = "Are you Sure ?"
    };
};

var searchPosts = (allPostClass, senderClass, contentClass, tagClass) => {
    let searchBar = document.getElementById("search-bar");

    let searchData = searchBar.value;

    let allPosts = document.querySelectorAll(allPostClass);

    allPosts = [...allPosts];

    let validPosts = [];

    switch (searchData[0]) {
        case "@":
            searchData = searchData.substring(1);

            if (searchData) {

                //Stop regex from recognising the special characters  
                searchData = searchData.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');;

                let filter = new RegExp(`${searchData}`, "gi");

                allPosts.forEach(post => {

                    let senderSpan = post.querySelector(senderClass);
                    if (senderSpan) {
                        let sender = senderSpan.innerHTML;

                        sender = sender.replace(new RegExp("<htext>|</htext>", "gi"), "");
                        filter.test("")
                        if (filter.test(sender)) {
                            post.hidden = false;
                            senderSpan.innerHTML = highlightSearch(filter, sender);
                            openThread(post.parentElement.id);
                        } else {
                            let postHidden = isReplyValid(validPosts, post);
                            post.hidden = postHidden;
                            senderSpan.innerHTML = sender;
                        };
                    }
                });
            } else {
                allPosts.forEach(post => {
                    let allSenderSpans = post.querySelectorAll(senderClass);
                    let senderList = [...allSenderSpans];
                    removeHighlight(senderList)
                });
            };

            break;

        case "#":
            searchData = searchData.substring(1);

            if (searchData) {
                searchData = searchData.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');;
                let filter = new RegExp(`(#)*${searchData}`, "gi");

                allPosts.forEach(post => {

                    let allTags = [...post.querySelectorAll(tagClass)];

                    let postHidden = true;

                    allTags.forEach(tagSpan => {
                        let tag = tagSpan.innerHTML;
                        tag = tag.replace(new RegExp("<htext>|</htext>", "gi"), "");
                        filter.test("")
                        if (filter.test(tag)) {
                            tagSpan.innerHTML = highlightSearch(filter, tag);
                            postHidden = false;
                        } else {
                            tagSpan.innerHTML = tag;
                        };
                    });

                    if (!postHidden) {
                        openThread(post.parentElement.id);
                        validPosts.push(post);
                    } else postHidden = isReplyValid(validPosts, post);

                    post.hidden = postHidden;

                });
            } else {
                allPosts.forEach(post => {
                    let allTags = [...post.querySelectorAll(tagClass)];
                    removeHighlight(allTags)
                    postHidden = false;
                    post.hidden = false;
                });
            };
            break;

        case undefined:
            allPosts.forEach(post => {

                let allContentSpans = post.querySelectorAll(contentClass);
                let contentList = [...allContentSpans];
                removeHighlight(contentList)
                post.hidden = false;
            });
            break;

        default:
            if ((searchData[0] == '"' && searchData.at(-1) == '"') || (searchData[0] == "'" && searchData.at(-1) == "'")) {
                searchData = searchData.slice(1, searchData.length - 1);
            }
            searchData = searchData.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
            let filter = new RegExp(`${(searchData)}`, "gi");

            allPosts.forEach(post => {

                let allContentSpans = post.querySelectorAll(contentClass);

                let postHidden = true;

                let contentList = [...allContentSpans];

                contentList.forEach(contentSpan => {
                    let content = contentSpan.innerHTML;

                    content = content.replace(new RegExp("<htext>|</htext>", "gi"), "");
                    contentSpan.innerHTML = content
                    filter.test("")
                    if (filter.test(content)) {
                        contentSpan.innerHTML = highlightSearch(filter, content)
                        postHidden = false;

                    } else if ((content[0] == '"' && content.at(-1) == '"') || (content[0] == "'" && content.at(-1) == "'")) {
                        let quoteMark = content[0];
                        content = content.slice(1, content.length - 1);
                        filter.test("")
                        if (filter.test(content)) {
                            contentSpan.innerHTML = quoteMark + highlightSearch(filter, content) + quoteMark;
                            postHidden = false;
                        }
                    }
                });

                if (!postHidden) {
                    validPosts.push(post);
                    openThread(post.parentElement.id);
                } else postHidden = isReplyValid(validPosts, post);

                post.hidden = postHidden;
            });
            break;
    };
};

var highlightSearch = (filter, string) => {
    let loopCount = 0
    let macthCount = string.match(filter).length
    let splitString = []
    let matchString;
    let matchIndex;
    let startIndex = 0

    while (loopCount < macthCount) {
        
        let currentMatch = filter.exec(string)
        //currentMatch automatically increments to the next match
        matchString = currentMatch["0"]
        matchIndex = currentMatch.index

        let substring = string.slice(startIndex, matchIndex + matchString.length)

        startIndex = matchIndex + matchString.length

        filterString = matchString.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
        //Stops regex from recognising special characters 

        let uniqueFilter = new RegExp(`${filterString}`, "g");

        substring = substring.replace(uniqueFilter, `<htext>${matchString}</htext>`)

        splitString.push(substring)

        loopCount += 1
    }
    splitString.push(string.slice(startIndex, string.length))
    return splitString.join('')
};


var isReplyValid = (allPosts, post) => {
    for (let i = 0; i < allPosts.length; i++) {
        const validPost = allPosts[i];
        let replyContainer = document.getElementById(`replyPost${validPost.id}`);
        if (hasDescendant(replyContainer, post) || hasDescendant(post, replyContainer)) {
            return false;
        };
    };
    return true;
};

//Expands all the container elements that are parents of a post
var openThread = (id) => {
    let post = document.getElementById(id);
    if (!post) return ""

    if (!(id == "all-posts-container")) {
        let postParentID = post.parentElement.id;

        let replyToggler = document.getElementById(`${id}Toggler`);

        if (!post.classList.contains("show")) {
            if (replyToggler) replyToggler.click();
        };
        openThread(postParentID);
    };
    return "";
};

var hasDescendant = (parent, child) => {
    if (!(parent && child)) {
        return false
    }
    return Boolean(parent.querySelector(`#${child.id}`));
};

var removeHighlight = (list) => {
    list.forEach(contentSpan => {
        let content = contentSpan.innerHTML;
        content = content.replace(new RegExp("<htext>|</htext>", "g"), "");
        contentSpan.innerHTML = content;
    });
}

//Copied from stackoverflow 
//Removes html styntax frmo string 
const strip = (html) => {
    let doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || "";
}

socket.on("logout", function(data) {
    data = JSON.parse(data);
    window.location = data.url;
});

socket.on("updateInboxAlert", function(data) {
    data = JSON.parse(data);

    let value = data.value;
    let inboxAlert = document.getElementById("inbox-alert");
    inboxAlert.innerHTML = parseInt(inboxAlert.innerHTML) + value;
});

socket.on("flashMessage", function(data) {
    data = JSON.parse(data);

    flashMessage(data.message, data.category)
});

// Gets the modal (background of pop up)
const modal = document.getElementById("myModal");

// Get the <span> element that closes the modal
const exitSpan = document.getElementById("closeModal");

const modalQuestion = document.getElementById("modalQuestion");

const noBtn = document.getElementById("modalNo");
noBtn.onclick = closeModalDiv;


// When the user clicks on <span> (x), close the modal
exitSpan.onclick = function() {
    modal.style.display = "none";
    return false;
};

function closeModalDiv() {
    modal.style.display = "none";
};

// When the user clicks anywhere outside of the modal, close it
window.onclick = function(event) {
    if (event.target == modal) {
        modal.style.display = "none";
        return false;
    }
};