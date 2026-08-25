# Inhouse Jobs

Inhouse Jobs is a bilingual, local-first Android job search and application assistant for Spain, the UK, and worldwide remote work.

## Included

- Search by role, company, skill, city, country, workplace and contract type
- Search-first list and swipe discovery mode
- Saved and dismissed jobs
- One reusable candidate profile and CV stored on-device
- Application preparation, compatible-field autofill and status tracking
- Hourly, serverless feed refresh using GitHub Actions
- Public adapters for Remotive, Arbeitnow, Remote OK, Jobicy, Lever, Greenhouse and Ashby
- Optional Adzuna adapter when free developer credentials are configured
- One-click installable beta APK published through GitHub Actions and Releases

## Development

```sh
npm install
npm run aggregate
npm run dev
```

Candidate data never enters the GitHub job feed. Source listings retain their provenance and original application URL.

## Distribution

Run **Build Android APK** from the GitHub Actions tab. The workflow tests the app, builds and verifies the APK, uploads it as an artifact, and publishes `Inhouse-Jobs.apk` in the repository's Releases section.
