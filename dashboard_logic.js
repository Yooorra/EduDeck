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
    enableColorPicker(newNoteCard); notesContainer.prepend(newNoteCard);
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

/* 7. Calendar Engine */
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
        void daysGrid.offsetWidth; // trigger CSS reflow
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

    document.addEventListener('click', (e) => {
        if (!monthYearSelector.contains(e.target)) {
            yearDropdown.classList.add('hidden');
        }
    });
}

function updateTimeDisplay() {
    if (timeDisplayBtn) timeDisplayBtn.textContent = `${selectedHour}:${selectedMinute} ${selectedAmPm}`;
}

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

    document.addEventListener('click', (e) => {
        if (!timeDisplayBtn.contains(e.target) && !timeDropdown.contains(e.target)) {
            timeDropdown.classList.add('hidden');
        }
    });
}

function openCalendarForTask(taskCard) {
    currentActiveTaskCard = taskCard;
    schedulerMainView.classList.add('hidden');
    calendarView.classList.remove('hidden');

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

        calendarView.classList.add('hidden');
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

let selectedVideoFile = null;

if (videoUploadZone && videoFileInput) {
    videoBrowseBtn.addEventListener('click', () => {
        videoFileInput.click();
    });

    videoFileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            selectedVideoFile = e.target.files[0];
            videoUploadText.innerHTML = `<strong>Selected:</strong><br>${selectedVideoFile.name}`;
        }
    });

    videoUploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        videoUploadZone.style.backgroundColor = '#fff0e6'; videoUploadZone.style.borderColor = 'var(--school-orange)';
    });

    videoUploadZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        videoUploadZone.style.backgroundColor = 'transparent';
        videoUploadZone.style.borderColor = '#d1d5db';
    });

    videoUploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        videoUploadZone.style.backgroundColor = 'transparent';
        videoUploadZone.style.borderColor = '#d1d5db';

        if (e.dataTransfer.files.length > 0) {
            selectedVideoFile = e.dataTransfer.files[0];
            videoUploadText.innerHTML = `<strong>Selected:</strong><br>${selectedVideoFile.name}`;
        }
    });

    videoCompressBtn.addEventListener('click', () => {
        if (!selectedVideoFile) {
            alert("Please select or drop a video file first!");
            return;
        }

        videoCompressBtn.textContent = "COMPRESSING...";
        videoCompressBtn.style.opacity = "0.7";
        videoCompressBtn.style.cursor = "not-allowed";

        // =========================================================================
        // HEY DONOBARN, EARL, AND NISHKY! THIS IS WHERE YOU CONNECT YOUR PYTHON CODE.
        // =========================================================================
        // Right now, this button just pretends to work. 
        // When you are ready to make it actually compress videos using Python, follow these steps:

        // STEP 1: Delete the "/*" and "*/" symbols that are hiding the code below.
        // STEP 2: Change the web address ('http://127.0.0.1:5000/compress') to match your Python server's address.
        // STEP 3: Delete the "FAKE DELAY" block at the very bottom.

        // This bundles the video file into a package so Python can read it.
        const formData = new FormData();
        formData.append('video_file', selectedVideoFile);

        fetch('http://127.0.0.1:5000/compress', { // Put your Python server link here!
            method: 'POST',
            body: formData
        })
            //removed the entire retrieval code here
            //changed it to return the blob instead of json
            .then(response => {
                if (!response.ok) {
                    //I used response.status so it will return the error code, but I can change it to text
                    throw new Error('Server Returned ${response.status}');
                }
                //video file (blob) instead of text (json)
                return response.blob();
            })
            .then (blob => {
                //the file sizes in MB, will show how much ffmpeg saved - EARL
                const originalMB = (selectedVideoFile.size / 1024 / 1024).toFixed(2);
                const compressedMB = (blob.size / 1024 / 1024).toFixed(2);
                const savedPercent = (((selectedVideoFile.size - blob.size) / selectedVideoFile.size) * 100).toFixed(0);

                //temporary URL for the compressed video file
                const downloadUrl = URL.createObjectURL(blob);
                //temporary link to download the compressed video
                const downloadLink = document.createElement('a');
                
                //misc 
                downloadLink.href = downloadUrl;
                downloadLink.download = 'compressed_video.mp4';
                document.body.appendChild(downloadLink);
                downloadLink.click();

                //remove and release the temporary link and URL after download
                downloadLink.remove();
                URL.revokeObjectURL(downloadUrl);

                videoCompressBtn.textContent = "COMPRESS";
                videoCompressBtn.style.opacity = "1";
                videoCompressBtn.style.cursor = "pointer";

                videoUploadText.innerHTML = "Drag & drop your<br>video file here";
                selectedVideoFile = null;
                videoFileInput.value = '';
                
                // I change this so the alert will show the original and compressed file sizes - EARL
                alert(`Video compressed successfully!\nOriginal: ${originalMB} MB\nCompressed: ${compressedMB} MB`);
            })
            .catch(error => {
                console.error('Compression Error:', error);
                alert("An error occurred during compression. Please try again.");
                videoCompressBtn.textContent = "COMPRESS NOW";
                videoCompressBtn.style.opacity = "1";
                videoCompressBtn.style.cursor = "pointer";
            })

    });
}

/* ========================================================================= */
/* 9. Document Tools Logic */
/* ========================================================================= */
const docUploadZone = document.getElementById('doc-upload-zone');
const docUploadText = document.getElementById('doc-upload-text');
const docBrowseBtn = document.getElementById('doc-browse-btn');
const docFileInput = document.getElementById('doc-file-input');

const docUploadView = document.getElementById('doc-upload-view');
const docActionView = document.getElementById('doc-action-view');
const docSelectedFilesText = document.getElementById('doc-selected-files');
const docCancelBtn = document.getElementById('doc-cancel-btn');
const btnDocConvert = document.getElementById('btn-doc-convert');
const btnDocMerge = document.getElementById('btn-doc-merge');

let selectedDocFiles = [];

if (docUploadZone && docFileInput) {
    // Handle Clicking Browse
    docBrowseBtn.addEventListener('click', () => {
        docFileInput.click();
    });

    // Handle File Selection
    docFileInput.addEventListener('change', (e) => {
        handleDocFiles(e.target.files);
    });

    // Handle Drag & Drop
    docUploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        docUploadZone.style.backgroundColor = '#fff0e6';
        docUploadZone.style.borderColor = 'var(--school-orange)';
    });

    docUploadZone.addEventListener('dragleave', () => {
        docUploadZone.style.backgroundColor = '#fafafa';
        docUploadZone.style.borderColor = 'var(--border-color)';
    });

    docUploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        docUploadZone.style.backgroundColor = '#fafafa';
        docUploadZone.style.borderColor = 'var(--border-color)';
        handleDocFiles(e.dataTransfer.files);
    });

    // Function to process selected files and swap views
    function handleDocFiles(files) {
        if (files.length > 0) {
            selectedDocFiles = Array.from(files);

            // Build text showing how many files were uploaded
            let fileNames = selectedDocFiles.map(f => f.name).join('<br>');
            docSelectedFilesText.innerHTML = `<strong>Selected Files:</strong><br>${fileNames}`;

            // Swap to the Actions View
            docUploadView.classList.add('hidden-view');
            docUploadView.classList.remove('active-view');
            docActionView.classList.remove('hidden-view');
            docActionView.classList.add('active-view');
        }
    }

    // Handle "Cancel / Start Over"
    docCancelBtn.addEventListener('click', () => {
        selectedDocFiles = [];
        docFileInput.value = '';

        // Swap back to Upload View
        docActionView.classList.add('hidden-view');
        docActionView.classList.remove('active-view');
        docUploadView.classList.remove('hidden-view');
        docUploadView.classList.add('active-view');
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
}

/* ========================================================================= */
/* 10. Draggable Custom Layout */
/* ========================================================================= */
const dashboardGrid = document.querySelector('.dashboard-grid');
if (dashboardGrid) {
    new Sortable(dashboardGrid, {
        animation: 250,           // ms, animation speed moving items when sorting
        easing: "cubic-bezier(0.25, 1, 0.5, 1)",
        ghostClass: 'sortable-ghost',  // Class name for the drop placeholder
        dragClass: 'sortable-drag',    // Class name for the dragging item
        delay: 150,               // Time in ms to define when the sorting should start (useful for clicking inner elements vs dragging)
        delayOnTouchOnly: true,   // Only delay if user is using touch
        handle: '.widget-header', // Optional: if you only want the header to be the drag handle. (Removing this makes the whole card draggable)
    });
}
