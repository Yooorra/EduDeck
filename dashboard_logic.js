/* 1. TOGGLE DROPDOWN MENUS */

// Find ALL the "more options" containers on the page
const moreOptionContainers = document.querySelectorAll('.more-options-container');

moreOptionContainers.forEach(container => {

    const button = container.querySelector('.icon-btn') || container.querySelector('.user-profile');
    const menu = container.querySelector('.dropdown-menu');

    if (button && menu) {
        button.addEventListener('click', () => {
            menu.classList.toggle('hidden');
        });
    }
});

/* 2. Add Note */
const notesContainer = document.getElementById('notes-container');
const noteTemplate = document.getElementById('note-card-template');

function createNewNote() {
    const newNoteFragment = noteTemplate.content.cloneNode(true);
    const newNoteCard = newNoteFragment.querySelector('.task-card');
    enableColorPicker(newNoteCard);
    notesContainer.prepend(newNoteCard);
}

const addNotePlusBtn = document.querySelector('.quick-notes .add-btn');
if (addNotePlusBtn) {
    addNotePlusBtn.addEventListener('click', createNewNote);
}

const addNoteDropdownBtn = document.getElementById('add-note-dropdown-btn');
if (addNoteDropdownBtn) {
    addNoteDropdownBtn.addEventListener('click', () => {
        createNewNote();
        addNoteDropdownBtn.closest('.dropdown-menu').classList.add('hidden');
    });
}

/* 3. Add Category */
const schedulerContainer = document.getElementById('scheduler-container');
const categoryTemplate = document.getElementById('category-template');
const addCategoryBtn = document.getElementById('add-category-btn');

if (addCategoryBtn) {
    addCategoryBtn.addEventListener('click', () => {
        // 1. Make a photocopy of the Category blueprint
        const newCategory = categoryTemplate.content.cloneNode(true);

        // 2. Find the "+" button inside this specific new category
        const addTaskBtn = newCategory.querySelector('.add-btn');
        const taskList = newCategory.querySelector('.task-list');
        const taskTemplate = document.getElementById('task-card-template');

        // 2b. Make the Toggle button minimize/maximize the task list
        const toggleBtn = newCategory.querySelector('.toggle-btn');
        const toggleIcon = toggleBtn.querySelector('img');
        toggleBtn.addEventListener('click', () => {
            taskList.classList.toggle('hidden');
            if (taskList.classList.contains('hidden')) {
                toggleIcon.style.transform = 'rotate(-90deg)';
                toggleIcon.style.transition = '0.2s';
            } else {
                toggleIcon.style.transform = 'rotate(0deg)';
            }
        });

        // 2c. Make the task list a sortable drop zone (Using SortableJS)
        enableDragAndDrop(taskList);

        // 3. Hook up the "+" button so it adds Task Cards to THIS category
        addTaskBtn.addEventListener('click', () => {
            const newTaskFragment = taskTemplate.content.cloneNode(true);
            const newTaskCard = newTaskFragment.querySelector('.task-card');
            enableColorPicker(newTaskCard);

            // Wire up the Bell button to open the Calendar
            const bellBtn = newTaskCard.querySelector('.bell-btn');
            if (bellBtn) {
                bellBtn.addEventListener('click', () => {
                    openCalendarForTask(newTaskCard);
                });
            }

            taskList.prepend(newTaskCard);
        });

        // 3.5. Enable Category Master Checkbox
        enableCategoryMasterCheckbox(newCategory);

        // 4. Add the new category to the top of the scheduler
        schedulerContainer.prepend(newCategory);

        // 5. Hide the dropdown menu after clicking
        addCategoryBtn.closest('.dropdown-menu').classList.add('hidden');
    });
}

/* 4. MAGIC COLOR PICKER */
function enableColorPicker(cardElement) {
    const colorLine = cardElement.querySelector('.card-color-line');
    const colorInput = cardElement.querySelector('.color-picker-input');

    if (!colorLine || !colorInput) return;

    colorLine.addEventListener('click', () => {
        colorInput.click();
    });

    colorInput.addEventListener('input', (event) => {
        colorLine.style.backgroundColor = event.target.value;
    });
}

/* 5. Bulk Remove Mode */

const allDropdownButtons = document.querySelectorAll('.menu-item');
allDropdownButtons.forEach(btn => {
    if (btn.textContent.trim() === "Remove") {
        btn.addEventListener('click', () => {
            const widget = btn.closest('.widget');

            widget.classList.add('remove-mode');

            const confirmBox = widget.querySelector('.confirm-box');
            if (confirmBox) confirmBox.classList.remove('hidden');

            btn.closest('.dropdown-menu').classList.add('hidden');
        });
    }
});

function enableCategoryMasterCheckbox(categoryElement) {
    const masterCheckbox = categoryElement.querySelector('.category-checkbox input');
    if (!masterCheckbox) return;

    masterCheckbox.addEventListener('change', () => {
        const taskCheckboxes = categoryElement.querySelectorAll('.task-list .task-checkbox');
        taskCheckboxes.forEach(cb => {
            cb.checked = masterCheckbox.checked;
        });
    });
}

const confirmButtons = document.querySelectorAll('.confirm-btn');
confirmButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        const widget = btn.closest('.widget');

        const allChecked = widget.querySelectorAll('input[type="checkbox"]:checked');

        allChecked.forEach(checkbox => {
            if (checkbox.closest('.category-checkbox')) {
                const category = checkbox.closest('.task-category');
                if (category) {
                    category.classList.add('shrink-out');
                    setTimeout(() => category.remove(), 400);
                }
            }
            else if (checkbox.classList.contains('task-checkbox')) {
                const card = checkbox.closest('.task-card');
                if (card) {
                    card.classList.add('shrink-out');
                    setTimeout(() => card.remove(), 400);
                }
            }
        });

        // wait for the shrink animation to finish, then turn remove mode off
        setTimeout(() => {
            widget.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);

            widget.classList.remove('remove-mode');

            const confirmBox = widget.querySelector('.confirm-box');
            if (confirmBox) confirmBox.classList.add('hidden');
        }, 400);
    });
});

/* 6. Drag & Drop */

function enableDragAndDrop(container) {
    new Sortable(container, {
        group: 'shared', animation: 150, ghostClass: 'dragging', easing: "cubic-bezier(1, 0, 0, 1)"
    });
}

enableDragAndDrop(document.getElementById('notes-container'));

/* 7. Calendar Engine (the one that pops up when you click the bell) */
const calendarView = document.querySelector('.scheduler-calendar-view');
const schedulerMainView = document.querySelector('.scheduler-main-view');
const daysGrid = document.getElementById('calendar-days');
const monthYearSelector = document.querySelector('.month-year-selector');
const monthYearText = document.querySelector('.current-month-year');
const yearDropdown = document.querySelector('.year-dropdown');
const prevBtn = document.querySelector('.prev-month-btn');
const nextBtn = document.querySelector('.next-month-btn');

const timeDisplayBtn = document.querySelector('.time-display-btn');
const timeDropdown = document.querySelector('.time-dropdown');
const hoursCol = document.getElementById('hours-col');
const minutesCol = document.getElementById('minutes-col');
const ampmOptions = document.querySelectorAll('.ampm-option');

const cancelBtn = document.querySelector('.cancel-date-btn');
const confirmBtn = document.querySelector('.confirm-date-btn');

let currentActiveTaskCard = null;
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let selectedDate = null;

let selectedHour = "12";
let selectedMinute = "00";
let selectedAmPm = "PM";

const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function renderCalendar() {
    daysGrid.innerHTML = '';
    if (monthYearText) monthYearText.textContent = `${monthNames[currentMonth]} ${currentYear}`;

    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    // empty boxes before the 1st of the month
    for (let i = 0; i < firstDay; i++) {
        const emptyDiv = document.createElement('div');
        emptyDiv.classList.add('calendar-day', 'empty');
        daysGrid.appendChild(emptyDiv);
    }

    for (let i = 1; i <= daysInMonth; i++) {
        const dayDiv = document.createElement('div');
        dayDiv.classList.add('calendar-day');
        dayDiv.textContent = i;

        if (selectedDate && selectedDate.getDate() === i && selectedDate.getMonth() === currentMonth && selectedDate.getFullYear() === currentYear) {
            dayDiv.classList.add('active');
        }

        dayDiv.addEventListener('click', () => {
            document.querySelectorAll('.calendar-day').forEach(el => el.classList.remove('active'));
            dayDiv.classList.add('active');
            selectedDate = new Date(currentYear, currentMonth, i);
        });

        daysGrid.appendChild(dayDiv);
    }
}

if (prevBtn) {
    prevBtn.addEventListener('click', () => {
        daysGrid.classList.remove('slide-left', 'slide-right');
        void daysGrid.offsetWidth; // trick so the slide animation can play again
        daysGrid.classList.add('slide-right'); // slide animation

        currentMonth--;
        if (currentMonth < 0) { currentMonth = 11; currentYear--; }
        renderCalendar();
    });
}
if (nextBtn) {
    nextBtn.addEventListener('click', () => {
        daysGrid.classList.remove('slide-left', 'slide-right');
        void daysGrid.offsetWidth;
        daysGrid.classList.add('slide-left');

        currentMonth++;
        if (currentMonth > 11) { currentMonth = 0; currentYear++; }
        renderCalendar();
    });
}

// clicking the "September 2026" text opens a list of years
if (monthYearSelector && yearDropdown) {
    for (let y = 2024; y <= 2035; y++) {
        const yearOpt = document.createElement('div');
        yearOpt.classList.add('year-option');
        yearOpt.textContent = y;
        yearOpt.addEventListener('click', (e) => {
            e.stopPropagation(); currentYear = y;
            renderCalendar();
            yearDropdown.classList.add('hidden');
        });
        yearDropdown.appendChild(yearOpt);
    }

    monthYearSelector.addEventListener('click', () => {
        yearDropdown.classList.toggle('hidden');
    });

    // clicking anywhere else closes the year list
    document.addEventListener('click', (e) => {
        if (!monthYearSelector.contains(e.target)) {
            yearDropdown.classList.add('hidden');
        }
    });
}

function updateTimeDisplay() {
    if (timeDisplayBtn) timeDisplayBtn.textContent = `${selectedHour}:${selectedMinute} ${selectedAmPm}`;
}

// building the hours / minutes / AM-PM lists for the time picker
if (hoursCol && minutesCol && timeDisplayBtn) {
    for (let h = 1; h <= 12; h++) {
        let str = h < 10 ? "0" + h : "" + h;
        const opt = document.createElement('div');
        opt.classList.add('time-option');
        if (str === "12") opt.classList.add('active');
        opt.textContent = str;
        opt.addEventListener('click', (e) => {
            e.stopPropagation();
            hoursCol.querySelectorAll('.time-option').forEach(el => el.classList.remove('active'));
            opt.classList.add('active');
            selectedHour = str;
            updateTimeDisplay();
        });
        hoursCol.appendChild(opt);
    }

    for (let m = 0; m < 60; m += 5) {
        let str = m < 10 ? "0" + m : "" + m;
        const opt = document.createElement('div');
        opt.classList.add('time-option');
        if (str === "00") opt.classList.add('active');
        opt.textContent = str;
        opt.addEventListener('click', (e) => {
            e.stopPropagation();
            minutesCol.querySelectorAll('.time-option').forEach(el => el.classList.remove('active'));
            opt.classList.add('active');
            selectedMinute = str;
            updateTimeDisplay();
        });
        minutesCol.appendChild(opt);
    }

    // AM/PM
    ampmOptions.forEach(opt => {
        opt.addEventListener('click', (e) => {
            e.stopPropagation();
            ampmOptions.forEach(el => el.classList.remove('active'));
            opt.classList.add('active');
            selectedAmPm = opt.textContent;
            updateTimeDisplay();
        });
    });

    timeDisplayBtn.addEventListener('click', (e) => {
        timeDropdown.classList.toggle('hidden');
        e.stopPropagation();
    });

    // clicking anywhere else closes the time list
    document.addEventListener('click', (e) => {
        if (!timeDisplayBtn.contains(e.target) && !timeDropdown.contains(e.target)) {
            timeDropdown.classList.add('hidden');
        }
    });
}

// runs when a task's bell button is clicked
function openCalendarForTask(taskCard) {
    currentActiveTaskCard = taskCard;
    schedulerMainView.classList.add('hidden');
    calendarView.classList.remove('hidden');

    // start fresh: this month, no date picked, 12:00 PM
    currentMonth = new Date().getMonth();
    currentYear = new Date().getFullYear();
    selectedDate = null;

    selectedHour = "12";
    selectedMinute = "00";
    selectedAmPm = "PM";
    if (hoursCol) {
        hoursCol.querySelectorAll('.time-option').forEach(el => el.classList.remove('active'));
        if (hoursCol.children[11]) hoursCol.children[11].classList.add('active'); // "12"
    }
    if (minutesCol) {
        minutesCol.querySelectorAll('.time-option').forEach(el => el.classList.remove('active'));
        if (minutesCol.children[0]) minutesCol.children[0].classList.add('active'); // "00"
    }
    ampmOptions.forEach(el => el.classList.remove('active'));
    if (ampmOptions[1]) ampmOptions[1].classList.add('active'); // "PM"
    updateTimeDisplay();

    renderCalendar();
}

if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
        calendarView.classList.add('hidden');
        schedulerMainView.classList.remove('hidden');
    });
}

if (confirmBtn) {
    confirmBtn.addEventListener('click', () => {
        if (!selectedDate) {
            alert("Please select a date first!");
            return;
        }

        const formattedDate = `${monthNames[selectedDate.getMonth()].substring(0, 3)} ${selectedDate.getDate()}, ${selectedHour}:${selectedMinute} ${selectedAmPm}`;

        if (currentActiveTaskCard) {
            // Update Text
            const dueText = currentActiveTaskCard.querySelector('.task-due');
            if (dueText) dueText.textContent = formattedDate;

            // remember the real date on the card, the Calendar page (section 12) reads these
            currentActiveTaskCard.dataset.year = selectedDate.getFullYear();
            currentActiveTaskCard.dataset.month = selectedDate.getMonth();
            currentActiveTaskCard.dataset.day = selectedDate.getDate();

            const statusDot = currentActiveTaskCard.querySelector('.status-dot');
            const statusText = currentActiveTaskCard.querySelector('.status-text');

            if (statusDot && statusText) {
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                if (selectedDate.getTime() === today.getTime()) {
                    statusDot.style.backgroundColor = "#34a853";
                    statusText.textContent = "Doing";
                } else if (selectedDate.getTime() > today.getTime()) {
                    statusDot.style.backgroundColor = "var(--school-orange)";
                    statusText.textContent = "Scheduled";
                } else {
                    statusDot.style.backgroundColor = "var(--school-red)";
                    statusText.textContent = "Overdue";
                }
            }
        }

        // go back to the task list
        calendarView.classList.add('hidden');
        schedulerMainView.classList.remove('hidden');
    });
}

/* 8. Video Compressor */
const videoUploadZone = document.getElementById('video-upload-zone');
const videoUploadText = document.getElementById('video-upload-text');
const videoBrowseBtn = document.getElementById('video-browse-btn');
const videoFileInput = document.getElementById('video-file-input');
const videoCompressBtn = document.getElementById('video-compress-btn');

// the 3 screens inside the video box: upload -> loading -> result
const videoUploadView = document.getElementById('video-upload-view');
const videoLoadingView = document.getElementById('video-loading-view');
const videoResultView = document.getElementById('video-result-view');

// "Save Location" part
const destBadge = document.getElementById('video-dest-badge');
const destText = document.getElementById('video-dest-display');
const destBrowseBtn = document.getElementById('btn-browse-dest-folder');
const destFolderInput = document.getElementById('video-dest-folder-input');

// stuff on the result screen
const resultStats = document.getElementById('video-result-stats');
const resultBadge = document.getElementById('video-saved-badge');
const resultLocation = document.getElementById('video-result-location');
const downloadBtn = document.getElementById('video-download-btn');
const compressAnotherBtn = document.getElementById('video-compress-another-btn');

let selectedVideoFile = null;
let compressedBlob = null;           // the compressed video Python sends back
let compressedFileName = '';
let destFolder = 'Upload_backend/';  // the folder name we send to Python
let destFolderHandle = null;         // the folder itself (only Chrome / Edge give this)

// swaps the screens. name is 'upload', 'loading' or 'result'
function showVideoScreen(name) {
    const screens = { upload: videoUploadView, loading: videoLoadingView, result: videoResultView };

    for (const key in screens) {
        const isThisOne = (key === name);
        screens[key].classList.toggle('active-view', isThisOne);
        screens[key].classList.toggle('hidden-view', !isThisOne);
    }
}

// orange highlight while a file is dragged over a drop zone
function highlightZone(zone, on) {
    zone.style.backgroundColor = on ? '#fff0e6' : '';
    zone.style.borderColor = on ? 'var(--school-orange)' : '';
}

// used by both the browse button and drag & drop
function chooseVideo(file) {
    selectedVideoFile = file;
    videoUploadText.innerHTML = `<strong>Selected:</strong><br>${file.name}`;
}

// 1. pick the video
videoBrowseBtn.addEventListener('click', () => {
    videoFileInput.click();
});

videoFileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        chooseVideo(e.target.files[0]);
    }
});

videoUploadZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    highlightZone(videoUploadZone, true);
});

videoUploadZone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    highlightZone(videoUploadZone, false);
});

videoUploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    highlightZone(videoUploadZone, false);

    if (e.dataTransfer.files.length > 0) {
        chooseVideo(e.dataTransfer.files[0]);
    }
});

// 2. pick the save location (opens the File Manager, so no typing the path)
function setDestFolder(name) {
    destFolder = name + '/';
    destText.textContent = destFolder;
}

async function pickDestFolder() {
    // Chrome / Edge can open the real folder window
    if (window.showDirectoryPicker) {
        try {
            destFolderHandle = await window.showDirectoryPicker();
            setDestFolder(destFolderHandle.name);
        } catch (err) {
            // AbortError just means the user closed the window, so ignore it.
            // any other error: use the hidden folder input instead
            if (err.name !== 'AbortError') destFolderInput.click();
        }
    } else {
        // other browsers use the hidden folder input
        destFolderInput.click();
    }
}

destBrowseBtn.addEventListener('click', pickDestFolder);
destBadge.addEventListener('click', pickDestFolder);

// the fallback: a hidden input that lets you pick a folder
destFolderInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        // webkitRelativePath looks like "MyFolder/video.mp4", we only want "MyFolder"
        const folderName = e.target.files[0].webkitRelativePath.split('/')[0];
        setDestFolder(folderName);
    }
});

// 3. COMPRESS NOW
videoCompressBtn.addEventListener('click', () => {
    if (!selectedVideoFile) {
        alert("Please select or drop a video file first!");
        return;
    }

    // =========================================================================
    // HEY EARL & NISHKY! (FRONT-END VIDEO COMPRESSOR CONNECTION)
    // =========================================================================
    // 1. Loading Screen: The frontend swaps into a loading screen while
    //    Python is running FFmpeg, so the user knows it's working!
    // 2. Save Folder: The user clicks "Browse..." to pick the folder. The
    //    front-end sends it as 'dest_folder', but it's ONLY THE FOLDER NAME
    //    (like 'nuod/'), not the full path. Browsers don't share full paths!
    //    So Python can't know where that folder really is. Read the TODO
    //    in file_upload.py about this.
    // 3. Finished Screen: When Python finishes and returns the file,
    //    the frontend shows the size savings, a Download button
    //    and a Compress Another button!
    // =========================================================================

    showVideoScreen('loading');

    // package the video and the folder name so Python can read them
    const formData = new FormData();
    formData.append('video_file', selectedVideoFile);
    formData.append('dest_folder', destFolder);

    fetch('http://127.0.0.1:5000/compress', {
        method: 'POST',
        body: formData
    })
        .then(response => {
            if (!response.ok) {
                throw new Error('Server returned error status: ' + response.status);
            }
            return response.blob();
        })
        .then(blob => {
            // the file sizes in MB, to show how much was saved
            const originalMB = (selectedVideoFile.size / 1024 / 1024).toFixed(2);
            const compressedMB = (blob.size / 1024 / 1024).toFixed(2);
            const savedPercent = (((selectedVideoFile.size - blob.size) / selectedVideoFile.size) * 100).toFixed(0);

            // Python always sends back an .mp4, so the new name ends with .mp4 too
            const originalName = selectedVideoFile.name;
            const nameOnly = originalName.includes('.') ? originalName.substring(0, originalName.lastIndexOf('.')) : originalName;

            compressedBlob = blob;
            compressedFileName = 'compressed_' + nameOnly + '.mp4';

            // fill in the result screen
            resultStats.innerHTML = `Original: <strong>${originalMB} MB</strong> → Compressed: <strong style="color: #16a34a;">${compressedMB} MB</strong>`;
            resultBadge.textContent = `Saved ${savedPercent}%`;
            // TODO: this only shows the folder the user picked.
            // The file isn't really saved there until Python (or the front-end) does it.
            resultLocation.innerHTML = `Saved in: <code>${destFolder}${compressedFileName}</code>`;

            showVideoScreen('result');
        })
        .catch(error => {
            console.error('Compression Error:', error);
            alert("An error occurred during compression. Make sure the Python server is running.");
            showVideoScreen('upload');
        });
});

// Download button on the result screen
downloadBtn.addEventListener('click', () => {
    // makes a temporary link to the file in memory, then clicks it
    const fileUrl = URL.createObjectURL(compressedBlob);
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = compressedFileName;
    document.body.appendChild(link);
    link.click();
    link.remove();

    // clean up the temporary link after a bit
    setTimeout(() => URL.revokeObjectURL(fileUrl), 2000);
});

// Compress Another Video button: back to the start
compressAnotherBtn.addEventListener('click', () => {
    selectedVideoFile = null;
    compressedBlob = null;
    videoFileInput.value = '';
    videoUploadText.innerHTML = "Drag & Drop Your<br>Video File Here";
    showVideoScreen('upload');
});

/* 9. Document Tools */
const docUploadZone = document.getElementById('doc-upload-zone');
const docBrowseBtn = document.getElementById('doc-browse-btn');
const docFileInput = document.getElementById('doc-file-input');

// the 2 screens: pick files -> choose what to do (convert / merge)
const docUploadView = document.getElementById('doc-upload-view');
const docActionView = document.getElementById('doc-action-view');
const docSelectedFilesText = document.getElementById('doc-selected-files');
const docCancelBtn = document.getElementById('doc-cancel-btn');
const btnDocConvert = document.getElementById('btn-doc-convert');
const btnDocMerge = document.getElementById('btn-doc-merge');

let selectedDocFiles = [];

// swaps the 2 screens. name is 'upload' or 'action'
function showDocScreen(name) {
    const isUpload = (name === 'upload');

    docUploadView.classList.toggle('active-view', isUpload);
    docUploadView.classList.toggle('hidden-view', !isUpload);
    docActionView.classList.toggle('active-view', !isUpload);
    docActionView.classList.toggle('hidden-view', isUpload);
}

// saves the files, lists their names, then shows the action screen
function handleDocFiles(files) {
    if (files.length > 0) {
        selectedDocFiles = Array.from(files);

        const fileNames = selectedDocFiles.map(f => f.name).join('<br>');
        docSelectedFilesText.innerHTML = `<strong>Selected Files:</strong><br>${fileNames}`;

        showDocScreen('action');
    }
}

docBrowseBtn.addEventListener('click', () => {
    docFileInput.click();
});

docFileInput.addEventListener('change', (e) => {
    handleDocFiles(e.target.files);
});

docUploadZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    highlightZone(docUploadZone, true);
});

docUploadZone.addEventListener('dragleave', () => {
    highlightZone(docUploadZone, false);
});

docUploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    highlightZone(docUploadZone, false);
    handleDocFiles(e.dataTransfer.files);
});

// Cancel / Start Over
docCancelBtn.addEventListener('click', () => {
    selectedDocFiles = [];
    docFileInput.value = '';
    showDocScreen('upload');
});

// Placeholder for Convert Action
btnDocConvert.addEventListener('click', () => {
    // TODO TEAMMATE: Connect to Python's /convert route!
    // 1. Create a new FormData()
    // 2. Append the selectedDocFiles[0] to it
    // 3. Use fetch('http://127.0.0.1:5000/convert', ...) to send it to Python
    // 4. Handle the JSON response (e.g., showing a download link!)
    alert("This will send " + selectedDocFiles.length + " file(s) to Python to convert to PDF/DOC/PPT!");
});

// Placeholder for Merge Action
btnDocMerge.addEventListener('click', () => {
    if (selectedDocFiles.length < 2) {
        alert("You need at least 2 files to merge them!");
        return;
    }

    // TODO TEAMMATE: Connect to Python's /merge route!
    // 1. Create a new FormData()
    // 2. Use a loop to append ALL files in selectedDocFiles array to the formData
    // 3. Use fetch('http://127.0.0.1:5000/merge', ...) to send them all to Python
    // 4. Handle the JSON response to show the merged download link
    alert("This will send " + selectedDocFiles.length + " files to Python to merge them together!");
});

/* 10. Draggable Custom Layout */
const dashboardGrid = document.querySelector('.dashboard-grid');

new Sortable(dashboardGrid, {
    animation: 250,                  // how fast the cards slide around (ms)
    easing: "cubic-bezier(0.25, 1, 0.5, 1)",
    ghostClass: 'sortable-ghost',    // class for the empty spot while dragging
    dragClass: 'sortable-drag',      // class for the card being dragged
    delay: 150,                      // wait a bit before dragging starts (for touch screens)
    delayOnTouchOnly: true,
    handle: '.widget-header'         // you can only drag a card by its header
});

/* 11. User Session & Logout */
const savedUser = localStorage.getItem('currentUser');

if (savedUser) {
    try {
        const user = JSON.parse(savedUser);

        // show the name in the top right
        document.querySelector('.user-profile .user-name').textContent = user.name;

        // the circle shows initials. "Juan Dela Cruz" -> "JC"
        const words = user.name.trim().split(' ');
        let initials = words[0].substring(0, 2);   // only one name: first 2 letters
        if (words.length > 1) {
            initials = words[0][0] + words[words.length - 1][0];   // first + last name
        }
        document.querySelector('.user-profile .avatar').textContent = initials.toUpperCase();
    } catch (e) {
        console.error('Error loading user session:', e);
    }
}

const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('currentUser');
        window.location.href = 'login_page.html';
    });
}

/* 12. Calendar Page (the Calendar button in the sidebar) */

// sidebar buttons + the two "pages" that swap places
const navHomeBtn = document.getElementById('nav-home-btn');
const navCalendarBtn = document.getElementById('nav-calendar-btn');
const pageTitle = document.getElementById('page-title');
const dashboardView = document.getElementById('dashboard-view');
const calendarPageView = document.getElementById('calendar-page-view');

// stuff inside the calendar page
const calPrevBtn = document.getElementById('cal-page-prev-btn');
const calNextBtn = document.getElementById('cal-page-next-btn');
const calTodayBtn = document.getElementById('cal-page-today-btn');
const calHeading = document.getElementById('cal-page-month-heading');
const calDaysGrid = document.getElementById('cal-page-days-grid');
const taskCountBadge = document.getElementById('schedules-counter-badge');
const filterText = document.getElementById('schedules-filter-text');
const showAllBtn = document.getElementById('schedules-reset-btn');
const taskListBox = document.getElementById('schedules-card-list');

let calMonth = new Date().getMonth();
let calYear = new Date().getFullYear();
let pickedDay = null;   // the day the user clicked (null = show all tasks)

// 1. collects every task in the Scheduler that has a date
function getScheduledTasks() {
    const tasks = [];
    const cards = document.querySelectorAll('#scheduler-container .task-card');

    cards.forEach(card => {
        // no date saved on this card yet, so skip it
        if (!card.dataset.day) return;

        tasks.push({
            title: card.querySelector('.task-title').textContent.trim(),
            category: card.closest('.task-category').querySelector('.category-title').textContent.trim(),
            due: card.querySelector('.task-due').textContent,
            status: card.querySelector('.status-text').textContent,
            color: card.querySelector('.card-color-line').style.backgroundColor || '#f57c00',
            done: card.querySelector('.task-checkbox').checked,
            year: Number(card.dataset.year),
            month: Number(card.dataset.month),
            day: Number(card.dataset.day)
        });
    });

    return tasks;
}

// 2. draws the month on the left, then the task list on the right
function drawCalendarPage() {
    calHeading.textContent = monthNames[calMonth] + ' ' + calYear;
    calDaysGrid.innerHTML = '';

    const tasks = getScheduledTasks();
    const firstDay = new Date(calYear, calMonth, 1).getDay();   // which weekday the 1st lands on
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const today = new Date();

    // empty boxes before the 1st of the month
    for (let i = 0; i < firstDay; i++) {
        const emptyBox = document.createElement('div');
        emptyBox.classList.add('cal-day-cell', 'empty');
        calDaysGrid.appendChild(emptyBox);
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const cell = document.createElement('div');
        cell.classList.add('cal-day-cell');
        cell.textContent = day;

        // today gets an orange ring
        if (day === today.getDate() && calMonth === today.getMonth() && calYear === today.getFullYear()) {
            cell.classList.add('today');
        }

        // the day the user clicked turns orange
        if (day === pickedDay) {
            cell.classList.add('selected');
        }

        // small dots under the number for each task on that day (3 max)
        const tasksThisDay = tasks.filter(t => t.year === calYear && t.month === calMonth && t.day === day);

        if (tasksThisDay.length > 0) {
            cell.title = tasksThisDay.length + ' task(s) scheduled';

            const dots = document.createElement('div');
            dots.classList.add('cal-day-dots');

            for (let i = 0; i < Math.min(tasksThisDay.length, 3); i++) {
                const dot = document.createElement('span');
                dot.classList.add('cal-dot');
                dot.style.backgroundColor = tasksThisDay[i].color;
                dots.appendChild(dot);
            }
            cell.appendChild(dots);
        }

        // clicking a day only shows that day's tasks. Click it again to undo
        cell.addEventListener('click', () => {
            pickedDay = (pickedDay === day) ? null : day;
            drawCalendarPage();
        });

        calDaysGrid.appendChild(cell);
    }

    drawTaskList(tasks);
}

// 3. draws the task cards on the right
function drawTaskList(allTasks) {
    taskListBox.innerHTML = '';
    const shortMonth = monthNames[calMonth].substring(0, 3);   // "October" -> "Oct"

    // if a day is picked, only keep that day's tasks
    let tasksToShow = allTasks;

    if (pickedDay !== null) {
        tasksToShow = allTasks.filter(t => t.year === calYear && t.month === calMonth && t.day === pickedDay);
        filterText.textContent = 'Showing schedules for ' + shortMonth + ' ' + pickedDay;
        showAllBtn.classList.remove('hidden');
    } else {
        filterText.textContent = 'All Scheduled Tasks (' + allTasks.length + ')';
        showAllBtn.classList.add('hidden');
    }

    taskCountBadge.textContent = tasksToShow.length + (tasksToShow.length === 1 ? ' Task' : ' Tasks');

    // nothing to show, so show a message instead
    if (tasksToShow.length === 0) {
        const emptyBox = document.createElement('div');
        emptyBox.classList.add('schedules-empty-state');

        if (pickedDay !== null) {
            // empty because of the day the user picked
            emptyBox.innerHTML = `
                <div class="empty-icon-circle">
                    <img src="icons/calendar.svg" alt="Calendar" class="empty-cal-icon">
                </div>
                <h3>No Tasks on this Date</h3>
                <p>No tasks from your scheduler are scheduled for ${shortMonth} ${pickedDay}.</p>
                <button type="button" class="schedules-reset-btn" style="text-decoration:none; font-weight:700;">Show All Scheduled Tasks</button>`;

            emptyBox.querySelector('button').addEventListener('click', () => {
                pickedDay = null;
                drawCalendarPage();
            });
        } else {
            // empty because no task has a date yet
            emptyBox.innerHTML = `
                <div class="empty-icon-circle">
                    <img src="icons/calendar.svg" alt="Calendar" class="empty-cal-icon">
                </div>
                <h3>No Scheduled Tasks</h3>
                <p>Tasks with a set date in your Scheduler will smoothly appear here.</p>
                <button type="button" class="cal-go-scheduler-btn">
                    <img src="icons/plus.svg" alt="" class="cal-btn-icon">
                    Open Scheduler
                </button>`;

            // sends the user back to the dashboard and makes the Scheduler glow
            emptyBox.querySelector('button').addEventListener('click', () => {
                showDashboardPage(true);
            });
        }

        taskListBox.appendChild(emptyBox);
        return;
    }

    // one card for each task
    tasksToShow.forEach(task => {
        const card = document.createElement('div');
        card.classList.add('sched-item-card');

        // the status color (Doing = green, Overdue = red, the rest = orange)
        let statusClass = 'scheduled';
        if (task.status === 'Doing') statusClass = 'doing';
        if (task.status === 'Overdue') statusClass = 'overdue';

        card.innerHTML = `
            <div class="sched-color-bar"></div>
            <div class="sched-item-body">
                <div class="sched-top-meta">
                    <span class="sched-cat-tag"></span>
                    <span class="sched-status-tag ${statusClass}"></span>
                </div>
                <h4 class="sched-task-name"></h4>
                <div class="sched-bottom-meta">
                    <img src="icons/calendar.svg" alt="Due" class="sched-due-icon">
                    <span class="sched-due-text"></span>
                </div>
            </div>`;

        // the text is added here (not in the template above) so weird characters can't break the page
        card.querySelector('.sched-color-bar').style.backgroundColor = task.color;
        card.querySelector('.sched-cat-tag').textContent = task.category;
        card.querySelector('.sched-status-tag').textContent = task.status;
        card.querySelector('.sched-task-name').textContent = task.title;
        card.querySelector('.sched-due-text').textContent = task.due;

        // finished tasks get a line through them
        if (task.done) {
            card.querySelector('.sched-task-name').classList.add('completed');
        }

        taskListBox.appendChild(card);
    });
}

// 4. swapping between the Dashboard and the Calendar page
function showCalendarPage() {
    navHomeBtn.classList.remove('active');
    navCalendarBtn.classList.add('active');
    pageTitle.textContent = 'CALENDAR';

    dashboardView.classList.add('hidden');
    calendarPageView.classList.remove('hidden');

    pickedDay = null;
    drawCalendarPage();
}

function showDashboardPage(glowScheduler) {
    navCalendarBtn.classList.remove('active');
    navHomeBtn.classList.add('active');
    pageTitle.textContent = 'DASHBOARD';

    calendarPageView.classList.add('hidden');
    dashboardView.classList.remove('hidden');

    // makes the Scheduler card glow for a bit so the user sees where to add tasks
    if (glowScheduler) {
        const schedulerCard = document.querySelector('.widget.scheduler');

        schedulerCard.classList.remove('highlight-pulse');
        void schedulerCard.offsetWidth;   // trick so the glow can play again
        schedulerCard.classList.add('highlight-pulse');
        schedulerCard.scrollIntoView({ behavior: 'smooth', block: 'start' });

        setTimeout(() => schedulerCard.classList.remove('highlight-pulse'), 2500);
    }
}

// 5. buttons
navCalendarBtn.addEventListener('click', (e) => {
    e.preventDefault();   // stops the "#" link from jumping to the top
    showCalendarPage();
});

navHomeBtn.addEventListener('click', (e) => {
    e.preventDefault();
    showDashboardPage(false);
});

calPrevBtn.addEventListener('click', () => {
    calMonth--;
    if (calMonth < 0) { calMonth = 11; calYear--; }
    pickedDay = null;
    drawCalendarPage();
});

calNextBtn.addEventListener('click', () => {
    calMonth++;
    if (calMonth > 11) { calMonth = 0; calYear++; }
    pickedDay = null;
    drawCalendarPage();
});

// Today button: jumps to this month and picks today
calTodayBtn.addEventListener('click', () => {
    const now = new Date();
    calMonth = now.getMonth();
    calYear = now.getFullYear();
    pickedDay = now.getDate();
    drawCalendarPage();
});

showAllBtn.addEventListener('click', () => {
    pickedDay = null;
    drawCalendarPage();
});
