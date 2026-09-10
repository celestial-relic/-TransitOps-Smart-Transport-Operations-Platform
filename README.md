<div align="center">

# 🚍 TransitOps
### Smart Transport & Logistics Management Platform

<p align="center">
A modern transport operations management system built with <b>Next.js</b>, <b>React</b>, <b>Prisma</b>, and <b>SQLite</b> to simplify fleet management, scheduling, logistics, and operational workflows.
</p>

<img src="https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js" />
<img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react" />
<img src="https://img.shields.io/badge/Prisma-5.20-2D3748?style=for-the-badge&logo=prisma" />
<img src="https://img.shields.io/badge/SQLite-Database-003B57?style=for-the-badge&logo=sqlite" />
<img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" />

</div>

---

# 📌 Overview

**TransitOps** is a full-stack transport operations platform designed to streamline logistics management through an intuitive dashboard.

The application enables efficient transport planning, database management, scheduling, and operational monitoring while maintaining a clean and responsive user interface.

---

# ✨ Features

- 🚛 Transport Operations Management
- 📦 Logistics Tracking
- 📅 Route & Schedule Management
- 👨‍💼 Admin Dashboard
- 🔐 Secure Authentication
- 📁 File Upload Support
- ⚡ Fast Performance with Next.js
- 💾 SQLite Database using Prisma ORM
- 📱 Fully Responsive UI

---

# 🛠 Tech Stack

| Technology | Purpose |
|------------|----------|
| **Next.js** | Frontend & Backend Framework |
| **React.js** | UI Development |
| **Prisma ORM** | Database Management |
| **SQLite** | Local Database |
| **Node.js** | Runtime Environment |
| **JavaScript** | Application Logic |
| **CSS / Tailwind** | Styling |

---

# 📂 Project Structure

```text
TransitOps/
│
├── prisma/
│   ├── schema.prisma
│   ├── seed.js
│   └── clear-db.ts
│
├── public/
│   └── uploads/
│
├── src/
│   ├── app/
│   ├── components/
│   ├── lib/
│   ├── services/
│   └── utils/
│
├── .env
├── package.json
└── README.md
```

---

# ⚙️ Prerequisites

Before starting, make sure the following software is installed:

- ✅ Node.js (v20 or later)
- ✅ npm
- ✅ Prisma CLI
- ✅ SQLite

---

# 🚀 Installation

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/yourusername/TransitOps.git
```

### 2️⃣ Move into the Project Folder

```bash
cd TransitOps
```

### 3️⃣ Install Dependencies

```bash
npm install
```

---

# 🔑 Environment Variables

Create a **.env** file in the project root and add the following:

```env
DATABASE_URL="file:./dev.db"

JWT_SECRET="transitops-super-secret-jwt-key-2024-change-in-production"

NEXT_PUBLIC_APP_NAME="TransitOps"

NEXT_PUBLIC_APP_VERSION="1.0.0"

UPLOAD_DIR="./public/uploads"
```

---

# 🗄 Database Setup

Generate the Prisma Client:

```bash
npx prisma generate
```

Synchronize the SQLite database:

```bash
npx prisma db push
```

(Optional) Seed the database:

```bash
npx prisma db seed
```

---

# ▶️ Run the Application

Start the development server:

```bash
npm run dev
```

Visit:

```text
http://localhost:3000
```

---

# 📜 Available Scripts

| Command | Description |
|----------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build application for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run db:clean` | Reset/Clean SQLite database |

---

# 📦 Build for Production

```bash
npm run build
```

Start production server:

```bash
npm run start
```

---

# 🗃 Database Commands

Generate Prisma Client

```bash
npx prisma generate
```

Push Schema

```bash
npx prisma db push
```

Open Prisma Studio

```bash
npx prisma studio
```

Seed Database

```bash
npx prisma db seed
```

Reset Database

```bash
npm run db:clean
```

---

# 📸 Screenshots

> Add screenshots of your dashboard here.

```
/screenshots/dashboard.png
/screenshots/login.png
/screenshots/routes.png
/screenshots/vehicles.png
```

---

# 🔒 Environment

```text
Node.js      >=20.x
Next.js      Latest
Prisma       5.20.x
SQLite       Local Database
```

---

# 🤝 Contributing

Contributions are always welcome!

1. Fork the repository
2. Create a new branch

```bash
git checkout -b feature-name
```

3. Commit your changes

```bash
git commit -m "Added new feature"
```

4. Push to GitHub

```bash
git push origin feature-name
```

5. Create a Pull Request

---

# 🐞 Troubleshooting

### Prisma Client Error

```bash
npx prisma generate
```

---

### Database Issues

```bash
npx prisma db push
```

---

### Missing Dependencies

```bash
npm install
```

<div align="center">

### 🚍 TransitOps

**Smart • Fast • Reliable Transport Operations**

Made with ❤️ using **Next.js**, **React**, **Prisma**, and **SQLite**

⭐ Star this repository if you found it useful!

</div>

