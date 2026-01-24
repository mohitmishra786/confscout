<div align="center">

# ConfScout

*"The beginning of wisdom is the definition of terms."* — Socrates

A premium conference tracking engine for the modern developer. One platform to scout them all.

[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![Vercel](https://img.shields.io/badge/Vercel-Deployed-black?style=flat-square&logo=vercel)](https://vercel.com/)
[![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)

</div>

---

Most developers miss the most important conferences because they are buried in Twitter threads or scattered across outdated wiki pages. You find out about the perfect event three days after the Call for Papers closes.

**ConfScout** solves this. It is not just a list; it is a geospatial intelligence tool for your career.

## Architecture & Features

This project utilizes a modern stack to provide real-time intelligence on global tech events.

| Component | Technology | Description |
| :--- | :--- | :--- |
| **Frontend** | Next.js 15 | High-performance React framework with App Router |
| **Maps** | Leaflet + CartoDB | Dark-mode visualization with marker clustering |
| **Backend** | Vercel Postgres | Serverless SQL for subscriber management |
| **Data Engine** | Python + Geopy | Automated scraping and coordinate resolution |

---

## What It Actually Does

When you visit ConfScout, three things happen.

First, the **Geospatial Engine** visualizes the global density of tech events. You don't just see a list; you see that October is heavy with European conferences, while May is peak season in the US. The map is interactive, clustered, and optimized for discovery.

Second, the **Subscription System** allows you to define your intake. You can choose to receive updates Daily or Weekly. The backend validates your intent, stores your preferences in a secure PostgreSQL database, and triggers a verification flow via Zoho Mail. No spam, just signal.

Third, the **RSS Feed** provides a direct pipe to your reader of choice. Generated dynamically, it ensures that even if you never visit the site again, you never miss a deadline.

## The Constraints

This system was built with specific design constraints to ensure quality and performance.

**Visual Excellence** is non-negotiable. The map uses CartoDB Dark Matter tiles to reduce eye strain. The UI is built with a custom dark theme that feels professional, not playful.

**Data Integrity** is paramount. Locations are geocoded using Nominatim with a caching layer to respect rate limits. Weekly digests only trigger for verified subscribers.

**User Sovereignty** is respected. No trackers. No ads. You choose your email frequency. You can unsubscribe at any time.

## Looking Ahead

The current platform handles the core use case: discovery. But the real power comes from community. Future iterations will introduce user accounts for saving itineraries, deeper integration with flight aggregators, and community-driven event reviews.

*"We are what we repeatedly do. Excellence, then, is not an act, but a habit."* — Aristotle

ConfScout ensures that attending the right events becomes a habit, not a lucky accident.

---

MIT License
