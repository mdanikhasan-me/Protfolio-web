# Open questions

These inputs are not approved or verified. Public pages must use a truthful fallback and must never
ship the bracketed development tokens below.

| Input                       | Development token                     | Public fallback until supplied                                      |
| --------------------------- | ------------------------------------- | ------------------------------------------------------------------- |
| Approved portrait source    | `[PORTRAIT_ASSET_REQUIRED]`           | Authored abstract builder silhouette with no facial likeness        |
| Contact email               | `[VERIFIED_CONTACT_EMAIL_REQUIRED]`   | Project-brief builder plus verified GitHub contact route            |
| LinkedIn URL                | `[VERIFIED_LINKEDIN_URL_REQUIRED]`    | Omit LinkedIn entirely                                              |
| Boilabin public screenshots | `[BOILABIN_MEDIA_REQUIRED]`           | Original explanatory product-flow diagram; no invented interface    |
| Analytics choice            | `[ANALYTICS_DECISION_REQUIRED]`       | No analytics and no tracking                                        |
| Search Console verification | `[GOOGLE_SITE_VERIFICATION_REQUIRED]` | Omit verification tag                                               |
| Bing verification           | `[BING_SITE_VERIFICATION_REQUIRED]`   | Omit verification tag                                               |
| Production form endpoint    | `[FORM_ENDPOINT_REQUIRED]`            | No network submission; copyable brief and explicit contact fallback |

The token scan in the release checks must fail if any bracketed token appears in generated public
output.
