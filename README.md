# 🛠️ machinery_management_system

The **Machinery Management System** is a full-stack web application built to streamline machinery inventory and maintenance tracking. It enables **Admins** to manage machine records and assign maintenance tasks to **Technicians**, who can then update the status of their assignments through a structured workflow.

---

## 🚀 Features

### 👤 Admin Capabilities
- Register new machines
- View machine list
- Edit machine information
- Delete machines
- Add maintenance records
- Assign maintenance tasks to technicians
- View the current status of maintenance tasks

### 🧰 Technician Capabilities
- View assigned maintenance tasks
- Accept tasks (status changes to **In Progress**)
- Mark tasks as **Done** upon completion

### 🔄 Maintenance Workflow
- `Pending` – Task created and assigned
- `In Progress` – Technician accepts the task
- `Done` – Technician completes the task

---

## ⚙️ Tech Stack

| Layer        | Technology     |
|--------------|----------------|
| Frontend     | EJS Templates  |
| Backend      | Express.js     |
| Database     | SQLite (via `sqlite3`) |
| Language     | JavaScript (Node.js) |

---

## 🏁 Getting Started

### 📦 Prerequisites
- Node.js (v14 or later)
- npm
- Git

### 🔧 Installation

1. **Clone the repository**

```bash
git clone https://github.com/keniKT/machinery_management_system.git
cd machinery_management_system
