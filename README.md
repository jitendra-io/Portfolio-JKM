# Jitendra Kumar Mishra - Personal Developer Portfolio

<p align="center">
  <b>Full-Stack Web & AI Developer Portfolio Showcase</b>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Frontend-HTML5%20%7C%20CSS3%20%7C%20JavaScript-blue?style=flat-square" alt="Frontend" />
  <img src="https://img.shields.io/badge/Backend-Node.js%20%2B%20Express-009688?style=flat-square" alt="Backend" />
  <img src="https://img.shields.io/badge/Database-MongoDB%20%2B%20Mongoose-green?style=flat-square" alt="Database" />
  <img src="https://img.shields.io/badge/License-MIT-gold?style=flat-square" alt="License" />
</p>

---

## Overview

Personal portfolio website for **Jitendra Kumar Mishra**, featuring an interactive dark-mode user interface, animated canvas effects, project showcase gallery, full-stack contact inquiry system with real-time email dispatch, and responsive mobile optimization.

---

## Features

- Modern Minimalist UI: Dark theme with fluid typography, responsive layout, and smooth section transitions.
- Live Contact & Email Service: Integrated with Node.js/Express, Brevo, and Resend HTTP APIs for real-time contact form delivery.
- Projects Showcase: Interactive display of full-stack, AI, and systems engineering applications.
- Mobile Responsive: Fully responsive grid across mobile, tablet, and desktop viewports.

---

## Tech Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Backend**: Node.js, Express
- **Email Services**: Brevo API, Resend API, Nodemailer
- **Database**: MongoDB (Mongoose ODM)

---

## Local Development Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/jitendra-io/Portfolio-JKM.git
   cd Portfolio-JKM
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables**:
   Create a `.env` file in the root directory:
   ```env
   PORT=5000
   MONGO_URI=your_mongodb_uri
   RESEND_API_KEY=your_resend_api_key
   BREVO_API_KEY=your_brevo_api_key
   ```

4. **Start the server**:
   ```bash
   npm run dev
   ```

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
