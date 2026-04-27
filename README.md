<div align="center">

# AnyCalc

**Calculate anything, anywhere — 19 interlinked financial calculators in one app**

![Next.js](https://img.shields.io/badge/Next.js-14-000000?logo=nextdotjs&logoColor=white) ![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white) ![Supabase](https://img.shields.io/badge/Supabase-cloud-3ECF8E?logo=supabase&logoColor=white) ![Zustand](https://img.shields.io/badge/Zustand-state-764ABC) ![Status](https://img.shields.io/badge/Status-Live-22c55e)

[**Live demo →**](https://anycalc.in)

</div>

<!-- LAUNCHPAD:START -->
```json
{
  "stage": "live",
  "progress": 50,
  "complexity": "F",
  "lastUpdated": "2026-04-27",
  "targetDate": null,
  "nextAction": "Multi-language support",
  "blocker": null,
  "demoUrl": "https://anycalc.in",
  "techStack": [
    "Next.js",
    "TypeScript",
    "Supabase",
    "Zustand"
  ],
  "shipped": true,
  "linkedinPosted": false
}
```
<!-- LAUNCHPAD:END -->

<details>
<summary>📚 Table of Contents</summary>

- [Features](#features)
- [Quick Start](#quick-start)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Roadmap](#roadmap)
- [License](#license)

</details>

## Features

- 19 interlinked calculators — EMI, tip splits, compound interest, currency conversion
- Plan mode chains calculations together for "what-if" analysis
- Workspace mode opens multiple calculators side-by-side
- 100% local processing — calculations never touch a server
- Interactive Recharts visualizations

## Quick Start

<p align="center">
  <a href="https://anycalc.in"><img src="https://img.shields.io/badge/🚀_Live_Demo-anycalc.in-2563EB?style=for-the-badge" alt="Live Demo" /></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-14+-black?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind-3.x-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="License" />
</p>

<h1 align="center">
  <br />
  AnyCalc
  <br />
</h1>

<h3 align="center">
  Calculate everything. Plan anything. <em><b>Beautifully</b> <a href="#"><img src="https://img.shields.io/badge/simple.-2563EB?style=flat-square&labelColor=2563EB" alt="simple." /></a></em>
</h3>

<p align="center">
  A comprehensive suite of 19+ financial, health, and utility calculators in one elegant workspace.<br />
  Built for speed, designed for clarity, made for everyone.
</p>

<p align="center">
  <a href="#-features">Features</a> •
  <a href="#-calculators">Calculators</a> •
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-tech-stack">Tech Stack</a> •
  <a href="#-contributing">Contributing</a>
</p>



---

## Features

- **19+ Calculators** — From EMI to Tax, SIP to BMI, all in one place
- **Workspace Mode** — Open multiple calculators side-by-side for comparison
- **Interactive Charts** — Visualize results with beautiful, responsive charts
- **Dark Mode** — Easy on the eyes, day or night
- **Mobile-First** — Fully responsive design that works on any device
- **Blazing Fast** — Built with Next.js App Router and optimized for performance
- **Privacy-First** — All calculations happen locally, no data sent to servers

---

## Calculators

### Investment & Savings
| Calculator | Description |
|------------|-------------|
| **SIP** | Systematic Investment Plan returns calculator |
| **Lumpsum** | One-time investment growth projector |
| **FD** | Fixed Deposit maturity calculator |
| **RD** | Recurring Deposit calculator |
| **PPF** | Public Provident Fund calculator |
| **CAGR** | Compound Annual Growth Rate calculator |
| **Compound** | Compound interest with flexible compounding |
| **Goal** | Reverse calculator — how much to invest monthly |

### Loans & EMI
| Calculator | Description |
|------------|-------------|
| **EMI** | Equated Monthly Installment for any loan |

### Tax & Salary
| Calculator | Description |
|------------|-------------|
| **Tax Planner** | Income tax calculation (Old vs New regime) |
| **Salary** | CTC to take-home salary breakdown |
| **HRA** | House Rent Allowance exemption calculator |
| **Gratuity** | Gratuity amount calculator |
| **GST** | Goods & Services Tax calculator |

### Health & Fitness
| Calculator | Description |
|------------|-------------|
| **BMI** | Body Mass Index with target weight planner |

### Lifestyle & Utility
| Calculator | Description |
|------------|-------------|
| **Cost of Living** | Compare living costs between cities |
| **Trip Planner** | Travel budget calculator |
| **Currency** | Real-time currency converter |
| **World Clock** | Multi-timezone clock display |

---

## Quick Start

### Prerequisites

- Node.js 18+ and npm

### Installation

```bash
# Clone the repository
git clone https://github.com/castroarun/caclulate_anything.git

# Navigate to project
cd caclulate_anything

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

### Build for Production

```bash
npm run build
npm run start
```

---

## Tech Stack

| Technology | Purpose |
|------------|---------|
| [Next.js 14](https://nextjs.org/) | React framework with App Router |
| [TypeScript](https://www.typescriptlang.org/) | Type-safe JavaScript |
| [Tailwind CSS](https://tailwindcss.com/) | Utility-first styling |
| [Recharts](https://recharts.org/) | Charting library |

---

## Project Structure

```
any_calculator/
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── page.tsx             # Landing page
│   │   ├── workspace/           # Multi-calculator workspace
│   │   └── (calculators)/       # Individual calculator routes
│   ├── components/
│   │   ├── calculator/          # Shared calculator UI components
│   │   └── calculators/         # Individual calculator logic
│   ├── lib/
│   │   ├── calculations/        # Pure calculation functions
│   │   └── utils/               # Formatting, helpers
│   └── types/                   # TypeScript definitions
├── docs/                        # Documentation
│   ├── APP_PRD.md              # Product requirements
│   ├── PROJECT-STATUS.md       # Development progress
│   └── mockups/                # UI design mockups
└── public/                      # Static assets
```

---

## Screenshots

> Screenshots coming soon — check back after v1.0 release!

<!--
<p align="center">
  <img src="docs/images/landing.png" width="400" alt="Landing Page" />
  <img src="docs/images/workspace.png" width="400" alt="Workspace" />
</p>
-->

---

## Roadmap

- [x] Core calculator components
- [x] Workspace mode
- [x] Landing page
- [ ] Dark mode toggle
- [ ] Export results to PDF
- [ ] Share calculation via link
- [ ] PWA support
- [ ] Localization (Hindi, Spanish)

---

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Links

- **GitHub:** [github.com/castroarun/caclulate_anything](https://github.com/castroarun/caclulate_anything)
- **Jira:** [CALC Project Board](https://castroarun.atlassian.net/jira/software/projects/CALC/boards/167)

---

<p align="center">
  <sub>Built with care by <a href="https://github.com/castroarun">Castro</a></sub>
</p>

## Tech Stack

| Component | Tech |
|---|---|
| Next.js | — |
| TypeScript | — |
| Supabase | — |
| Zustand | — |

## Roadmap

- [x] Investment + Loan + Tax + Health calculators
- [x] Plan mode (chained calculations)
- [ ] Multi-language support
- [ ] Calculator marketplace

## License

Private — part of the Castronix portfolio.

<div align="center">

---

<sub>Part of the <a href="https://castronix.dev">Castronix</a> portfolio · crafted with care · © 2026 Arun Castromin</sub>

</div>
