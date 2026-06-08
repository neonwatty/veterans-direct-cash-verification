# Fixture Documents

This directory contains public, safe-looking sample documents for testing the verified-claims pipeline.

## Included

- `source-documents/va-civil-service-letter-sample.pdf`
- `source-documents/statement-of-service-sample.pdf`
- `source-documents/ngb22-example-nd.pdf`
- `rendered-pages/*.png`

## Safety Rules

- Do not add real veteran records.
- Do not add documents with apparent real SSNs, claim numbers, addresses, or unredacted medical/benefit details.
- Prefer official samples, synthetic records, or explicitly donated redacted records with written consent.
- Raw source documents should be treated as sensitive even when they are samples.

## Notes

The current PDFs are useful because they behave like image/PDF documents rather than clean machine-readable text. That makes them suitable for OCR and vision-model extraction tests.
