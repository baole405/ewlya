# DARKSTAR CLAN MANAGEMENT SYSTEM (EWLYA)
## Report 2 – Project Management Plan
*Ho Chi Minh City, September 2026*

---

## Table of Contents
- [I. Record of Changes](#i-record-of-changes)
- [II. Project Management Plan](#ii-project-management-plan)
  - [1. Overview](#1-overview)
    - [1.1 Scope & Estimation](#11-scope--estimation)
    - [1.2 Project Objectives](#12-project-objectives)
    - [1.3 Project Risks](#13-project-risks)
  - [2. Management Approach](#2-management-approach)
    - [2.1 Project Process](#21-project-process)
    - [2.2 Quality Management](#22-quality-management)
    - [2.3 Training Plan](#23-training-plan)
  - [3. Project Deliverables](#3-project-deliverables)
  - [4. Responsibility Assignments](#4-responsibility-assignments)
  - [5. Project Communications](#5-project-communications)
  - [6. Configuration Management](#6-configuration-management)
    - [6.1 Document Management](#61-document-management)
    - [6.2 Source Code Management](#62-source-code-management)
    - [6.3 Tools & Infrastructures](#63-tools--infrastructures)

---

## I. Record of Changes

| Date | A* M, D | In charge | Change Description |
| :--- | :---: | :--- | :--- |
| **15/07/2026** | A | DarkStar Dev Team | Initial project plan, WBS estimation, sprint timeline definition. |
| **05/08/2026** | M | DarkStar Dev Team | Updated WBS with Point Wizard, Safe Image Header Guard, and Neon Podium UI. |
| **12/08/2026** | M | DarkStar Dev Team | Refined risk management matrix and quality testing schedule based on staging bot feedback. |
| **12/09/2026** | M | DarkStar Dev Team | Finalized project metrics, 100% test completion sign-off, and handover checklist. |

*\*A - Added, M - Modified, D - Deleted*

---

## II. Project Management Plan

### 1. Overview

#### 1.1 Scope & Estimation
The project scope encompasses the complete lifecycle of the EWLYA DarkStar Clan Management Platform, including requirements analysis, database design, NestJS backend API, Discord.js interaction bot, Point Wizard scoring engine, Leaderboard UI, member management, containerized deployment, and quality testing. Total estimated effort is approximately **180 man-days** distributed across 4 core phases.

| # | WBS Item | Complexity | Est. Effort (man-days) |
| :-: | :--- | :-: | :-: |
| 1 | Project Planning & Architecture Definition | Medium | 15 |
| 2 | Prisma Schema & PostgreSQL Database Modeling | Medium | 18 |
| 3 | Discord.js Gateway & NestJS Core Integration | High | 25 |
| 4 | Smart Point Wizard (Hybrid Batch & Single Image) | Very High | 35 |
| 5 | Multi-Category Point Rules Engine (Ruins, Mines, Raids, Crests) | High | 22 |
| 6 | Leaderboard Embed UI with Top 3 Podium & Season Archiving | High | 20 |
| 7 | Member Progression Check & Birthday Service | Medium | 15 |
| 8 | Docker Containerization & Multi-Environment Configuration | Medium | 12 |
| 9 | Unit Testing (Jest), System Verification & Bug Fixing | High | 18 |

#### 1.2 Project Objectives

| # | Objective Target | Success Metric & Benchmark |
| :-: | :--- | :--- |
| 1 | Interaction Latency | < 1.5 seconds response time for all slash commands and context menus. |
| 2 | Scoring Efficiency | Reduce admin review time from 5 minutes to under 3 seconds per member post. |
| 3 | System Reliability | 100% uptime during clan competition seasons with zero Discord API 50035 crashes. |
| 4 | Test Coverage | Maintain >85% code coverage across core scoring and database transaction modules. |

#### 1.3 Project Risks

| ID | Risk Description | Impact | Possibility | Response Plans |
| :--- | :--- | :-: | :-: | :--- |
| **RSK-01** | Discord API 2000-char message limit on long attachment link lists | High | High | Implement dynamic header capping (`buildImageHeader` max 5 links + overflow indicator). |
| **RSK-02** | Accidental scoring into closed or archived seasons | High | Medium | Enforce active season resolution filter (`isActive: true`) in all point queries. |
| **RSK-03** | Database connection pooling exhaustion under concurrent bot interactions | Medium | Low | Configure Prisma connection limits and Supabase PgBouncer pooler. |
| **RSK-04** | Multi-category image counter desynchronization on custom quantities | High | Medium | Track dynamic processed vs. remaining image counters across wizard steps. |

---

### 2. Management Approach

#### 2.1 Project Process
The project followed an Agile/Scrum methodology adapted for a focused software engineering team. Work was divided into four 2-week sprints. Daily standup communication was maintained via a dedicated Discord developer channel, and sprint backlogs were tracked using GitHub Project boards with automated status transitions.

#### 2.2 Quality Management
Quality assurance enforced a prevention-first approach: TypeScript strict mode was enabled across the entire repository, every PR required passing automated Jest test suites (35 unit tests), and all bot interaction flows were staged and tested in a private Discord test server (`#test-bot`) prior to production deployment.

#### 2.3 Training Plan
Team members received specialized technical alignment in Discord.js v14 interaction handling, NestJS dependency injection lifecycle, and Prisma transactional query safety to avoid common concurrency bottlenecks.

---

### 3. Project Deliverables

| ID | Deliverable Name | Description & Scope |
| :--- | :--- | :--- |
| **DEL-01** | EWLYA Discord Bot Application | Production-ready bot executable running on Discord.js v14 & NestJS. |
| **DEL-02** | PostgreSQL Database & Prisma Migrations | Fully normalized database schema with migration scripts and seeds. |
| **DEL-03** | Docker Compose Orchestration | Multi-container deployment files (`db`, `api`, `ewlya-bot`) with health checks. |
| **DEL-04** | Jest Unit & Integration Test Suite | Comprehensive automated test coverage passing 100%. |
| **DEL-05** | Technical Reports & Architecture Documentation | Reports 1 through 5 and repository guides in Markdown/DOCX. |

---

### 4. Responsibility Assignments (RACI Matrix)

| Task / Deliverable | Lead Architect | DB Engineer | UI/Bot Dev | Guild Master |
| :--- | :-: | :-: | :-: | :-: |
| Architecture & System Design | **R/A** | C | I | I |
| Point Wizard & Scoring Engine | **R/A** | C | I | I |
| Database Schema & Prisma ORM | C | **R/A** | I | I |
| Leaderboard UI & Embed Styling | C | I | **R/A** | I |
| QA & Automated Testing | R | R | R | **A** |
| User Acceptance & Season Approval | I | I | I | **R/A** |

*\*R: Responsible, A: Accountable, C: Consulted, I: Informed*

---

### 5. Project Communications

| Communication Mechanism | Channel | Frequency | Objective |
| :--- | :--- | :-: | :--- |
| **Daily Standup** | Discord Dev Channel | Daily, async | Progress, blockers, daily goals |
| **Sprint Review & Demo** | Discord Voice & Screen Share | Bi-weekly | Demo working bot features to Guild Admins |
| **Emergency Incident Sync** | Discord Ping & Thread | Ad-hoc | Immediate triage and rollback coordination |

---

### 6. Configuration Management

#### 6.1 Document Management
All project documentation is maintained under the `/docs` directory in both Markdown and DOCX formats, versioned in Git.

#### 6.2 Source Code Management
Git branching workflow: `main` (production release), `dev` (active integration), `feature/*` (isolated feature branches).

#### 6.3 Tools & Infrastructures

| Category | Tool / Technology | Purpose in Project |
| :--- | :--- | :--- |
| Framework | NestJS v10 + Discord.js v14 | TypeScript runtime backend and Discord bot engine |
| Database | PostgreSQL 15 + Prisma ORM | Relational database schema and type-safe query layer |
| Containerization | Docker & Docker Compose | Isolated execution of database, API, and bot services |
| Configuration | Doppler / .env files | Encrypted environment variables and API token management |
| Testing | Jest + ts-jest | Automated unit test execution and code coverage reporting |

---
*— End of Report 2: Project Management Plan —*
