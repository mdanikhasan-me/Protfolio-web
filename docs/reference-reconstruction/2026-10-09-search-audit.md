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
