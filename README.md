# 🍜 Maggino's - Late Night Hostel Maggi Delivery

Maggino's is a dedicated Progressive Web App (PWA) and website built to operate a hostel Maggi stall, designed specifically to seamlessly handle late-night student cravings. What began as a minimum viable product evolved into a fully modular, enterprise-grade application featuring a customer-facing menu and a real-time kitchen dashboard.

## ✨ Key Features

### 👨‍🎓 User Experience (Students & Faculty)
*   **Simple Authentication:** Secure login system using Google OAuth.
*   **Hostel Profiles:** Customers specify their Hostel Block and Room Number to streamline 2 AM deliveries.
*   **Premium Aesthetic UI:** A modern, glassmorphic interface with buttery smooth Framer Motion physics, tactile buttons, and Retina-ready vector graphics for 60fps mobile performance.
*   **Live Menu & Cart:** Features a click-to-add cart system with signature items like "Classic Nostalgia," "Double Trouble," and "Cheesy Delight".
*   **Flexible Payments:** Options for quick Cash on Delivery or direct UPI payments via QR code.
*   **Installable PWA:** Users can "Install" Maggino's directly to their iOS or Android home screens, bypassing the browser URL bar to act like a native app.
*   **Order Tracking & Ratings:** Includes an automated Timeout Manager to gracefully handle dropped college Wi-Fi, and allows users to leave item-level 5-star ratings.

### 🧑‍🍳 Admin Dashboard (The Kitchen)
*   **Real-Time Order Queue:** Live dashboard displaying incoming orders, room numbers, and selected payment types.
*   **Status Toggles:** Instantly update customers as their order moves from *Received* ➔ *Cooking* ➔ *Out for Delivery* ➔ *Delivered*.
*   **The "Sleep" Switch:** A master toggle that displays "Maggino's is Currently Sleeping" to automatically stop incoming orders when the kitchen is closed.
*   **Stock Management:** Quick toggles to mark specific ingredients or items as "Sold Out".
*   **Role-Based Access Control (RBAC):** The admin route is strictly protected by a Firebase secure crew collection, ensuring only authorized staff can access the kitchen queue.

## 🛠️ Tech Stack
*   **Frontend:** React (Vite), Tailwind CSS, Framer Motion.
*   **Icons & Assets:** Lucide-React and Scalable Vector Graphics (SVGs).
*   **Backend & Database:** Google Firebase (Cloud Firestore & Authentication).
*   **Hosting:** Vercel.
*   **Version Control & CI/CD:** GitHub, GitHub Actions.

## 🏗️ Architecture & Engineering
This project was heavily refactored to meet industry-standard practices, moving away from a monolithic structure:
*   **Component Separation:** The UI is cleanly split into independent, reusable React components (`Header.tsx`, `Menu.tsx`, `CartModal.tsx`, `AdminDashboard.tsx`).
*   **Service Abstraction (API Layer):** Database and backend operations are abstracted into an `orderService.js` file, fully decoupling the UI components from the data layer.
*   **Security First:** Sensitive API keys and secrets are stored entirely outside the source code using `.env` files.

## 🚀 DevOps & CI/CD Pipeline
To ensure a reliable experience for customers, Maggino's utilizes a professional Continuous Integration/Continuous Deployment (CI/CD) pipeline:
*   **Automated Testing & Deployment Guards:** A GitHub Actions workflow (`.github/workflows/ci.yml`) spins up a virtual server every time code is pushed. 
*   **Stability Checks:** The pipeline checks the code for errors and completely blocks Vercel from deploying if any bugs are detected, preventing broken code from ever reaching live customers.
