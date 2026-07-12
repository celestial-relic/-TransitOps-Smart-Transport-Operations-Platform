# TransitOps

TransitOps is a transport and logistics management application built using Next.js, React, and Prisma with SQLite.

## Technologies to Install

Ensure the following tools are installed on your system before running the application:

1. **Node.js** (v20.x or higher recommended)
2. **npm** (included with Node.js)
3. **SQLite** (local database engine)

## Setup & Running the Project

Follow these steps in your terminal to initialize and start the project:

### 1. Identify the Project Directory (pwd)
Verify that your terminal session is active in the project root directory:

2. Install Project Dependencies
Run the installation command to fetch all Node.js and runtime dependencies:

bash


npm install
3. Initialize Database Schema
Sync the schema with the local SQLite database and generate the client code:

bash


npx prisma generate
npx prisma db push
npx prisma db seed
4. Run the Development Server
Launch the local Next.js development server:

bash


npm run dev
Once initialized, open http://localhost:3000 in your web browser.
