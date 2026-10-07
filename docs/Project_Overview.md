# DARKSTAR CLAN MANAGEMENT PROJECT REPORT
## Project Overview – EWLYA System
*Ho Chi Minh City, September 2026*

---

## Table of Contents
- [I. Record of Changes](#i-record-of-changes)
- [II. Project Introduction](#ii-project-introduction)
  - [1. Overview](#1-overview)
    - [1.1 Project Information](#11-project-information)
    - [1.2 Project Team](#12-project-team)
  - [2. Product Background](#2-product-background)
  - [3. Existing Systems](#3-existing-systems)
  - [4. Business & Community Opportunity](#4-business--community-opportunity)
  - [5. Software Product Vision](#5-software-product-vision)
  - [6. Project Scope & Limitations](#6-project-scope--limitations)
    - [6.1 Major Features](#61-major-features)
    - [6.2 Limitations & Exclusions](#62-limitations--exclusions)

---

## I. Record of Changes

| Date | A* M, D | In charge | Change Description |
| :--- | :---: | :--- | :--- |
| **15/07/2026** | A | DarkStar Dev Team | Initial project architecture setup with NestJS, Prisma ORM, PostgreSQL database schema, and base Discord.js v14 bot framework. |
| **05/08/2026** | A, M | DarkStar Dev Team | Implemented Smart Point Wizard (`/wizard` & `Award Points` context command), hybrid batch scoring (`⚡ All X Images`), safe image header capping (`buildImageHeader`), message link logging, and neon podium leaderboard UI. |
| **12/08/2026** | M | DarkStar Dev Team | Refined custom image quantity handling, resolved image counter sync across multi-category submissions, fixed active season resolution logic, and finalized Hall of Fame archiving. |
| **12/09/2026** | M | DarkStar Dev Team | Achieved 100% Jest test suite pass rate (35 unit tests), validated TypeScript compilation cleanliness, and prepared comprehensive project documentation. |

*\*A - Added, M - Modified, D - Deleted*

---

## II. Project Introduction

### 1. Overview

#### 1.1 Project Information
- **Project Name:** EWLYA — DarkStar Clan Discord Management System & Point Engine
- **Project Code:** EWLYA-DS-2026
- **Group / Community Name:** DarkStar Clan (Grand Summoners Ecosystem)
- **Software Type:** NestJS API Backend & Discord.js v14 Application Bot

#### 1.2 Project Team

##### a) Supervisors & Guild Leadership
| Full Name | Role | Email / Contact | Responsibility |
| :--- | :--- | :--- | :--- |
| **Liza / Guild Leader** | Clan Master | `clanmaster@darkstar.gg` | Overall Guild Governance & Competition Rules |
| **DarkStar Admin Board** | Senior Moderator | `admin@darkstar.gg` | Point Rules Verification & Season Approval |

##### b) Development Team
| Full Name | Role | Email / Contact | Module in Charge |
| :--- | :--- | :--- | :--- |
| **DarkStar Core Dev** | Lead Architect & Bot Engineer | `dev@darkstar.gg` | NestJS API, Discord.js Engine & Smart Point Wizard |
| **Backend & DB Lead** | Database Specialist | `db@darkstar.gg` | Prisma ORM, PostgreSQL Schema & Docker Infrastructure |
| **UI & Embed Designer** | Frontend / Discord UI Lead | `ui@darkstar.gg` | Leaderboard Podium Embeds, Modals & User Commands |

---

### 2. Product Background
Grand Summoners is a highly competitive mobile RPG where gaming guilds (clans) compete in high-difficulty end-game events including Boss Ruins, Mines (B200F to B600F), Raids, Special Challenge Quests, and Crest farming. DarkStar Clan is one of the premier competitive clans, running monthly seasonal competitions to track member achievements, rank performance, and award internal clan prestige and rewards.

Historically, managing points for over 50-100 active clan members was a heavy manual burden. Members post screenshot evidence in Discord channels, containing anywhere from 1 to 20+ screenshots per submission post. Administrators had to manually review each image, calculate point values according to complex floor/rank tiers, update static spreadsheets, and manually handle season archiving. This legacy approach suffered from severe pain points:

- **High Administrative Fatigue:** Admin spent up to 5-10 minutes per member post reviewing multi-image submissions.
- **Discord API & Character Limit Crashes:** Early bot attempts failed with `DiscordAPIError 50035` when formatting long lists of image attachment URLs (>2000 characters).
- **Lack of Audit Traceability:** Spreadsheet logs lacked direct clickable jump links back to the original Discord screenshot post, making discrepancy resolution difficult.
- **Image Counter & Multi-Category Discrepancies:** Members submitting posts containing mixed content (e.g., 4 Crest images + 6 Mines images) often resulted in inaccurate point scoring or dropped images.
- **Lack of Visual Engagement:** Standard text-based point updates were dull and failed to motivate clan members during monthly seasons.

---

### 3. Existing Systems

#### 3.1 Manual Google Spreadsheets + Reaction Tracking
The clan relies on manual Discord reaction emojis (e.g., thumbs up) and copy-pasting numbers into Google Sheets.
- **Pros:** Zero initial development cost, flexible format.
- **Cons:** Extremely slow, prone to human calculation errors, no message audit link, no automatic season rollover.

#### 3.2 Generic Discord Economy & Point Bots (e.g., Dyno, UnbelievaBoat)
Standard Discord bots offering generic `+1` point increment commands.
- **Pros:** Quick setup, built-in leaderboards.
- **Cons:** Cannot handle game-specific rules (Ruins floors, Mines B200-B600 tiers, Raid top ranks), no batch image scoring, no context-menu integration.

#### 3.3 Single-Command Custom Slash Bots
Basic custom Discord bots requiring admins to run individual slash commands per image.
- **Pros:** Custom point values per command.
- **Cons:** Extremely tedious for posts with 15+ images, subject to Discord 2000-character payload limits, no hybrid batching options.

---

### 4. Business & Community Opportunity
EWLYA bridges the gap by delivering a fully integrated, automated management platform specifically engineered for DarkStar Clan. By replacing manual review with a context-menu **Smart Point Wizard**, admin processing time is cut by over 90% (from ~5 minutes down to 3 seconds for batch submissions). Furthermore, visually striking **Neon Podium Leaderboard embeds**, real-time message jump links, and automated season archiving create a professional, engaging competitive ecosystem that drives community retention and member participation.

---

### 5. Software Product Vision
The vision for EWLYA is to serve as the definitive, zero-maintenance operational backbone for DarkStar Clan. By combining NestJS modular backend architecture, PostgreSQL persistence with Prisma ORM, containerized Docker deployment, and intuitive Discord.js v14 interaction design, EWLYA delivers enterprise-grade reliability, real-time auditability, and delightful user experiences for both administrators and clan members.

---

### 6. Project Scope & Limitations

#### 6.1 Major Features

- **FE-01: Context-Menu Hybrid Smart Point Wizard (`/wizard` & `Award Points` Context Command)**
  Allows Administrators and Moderators to right-click any member's screenshot submission post and trigger a context-sensitive wizard. Supports 1-click batch awarding (`⚡ All X Images`), custom quantity allocation (`🔢 Custom Quantity`), and step-by-step scoring (`🎯 Single Image`).

- **FE-02: Safe Header Capping & Discord Payload Guard (`buildImageHeader`)**
  Automatically truncates long lists of attachment links in Discord embeds to a maximum of 5 displayed links plus an overflow indicator `*(+X more)*`, guaranteeing complete immunity from `DiscordAPIError 50035` (2000-character payload limit).

- **FE-03: Audit Point Log & Reaction Integration**
  Generates structured log entries in the dedicated `#log-points` channel containing direct clickable post links (`[🔗 Jump to Post]`) and automatically attaches a green checkmark badge (`✅`) to the member's target submission message upon successful point award.

- **FE-04: Multi-Category Game Point Engine (`POINT_CONFIG`)**
  Encapsulates complex Grand Summoners scoring rules across Boss Ruins (Spex, EX2, Blue Stage 1-5F), Mines (B200F to B600F), Raids (Top 1-3 to Top 100), Special Challenges (Maximum/Minimum), Crests (4+, Crest Burst), SR Equipment, and Custom Point Modal dialogs.

- **FE-05: Leaderboard UI & Top 3 Podium Embed (`/leaderboard`)**
  Renders dynamic, high-aesthetic Neon Cyan embeds featuring a Top 3 Podium (🥇 1st Place, 🥈 2nd Place, 🥉 3rd Place), formatted rank listings (`#04`, `#05`...), and community summary metrics (total points awarded, active contestants).

- **FE-06: Active Season Management & History Archiving (`/season`)**
  Automatically resolves active seasons (`isActive: true`), prevents accidental scoring to closed seasons, supports season creation, closing, and historic season viewing with autocomplete support.

- **FE-07: Member Progression & Birthday Reminders**
  Tracks member join dates, automated rank progression verification, birthday notification scheduling, and AI-powered community summaries.

- **FE-08: Containerized Microservices & Database System**
  Built on NestJS framework, Prisma ORM schema, PostgreSQL relational database, and orchestrated via Docker Compose (services: `db`, `api`, `ewlya-bot`).

#### 6.2 Limitations & Exclusions

- **LI-01: Direct Game API Integration**
  Due to the absence of public APIs for Grand Summoners, all point scoring relies on image proof submitted by members and verified by Admins via the Point Wizard.

- **LI-02: Real-Money Financial Transactions**
  Points managed by EWLYA represent internal clan competition scores and hold zero monetary value. No payment gateway or cash payout functions are included.

- **LI-03: Multi-Tenant Guild Isolation Beyond DarkStar**
  The system is tailored specifically for DarkStar Clan's custom rules and server configuration; general multi-guild SaaS isolation is excluded from current scope.

- **LI-04: Fully Automated Screenshot OCR Processing**
  To guarantee 100% scoring accuracy and prevent fraudulent screenshot manipulation, human-in-the-loop validation via the Smart Point Wizard is preserved.

- **LI-05: Native Mobile Application Development**
  All interactions are delivered directly inside the native Discord client via Slash Commands, Context Menus, Embed UI, and Modals without requiring a standalone mobile app.

---
*— End of Project Overview Document —*
