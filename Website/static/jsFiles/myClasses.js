let socket = io.connect(`${window.origin}`);

function createClass() {
    let className = document.getElementById("newClass").
        value.replace(/class+/gi, "").replace(/\s+/g, '');

    //clears class name input
    document.getElementById("newClass").value = "";

    let content = {
        type: "create-class",
        name: strip(className.trim()) //strip removes html syntax from name
    };

    //list of all the class banner  elements
    let allClassBanners = [...document.querySelectorAll(".class-banner")];

    //gets the name of every class
    allClassNames = allClassBanners.map(banner =>
        banner.querySelector(".class-name")
        .innerHTML.replace(/class/ig, "")
        .replace(/\s+/g, '').toLowerCase());

    if (allClassNames.includes(className.toLowerCase())){
        flashMessage(`Class '${className.toUpperCase()}' Already Exists`, "danger");
    }
    else {
        if (content.name.replace(/\s+/g, '')) {
            fetch(`${window.origin}/games/my-classes`, {
                    method: "POST",
                    body: JSON.stringify(content),
                    headers: new Headers({ "content-type": "application/json" }),
                })
                .then((response) => response.json())
                .then((data) => {
                    addClass(data);
                })
                .catch(() => {
                    flashMessage("Something went wrong", "danger")
                });
        } else flashMessage("Invalid Class Name", "danger");
    };
};

function removeStudent(student, classID) {
    let content = {
        type: "remove-student",
        studentName: student,
        ClassID: classID
    };
    let classContainer = document.getElementById(classID);
    let studentListElement = classContainer.querySelector(".student-list");
    let className = classContainer.querySelector(".class-name").innerHTML.replace(/class/gi, "");


    function temp() {
        fetch(`${window.origin}/games/my-classes`, {
                method: "POST",
                body: JSON.stringify(content),
                headers: new Headers({ "content-type": "application/json" }),
            })
            .then((response) => response.json())
            .then(() => {
                [...studentListElement.children].forEach(studentElement => {
                    let name = studentElement.querySelector(".class-student-name").innerHTML;

                    if (name.toLowerCase() == student.toLowerCase()) {
                        targetStudentElement = studentElement;
                        targetStudentElement.parentElement.removeChild(targetStudentElement);
                    };
                });
                flashMessage(`${student.toUpperCase()} was Successfully Removed from Class ${className.toUpperCase()}`, "success");
            })
            .catch(() => {
                flashMessage("Something went wrong", "danger")
            });
    };
    altConfirm(temp, `Are you sure you want to remove ${student} from this class ${className.toUpperCase()} ?`);
};

function addStudent(classID, inputID) {

    let studentName = document.getElementById(inputID).value;

    document.getElementById(inputID).value = "";

    let content = {
        type: "add-student",
        studentName: studentName,
        ClassID: classID
    };

    //Checking if student is already in Class
    let classStudents = [];
    let classContainer = document.getElementById(classID);
    let studentListElement = classContainer.querySelector(".student-list");
    let className = classContainer.querySelector(".class-name").innerHTML.replace(/class/gi, "");

    //gets list of students in class
    [...studentListElement.children].forEach(studentElement => {
        let name = studentElement.querySelector(".class-student-name").innerHTML;
        classStudents.push(name.toLowerCase())

    });

    if (classStudents.includes(studentName.toLowerCase())) {
        flashMessage(`${studentName.toUpperCase()} i
        s Already in Class ${className.toUpperCase()}`, "danger");
    } else {

        if (content.studentName.replace(/\s+/g, '')){
            socket.emit("sendClassRequest", JSON.stringify(content));
        } 
        else flashMessage("Invalid Student Name", "danger");
    };
};

function deleteClass(classID) {

    var content = {
        type: "delete-class",
        ClassID: classID
    };

    function temp() {
        fetch(`${window.origin}/games/my-classes`, {
                method: "POST",
                body: JSON.stringify(content),
                headers: new Headers({ "content-type": "application/json" }),
            })
            .then((response) => response.json())
            .then(() => {

                //deletes class element
                let classElement = document.getElementById(classID);
                let className = classElement.querySelector(".class-name").innerHTML.replace(/class/gi, "");

                classElement.parentElement.removeChild(classElement);

                flashMessage(`Class ${className.toUpperCase()} was successfully deleted`, "success");
            })
            .catch(() => {
                flashMessage("Something went wrong", "danger")
            });
    };

    altConfirm(temp, "Are you sure you want to Delete this class ?");
};

socket.on("classRequestFeedback", function(data) {
    data = JSON.parse(data);

    if (data.message) flashMessage(data.message, "danger");
    else flashMessage("Request has been sent to student", "success");
});

function addClass(data) {

    flashMessage(`Class ${data.name.toUpperCase()} was created Successfully`, "success");

    //gets template class container element, and adds the new class's details
    let allClassContainer = document.querySelector(".all-class-container");

    let classContainer = document.getElementById("class-template").cloneNode(true);

    classContainer.hidden = false;

    classContainer.id = data.id;

    let classTitle = classContainer.querySelector(".class-name");

    classTitle.innerHTML = `Class ${data.name}`;

    let deleteClassBtn = classContainer.querySelector(".delete-class-btn");

    deleteClassBtn.onclick = () => {
        deleteClass(data.id);
    };

    let studentInput = classContainer.querySelector(".student-input");

    studentInput.id = `newStudent${data.id}`;

    let addStudentBtn = classContainer.querySelector(".add-student-btn");

    addStudentBtn.onclick = () => {
        addStudent(data.id, `newStudent${data.id}`);
    };

    allClassContainer.prepend(classContainer);
};