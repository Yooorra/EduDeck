/* 1. Dropdown Menus */

// grabs all the "..." menus + the profile menu in the top right
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
        // copy the category template from HTML
        const newCategory = categoryTemplate.content.cloneNode(true);

        const addTaskBtn = newCategory.querySelector('.add-btn');
        const taskList = newCategory.querySelector('.task-list');
        const taskTemplate = document.getElementById('task-card-template');

        // arrow button to hide/show the tasks inside
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

        enableDragAndDrop(taskList);

        // "+" button adds a new task to this category
        addTaskBtn.addEventListener('click', () => {
            const newTaskFragment = taskTemplate.content.cloneNode(true);
            const newTaskCard = newTaskFragment.querySelector('.task-card');
            enableColorPicker(newTaskCard);

            // bell button opens the date picker
            const bellBtn = newTaskCard.querySelector('.bell-btn');
            if (bellBtn) {
                bellBtn.addEventListener('click', () => {
                    openCalendarForTask(newTaskCard);
                });
            }

            taskList.prepend(newTaskCard);
        });

        enableCategoryMasterCheckbox(newCategory);
        schedulerContainer.prepend(newCategory);
        addCategoryBtn.closest('.dropdown-menu').classList.add('hidden');
    });
}

/* 4. Card Color Picker */
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
    const yearDownInd = yearDropdown.querySelector('.scroll-ind-down');
    for (let y = 2024; y <= 2035; y++) {
        const yearOpt = document.createElement('div');
        yearOpt.classList.add('year-option');
        yearOpt.textContent = y;
        yearOpt.addEventListener('click', (e) => {
            e.stopPropagation(); currentYear = y;
            renderCalendar();
            yearDropdown.classList.add('hidden');
        });
        if (yearDownInd) {
            yearDropdown.insertBefore(yearOpt, yearDownInd);
        } else {
            yearDropdown.appendChild(yearOpt);
        }
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
    const isDark = document.body.classList.contains('dark-mode');
    zone.style.backgroundColor = on ? (isDark ? 'rgba(245, 124, 0, 0.14)' : '#fff0e6') : '';
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
        .then(async response => {
            if (!response.ok) {
                let message = 'Server returned error status: ' + response.status;
                try {
                    const data = await response.json();
                    message = data.error || message;
                } catch {
                    try {
                        const text = await response.text();
                        message = text || message;
                    } catch { }
                }
                throw new Error(message);
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
            alert(error.message || "An error occurred during compression. Make sure the Python server is running.");
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

// Document Converter
btnDocConvert.addEventListener('click', async () => {
    if (selectedDocFiles.length !== 1) {
        alert("Please select exactly one document to convert.");
        return;
    }

    const formData = new FormData();
    formData.append('doc_file', selectedDocFiles[0]);

    try {
        btnDocConvert.style.pointerEvents = 'none';

        const response = await fetch(
            'http://127.0.0.1:5000/convert',
            {
                method: 'POST',
                body: formData
            }
        );

        if (!response.ok) {
            let message = 'Document conversion failed';

            try {
                const data = await response.json();
                message = data.error || message;
            } catch { }

            throw new Error(message);
        }

        const blob = await response.blob();
        const downloadUrl = URL.createObjectURL(blob);
        const fileName = selectedDocFiles[0].name.replace(/\.[^/.]+$/, '') + '.pdf';

        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        link.remove();

        setTimeout(() => {
            URL.revokeObjectURL(downloadUrl);
        }, 1000);

    } catch (error) {
        console.error('Conversion error:', error);
        alert(error.message);

    } finally {
        btnDocConvert.style.pointerEvents = '';
    }
});

//merger
btnDocMerge.addEventListener('click', async () => {
    if (selectedDocFiles.length < 2) {
        alert("You need at least 2 files to merge");
        return;
    }

    const formData = new FormData();

    for (const file of selectedDocFiles) {
        formData.append('doc_files', file);
    }

    try {
        btnDocMerge.disabled = true;
        btnDocMerge.textContent = "Merging...";

        const response = await fetch(
            'http://127.0.0.1:5000/merge',
            {
                method: 'POST',
                body: formData
            }
        );

        if (!response.ok) {
            let message = 'Document merging failed';
            try { const data = await response.json(); message = data.error || message; }
            catch { }
            throw new Error(message);
        }

        const blob = await response.blob();
        const downloadUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = 'merged_document.pdf';
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => { URL.revokeObjectURL(downloadUrl); }, 1000);

    } catch (error) {
        console.error('Merging error: ', error);
        alert(error.message);

    } finally {
        btnDocMerge.disabled = false;
        btnDocMerge.textContent = 'Merge';
    }
});

/* 10. Draggable Custom Layout */
const dashboardCols = document.querySelectorAll('.dashboard-col');

// saves where each card is placed so it stays that way after refresh
function saveWidgetLayout() {
    const layout = [];
    dashboardCols.forEach(col => {
        const ids = Array.from(col.querySelectorAll(':scope > .widget'))
            .map(w => w.dataset.widgetId)
            .filter(Boolean);
        layout.push(ids);
    });
    localStorage.setItem('edudeck_widget_layout', JSON.stringify(layout));
}

function restoreWidgetLayout() {
    const raw = localStorage.getItem('edudeck_widget_layout');
    if (!raw || dashboardCols.length === 0) return;
    try {
        const layout = JSON.parse(raw);
        if (!Array.isArray(layout)) return;
        layout.forEach((colIds, colIndex) => {
            const targetCol = dashboardCols[colIndex] || dashboardCols[0];
            if (!Array.isArray(colIds)) return;
            colIds.forEach(id => {
                const widget = document.querySelector(`.widget[data-widget-id="${id}"]`);
                if (widget && targetCol) {
                    targetCol.appendChild(widget);
                }
            });
        });
    } catch (e) { }
}

restoreWidgetLayout();

dashboardCols.forEach(col => {
    new Sortable(col, {
        group: 'dashboard-widgets',      // lets cards move between any column
        animation: 220,                  // how fast the cards slide around (ms)
        easing: "cubic-bezier(0.25, 1, 0.5, 1)",
        ghostClass: 'sortable-ghost',    // class for the empty spot while dragging
        dragClass: 'sortable-drag',      // class for the card being dragged
        delay: 150,                      // wait a bit before dragging starts (for touch screens)
        delayOnTouchOnly: true,
        handle: '.widget-header',        // drag a card by its header
        emptyInsertThreshold: 40,
        onEnd: saveWidgetLayout
    });
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

// sidebar buttons + the pages that swap places
const navHomeBtn = document.getElementById('nav-home-btn');
const navCalendarBtn = document.getElementById('nav-calendar-btn');
const navSettingsBtn = document.getElementById('nav-settings-btn');
const pageTitle = document.getElementById('page-title');
const dashboardView = document.getElementById('dashboard-view');
const calendarPageView = document.getElementById('calendar-page-view');
const settingsPageView = document.getElementById('settings-page-view');

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

// 4. swapping between Dashboard, Calendar, and Settings pages
function showCalendarPage() {
    navHomeBtn.classList.remove('active');
    if (navSettingsBtn) navSettingsBtn.classList.remove('active');
    navCalendarBtn.classList.add('active');
    pageTitle.textContent = 'CALENDAR';

    dashboardView.classList.add('hidden');
    if (settingsPageView) settingsPageView.classList.add('hidden');
    calendarPageView.classList.remove('hidden');

    pickedDay = null;
    drawCalendarPage();
}

function showDashboardPage(glowScheduler) {
    navCalendarBtn.classList.remove('active');
    if (navSettingsBtn) navSettingsBtn.classList.remove('active');
    navHomeBtn.classList.add('active');
    pageTitle.textContent = 'DASHBOARD';

    calendarPageView.classList.add('hidden');
    if (settingsPageView) settingsPageView.classList.add('hidden');
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

/* 13. Scroll Arrows (^ and v) */

function setupScrollIndicators(scrollEl) {
    if (!scrollEl) return;

    const wrapper = scrollEl.closest('.scroll-wrap') || scrollEl;
    const upBtn = wrapper.querySelector(':scope > .scroll-ind-up');
    const downBtn = wrapper.querySelector(':scope > .scroll-ind-down');

    if (!upBtn || !downBtn) return;

    function updateIndicators() {
        if (scrollEl.classList.contains('hidden') || scrollEl.clientHeight === 0) {
            upBtn.classList.add('hidden');
            downBtn.classList.add('hidden');
            return;
        }

        // ^ only shows if you scrolled down, v only shows if there's more below
        const canScrollUp = scrollEl.scrollTop > 0;
        const canScrollDown = (scrollEl.scrollTop + scrollEl.clientHeight) < (scrollEl.scrollHeight - 2);

        upBtn.classList.toggle('hidden', !canScrollUp);
        downBtn.classList.toggle('hidden', !canScrollDown);
    }

    scrollEl.addEventListener('scroll', updateIndicators);

    // clicking ^ or v nudges the list up/down a bit
    upBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        scrollEl.scrollBy({ top: -60, behavior: 'smooth' });
    });

    downBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        scrollEl.scrollBy({ top: 60, behavior: 'smooth' });
    });

    // re-check when tasks/notes are added or hidden menus open
    const observer = new MutationObserver(() => {
        requestAnimationFrame(updateIndicators);
    });
    observer.observe(scrollEl, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });

    if (window.ResizeObserver) {
        const resizeObserver = new ResizeObserver(() => {
            requestAnimationFrame(updateIndicators);
        });
        resizeObserver.observe(scrollEl);
    }

    requestAnimationFrame(updateIndicators);
}

// all the scrollable lists that get ^ and v
const scrollableTargets = [
    document.getElementById('hours-col'),
    document.getElementById('minutes-col'),
    document.querySelector('.year-dropdown'),
    document.querySelector('.scheduler-main-view'),
    document.querySelector('.notes-main-view'),
    document.querySelector('.schedules-card-list')
];

scrollableTargets.forEach(target => setupScrollIndicators(target));

/* 14. Dark Mode */
const darkModeToggleBtn = document.getElementById('dark-mode-toggle');

// keep dark mode on if it was already turned on before
if (localStorage.getItem('edudeck_dark_mode') === 'true') {
    document.body.classList.add('dark-mode');
}

if (darkModeToggleBtn) {
    darkModeToggleBtn.addEventListener('click', () => {
        const isDark = document.body.classList.toggle('dark-mode');
        localStorage.setItem('edudeck_dark_mode', isDark ? 'true' : 'false');
    });
}

/* 15. Notification Sounds */

// =========================================================================
// SOUND EFFECT FILE PATHS | REMEMBER MO TOH SELF, SOUND EFFECTS TOH AH!!!
// =========================================================================
const connectedSound = new Audio('sounds/connected.mp3'); // put connected sound file here
const alertSound = new Audio('sounds/alert.mp3');         // put alert sound file here

// backup beep sound just in case the mp3 files aren't in the folder yet | placeholder toh ah
function playFallbackBeep(type, volumeDecimal) {
    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(type === 'connected' ? 660 : 520, ctx.currentTime);
        if (type === 'connected') {
            osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1);
        }

        gain.gain.setValueAtTime(Math.max(0.01, volumeDecimal * 0.25), ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.28);
    } catch (e) { }
}

// plays 'connected' or 'alert' using whatever volume is set in Settings
function playNotificationSound(type) {
    const connectedVolSlider = document.getElementById('connected-sound-volume');
    const alertVolSlider = document.getElementById('alert-sound-volume');

    if (type === 'connected') {
        const volPercent = connectedVolSlider ? Number(connectedVolSlider.value) : 80;
        const volDecimal = Math.min(1, Math.max(0, volPercent / 100));
        connectedSound.volume = volDecimal;
        connectedSound.currentTime = 0;
        connectedSound.play().catch(() => playFallbackBeep('connected', volDecimal));
    } else if (type === 'alert') {
        const volPercent = alertVolSlider ? Number(alertVolSlider.value) : 85;
        const volDecimal = Math.min(1, Math.max(0, volPercent / 100));
        alertSound.volume = volDecimal;
        alertSound.currentTime = 0;
        alertSound.play().catch(() => playFallbackBeep('alert', volDecimal));
    }
}

/* 16. Settings Page (the gear icon in the sidebar) */
const headerAvatar = document.querySelector('.user-profile .avatar');
const headerUserName = document.querySelector('.user-profile .user-name');
const settingsAvatarPreview = document.getElementById('settings-avatar-preview');
const settingsAvatarInput = document.getElementById('settings-avatar-input');
const settingsDisplayName = document.getElementById('settings-display-name');
const settingsStudentId = document.getElementById('settings-student-id');
const saveProfileBtn = document.getElementById('save-profile-btn');

const connectedVolSlider = document.getElementById('connected-sound-volume');
const connectedVolLabel = document.getElementById('connected-vol-label');
const alertVolSlider = document.getElementById('alert-sound-volume');
const alertVolLabel = document.getElementById('alert-vol-label');
const testConnectedSoundBtn = document.getElementById('test-connected-sound-btn');
const testAlertSoundBtn = document.getElementById('test-alert-sound-btn');

const toggleHotspotSharing = document.getElementById('toggle-hotspot-sharing');
const lanStatusPill = document.getElementById('lan-status-pill');
const statusBadgeOffline = document.getElementById('status-badge-offline');
const statusBadgeLan = document.getElementById('status-badge-lan');
const connectedPeersList = document.getElementById('connected-peers-list');

const compressionPresetSelect = document.getElementById('settings-compression-preset');
const storageUsageText = document.getElementById('storage-usage-text');
const storageBarFill = document.getElementById('storage-bar-fill');
const clearCacheBtn = document.getElementById('clear-cache-btn');

const togglePasswordFormBtn = document.getElementById('toggle-password-form-btn');
const passwordCollapseBox = document.getElementById('password-collapse-box');
const savePasswordBtn = document.getElementById('save-password-btn');
const deleteAccountBtn = document.getElementById('delete-account-btn');

function getInitials(nameStr) {
    const clean = (nameStr || 'Student').trim();
    const words = clean.split(/\s+/);
    if (words.length > 1) {
        return (words[0][0] + words[words.length - 1][0]).toUpperCase();
    }
    return clean.substring(0, 2).toUpperCase();
}

// updates the circle in the top right + the preview inside Settings
function applyAvatarDisplay(imageDataUrl, fallbackName) {
    const initials = getInitials(fallbackName);

    [headerAvatar, settingsAvatarPreview].forEach(el => {
        if (!el) return;
        if (imageDataUrl) {
            el.innerHTML = `<img src="${imageDataUrl}" alt="Profile Avatar">`;
        } else {
            el.textContent = initials;
        }
    });
}

// load saved name, profile pic, and sound volumes when the page opens
(function loadSavedProfileAndSettings() {
    let currentName = 'John Smith';
    let currentId = '2024-0001';

    const rawUser = localStorage.getItem('currentUser');
    if (rawUser) {
        try {
            const parsed = JSON.parse(rawUser);
            if (parsed.name) currentName = parsed.name;
            if (parsed.username) currentId = parsed.username;
        } catch (e) { }
    }

    if (settingsDisplayName) settingsDisplayName.value = currentName;
    if (settingsStudentId) settingsStudentId.value = currentId;
    if (headerUserName) headerUserName.textContent = currentName;

    const savedAvatar = localStorage.getItem('edudeck_avatar');
    applyAvatarDisplay(savedAvatar, currentName);

    const savedConnVol = localStorage.getItem('edudeck_connected_vol');
    if (savedConnVol !== null && connectedVolSlider && connectedVolLabel) {
        connectedVolSlider.value = savedConnVol;
        connectedVolLabel.textContent = `${savedConnVol}%`;
    }

    const savedAlertVol = localStorage.getItem('edudeck_alert_vol');
    if (savedAlertVol !== null && alertVolSlider && alertVolLabel) {
        alertVolSlider.value = savedAlertVol;
        alertVolLabel.textContent = `${savedAlertVol}%`;
    }

    const savedPreset = localStorage.getItem('edudeck_compression_preset');
    if (savedPreset && compressionPresetSelect) {
        compressionPresetSelect.value = savedPreset;
    }
})();

// rough check of how much browser storage is used
function updateStorageUsageDisplay() {
    if (!storageUsageText || !storageBarFill) return;
    let totalBytes = 0;
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        const val = localStorage.getItem(key) || '';
        totalBytes += (key.length + val.length) * 2;
    }
    const kb = (totalBytes / 1024).toFixed(1);
    const percent = Math.min(100, Math.max(4, Math.round((totalBytes / (5 * 1024 * 1024)) * 100)));
    storageUsageText.textContent = `${kb} KB / 5 MB`;
    storageBarFill.style.width = `${percent}%`;
}

// opens Settings without refreshing the page
function showSettingsPage() {
    navHomeBtn.classList.remove('active');
    navCalendarBtn.classList.remove('active');
    if (navSettingsBtn) navSettingsBtn.classList.add('active');
    pageTitle.textContent = 'SETTINGS';

    dashboardView.classList.add('hidden');
    calendarPageView.classList.add('hidden');
    if (settingsPageView) settingsPageView.classList.remove('hidden');

    updateStorageUsageDisplay();
}

if (navSettingsBtn) {
    navSettingsBtn.addEventListener('click', (e) => {
        e.preventDefault();
        showSettingsPage();
    });
}

// clicking "Profile" in the top-right menu opens Settings too
document.querySelectorAll('.user-profile + .dropdown-menu .menu-item').forEach(btn => {
    if (btn.textContent.trim() === 'Profile') {
        btn.addEventListener('click', () => {
            btn.closest('.dropdown-menu').classList.add('hidden');
            showSettingsPage();
        });
    }
});

// 1. profile picture + name
if (settingsAvatarInput) {
    settingsAvatarInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const base64Url = event.target.result;
            try {
                localStorage.setItem('edudeck_avatar', base64Url);
            } catch (err) {
                alert('Image is too large to save in browser localStorage, but it will preview for this session.');
            }
            applyAvatarDisplay(base64Url, settingsDisplayName ? settingsDisplayName.value : 'Student');
        };
        reader.readAsDataURL(file);
    });
}

if (saveProfileBtn) {
    saveProfileBtn.addEventListener('click', () => {
        const newName = (settingsDisplayName.value || '').trim() || 'John Smith';
        const newId = (settingsStudentId.value || '').trim() || '2024-0001';

        const updatedUser = { name: newName, username: newId };
        localStorage.setItem('currentUser', JSON.stringify(updatedUser));

        if (headerUserName) headerUserName.textContent = newName;
        applyAvatarDisplay(localStorage.getItem('edudeck_avatar'), newName);
        updateStorageUsageDisplay();
        alert('Profile updated successfully!');
    });
}

// 2. sound volume sliders + test buttons
if (connectedVolSlider && connectedVolLabel) {
    connectedVolSlider.addEventListener('input', () => {
        connectedVolLabel.textContent = `${connectedVolSlider.value}%`;
        localStorage.setItem('edudeck_connected_vol', connectedVolSlider.value);
    });
}

if (alertVolSlider && alertVolLabel) {
    alertVolSlider.addEventListener('input', () => {
        alertVolLabel.textContent = `${alertVolSlider.value}%`;
        localStorage.setItem('edudeck_alert_vol', alertVolSlider.value);
    });
}

if (testConnectedSoundBtn) {
    testConnectedSoundBtn.addEventListener('click', () => {
        playNotificationSound('connected');
    });
}

if (testAlertSoundBtn) {
    testAlertSoundBtn.addEventListener('click', () => {
        playNotificationSound('alert');
    });
}

// 3. LAN mode badge + hotspot toggle + connected classmates list
function setLanModeVisual(isActive, playSoundIfEnabled = false) {
    if (statusBadgeOffline && statusBadgeLan) {
        statusBadgeOffline.classList.toggle('hidden', isActive);
        statusBadgeLan.classList.toggle('hidden', !isActive);
    }
    if (toggleHotspotSharing) {
        toggleHotspotSharing.checked = isActive;
    }
    if (lanStatusPill) {
        lanStatusPill.textContent = isActive ? 'LAN Active' : 'Offline';
        lanStatusPill.classList.toggle('offline', !isActive);
    }

    if (playSoundIfEnabled && isActive) {
        const connAlertsToggle = document.getElementById('toggle-conn-alerts');
        if (!connAlertsToggle || connAlertsToggle.checked) {
            playNotificationSound('connected');
        }
    }
}

// start in offline mode by default so the badge matches the header on load
setLanModeVisual(false, false);

if (statusBadgeOffline) {
    statusBadgeOffline.addEventListener('click', () => setLanModeVisual(true, true));
}

if (statusBadgeLan) {
    statusBadgeLan.addEventListener('click', () => setLanModeVisual(false, false));
}

if (toggleHotspotSharing) {
    toggleHotspotSharing.addEventListener('change', () => {
        setLanModeVisual(toggleHotspotSharing.checked, true);
    });
}

if (connectedPeersList) {
    connectedPeersList.querySelectorAll('.peer-disconnect-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const peerItem = btn.closest('.peer-item');
            if (peerItem) peerItem.remove();
        });
    });
}

// 4. video preset + clear cache
if (compressionPresetSelect) {
    compressionPresetSelect.addEventListener('change', () => {
        localStorage.setItem('edudeck_compression_preset', compressionPresetSelect.value);
    });
}

if (clearCacheBtn) {
    clearCacheBtn.addEventListener('click', () => {
        localStorage.removeItem('edudeck_avatar');
        localStorage.removeItem('edudeck_compression_preset');
        applyAvatarDisplay(null, settingsDisplayName ? settingsDisplayName.value : 'John Smith');
        updateStorageUsageDisplay();
        alert('Offline cache cleared!');
    });
}

// 5. password & delete account
if (togglePasswordFormBtn && passwordCollapseBox) {
    togglePasswordFormBtn.addEventListener('click', () => {
        passwordCollapseBox.classList.toggle('hidden');
    });
}

if (savePasswordBtn) {
    savePasswordBtn.addEventListener('click', () => {
        const curr = document.getElementById('sec-current-pass');
        const next = document.getElementById('sec-new-pass');
        if (!curr.value || !next.value) {
            alert('Please fill in both current and new password fields.');
            return;
        }
        curr.value = '';
        next.value = '';
        passwordCollapseBox.classList.add('hidden');
        alert('Password updated successfully!');
    });
}

if (deleteAccountBtn) {
    deleteAccountBtn.addEventListener('click', () => {
        const sure = confirm('Are you sure you want to delete your account on this device? This action cannot be undone.');
        if (sure) {
            localStorage.removeItem('currentUser');
            localStorage.removeItem('edudeck_avatar');
            window.location.href = 'login_page.html';
        }
    });
}

/* 17. Flashcards */
const fcSetupView = document.getElementById('flashcard-setup-view');
const fcQuizView = document.getElementById('flashcard-quiz-view');
const fcDeckCountBadge = document.getElementById('flashcard-deck-count');

const fcCategorySelect = document.getElementById('fc-category-select');
const fcNewCatBtn = document.getElementById('fc-new-cat-btn');
const fcDelCatBtn = document.getElementById('fc-del-cat-btn');
const fcNewCatRow = document.getElementById('fc-new-cat-row');
const fcNewCatInput = document.getElementById('fc-new-cat-input');
const fcSaveCatBtn = document.getElementById('fc-save-cat-btn');
const fcCancelCatBtn = document.getElementById('fc-cancel-cat-btn');

const fcUploadZone = document.getElementById('flashcard-upload-zone');
const fcUploadText = document.getElementById('flashcard-upload-text');
const fcBrowseBtn = document.getElementById('flashcard-browse-btn');
const fcFileInput = document.getElementById('flashcard-file-input');
const fcSampleBtn = document.getElementById('flashcard-sample-btn');
const fcStartBtn = document.getElementById('flashcard-start-btn');

const fcManualTerm = document.getElementById('fc-manual-term');
const fcManualDef = document.getElementById('fc-manual-def');
const fcManualAddBtn = document.getElementById('fc-manual-add-btn');

const fcProgress = document.getElementById('flashcard-progress');
const fcSideHint = document.getElementById('flashcard-side-hint');
const fcBox = document.getElementById('flashcard-box');
const fcTermDisplay = document.getElementById('fc-term-display');
const fcDefDisplay = document.getElementById('fc-def-display');
const fcPrevBtn = document.getElementById('fc-prev-btn');
const fcFlipBtn = document.getElementById('fc-flip-btn');
const fcNextBtn = document.getElementById('fc-next-btn');
const fcBackSetupBtn = document.getElementById('fc-back-setup-btn');
const fcDeleteCardBtn = document.getElementById('fc-delete-card-btn');

// sample cards so it can be tested right away
const sampleReviewerDeck = [
    { term: 'HTTP (HyperText Transfer Protocol)', definition: 'The foundation of data communication for the World Wide Web.' },
    { term: 'SQLite', definition: 'A lightweight, file-based relational database built right into Python.' },
    { term: 'FFmpeg', definition: 'A command-line multimedia framework used to compress and convert video/audio files.' },
    { term: 'LAN (Local Area Network)', definition: 'A local network connecting computers within a classroom or mobile hotspot without internet.' },
    { term: 'DOM (Document Object Model)', definition: 'A tree structure of HTML elements that JavaScript can change dynamically.' }
];

const FC_STORAGE_KEY = 'edudeck_flashcard_categories';
let fcCategories = {};        // { "Web Dev": [ {term, definition}, ... ] }
let currentCategory = '';
let flashcardDeck = [];
let currentCardIndex = 0;

// loads saved subjects from localStorage (makes a default one if empty)
function loadFlashcardCategories() {
    const raw = localStorage.getItem(FC_STORAGE_KEY);
    if (raw) {
        try {
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
                fcCategories = parsed;
            }
        } catch (e) { }
    }
    if (Object.keys(fcCategories).length === 0) {
        fcCategories = {
            'General Reviewer': []
        };
    }
    const names = Object.keys(fcCategories);
    if (!currentCategory || !fcCategories[currentCategory]) {
        currentCategory = names[0];
    }
    flashcardDeck = fcCategories[currentCategory] || [];
    renderCategoryDropdown();
    updateDeckBadge();
}

function saveFlashcardCategories() {
    if (currentCategory) {
        fcCategories[currentCategory] = flashcardDeck;
    }
    localStorage.setItem(FC_STORAGE_KEY, JSON.stringify(fcCategories));
    renderCategoryDropdown();
    updateDeckBadge();
}

function renderCategoryDropdown() {
    if (!fcCategorySelect) return;
    fcCategorySelect.innerHTML = '';
    Object.keys(fcCategories).forEach(catName => {
        const count = (fcCategories[catName] || []).length;
        const opt = document.createElement('option');
        opt.value = catName;
        opt.textContent = `${catName} (${count})`;
        if (catName === currentCategory) opt.selected = true;
        fcCategorySelect.appendChild(opt);
    });
}

function selectCategory(catName) {
    if (!fcCategories[catName]) return;
    currentCategory = catName;
    flashcardDeck = fcCategories[currentCategory];
    currentCardIndex = 0;
    renderCategoryDropdown();
    updateDeckBadge();
}

function updateDeckBadge() {
    if (!fcDeckCountBadge) return;
    const count = flashcardDeck.length;
    fcDeckCountBadge.textContent = `${count} ${count === 1 ? 'Card' : 'Cards'}`;
    if (fcStartBtn) {
        fcStartBtn.classList.toggle('hidden', count === 0);
        fcStartBtn.textContent = `STUDY "${currentCategory.toUpperCase()}" (${count})`;
    }
}

// swaps between 'setup' and 'quiz' screens
function showFlashcardScreen(screenName) {
    if (!fcSetupView || !fcQuizView) return;
    const isQuiz = (screenName === 'quiz');
    fcSetupView.classList.toggle('active-view', !isQuiz);
    fcSetupView.classList.toggle('hidden-view', isQuiz);
    fcQuizView.classList.toggle('active-view', isQuiz);
    fcQuizView.classList.toggle('hidden-view', !isQuiz);
}

function renderCurrentFlashcard() {
    if (flashcardDeck.length === 0) {
        showFlashcardScreen('setup');
        return;
    }
    if (currentCardIndex >= flashcardDeck.length) {
        currentCardIndex = Math.max(0, flashcardDeck.length - 1);
    }
    const card = flashcardDeck[currentCardIndex];

    fcBox.classList.remove('is-flipped');
    fcSideHint.textContent = 'FRONT (Click card to flip)';
    fcProgress.textContent = `${currentCategory} • Card ${currentCardIndex + 1} of ${flashcardDeck.length}`;
    fcTermDisplay.textContent = card.term;
    fcDefDisplay.textContent = `- ${card.definition}`;
}

function flipCurrentFlashcard() {
    if (!fcBox) return;
    const isNowBack = fcBox.classList.toggle('is-flipped');
    fcSideHint.textContent = isNowBack ? 'BACK (Definition / Meaning)' : 'FRONT (Click card to flip)';
}

// 1. subject dropdown (switch, add, delete)
if (fcCategorySelect) {
    fcCategorySelect.addEventListener('change', () => {
        selectCategory(fcCategorySelect.value);
    });
}

if (fcNewCatBtn && fcNewCatRow && fcNewCatInput) {
    fcNewCatBtn.addEventListener('click', () => {
        fcNewCatRow.classList.remove('hidden');
        fcNewCatInput.focus();
    });
}

if (fcCancelCatBtn && fcNewCatRow && fcNewCatInput) {
    fcCancelCatBtn.addEventListener('click', () => {
        fcNewCatInput.value = '';
        fcNewCatRow.classList.add('hidden');
    });
}

function createNewFlashcardSubject() {
    const name = (fcNewCatInput.value || '').trim();
    if (!name) {
        alert('Please enter a subject or category name!');
        return;
    }
    if (!fcCategories[name]) {
        fcCategories[name] = [];
    }
    currentCategory = name;
    flashcardDeck = fcCategories[currentCategory];
    currentCardIndex = 0;
    fcNewCatInput.value = '';
    fcNewCatRow.classList.add('hidden');
    saveFlashcardCategories();
}

if (fcSaveCatBtn) {
    fcSaveCatBtn.addEventListener('click', createNewFlashcardSubject);
}

if (fcNewCatInput) {
    fcNewCatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            createNewFlashcardSubject();
        }
    });
}

if (fcDelCatBtn) {
    fcDelCatBtn.addEventListener('click', () => {
        if (!currentCategory) return;
        const confirmDel = confirm(`Delete subject "${currentCategory}" and all ${flashcardDeck.length} card(s) inside it?`);
        if (!confirmDel) return;

        delete fcCategories[currentCategory];
        const remaining = Object.keys(fcCategories);
        if (remaining.length === 0) {
            fcCategories['General Reviewer'] = [];
        }
        currentCategory = Object.keys(fcCategories)[0];
        flashcardDeck = fcCategories[currentCategory];
        currentCardIndex = 0;
        saveFlashcardCategories();
    });
}

// reads **Word** and - meaning from a .txt file
function parseReviewerTextToCards(rawText) {
    const cards = [];
    const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    let currentTerm = null;

    for (const line of lines) {
        const boldMatch = line.match(/^\*\*(.+?)\*\*$/);
        if (boldMatch) {
            currentTerm = boldMatch[1].trim();
        } else if (line.startsWith('-') && currentTerm) {
            cards.push({
                term: currentTerm,
                definition: line.replace(/^-+\s*/, '').trim()
            });
            currentTerm = null;
        } else if (line.includes(':') && !line.startsWith('-')) {
            const parts = line.split(':');
            const term = parts[0].replace(/\*\*/g, '').trim();
            const def = parts.slice(1).join(':').trim();
            if (term && def) cards.push({ term, definition: def });
        }
    }
    return cards;
}

// 2. reviewer upload (tries Python first, falls back to .txt reader if server is off)
async function handleFlashcardFileUpload(file) {
    if (!file) return;
    fcUploadText.innerHTML = `<strong>Selected Reviewer:</strong><br>${file.name}`;

    const formData = new FormData();
    formData.append('reviewer_file', file);

    try {
        const response = await fetch('http://127.0.0.1:5000/generate_flashcards', {
            method: 'POST',
            body: formData
        });
        if (response.ok) {
            const data = await response.json();
            if (Array.isArray(data.cards) && data.cards.length > 0) {
                flashcardDeck.push(...data.cards);
                currentCardIndex = 0;
                saveFlashcardCategories();
                renderCurrentFlashcard();
                showFlashcardScreen('quiz');
                return;
            }
        }
    } catch (e) { }

    if (file.name.toLowerCase().endsWith('.txt')) {
        const text = await file.text();
        const parsed = parseReviewerTextToCards(text);
        if (parsed.length > 0) {
            flashcardDeck.push(...parsed);
            currentCardIndex = 0;
            saveFlashcardCategories();
            renderCurrentFlashcard();
            showFlashcardScreen('quiz');
            return;
        }
    }

    alert('Reviewer selected! Note: Connect /generate_flashcards in file_upload.py for automatic PDF/DOCX extraction, or click "Load Sample Reviewer Deck" to test right now.');
}

if (fcBrowseBtn && fcFileInput) {
    fcBrowseBtn.addEventListener('click', () => fcFileInput.click());
    fcFileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) handleFlashcardFileUpload(e.target.files[0]);
    });
}

if (fcUploadZone) {
    fcUploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        highlightZone(fcUploadZone, true);
    });
    fcUploadZone.addEventListener('dragleave', () => highlightZone(fcUploadZone, false));
    fcUploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        highlightZone(fcUploadZone, false);
        if (e.dataTransfer.files.length > 0) handleFlashcardFileUpload(e.dataTransfer.files[0]);
    });
}

// 3. sample deck, manual add, and card delete
if (fcSampleBtn) {
    fcSampleBtn.addEventListener('click', () => {
        flashcardDeck = [...sampleReviewerDeck];
        currentCardIndex = 0;
        saveFlashcardCategories();
        renderCurrentFlashcard();
        showFlashcardScreen('quiz');
    });
}

if (fcStartBtn) {
    fcStartBtn.addEventListener('click', () => {
        if (flashcardDeck.length > 0) {
            currentCardIndex = 0;
            renderCurrentFlashcard();
            showFlashcardScreen('quiz');
        }
    });
}

if (fcManualAddBtn) {
    fcManualAddBtn.addEventListener('click', () => {
        const term = (fcManualTerm.value || '').trim();
        const def = (fcManualDef.value || '').trim();
        if (!term || !def) {
            alert('Please enter both a Word/Term and its Definition!');
            return;
        }
        flashcardDeck.push({ term, definition: def });
        fcManualTerm.value = '';
        fcManualDef.value = '';
        saveFlashcardCategories();
    });
}

if (fcDeleteCardBtn) {
    fcDeleteCardBtn.addEventListener('click', () => {
        if (flashcardDeck.length === 0) return;
        flashcardDeck.splice(currentCardIndex, 1);
        saveFlashcardCategories();
        if (flashcardDeck.length === 0) {
            showFlashcardScreen('setup');
        } else {
            if (currentCardIndex >= flashcardDeck.length) {
                currentCardIndex = flashcardDeck.length - 1;
            }
            renderCurrentFlashcard();
        }
    });
}

// 4. quiz buttons (flip, prev, next, back)
if (fcBox) {
    fcBox.addEventListener('click', flipCurrentFlashcard);
}
if (fcFlipBtn) {
    fcFlipBtn.addEventListener('click', flipCurrentFlashcard);
}
if (fcPrevBtn) {
    fcPrevBtn.addEventListener('click', () => {
        if (flashcardDeck.length === 0) return;
        currentCardIndex = (currentCardIndex - 1 + flashcardDeck.length) % flashcardDeck.length;
        renderCurrentFlashcard();
    });
}
if (fcNextBtn) {
    fcNextBtn.addEventListener('click', () => {
        if (flashcardDeck.length === 0) return;
        currentCardIndex = (currentCardIndex + 1) % flashcardDeck.length;
        renderCurrentFlashcard();
    });
}
if (fcBackSetupBtn) {
    fcBackSetupBtn.addEventListener('click', () => {
        showFlashcardScreen('setup');
    });
}

loadFlashcardCategories();
