# 🎓 EduDeck — All-in-One Student Productivity Portal

> *Just a simple school project, an all-in-one student tool for productivity.*

**EduDeck** is an offline-first, LAN-capable web application built for students to manage their schedules, notes, study reviewers, and everyday school files in one clean dashboard—without needing an active internet connection.

---

## ✨ Main Features

- 📅 **Task Scheduler & Calendar**
  - Organize upcoming tasks, deadlines, and exams by custom categories.
  - Track task status (`Scheduled`, `Doing`, `Done`, and `Overdue`) with a built-in monthly calendar view.
- 📝 **Quick Notes**
  - Jot down lecture reminders and quick study notes right on the dashboard.
- 🗂️ **Flashcards Quizzer**
  - Upload reviewer files (`.pdf`, `.docx`, or `.txt`) to automatically generate Q&A flashcards.
  - Create, save, and switch between custom **Subject Categories** with score tracking (`Got It` vs. `Study Again`).
- 🎬 **Video Compressor**
  - Compress large video recordings and project demos locally using **FFmpeg** so they are easier to submit or share.
- 📄 **Document Tools**
  - Convert documents (`.docx`, `.pptx`) into **PDF** and merge multiple PDF files into a single document.
- 📡 **Offline & LAN Hotspot Mode**
  - Works completely offline and supports local Wi-Fi / Hotspot peer connections for classroom file sharing.
- 🎨 **Customizable Workspace**
  - Drag-and-drop dashboard cards to arrange your layout freely, plus built-in **Dark Mode** and custom notification sound controls.

---

## 🛠️ Tech Stack

| Layer | Technologies Used |
| :--- | :--- |
| **Frontend** | HTML5, CSS3, Vanilla JavaScript, SortableJS |
| **Backend** | Python (Flask), SQLite (`auth_db.py`) |
| **File & Media Processing** | FFmpeg (Video Compression), PyPDF / docx2pdf (Document Tools) |

---

## 🚀 How to Run Locally

1. Clone or download this repository.
2. Make sure **Python 3** and the required packages are installed:
   ```bash
   pip install flask flask-cors pypdf docx2pdf
   ```
3. Run the local server using the batch file or terminal:
   ```bash
   python file_upload.py
   ```
4. Open [login_page.html](login_page.html) or [dashboard.html](dashboard.html) in your browser.

---

## 📌 Our Project Checklist

- [x] Student Login & Registration System
- [x] Drag-and-Drop Dashboard Layout & Dark Mode
- [x] Scheduler, Calendar View & Quick Notes
- [x] Video Compressor & Document Tools (Convert / Merge PDF)
- [x] Flashcards Quizzer with Custom Subject Categories
- [x] Settings Page & LAN Mode Indicator
