# Rolling Suds — Starbucks Operations Platform

## What This Is

A free web app that automates the most tedious parts of managing your Starbucks overnight pressure washing contract. Built specifically for Rolling Suds franchisees doing Starbucks work through GoSuperClean.

## What It Does

**Upload your schedule → Generate invoices & work orders → Pull photos from CompanyCam → Email everything to GoSuperClean. All in one place.**

### The Problem
Every night after completing Starbucks stores, you have to:
1. Manually create an invoice PDF for each store
2. Manually create a signed work order PDF for each store
3. Go into CompanyCam, find the right project, download the 5 photos
4. Send the invoice + work order to documents@gosuperclean.com
5. Send the 5 photos to starbucks@gosuperclean.com
6. Repeat for every single store. Every single night.

For 30 stores a month, that's 60+ emails with 90+ attachments — all done manually.

### The Solution
1. **Upload** your monthly Starbucks schedule spreadsheet (.xlsx)
2. **Click into a job** after it's completed
3. **Fill in** WO#, invoice#, start/stop times
4. **Click "Find Photos"** — auto-matches the CompanyCam project by store # and WO#, loads all 5 photos
5. **Click "Send Documents"** — generates the invoice + signed work order PDFs and emails them to documents@gosuperclean.com
6. **Click "Send Photos"** — emails the 5 CompanyCam photos to starbucks@gosuperclean.com
7. **Done.** Email log tracks what was sent, when, and to whom.

What used to take 15-20 minutes per store takes about 60 seconds.

## Features

- **PDF Generator** — Produces pixel-perfect Invoice (Rolling Suds branded) and Work Order (SuperClean format with signature) PDFs
- **Schedule Calendar** — Week/month view of all your Starbucks jobs with color coding
- **XLSX Upload** — Drag and drop your Starbucks schedule spreadsheet, set pricing and tech assignments in bulk
- **CompanyCam Integration** — Searches for projects by store # and WO#, auto-loads photos
- **Email via Resend** — Sends documents and photos to GoSuperClean with proper subject lines, you're CC'd on everything
- **Email Logging** — Tracks every email sent per job with timestamps to prevent double-sends
- **Tech Management** — Add/remove technicians from the Settings page
- **Mobile Friendly** — Works on your phone

## Cost

- **Hosting (Vercel):** Free
- **Database (Redis):** Free (30MB, more than enough)
- **Email (Resend):** Free up to 3,000 emails/month
- **CompanyCam:** You already pay for this
- **Total: $0/month**

## Setup Guide (30 minutes)

### Prerequisites
- A GitHub account (free)
- A Vercel account (free — sign up with GitHub)
- A CompanyCam account with API access
- A domain you can add DNS records to (for email sending)

### Step 1: Fork the Code

Go to GitHub and fork this repository: https://github.com/maxgelfman-glitch/Starbucks

This creates your own copy. Your data is completely separate — nothing connects back to anyone else's instance.

### Step 2: Customize for Your Franchise

Edit these files in your fork:

**`lib/constants.ts`** — Change the company info:
```typescript
export const COMPANY = {
  name: 'Rolling Suds of [YOUR TERRITORY]',
  phone: '(YOUR) NUMBER',
  email: 'your.email@rollingsuds.com',
};
```

**`lib/constants.ts`** — Change the default technicians:
```typescript
export const DEFAULT_TECHNICIANS = [
  'Your Name',
  'Your Tech 1',
  'Your Tech 2',
];
```

**`lib/constants.ts`** — Change the seed data to your stores (or just delete it and upload your own spreadsheet)

**`lib/email.ts`** — Change the reply-to and CC email to yours:
```typescript
replyTo: 'your.email@rollingsuds.com',
cc: ['your.email@rollingsuds.com'],
```

**`lib/pdf/invoice.ts`** — The invoice already uses the COMPANY constant, so it'll auto-update

**`lib/pdf/work-order.ts`** — The work order technician default will use your name from the constants

### Step 3: Get Your API Keys

**CompanyCam:**
1. Log into CompanyCam
2. Go to Your Company → Account → Access Tokens
3. Select "N/A" from the dropdown and create a token
4. Copy the token

**Resend (for email):**
1. Sign up at resend.com (free)
2. Get your API key from the dashboard
3. Add your sending domain under Domains (requires adding 3 DNS records to your domain)
4. Verify the domain

**Workiz (optional):**
1. Go to Settings → Developer in Workiz
2. Copy your API Token
3. Note: API access may require a specific Workiz plan

### Step 4: Deploy to Vercel

1. Go to vercel.com, sign in with GitHub
2. Click "New Project" → import your forked Starbucks repo
3. Add these Environment Variables:

| Name | Value |
|------|-------|
| `COMPANYCAM_API_TOKEN` | Your CompanyCam token |
| `RESEND_API_KEY` | Your Resend API key |
| `EMAIL_FROM` | your-name@yourdomain.com |
| `WORKIZ_API_TOKEN` | Your Workiz token (optional) |
| `WORKIZ_BASE_URL` | https://api.workiz.com/api/v1 |

4. Click Deploy

### Step 5: Add Database (for persistent storage)

1. In Vercel dashboard → Storage → Create Database → KV (Redis)
2. Select the free 30MB plan
3. Connect it to your project
4. Redeploy

### Step 6: Load Your Schedule

Visit `https://your-app-url.vercel.app/api/seed` to load test data, or go to Upload and drop in your actual .xlsx schedule.

## Spreadsheet Format

Your schedule spreadsheet should have these columns:

| Night | Date | Store | Address | City | State |
|-------|------|-------|---------|------|-------|
| 1 | 2026-04-06 | Starbucks # 00806 | 301 Greenwich Ave | Greenwich | CT |

The "Store" column should contain the store number — the app parses it automatically.

## Daily Workflow

1. Jobs get done overnight
2. Next morning, open the app on your phone
3. Click into the completed job
4. Fill in: WO#, Invoice#, start/stop times, mark as completed
5. Click "Find Photos" (auto-matches from CompanyCam)
6. Click "Test to Me" first to verify (sends to your email)
7. Click "Send Documents" (invoice + WO → documents@gosuperclean.com)
8. Click "Send Photos" (5 photos → starbucks@gosuperclean.com)
9. Move to next store

## Questions?

This is open source. Each franchisee runs their own completely independent instance — your data, your API keys, your emails. Nothing is shared between franchisees.

If you need help setting it up, reach out to Max Gelfman at Rolling Suds of Westchester-Stamford.
