# DARKSTAR CLAN MANAGEMENT SYSTEM (EWLYA)
## Report 3 – Software Requirement Specification
*Ho Chi Minh City, September 2026*

---

## Table of Contents
- [I. Record of Changes](#i-record-of-changes)
- [II. Software Requirement Specification](#ii-software-requirement-specification)
  - [1. Product Overview](#1-product-overview)
  - [2. User Requirements](#2-user-requirements)
    - [2.1 Actors](#21-actors)
    - [2.2 Use Cases](#22-use-cases)
    - [2.3 Relationships](#23-relationships)
  - [3. Functional Requirements](#3-functional-requirements)
    - [3.1 System Functional Overview](#31-system-functional-overview)
    - [3.2 Feature Details](#32-feature-details)
  - [4. Non-Functional Requirements](#4-non-functional-requirements)
    - [4.1 External Interfaces](#41-external-interfaces)
    - [4.2 Quality Attributes](#42-quality-attributes)
  - [5. Requirement Appendix](#5-requirement-appendix)
    - [5.1 Business Rules](#51-business-rules)
    - [5.2 Application Messages List](#52-application-messages-list)

---

## I. Record of Changes

| Date | A* M, D | In charge | Change Description |
| :--- | :---: | :--- | :--- |
| **15/07/2026** | A | DarkStar Dev Team | Initial SRS capturing core point scoring and clan member tracking requirements. |
| **05/08/2026** | M | DarkStar Dev Team | Specified Hybrid Smart Point Wizard, safe payload length guard, and podium embed UI. |
| **12/08/2026** | M | DarkStar Dev Team | Updated point categories for Ruins Spex/EX2/Blue Stage, Mines B200-B600F, and Raids top tiers. |
| **12/09/2026** | M | DarkStar Dev Team | Finalized audit logging with direct message jump links and AI activity summary integration. |

*\*A - Added, M - Modified, D - Deleted*

---

## II. Software Requirement Specification

### 1. Product Overview
EWLYA is a comprehensive Discord bot and backend management system tailored for the competitive Grand Summoners guild "DarkStar Clan". The system automates monthly seasonal competitions, point verification from screenshot submissions, real-time leaderboard generation, member progression auditing, and community engagement.

---

### 2. User Requirements

#### 2.1 Actors
| # | Actor | Description & Privileges |
| :-: | :--- | :--- |
| **ACT-01** | Guild Master (Clan Leader) | Full administrative privileges, manages seasons, overrides points, archives competitions. |
| **ACT-02** | Clan Admin / Moderator | Verifies member screenshot submissions, awards points using the Point Wizard, views audit logs. |
| **ACT-03** | Clan Member (Contestant) | Submits screenshot proofs in designated Discord channels, checks personal points, views leaderboards. |
| **ACT-04** | System Bot (EWLYA / Liza) | Automated actor handling interaction responses, scheduled cron jobs, reaction additions, and AI summaries. |

#### 2.2 Use Cases
| ID | Use Case | Primary Actor | Use Case Description |
| :--- | :--- | :-: | :--- |
| **UC-01** | Award Points via Wizard | Admin/Mod | Right-click member message or type `/wizard` to score attached screenshots. |
| **UC-02** | Batch Score All Images | Admin/Mod | Click `⚡ All X Images` button to score entire screenshot post in one click. |
| **UC-03** | Custom Quantity Scoring | Admin/Mod | Allocate specific image counts to different point categories within a post. |
| **UC-04** | View Leaderboard | All Users | Display current season standings with Top 3 Podium embed and participant stats. |
| **UC-05** | Manage Season | Guild Master | Create new season, close active season, archive past results, and reset points. |
| **UC-06** | Check Member Progression | Admin/Mod | Evaluate member rank tier eligibility and account progression milestones. |
| **UC-07** | Set & View Birthday | Clan Member | Register birthday date and receive automated celebratory Discord announcements. |
| **UC-08** | Generate AI Summary | Guild Master | Synthesize weekly clan activity highlights into an automated digest. |

#### 2.3 Relationships
| Base Use Case | Related Use Case | Relationship & Reason |
| :--- | :--- | :-: |
| **Award Points via Wizard** | Batch Score All Images | Extend: Admin can choose batch mode if all images belong to one category. |
| **Award Points via Wizard** | Custom Quantity Scoring | Extend: Admin can select custom image subsets if mixed evidence is submitted. |
| **Award Points via Wizard** | Log Point Entry & Add Reaction | Include: Successful point award always writes to `#log-points` and reacts `✅`. |
| **View Leaderboard** | Autocomplete Historic Seasons | Extend: User can optionally specify season name parameter to view archives. |

---

### 3. Functional Requirements

#### 3.1 System Functional Overview
The system user interface is rendered natively inside the Discord Desktop, Web, and Mobile clients through Discord.js v14 Application Commands (Slash Commands), Message Context Menus, Interactive Buttons, String Select Menus, and Modal Dialogs.

#### 3.2 Feature Details

##### 3.2.1 Point Wizard & Multi-Modal Scoring
Triggered by right-clicking a message (`Apps > Award Points`) or running `/wizard`. Inspects the target message for image attachments. Dynamically presents 3 workflow paths:
1. `⚡ All X Images`: Instant batch scoring across all attachments in 1 click.
2. `🔢 Custom Quantity`: Specify exact image count for multi-category submissions.
3. `🎯 Single Image`: Stepwise inspection per screenshot.
Employs `buildImageHeader` to cap displayed links to 5 max + `*(+X more)*`.

##### 3.2.2 Point Rules & Multi-Tier Scoring Engine (`POINT_CONFIG`)
Implements official clan scoring rules across all Grand Summoners game modes:
- **Ruins 6-16F / Spex**: 1st (24 pts), 2nd-3rd (12 pts), 4th-8th (6 pts).
- **Ruins 1-5F / EX2**: 1st (12 pts), 2nd-3rd (6 pts), 4th-8th (3 pts).
- **Ruins 1-5F Blue Stage**: 1st (5 pts), 2nd (4 pts), 3rd (3 pts), 4th (2 pts), 5th (1 pt).
- **Mines Floors**: B200F (10 pts) up to B600F (400 pts).
- **Raids**: Top 1-3 (100 pts), Top 4-10 (75 pts), Top 11-30 (50 pts), Top 31-50 (10 pts), Top 100 (3 pts).
- **Crests**: Crest 4+ (8 pts), Crest Burst (20 pts).
- **Challenges**: Maximum (20 pts), Minimum (5 pts); SR Equipment: Rep (5 pts), Custom (20 pts).
- **Custom Points**: Freeform point input via Modal dialog.

##### 3.2.3 Leaderboard & Top 3 Podium Embeds (`/leaderboard`)
Renders a high-contrast Neon Cyan embed displaying a Top 3 Podium (🥇 1st Place, 🥈 2nd Place, 🥉 3rd Place) with bold score highlights, followed by ranked contestants (`#04`, `#05`...), and overall community statistics cards.

##### 3.2.4 Season Management & History Archiving (`/season`)
Governed by `/season` command group. Automatically routes all score additions to the currently active season (`isActive: true`). Supports season creation, closure, point freezing, and autocomplete lookup for historical seasons.

##### 3.2.5 Member Progression Check & Verification
Evaluates member join tenure, account milestone achievements, and tournament rankings against predefined DarkStar Clan tier criteria. Outputs formatted status reports.

##### 3.2.6 Birthday Reminders & Profile Management
Allows members to register their birthday (`/birthday set`). Daily scheduled background cron scans for birthdays and sends a custom celebratory announcement embed in the general community channel.

##### 3.2.7 Audit Logging & Reaction Badging
Every point transaction writes a detailed audit entry to the `#log-points` channel containing moderator ID, target member ID, points awarded, category, timestamp, and a clickable `[🔗 Jump to Post]` markdown link. The target submission message automatically receives a green checkmark emoji (`✅`).

##### 3.2.8 AI Clan Activity Summarization
Integrates OpenRouter/Gemini AI models to analyze clan chat activity, event participation, and tournament results, generating concise executive summaries for clan leadership.

---

### 4. Non-Functional Requirements

#### 4.1 External Interfaces
| Interface Name | Version / Protocol | Description & Usage |
| :--- | :--- | :--- |
| **Discord Gateway / REST API** | v10 / v14 | Real-time WebSocket interaction gateway and REST endpoint execution. |
| **PostgreSQL Database** | v15 | ACID-compliant relational database accessed via Prisma ORM. |
| **AI Summarizer API** | Gemini 1.5 / OpenRouter | External LLM API for natural language activity synthesis. |

#### 4.2 Quality Attributes
| Quality Attribute | Specification & Requirement |
| :--- | :--- |
| **Performance** | All button clicks and command responses must defer within 1.5s to avoid Discord token timeouts. |
| **Reliability** | Zero payload truncation crashes; embeds must strictly respect Discord 2000-character payload limits. |
| **Security** | Administrative commands must enforce Discord permission checks (Administrator / Moderator role guards). |
| **Auditability** | Every point modification must have an immutable database log record with moderator ID and jump link. |

---

### 5. Requirement Appendix

#### 5.1 Business Rules
| Rule ID | Business Rule Statement |
| :-: | :--- |
| **BR-01** | Points must only be credited to the currently active season (`isActive: true`). |
| **BR-02** | Images cannot be double-counted; the wizard tracks remaining unassigned images per submission. |
| **BR-03** | Points cannot be negative; custom point awards require a non-empty administrative justification. |
| **BR-04** | In the event of a tie on the leaderboard, members with earlier achievement timestamps rank higher. |

#### 5.2 Application Messages List
| Code | Message Type | Message Template Text |
| :-: | :--- | :--- |
| **MSG-01** | Success: Points Awarded | `✅ Successfully awarded {points} points to {member} for {category}!` |
| **MSG-02** | Error: No Images Found | `❌ This message does not contain any valid image attachments to score.` |
| **MSG-03** | Error: No Active Season | `⚠️ There is currently no active season open. Please open a season first.` |
| **MSG-04** | Notice: Image Overflow | `*(+{count} more attachments)*` |

---
*— End of Report 3: Software Requirement Specification —*
