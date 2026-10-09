# Search setup, October 9

The owner reported a drop for their exact name and supplied a Google results
screenshot. This audit does not establish when the drop began or its cause.

The live HTTP audit is saved outside Git at
`D:/Portfolio Evidence/current-20261009/seo-live-before.json`.
HTTP and HTTPS, with and without www, resolve to the HTTPS www homepage.
That page returns 200, a self-canonical link, index/follow, a server-rendered H1,
and structured data. Both sitemap files and robots.txt return 200; a nonexistent
page returns 404. The sitemap lists 21 canonical pages.

Two maintenance defects were found:

- `SITE.origin` used the non-www host, while Astro, canonicals, the sitemap and
  hosting use www. This made schema, RSS and the robots sitemap declaration
  point through redirects. Align the origin with the existing canonical host.
- The Google verification tag from the March 30 indexing commit (`0a8a7d5`)
  was missing. Search Console under the owner's selected main account supplies
  exactly the same tag for the existing URL-prefix property. Restore that tag
  in the common page head to recover the existing verification setup.

Neither defect proves the reported ranking loss. Missing ownership verification
prevents access to diagnostic reports; it is not itself a noindex directive.
Do not promise a ranking position or recrawl deadline. After verification, inspect
the Performance and URL Inspection reports before drawing a conclusion.

Google's diagnostic guidance:
https://developers.google.com/search/docs/monitor-debug/debugging-search-traffic-drops
and canonical guidance:
https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls

## Search Console findings

The owner's selected main account now has verified URL-prefix properties for both
HTTPS hosts. The new www property automatically verified using the restored HTML
tag. The domain property still needs DNS verification. Do not treat the non-www
property's 269 excluded / zero indexed pages as the status of the www site.

URL Inspection confirms the www homepage is indexed. The last recorded crawl was
September 19, 2026 at 07:46:05, Googlebot smartphone; fetching, crawling and indexing
were allowed. Google selected the same www canonical. No referring sitemap was
recorded. Manual Actions and Security Issues both report no issues detected.

Submitted `https://www.mdanikhasan.com/sitemap-index.xml` on October 9. Google
accepted the submission but initially reported "Couldn't fetch" / "Sitemap could
not be read". Independent HTTP fetch returns 200 and valid sitemap-index XML;
robots.txt allows crawling and names that exact sitemap. Submission alone is not
successful processing. Recheck the report and inspect the child sitemap before
claiming this resolved. Performance/indexing reports for the new property are
processing and do not yet establish why the owner lost ranking.

The old non-www report includes 100 404 examples, with sampled random four-letter
paths crawled in May. Those are not current portfolio routes. Do not redirect all
missing URLs to the homepage or mark them fixed without identifying an equivalent
page. Other reported exclusions: 24 duplicate without canonical, three alternate
with canonical, two redirects, 136 crawled-not-indexed, four discovered-not-indexed.

X, YouTube and TikTok are already connected in Search Console. Their displayed
handles are `@mdanikhasan_me`, `@mdanikhasan_me`, and `@mdanikhasan.me` respectively.
Instagram's signed-in page identifies `mdanikhasan_me`. The connection requests
basic profile information, then opens an Instagram flow with forced authentication;
the separate logged-in homepage does not skip that login. Fresh sign-in is pending
with the owner. Do not claim the Instagram Search Console property is connected.

## Website identity

Use one canonical Person ID (`https://www.mdanikhasan.com/#person`) for the profile,
article authors, software authors, and service provider. The shared footer and
Person sameAs now draw from the same seven public social profiles. This preserves
the site's words and ANIK lettering. Linking profiles is identity information, not
a promise of a knowledge panel or higher ranking.

## Search targets and how to measure them

These are initial relevance targets, not researched search-volume claims. Keep one
useful page per real topic; do not generate near-duplicate city/keyword pages.

| Priority | Queries to monitor | Existing destination | Evidence to develop |
| --- | --- | --- | --- |
| 1 | MD Anik Hasan, Anik Hasan developer, mdanikhasan | Home and About | Consistent public name, verified profile links, real projects |
| 2 | website developer Bangladesh, freelance web developer Dhaka | Website development service | Working examples, scope, implementation and contact route |
| 2 | custom software developer Bangladesh | Custom software service | Actual delivered tools and explained problems solved |
| 3 | Windows desktop app developer, local AI desktop application | Native Windows service | Salty Steak screenshots, technical decisions and honest work-in-progress status |
| 3 | Boilabin, SoctuKit, UIU Discord Bot | Individual project pages | Unique case studies and links to the actual product/source |
| 4 | university notice Discord bot, training a language model from scratch | Existing writing | First-hand implementation detail, examples, limitations and updates |

Once the www report is ready, compare 28 days with the preceding 28: clicks,
impressions, CTR and position by query and page, separating exact-name searches
from service/topic searches and checking country/device. Use that data to choose
the next content improvement. Rank changes and indexing require later observation.

Google reference for profile markup:
https://developers.google.com/search/docs/appearance/structured-data/profile-page
