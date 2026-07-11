<h1 align="center">🏫 SmartAttend AI — Smart Classroom Attendance System 🚀</h1>

<p align="center">
  <img src="https://i.postimg.cc/zfF24Kw0/image.png" alt="SmartAttend AI Banner">
</p>

---

<p align="center">
  <img src="https://img.shields.io/badge/SmartAttend-AI%20Attendance-6366f1?style=for-the-badge&logo=google-lens&logoColor=white">
  <img src="https://img.shields.io/badge/React-v19-61DAFB?style=for-the-badge&logo=react&logoColor=black">
  <img src="https://img.shields.io/badge/Vite-v7.3.2-646CFF?style=for-the-badge&logo=vite&logoColor=white">
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Python-v3.10-3776AB?style=for-the-badge&logo=python&logoColor=white">
  <img src="https://img.shields.io/badge/Flask-v3.0-000000?style=for-the-badge&logo=flask&logoColor=white">
  <img src="https://img.shields.io/badge/OpenCV-YuNet-5C3EE8?style=for-the-badge&logo=opencv&logoColor=white">
  <img src="https://img.shields.io/badge/MongoDB-Atlas-47A248?style=for-the-badge&logo=mongodb&logoColor=white">
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Vercel-Frontend-000000?style=for-the-badge&logo=vercel&logoColor=white">
  <img src="https://img.shields.io/badge/Render-Backend-46E3B7?style=for-the-badge&logo=render&logoColor=black">
</p>

<p align="center">
  <img src="https://img.shields.io/github/license/Shariar-Ahamed/smart-classroom-attendance-system">
  <img src="https://img.shields.io/github/repo-size/Shariar-Ahamed/smart-classroom-attendance-system">
  <img src="https://img.shields.io/github/last-commit/Shariar-Ahamed/smart-classroom-attendance-system">
</p>

<p align="center">
  <img src="https://img.shields.io/github/stars/Shariar-Ahamed/smart-classroom-attendance-system?style=social">
  <img src="https://img.shields.io/github/forks/Shariar-Ahamed/smart-classroom-attendance-system?style=social">
</p>

<p align="center">
  <a href="https://wakatime.com/badge/user/c7433bc5-6f12-4c97-baea-430790fa608c/project/4d162b42-7e21-4ae8-9867-594059a2c42f">
    <img src="https://wakatime.com/badge/user/c7433bc5-6f12-4c97-baea-430790fa608c/project/4d162b42-7e21-4ae8-9867-594059a2c42f.svg" alt="wakatime">
  </a>
</p>

---

<p align="center">
  SmartAttend AI is a premium, high-performance web-based Smart Classroom Attendance System. Built using a <b>React + Vite</b> frontend and a secure <b>Flask + OpenCV</b> backend, it features a gorgeous custom glassmorphic UI, real-time facial recognition (using SSD Mobilenet v1 & YuNet), database activity tracking, role-based access control, and a secure administration panel.
</p>

> **Live Production Demo**: **[smart-attend-diu.vercel.app](https://smart-attend-diu.vercel.app/)**

---

## 🛠️ Technology Stack

| Layer | Technologies Used | Description |
|---|---|---|
| **Frontend** | React 19, Vite, Tailwind CSS 4 | Glassmorphic interface, dynamic routing, live analytics cards |
| **Backend** | Python 3, Flask, Flask-CORS | REST APIs, multi-threaded video capture, JWT auth |
| **AI / CV** | OpenCV (YuNet), `face_recognition` | YuNet face detector + dlib 128-dimensional face encodings |
| **Database** | MongoDB (PyMongo) | Stores face encodings, user accounts, and class logs |
| **Security** | JWT, bcrypt | Secure password hashing & Role-Based Access Control (RBAC) |

---

## 🌟 Key Features

### 🔍 Real-Time Automated Attendance
- **Live Facial Recognition:** Connects to local webcams or RTSP security streams, runs frame-by-frame face detection, matches details with enrolled student encodings, and records logs.
- **RTSP IP-Camera Support:** Simply switch your `CAMERA_SOURCE` in the environment configuration to link up to standard CCTV cameras.

### 🛡️ Privacy by Design (No Raw Images Saved)
- **Vectors Only:** When registering students, the server computes a 128-dimensional face encoding vector from their web photos and stores only this numerical array in MongoDB.
- **Safe Storage:** Raw images are processed in-memory and immediately discarded—they are never saved to disk or database tables, ensuring strict student visual privacy.

### ⚙️ Role-Based Access Control (RBAC)
- **Admin Dashboard:** Manage students, register new users, capture enrollment photographs, and manage courses/faculty.
- **Faculty Dashboard:** Start live face recognition attendance sessions, perform manual attendance updates, and review daily records.
- **Student Dashboard:** Log in to see dynamic personal attendance percentages, course attendance logs, and overall class presence metrics.

### 📊 Analytics & Reporting
- **Real-Time KPIs:** Dynamic graphs displaying overall presence rates, total enrolled counts, daily absentees, and course metrics.
- **Manual Overrides:** Allows faculty to quickly mark students present/absent manually in case of exceptions.

---

## 🖥️ Platform Interfaces

### 🔑 Secure Login
A futuristic glassmorphic portal handling authentication for Admin, Faculty, and Students using secure JSON Web Tokens (JWT).

### 📹 Live Attendance
The heart of the application. Displays a live camera feed showing bounding boxes, detected face confidence rates, and lists students as they are recognized.

### 📝 Enrollment Capture
A dedicated stepper component that guides the user through capturing multiple photos of a student to generate a high-accuracy averaged face signature.

---

## 📂 Project Directory Structure

```bash
smart-classroom-attendance-system/
│
├── 📂 backend/                    # Python Flask backend
│   ├── app.py                     # Main server entry & REST routing
│   ├── db.py                      # MongoDB initialization & indexes
│   ├── camera.py                  # Live feed / RTSP wrapper class
│   ├── face_service.py            # Face detection (YuNet) & signature matching
│   ├── attendance_service.py      # Core attendance marking rules
│   ├── auth.py                    # JWT + bcrypt user management
│   ├── README.md                  # Backend setup guidelines
│   └── requirements.txt           # Python dependency manifests
│
├── 📂 src/                        # React Frontend Source
│   ├── 📂 components/             # React visual components
│   │   ├── AttendanceRecords.jsx  # History records & filtering
│   │   ├── CoursesManager.jsx     # Course & Faculty CRUD panel
│   │   ├── Dashboard.jsx          # KPI analytics & widgets
│   │   ├── LiveAttendance.jsx     # OpenCV webcam stream feedback
│   │   ├── Login.jsx              # RBAC portal
│   │   ├── ManualAttendance.jsx   # Grid overrides for faculty
│   │   ├── RegisterStudent.jsx    # Photo-stepper registration capture
│   │   ├── Sidebar.jsx            # Dynamic navigation system
│   │   ├── StudentDashboard.jsx   # Dedicated view for logged-in students
│   │   └── StudentsList.jsx       # Enrolled student directory
│   ├── 📂 context/                # AuthContext state hooks
│   ├── 📂 hooks/                  # Custom React hooks (e.g. useWebcam)
│   ├── 📂 services/               # Axios API wrappers
│   ├── App.jsx                    # Routing & Shell controller
│   ├── main.jsx                   # React mounting file
│   └── index.css                  # Tailwinds style directives
│
├── 📄 index.html                  # Main SPA HTML structure
├── 📄 vite.config.js              # Vite configuration
├── 📄 package.json                # Front-end scripts & Node dependencies
└── 📄 README.md                   # Project documentation
```

---

## ⚙️ Getting Started (Local Development)

### 1️⃣ Clone the Repository
```bash
git clone <repository-url>
cd smart-classroom-attendance-system
```

### 2️⃣ Backend Configuration
Ensure you have **Python 3.8+** and a running instance of **MongoDB** (local or Atlas cluster).

```bash
# Navigate to backend
cd backend

# Create virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

Create a `.env` file in the `backend/` directory:
```env
MONGO_URI=mongodb://localhost:27017
DB_NAME=smartattend
JWT_SECRET=your-secret-key-change-me
CAMERA_SOURCE=0  # Use 0 for webcam, or use RTSP stream link
```

Run the backend server (starts on `http://localhost:5000`):
```bash
python app.py
```

### 3️⃣ Frontend Configuration
Ensure you have **Node.js (v18+)** installed.

```bash
# Navigate to the root folder
cd ..

# Install frontend dependencies
npm install

# Run the development server (starts on http://localhost:5173)
npm run dev
```

---

## 👤 Initial Seed User

On its first run, the backend automatically seeds a single administrator account. Faculty and students can sign up using the **Register** interface on the front-end login card.

| Role | Username | Password |
|---|---|---|
| **ADMIN** | `admin` | `admin@123` |

*(Note: student usernames must start with `s-` to be identified properly by the authentication schema.)*

---

