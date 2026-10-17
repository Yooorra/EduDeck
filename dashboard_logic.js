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

    // =========================================================================
    // VIDEO COMPRESSOR DYNAMIC VIEWS & SETUP
    // =========================================================================
    const videoUploadView = document.getElementById('video-upload-view');
    const videoLoadingView = document.getElementById('video-loading-view');
    const videoResultView = document.getElementById('video-result-view');
    const videoDestBadge = document.getElementById('video-dest-badge');
    const videoDestDisplay = document.getElementById('video-dest-display');
    const btnBrowseDestFolder = document.getElementById('btn-browse-dest-folder');
    const videoDestFolderInput = document.getElementById('video-dest-folder-input');
    const videoResultStats = document.getElementById('video-result-stats');
    const videoSavedBadge = document.getElementById('video-saved-badge');
    const videoResultLocation = document.getElementById('video-result-location');
    const videoDownloadBtn = document.getElementById('video-download-btn');
    const videoCompressAnotherBtn = document.getElementById('video-compress-another-btn');

    let currentCompressedBlob = null;
    let currentCompressedFileName = 'compressed_video.mp4';
    let selectedDestFolder = 'Upload_backend/';

    // Opens the native OS File Manager / Folder Picker so users don't have to type paths
    async function selectDestinationFolder() {
        if (window.showDirectoryPicker) {
            try {
                const dirHandle = await window.showDirectoryPicker();
                if (dirHandle && dirHandle.name) {
                    selectedDestFolder = dirHandle.name + '/';
                    if (videoDestDisplay) {
                        videoDestDisplay.textContent = selectedDestFolder;
                    }
                }
            } catch (err) {
                // User cancelled or closed the picker without choosing
                if (err.name !== 'AbortError') {
                    console.warn('DirectoryPicker notice:', err);
                    if (videoDestFolderInput) videoDestFolderInput.click();
                }
            }
        } else if (videoDestFolderInput) {
            // Fallback for browsers without showDirectoryPicker
            videoDestFolderInput.click();
        }
    }

    if (btnBrowseDestFolder) {
        btnBrowseDestFolder.addEventListener('click', selectDestinationFolder);
    }
    if (videoDestBadge) {
        videoDestBadge.addEventListener('click', selectDestinationFolder);
    }

    if (videoDestFolderInput) {
        videoDestFolderInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files.length > 0) {
                const relativePath = e.target.files[0].webkitRelativePath;
                if (relativePath) {
                    const topFolder = relativePath.split('/')[0];
                    if (topFolder) {
                        selectedDestFolder = topFolder + '/';
                        if (videoDestDisplay) {
                            videoDestDisplay.textContent = selectedDestFolder;
                        }
                    }
                }
            }
        });
    }

    function switchVideoView(viewName) {
        if (videoUploadView) {
            videoUploadView.classList.toggle('active-view', viewName === 'upload');
            videoUploadView.classList.toggle('hidden-view', viewName !== 'upload');
        }
        if (videoLoadingView) {
            videoLoadingView.classList.toggle('active-view', viewName === 'loading');
            videoLoadingView.classList.toggle('hidden-view', viewName !== 'loading');
        }
        if (videoResultView) {
            videoResultView.classList.toggle('active-view', viewName === 'result');
            videoResultView.classList.toggle('hidden-view', viewName !== 'result');
        }
    }

    // Reset button to compress another video
    if (videoCompressAnotherBtn) {
        videoCompressAnotherBtn.addEventListener('click', () => {
            selectedVideoFile = null;
            if (videoFileInput) videoFileInput.value = '';
            if (videoUploadText) videoUploadText.innerHTML = "Drag & Drop Your<br>Video File Here";
            currentCompressedBlob = null;
            switchVideoView('upload');
        });
    }

    // Download button handler when on the Result Screen
    if (videoDownloadBtn) {
        videoDownloadBtn.addEventListener('click', () => {
            if (!currentCompressedBlob) return;
            const downloadUrl = window.URL.createObjectURL(currentCompressedBlob);
            const downloadLink = document.createElement('a');
            downloadLink.style.display = 'none';
            downloadLink.href = downloadUrl;
            downloadLink.download = currentCompressedFileName;
            document.body.appendChild(downloadLink);
            downloadLink.click();
            setTimeout(() => {
                downloadLink.remove();
                window.URL.revokeObjectURL(downloadUrl);
            }, 2000);
        });
    }

    videoCompressBtn.addEventListener('click', () => {
        if (!selectedVideoFile) {
            alert("Please select or drop a video file first!");
            return;
        }

        // =========================================================================
        // HEY EARL & NISHKY! (FRONT-END VIDEO COMPRESSOR CONNECTION)
        // =========================================================================
        // 1. Loading Screen: The frontend now swaps into a loading screen while
        //    Python is running FFmpeg, so the user knows it's working!
        // 2. Setting Save Folder: The user can now click "Browse..." to pick where
        //    to save the file (opened through native file manager) instead of typing!
        //    Defaults to 'Upload_backend/'. You can read this in Python with:
        //    dest_folder = request.form.get('dest_folder', 'Upload_backend')
        // 3. Finished Screen: When Python finishes and returns the blob/file,
        //    the frontend displays the size savings and exact save location,
        //    along with a Download button and a Compress Another button!
        // =========================================================================

        // Switch to the Loading Screen view
        switchVideoView('loading');

        const destFolder = selectedDestFolder || 'Upload_backend/';
        const originalFileName = selectedVideoFile.name;

        // Package the video file and destination folder to send to Python
        const formData = new FormData();
        formData.append('video_file', selectedVideoFile);
        formData.append('dest_folder', destFolder);

        fetch('http://127.0.0.1:5000/compress', {
            method: 'POST',
            body: formData
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Server returned error status: ${response.status}`);
                }
                return response.blob();
            })
            .then(blob => {
                // Calculate file size statistics
                const originalMB = (selectedVideoFile.size / 1024 / 1024).toFixed(2);
                const compressedMB = (blob.size / 1024 / 1024).toFixed(2);
                const savedPercent = (((selectedVideoFile.size - blob.size) / selectedVideoFile.size) * 100).toFixed(0);

                currentCompressedBlob = blob;
                currentCompressedFileName = 'compressed_' + originalFileName;

                // Update the result screen UI
                if (videoResultStats) {
                    videoResultStats.innerHTML = `Original: <strong>${originalMB} MB</strong> → Compressed: <strong style="color: #16a34a;">${compressedMB} MB</strong>`;
                }
                if (videoSavedBadge) {
                    videoSavedBadge.textContent = `Saved ${savedPercent}%`;
                }
                if (videoResultLocation) {
                    videoResultLocation.innerHTML = `Saved in: <code>${destFolder}${currentCompressedFileName}</code>`;
                }

                // Show the Finished Result Screen
                switchVideoView('result');
            })
            .catch(error => {
                console.error('Compression Error:', error);
                alert("An error occurred during compression. Make sure the Python server is running.");
                switchVideoView('upload');
            });

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

/* ========================================================================= */
/* 11. User Session & Logout */
/* ========================================================================= */
const loggedInUserRaw = localStorage.getItem('currentUser');
if (loggedInUserRaw) {
    try {
        const loggedInUser = JSON.parse(loggedInUserRaw);
        const userNameElem = document.querySelector('.user-profile .user-name');
        const userAvatarElem = document.querySelector('.user-profile .avatar');

        if (userNameElem && loggedInUser.name) {
            userNameElem.textContent = loggedInUser.name;
        }

        if (userAvatarElem && loggedInUser.name) {
            // Generate initials (e.g., "Juan Dela Cruz" -> "JD")
            const parts = loggedInUser.name.trim().split(' ');
            const initials = parts.length > 1
                ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
                : parts[0].substring(0, 2).toUpperCase();
            userAvatarElem.textContent = initials;
        }
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

/* ========================================================================= */
/* 12. Calendar View Page Switching & Schedule Sync */
/* ========================================================================= */
// Navigation elements
const navHomeBtn = document.getElementById('nav-home-btn');
const navCalendarBtn = document.getElementById('nav-calendar-btn');
const pageTitleElem = document.getElementById('page-title');
const dashboardView = document.getElementById('dashboard-view');
const calendarPageView = document.getElementById('calendar-page-view');

// Calendar Page View elements
const calPagePrevBtn = document.getElementById('cal-page-prev-btn');
const calPageNextBtn = document.getElementById('cal-page-next-btn');
const calPageTodayBtn = document.getElementById('cal-page-today-btn');
const calPageMonthHeading = document.getElementById('cal-page-month-heading');
const calPageDaysGrid = document.getElementById('cal-page-days-grid');
const schedulesCounterBadge = document.getElementById('schedules-counter-badge');
const schedulesFilterText = document.getElementById('schedules-filter-text');
const schedulesResetBtn = document.getElementById('schedules-reset-btn');
const schedulesCardList = document.getElementById('schedules-card-list');

let calPageCurrentMonth = new Date().getMonth();
let calPageCurrentYear = new Date().getFullYear();
let calPageSelectedDay = null;

// 1. Gathers all tasks from the Scheduler widget that have a set due date
function getScheduledTasksFromScheduler() {
    const tasks = [];
    const scheduler = document.getElementById('scheduler-container');
    if (!scheduler) return tasks;

    const categories = scheduler.querySelectorAll('.task-category');
    categories.forEach(category => {
        const catTitleElem = category.querySelector('.category-title');
        const categoryName = catTitleElem ? catTitleElem.textContent.trim() : 'Scheduler';

        const taskCards = category.querySelectorAll('.task-card');
        taskCards.forEach(card => {
            const titleElem = card.querySelector('.task-title');
            const dueElem = card.querySelector('.task-due');
            const statusElem = card.querySelector('.status-text');
            const colorElem = card.querySelector('.card-color-line');
            const checkbox = card.querySelector('.task-checkbox');

            const title = titleElem ? titleElem.textContent.trim() : 'Untitled Task';
            const due = dueElem ? dueElem.textContent.trim() : 'No Due Date';
            const status = statusElem ? statusElem.textContent.trim() : 'Not Scheduled';
            const color = colorElem ? (colorElem.style.backgroundColor || '#f57c00') : '#f57c00';
            const isCompleted = checkbox ? checkbox.checked : false;

            // Only grab tasks that have a scheduled date
            if (due && due !== 'No Due Date') {
                tasks.push({
                    title,
                    category: categoryName,
                    due,
                    status,
                    color,
                    isCompleted
                });
            }
        });
    });

    return tasks;
}

// 2. Render Calendar Grid & Schedules List
function renderCalendarPageView() {
    if (!calPageMonthHeading || !calPageDaysGrid) return;

    const monthName = monthNames[calPageCurrentMonth];
    calPageMonthHeading.textContent = `${monthName} ${calPageCurrentYear}`;
    const monthShort = monthName.substring(0, 3);

    // Fetch current tasks with dates from the scheduler
    const allSchedules = getScheduledTasksFromScheduler();

    // Reset grid
    calPageDaysGrid.innerHTML = '';

    const firstDayIndex = new Date(calPageCurrentYear, calPageCurrentMonth, 1).getDay();
    const daysInMonth = new Date(calPageCurrentYear, calPageCurrentMonth + 1, 0).getDate();
    const today = new Date();

    // Leading empty cells
    for (let i = 0; i < firstDayIndex; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.classList.add('cal-day-cell', 'empty');
        calPageDaysGrid.appendChild(emptyCell);
    }

    // Month days
    for (let day = 1; day <= daysInMonth; day++) {
        const dayCell = document.createElement('div');
        dayCell.classList.add('cal-day-cell');
        dayCell.textContent = day;

        const isToday = (
            day === today.getDate() &&
            calPageCurrentMonth === today.getMonth() &&
            calPageCurrentYear === today.getFullYear()
        );
        if (isToday) {
            dayCell.classList.add('today');
        }

        if (calPageSelectedDay === day) {
            dayCell.classList.add('selected');
        }

        // Check if any schedule matches this day (e.g. "Oct 17")
        const datePrefix = `${monthShort} ${day}`;
        const tasksForDay = allSchedules.filter(t => t.due && t.due.startsWith(datePrefix));

        if (tasksForDay.length > 0) {
            dayCell.classList.add('has-tasks');
            dayCell.title = `${tasksForDay.length} task${tasksForDay.length > 1 ? 's' : ''} scheduled`;

            const dotsContainer = document.createElement('div');
            dotsContainer.classList.add('cal-day-dots');

            const dotCount = Math.min(tasksForDay.length, 3);
            for (let d = 0; d < dotCount; d++) {
                const dot = document.createElement('span');
                dot.classList.add('cal-dot');
                if (tasksForDay[d] && tasksForDay[d].color && tasksForDay[d].color !== '#dadce0') {
                    dot.style.backgroundColor = tasksForDay[d].color;
                }
                dotsContainer.appendChild(dot);
            }
            dayCell.appendChild(dotsContainer);
        }

        // Clicking a day filters the schedule list on the right
        dayCell.addEventListener('click', () => {
            if (calPageSelectedDay === day) {
                calPageSelectedDay = null; // Toggle off
            } else {
                calPageSelectedDay = day;
            }
            renderCalendarPageView();
        });

        calPageDaysGrid.appendChild(dayCell);
    }

    // Render schedule cards on the right
    renderSchedulesList(allSchedules, monthShort);
}

// 3. Render the schedules card list on the right
function renderSchedulesList(allSchedules, monthShort) {
    if (!schedulesCardList) return;
    schedulesCardList.innerHTML = '';

    let displayedTasks = allSchedules;

    if (calPageSelectedDay !== null) {
        const datePrefix = `${monthShort} ${calPageSelectedDay}`;
        displayedTasks = allSchedules.filter(t => t.due && t.due.startsWith(datePrefix));

        if (schedulesFilterText) {
            schedulesFilterText.textContent = `Showing schedules for ${monthShort} ${calPageSelectedDay}`;
        }
        if (schedulesResetBtn) {
            schedulesResetBtn.classList.remove('hidden');
        }
    } else {
        if (schedulesFilterText) {
            schedulesFilterText.textContent = `All Scheduled Tasks (${allSchedules.length})`;
        }
        if (schedulesResetBtn) {
            schedulesResetBtn.classList.add('hidden');
        }
    }

    if (schedulesCounterBadge) {
        schedulesCounterBadge.textContent = `${displayedTasks.length} Task${displayedTasks.length === 1 ? '' : 's'}`;
    }

    // Empty state
    if (displayedTasks.length === 0) {
        const emptyDiv = document.createElement('div');
        emptyDiv.classList.add('schedules-empty-state');

        if (calPageSelectedDay !== null) {
            emptyDiv.innerHTML = `
                <div class="empty-icon-circle">
                    <img src="icons/calendar.svg" alt="Calendar" class="empty-cal-icon">
                </div>
                <h3>No Tasks on this Date</h3>
                <p>No tasks from your scheduler are scheduled for ${monthShort} ${calPageSelectedDay}.</p>
                <button type="button" class="schedules-reset-btn" id="empty-clear-filter-btn" style="text-decoration:none; font-weight:700;">Show All Scheduled Tasks</button>
            `;
            const emptyClearBtn = emptyDiv.querySelector('#empty-clear-filter-btn');
            if (emptyClearBtn) {
                emptyClearBtn.addEventListener('click', () => {
                    calPageSelectedDay = null;
                    renderCalendarPageView();
                });
            }
        } else {
            emptyDiv.innerHTML = `
                <div class="empty-icon-circle">
                    <img src="icons/calendar.svg" alt="Calendar" class="empty-cal-icon">
                </div>
                <h3>No Scheduled Tasks</h3>
                <p>Tasks with a set date in your Scheduler will smoothly appear here.</p>
                <button type="button" class="cal-go-scheduler-btn" id="btn-goto-scheduler">
                    <img src="icons/plus.svg" alt="" class="cal-btn-icon">
                    Open Scheduler
                </button>
            `;
            const gotoSchedulerBtn = emptyDiv.querySelector('#btn-goto-scheduler');
            if (gotoSchedulerBtn) {
                gotoSchedulerBtn.addEventListener('click', () => {
                    switchToDashboard(true);
                });
            }
        }

        schedulesCardList.appendChild(emptyDiv);
        return;
    }

    // Render each schedule card
    displayedTasks.forEach(task => {
        const card = document.createElement('div');
        card.classList.add('sched-item-card');

        let statusClass = 'scheduled';
        const stLower = task.status.toLowerCase();
        if (stLower.includes('doing')) statusClass = 'doing';
        else if (stLower.includes('overdue')) statusClass = 'overdue';

        card.innerHTML = `
            <div class="sched-color-bar" style="background-color: ${task.color || '#f57c00'};"></div>
            <div class="sched-item-body">
                <div class="sched-top-meta">
                    <span class="sched-cat-tag">${task.category}</span>
                    <span class="sched-status-tag ${statusClass}">${task.status}</span>
                </div>
                <h4 class="sched-task-name ${task.isCompleted ? 'completed' : ''}">${task.title}</h4>
                <div class="sched-bottom-meta">
                    <img src="icons/calendar.svg" alt="Due" class="sched-due-icon">
                    <span>${task.due}</span>
                </div>
            </div>
        `;

        schedulesCardList.appendChild(card);
    });
}

// 4. View Switcher functions
function switchToCalendar() {
    if (navHomeBtn) navHomeBtn.classList.remove('active');
    if (navCalendarBtn) navCalendarBtn.classList.add('active');

    if (pageTitleElem) pageTitleElem.textContent = 'CALENDAR';

    if (dashboardView) dashboardView.classList.add('hidden');
    if (calendarPageView) calendarPageView.classList.remove('hidden');

    calPageSelectedDay = null;
    renderCalendarPageView();
}

function switchToDashboard(highlightScheduler = false) {
    if (navCalendarBtn) navCalendarBtn.classList.remove('active');
    if (navHomeBtn) navHomeBtn.classList.add('active');

    if (pageTitleElem) pageTitleElem.textContent = 'DASHBOARD';

    if (calendarPageView) calendarPageView.classList.add('hidden');
    if (dashboardView) dashboardView.classList.remove('hidden');

    if (highlightScheduler) {
        const schedulerCard = document.querySelector('.widget.scheduler');
        if (schedulerCard) {
            schedulerCard.classList.remove('highlight-pulse');
            void schedulerCard.offsetWidth; // trigger reflow
            schedulerCard.classList.add('highlight-pulse');
            schedulerCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
            setTimeout(() => {
                schedulerCard.classList.remove('highlight-pulse');
            }, 2500);
        }
    }
}

// 5. Wire up Event Listeners
if (navCalendarBtn) {
    navCalendarBtn.addEventListener('click', (e) => {
        e.preventDefault();
        switchToCalendar();
    });
}

if (navHomeBtn) {
    navHomeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        switchToDashboard();
    });
}

if (calPagePrevBtn) {
    calPagePrevBtn.addEventListener('click', () => {
        calPageCurrentMonth--;
        if (calPageCurrentMonth < 0) {
            calPageCurrentMonth = 11;
            calPageCurrentYear--;
        }
        calPageSelectedDay = null;
        renderCalendarPageView();
    });
}

if (calPageNextBtn) {
    calPageNextBtn.addEventListener('click', () => {
        calPageCurrentMonth++;
        if (calPageCurrentMonth > 11) {
            calPageCurrentMonth = 0;
            calPageCurrentYear++;
        }
        calPageSelectedDay = null;
        renderCalendarPageView();
    });
}

if (calPageTodayBtn) {
    calPageTodayBtn.addEventListener('click', () => {
        const now = new Date();
        calPageCurrentMonth = now.getMonth();
        calPageCurrentYear = now.getFullYear();
        calPageSelectedDay = now.getDate();
        renderCalendarPageView();
    });
}

if (schedulesResetBtn) {
    schedulesResetBtn.addEventListener('click', () => {
        calPageSelectedDay = null;
        renderCalendarPageView();
    });
}
