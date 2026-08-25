# Inhouse Jobs release policy

Every Android publication must:

1. Increment the semantic version in `package.json`, `android/app/build.gradle`, and `android-update.json`.
2. Increment `versionCode` in both Android Gradle configuration and `android-update.json`.
3. Run tests and the production web build.
4. Build the APK with the permanent Inhouse Jobs signing key.
5. Publish `Inhouse-Jobs.apk` to a GitHub Release and keep `android-update.json` aligned with it.
6. Never commit API keys, signing material, CVs, candidate profiles, or application data.

Candidate data must remain local to the device. The public feed may contain only normalized public job-listing information and source URLs.
