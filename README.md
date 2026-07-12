TransitOps

TransitOps is a transport and logistics management application built using Next.js, React, and Prisma with SQLite.

Technologies Used
To run this application, ensure you have the following installed on your system:

Node.js (v20.x or higher recommended)
npm (usually packaged with Node.js)
Prisma (v5.20.x, database ORM)
SQLite (relational database, runs locally as a file)
Installation & Setup Guide
1. Navigate to the Project Directory
Open your terminal/command prompt and change directory to the root of the project:

bash


cd transitops
2. Install Dependencies
Install all required Node.js packages:

bash


npm install
3. Environment Variables
Verify or create a .env file in the root directory. It should contain the following settings:

env


DATABASE_URL="file:./dev.db"
JWT_SECRET="transitops-super-secret-jwt-key-2024-change-in-production"
NEXT_PUBLIC_APP_NAME="TransitOps"
NEXT_PUBLIC_APP_VERSION="1.0.0"
UPLOAD_DIR="./public/uploads"
4. Database Initialization
Prepare the SQLite database schema and generate the Prisma client:

bash


# Generate the Prisma client
npx prisma generate
# Create/Sync the SQLite database schema
npx prisma db push
# (Optional) Seed the database with initial developer/mock data
npx prisma db seed
5. Running the Development Server
Start the local Next.js development server:

bash


npm run dev
Once running, open http://localhost:3000 in your web browser to access the application.

Available Scripts
In the project directory, you can run the following npm commands:

npm run dev: Starts the Next.js application in development mode with hot-reloading.
npm run build: Generates the Prisma client and compiles the Next.js app for production deployment.
npm run start: Runs the built production application.
npm run lint: Performs lint checks on codebase using ESLint.
npm run db:clean: Cleans the SQLite database (runs prisma/clear-db.ts).
