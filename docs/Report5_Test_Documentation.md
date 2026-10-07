# DARKSTAR CLAN MANAGEMENT SYSTEM (EWLYA)
## Report 5 – Software Test Documentation
*Ho Chi Minh City, September 2026*

---

## Table of Contents
- [I. Record of Changes](#i-record-of-changes)
- [II. Testing Documentation](#ii-testing-documentation)
  - [1. Scope of Testing](#1-scope-of-testing)
  - [2. Test Strategy](#2-test-strategy)
    - [2.1 Testing Types](#21-testing-types)
    - [2.2 Test Levels](#22-test-levels)
    - [2.3 Supporting Tools](#23-supporting-tools)
  - [3. Test Plan](#3-test-plan)
    - [3.1 Human Resources](#31-human-resources)
    - [3.2 Test Environment](#32-test-environment)
    - [3.3 Test Milestones](#33-test-milestones)
  - [4. Test Cases](#4-test-cases)
    - [4.1 Wizard & Scoring Test Cases](#41-wizard--scoring-test-cases)
    - [4.2 Leaderboard & Season Test Cases](#42-leaderboard--season-test-cases)
    - [4.3 Integration & Payload Safety Test Cases](#43-integration--payload-safety-test-cases)
  - [5. Test Reports](#5-test-reports)
    - [5.1 Execution Summary](#51-execution-summary)
    - [5.2 Defect Resolution Log](#52-defect-resolution-log)

---

## I. Record of Changes

| Date | A* M, D | In charge | Change Description |
| :--- | :---: | :--- | :--- |
| **15/07/2026** | A | DarkStar Dev Team | Initial test strategy, test environment setup, and Jest test harness configuration. |
| **05/08/2026** | M | DarkStar Dev Team | Added unit test suites for Point Wizard, batch multipliers, and payload header capping. |
| **12/08/2026** | M | DarkStar Dev Team | Added regression tests for multi-category image quantity counters and season rollover queries. |
| **12/09/2026** | M | DarkStar Dev Team | Completed full test execution: 35 unit tests across 6 suites passing 100% with zero defects. |

*\*A - Added, M - Modified, D - Deleted*

---

## II. Testing Documentation

### 1. Scope of Testing
The testing scope covers all core backend business logic, database transactions, Discord.js interaction flows, Point Wizard calculations, payload length safety guards, and season archive integrity. Out of scope: Discord Gateway internal network latency and Grand Summoners third-party game server uptime.

---

### 2. Test Strategy

#### 2.1 Testing Types
| Testing Type | Objectives & Scope |
| :--- | :--- |
| **Functional Testing** | Verifies individual slash commands, buttons, modal dialogs, and point calculation logic. |
| **Integration Testing** | Verifies interaction between NestJS services, Prisma ORM, and PostgreSQL database queries. |
| **System Testing (ST)** | Simulates full end-to-end admin scoring workflows inside the Discord sandbox server (`#test-bot`). |
| **Regression Testing** | Automated Jest test execution preventing regressions across releases. |

#### 2.2 Test Levels
- **Unit Level**: Tested service methods (`countProcessedImages`, `buildImageHeader`, `calculatePoints`, `resolveActiveSeason`).
- **Module Level**: Tested command interaction lifecycle and component state builders.
- **System Level**: Tested complete user journeys from member screenshot post to leaderboard rank update.

#### 2.3 Supporting Tools
| Tool Purpose | Tool & Version | Usage in Testing |
| :--- | :--- | :--- |
| **Test Runner** | Jest v29 + ts-jest | Automated unit test execution and assertion framework |
| **Container Runtime** | Docker Compose | Local isolated PostgreSQL 15 test database instance |
| **Discord Sandbox** | Discord Client + Test Guild | Live staging verification with real attachments and permissions |

---

### 3. Test Plan

#### 3.1 Human Resources
| Role | Designation | Responsibilities |
| :--- | :--- | :--- |
| **QA Engineer / Bot Dev** | Lead Tester | Automated unit test writing, integration testing, and bug regression. |
| **Guild Moderator** | Acceptance Tester | Real-world testing of Point Wizard workflows and leaderboard announcements. |

#### 3.2 Test Environment
| Environment Component | Specification / Configuration |
| :--- | :--- |
| **Runtime Engine** | Node.js v20.x LTS (x64) on Windows / Linux Docker container |
| **Database Engine** | PostgreSQL 15 running in Docker with seeded test data |
| **Discord API** | Discord REST API v10 / Discord Gateway v14 |

#### 3.3 Test Milestones
| Milestone | Target Date | Completion Criteria |
| :--- | :-: | :--- |
| **M1: Unit Test Harness Setup** | 15/07/2026 | Jest configuration and mock Discord client structures established. |
| **M2: Wizard & Calculation Tests** | 05/08/2026 | All point calculation and safe capping unit tests implemented. |
| **M3: Staging User Acceptance** | 20/08/2026 | Admin team validated batch wizard scoring in `#test-bot` channel. |
| **M4: Final Regression & Sign-Off** | 12/09/2026 | 100% pass rate achieved across 35 unit tests with zero outstanding bugs. |

---

### 4. Test Cases

#### 4.1 Wizard & Scoring Test Cases
| Test ID | Test Case Title | Test Input / Precondition | Expected Outcome | Status |
| :--- | :--- | :--- | :--- | :-: |
| **TC-WIZ-01** | 1-Click Batch Scoring (`⚡ All Images`) | Post with 18 Crest 4+ images | All 18 images scored, 144 pts added, 1 click | **Pass** |
| **TC-WIZ-02** | Custom Quantity Scoring | Post with 10 mixed images | Score 4 as Crest, 6 remain available for Mines | **Pass** |
| **TC-WIZ-03** | Single Image Stepwise Scoring | Post with 3 images | Step through images 1 by 1 with accurate counter | **Pass** |
| **TC-WIZ-04** | Custom Point Modal Input | Admin inputs 35 pts + custom reason | Modal validates number, awards 35 pts with reason | **Pass** |

#### 4.2 Leaderboard & Season Test Cases
| Test ID | Test Case Title | Test Input / Precondition | Expected Outcome | Status |
| :--- | :--- | :--- | :--- | :-: |
| **TC-LB-01** | Leaderboard Podium Rendering | Active season with 25 contestants | Top 3 displayed with 🥇🥈🥉, ranks `#04`–`#10` listed | **Pass** |
| **TC-LB-02** | Historic Season Autocomplete | User types `/leaderboard season: July` | Autocomplete suggests July 2026; displays archive | **Pass** |
| **TC-LB-03** | Active Season Resolution Guard | Points awarded via wizard | Always resolves `isActive=true`; never writes to closed | **Pass** |

#### 4.3 Integration & Payload Safety Test Cases
| Test ID | Test Case Title | Test Input / Precondition | Expected Outcome | Status |
| :--- | :--- | :--- | :--- | :-: |
| **TC-SAF-01** | Safe Image Header Truncation | Submission with 25 long CDN image URLs | Caps display at 5 links + `*(+20 more)*`; no 50035 error | **Pass** |
| **TC-SAF-02** | Message Reaction Addition | Successful point transaction | Bot adds `✅` reaction emoji to member post | **Pass** |
| **TC-SAF-03** | Point Log Jump Link | Point award entry in `#log-points` | Contains clickable markdown `[🔗 Jump to Post]` | **Pass** |

---

### 5. Test Reports

#### 5.1 Execution Summary
Automated unit testing was executed using Jest v29. A total of 35 unit test cases across 6 test suites were executed.
**Result: 35 Passed, 0 Failed, 0 Skipped (100% Success Rate).** Execution time: 4.82 seconds.

| Metric Category | Test Execution Result | Pass Rate |
| :--- | :--- | :-: |
| **Test Suites** | 6 passed, 6 total | **100%** |
| **Test Cases (Unit Tests)** | 35 passed, 35 total | **100%** |
| **TypeScript Compilation** | 0 errors (`tsc --noEmit` clean) | **100%** |
| **Staging System Tests (ST)** | 12 passed, 12 total | **100%** |

#### 5.2 Defect Resolution Log
| Defect ID | Defect Summary | Severity | Status | Resolution |
| :--- | :--- | :-: | :-: | :--- |
| **DEF-01** | DiscordAPIError 50035 (String length > 2000 chars) | Critical | **Closed** | Implemented `buildImageHeader` capping links to 5 max. |
| **DEF-02** | Custom quantity counter desync on multi-category posts | Major | **Closed** | Re-architected `countProcessedImages` dynamic counter tracking. |
| **DEF-03** | Points inadvertently credited to closed season | Critical | **Closed** | Enforced `resolveActiveSeason` guard in points service. |

---
*— End of Report 5: Software Test Documentation —*
