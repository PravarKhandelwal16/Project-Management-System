# Project Management System

A full-stack web application designed for project and task tracking, team management, and status analytics.

---

## 🛠️ Technology Stack

- **Frontend:** React 19, Vite, Vanilla CSS
- **Backend:** Node.js, Express 5
- **Database:** MySQL 8.0+ (`mysql2/promise` connection pooling)
- **Security & Tools:** JWT, bcrypt, express-rate-limit, cors, dotenv, nodemon

---

## 📁 Project Structure

```text
project-management-system/
├── client/                     # Frontend React + Vite application
│   ├── public/                 # Static assets
│   ├── src/
│   │   ├── components/         # Reusable UI components (e.g., StatusBadge)
│   │   ├── context/            # React context providers (e.g., AuthContext)
│   │   ├── pages/              # Page views (e.g., HomePage starter)
│   │   ├── services/           # API and HTTP services (e.g., api.js)
│   │   ├── utils/              # Constants, helpers, and shared types
│   │   ├── App.jsx             # Main React component
│   │   ├── index.css           # Modern design system & styles
│   │   └── main.jsx            # React root entry point
│   ├── index.html              # HTML template
│   ├── package.json            # Frontend dependencies & scripts
│   └── vite.config.js          # Vite configuration
│
├── server/                     # Backend Node.js + Express REST API
│   ├── config/
│   │   └── db.js               # MySQL pool configuration (mysql2/promise)
│   ├── controllers/            # Route controllers (.gitkeep)
│   ├── middleware/
│   │   └── errorHandler.js     # Centralized error handling
│   ├── models/                 # Database models / query handlers (.gitkeep)
│   ├── routes/
│   │   ├── healthRoutes.js     # GET /api/health endpoint
│   │   └── index.js            # Main API route router
│   ├── utils/                  # Utility helper functions (.gitkeep)
│   ├── .env.example            # Backend environment variables template
│   ├── app.js                  # Express application setup
│   ├── package.json            # Backend dependencies & scripts
│   └── server.js               # Server entry point & DB connection check
│
├── database/
│   └── schema.sql              # MySQL schema for users, projects, tasks, audit_logs
│
├── .env.example                # Root environment variables template
├── .gitignore                  # Git ignore rules
├── package.json                # Root convenience scripts
├── PROJECT_DESCRIPTION.md      # Detailed project specification
└── README.md                   # Setup guide and documentation
```

---

## 📋 Prerequisites

Before starting, ensure you have the following installed on your machine:
- **Node.js** (v18 or higher, v20+ recommended)
- **npm** (v9 or higher)
- **MySQL Server** (v8.0 or higher)

---

## 🗄️ Database Setup

### 1. Start MySQL Server
Ensure your MySQL service is running. On Windows:
```powershell
Get-Service *mysql*
```

### 2. Create the Database and Execute `schema.sql`

You can execute `database/schema.sql` using any of the following methods:

#### Option A: Using MySQL Command-Line Client
```bash
mysql -u root -p < database/schema.sql
```
*(Enter your MySQL root password when prompted)*

#### Option B: From inside the MySQL Shell
```sql
mysql -u root -p
```
Then run:
```sql
SOURCE /absolute/path/to/Project-Management-System/database/schema.sql;
```

#### Option C: Using MySQL Workbench
1. Open **MySQL Workbench** and connect to your local instance.
2. Go to **File** &rarr; **Open SQL Script...**
3. Select `database/schema.sql`.
4. Click the **Execute (lightning bolt)** button.

### Tables Created:
- `users`: ID, full name, unique email, password hash, role (`user`, `admin`), timestamps.
- `projects`: ID, user ID (foreign key), name, description, status (`Not Started`, `In Progress`, `Completed`), dates, timestamps.
- `tasks`: ID, project ID (FK), user ID (FK), name, description, priority (`Low`, `Medium`, `High`), status (`Pending`, `In Progress`, `Completed`), due date, timestamps.
- `audit_logs`: ID, user ID (FK), action, resource type, resource ID, details, timestamp.

---

## ⚙️ Environment Configuration

1. In the `server/` directory, create a `.env` file from `.env.example`:

```bash
# On Linux / macOS / Git Bash:
cp server/.env.example server/.env

# On Windows PowerShell:
Copy-Item server/.env.example server/.env
```

2. Open `server/.env` and fill in your MySQL credentials:

```env
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=project_management
JWT_SECRET=your_jwt_secret_key_here
```

> **Note:** `.env` is ignored by Git and will not be committed to the repository.

---

## 🚀 Running the Application

### 1. Install Dependencies

You can install all dependencies from the root directory:
```bash
npm run install:all
```

Or install separately in each folder:
```bash
# Backend dependencies
cd server
npm install

# Frontend dependencies
cd ../client
npm install
```

---

### 2. Start Backend and Frontend Separately

#### Terminal 1 — Start Backend Server:
```bash
cd server
npm run dev
```
- Server starts at: `http://localhost:5000`
- Verifies MySQL connection automatically on startup.
- Health check available at: `http://localhost:5000/api/health`

#### Terminal 2 — Start Frontend Application:
```bash
cd client
npm run dev
```
- Vite dev server starts at: `http://localhost:5173` (or port specified in terminal output).
- Open `http://localhost:5173` in your browser.

---

### 3. Alternative: Running from Root Directory

From the project root:
```bash
# Start backend in development mode (nodemon)
npm run dev:server

# In another terminal, start frontend (vite)
npm run dev:client
```

---

## 🔍 Verification

### 1. Backend Health Check
Send a `GET` request to `/api/health`:
```bash
curl http://localhost:5000/api/health
```
Response:
```json
{
  "success": true,
  "message": "API is running"
}
```

### 2. Frontend Starter Verification
Navigate to `http://localhost:5173`. You will see the application login page.

---

## 👥 Pre-Configured Test Profiles

The system comes pre-seeded with test accounts covering all Role-Based Access Control (RBAC) tiers:

| Role | Name | Email | Password | Access Scope & Key Features |
| :--- | :--- | :--- | :--- | :--- |
| **Super Admin** | System Super Admin | `admin@projectmanagement.com` | `SuperAdmin123!` | Complete platform authority: User Management (`/admin/users`), Audit Logs (`/admin/audit-logs`), all projects & tasks |
| **Admin** | Stage4 Admin | `admin@teststage4.com` | `Password123!` | Administrative control: Role modification, security audit logs, workspace oversight |
| **Project Manager** | Stage4 PM 1 | `pm1@teststage4.com` | `Password123!` | Project leadership: Create/manage projects, add members, assign tasks, set deadlines |
| **Project Manager (Alt)** | Stage4 PM 2 | `pm2@teststage4.com` | `Password123!` | Secondary PM for multi-project workflows and task reassignments |
| **Team Member** | Stage4 Member 1 | `member1@teststage4.com` | `Password123!` | Contributor: View assigned projects/tasks, update status (`Pending` → `In Progress` → `Completed`), view personal dashboard |
| **Team Member (Alt)** | Stage4 Member 2 | `member2@teststage4.com` | `Password123!` | Secondary contributor for testing task re-assignment & notification triggers |

### 🧪 Automated Notification & Reminder Testing

```bash
# In the server directory:
cd server

# 1. Test Email Service (simulated output or SMTP if configured)
npm run test:email

# 2. Test Scheduled Reminder Job (evaluates tasks due tomorrow & overdue)
npm run test:reminders
```