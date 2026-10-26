# ⚡ Samarth Haveliwala // Personal Portfolio & Admin Suite

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/samarth163-cloud/Samarthhh)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Vercel Ready](https://img.shields.io/badge/Vercel-Ready-black?logo=vercel)](https://vercel.com)

Welcome to the official repository for **Samarth Haveliwala's Portfolio**, featuring a retro Neo-Brutalist print-media aesthetic, dark/light theme, interactive particle canvas, dynamic resume, and a full-fledged **Admin Control Suite** to manage and customize all content in real time.

---

## 🌟 Key Features

- **🎨 Neo-Brutalist Design System**: Bold black outlines (`2.5px solid #000`), hard drop shadows, crimson red accents (`#e52521`), and high-contrast typography (Anton, Space Grotesk, Space Mono).
- **🌓 Dual Dark / Light Mode**: Smooth theme toggling with retro cream paper and sleek cyber-dark palettes.
- **🚀 Project Showcase**: Interactive project cards with tech badges, GitHub source links, and demo previews.
- **📄 Interactive Resume**: Live resume at `/resume/` with experience timelines, education, skills, and projects.
- **🛠️ Built-in Admin Suite**: Private control dashboard at `/admin/` allowing you to:
  - Add, edit, reorder, and delete showcase projects with a live card preview.
  - Update resume details (experience bullets, projects, skills, education, recognition).
  - Customize About Me bio, highlights, and tools categories.
  - Manage hero identity and social media links.
  - Direct 1-Click commit & deploy to Vercel via GitHub API!
- **⚡ Zero Visible Admin Traces**: The public portfolio is 100% clean—no visible admin buttons or redirects for external visitors.
- **🔄 Live Cross-Tab Sync**: Edits made in the Admin panel update open portfolio tabs in real time using `BroadcastChannel` and `localStorage`.

---

## 🚀 1-Click Deployment to Vercel

### Method A: Deploy via Vercel Website (Recommended)
1. Go to [Vercel Dashboard](https://vercel.com/dashboard).
2. Click **Add New...** ➜ **Project**.
3. Import your GitHub repository: `samarth163-cloud/Samarthhh`.
4. Framework Preset: **Other** (Static HTML).
5. Click **Deploy**. Vercel will build and serve your site globally within seconds!

### Method B: Deploy via Vercel CLI
```bash
# Install Vercel CLI globally
npm i -g vercel

# Run deploy from the project folder
vercel
```

All route rewrites (`/resume`, `/admin`) and caching headers are pre-configured in [`vercel.json`](vercel.json).

---

## 💻 Local Development

### Option 1: Built-in Node Companion Server (Recommended)
This runs the lightweight server with disk-persistence API support on port 3000:

```bash
npm install
npm run dev
```

Visit:
- **Portfolio**: [http://localhost:3000/](http://localhost:3000/)
- **Resume**: [http://localhost:3000/resume/](http://localhost:3000/resume/)
- **Admin Panel**: [http://localhost:3000/admin/](http://localhost:3000/admin/)

### Option 2: Python HTTP Server
```bash
python -m http.server 3000
```

---

## 📁 Project Structure

```
├── admin/                  # Private Admin Control Suite
│   ├── index.html          # Admin Dashboard UI
│   ├── admin.css           # Neo-brutalist admin styling
│   ├── admin.js            # State manager & GitHub auto-deployer
│   └── server.js           # Companion server with /api/save endpoint
├── assets/                 # Images, favicons, project thumbnails
├── data/
│   └── portfolio-data.json # Primary data source for dynamic content
├── resume/
│   ├── index.html          # Interactive resume page
│   ├── resume.css          # Resume styling
│   └── pixels.js           # Pixel canvas animation
├── index.html              # Main portfolio homepage
├── style.css               # Neo-brutalist theme styles
├── script.js               # Particles, navigation, and interaction logic
├── data-sync.js            # Live data hydration engine
├── vercel.json             # Vercel deployment & rewrite configuration
└── package.json            # Node scripts and dependencies
```

---

## 🔒 Customizing Content

To customize projects, experience, bio, or links:
1. Navigate directly to `/admin/` in your browser.
2. Make your edits and click **Save & Apply** (or press `Ctrl+S`).
3. To push changes to the live Vercel deployment:
   - Use the **GitHub & Vercel Live Auto-Deploy** module in the Backup tab, or
   - Export `portfolio-data.json` and push to GitHub:
     ```bash
     git add data/portfolio-data.json
     git commit -m "Update portfolio content"
     git push origin main
     ```

---

## 📜 License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
