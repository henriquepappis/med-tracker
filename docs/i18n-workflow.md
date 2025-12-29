# Localization Workflow

This document describes how to add and maintain translations for the mobile app.

## Source of truth
- English (`apps/mobile/src/i18n/resources/en.json`) is the source of truth.
- Every key must exist in all supported languages.

## Adding or changing strings
1. Add or update the key in `en.json`.
2. Copy the key into `pt-BR.json`, `es.json`, and `fr.json`.
3. Translate the value carefully and keep placeholders intact (for example: `{{name}}`).
4. Run the app and verify the screens where the string appears.

## Sensitive strings
Manually review all user-visible strings related to:
- Intake statuses
- Warnings and errors
- Notification content

## Fallback behavior
- Missing keys fall back to English (`fallbackLng: 'en'`).
- If a device language is unsupported, the app defaults to English.

## Adding a new language
1. Create a new JSON file in `apps/mobile/src/i18n/resources/`.
2. Add it to `resources` and `supportedLanguages` in `apps/mobile/src/i18n/index.ts`.
3. Add a label to Settings (`settings.*`) for language selection.

