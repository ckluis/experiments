# Lines of code, the three F# rewrites, one rule

Counted 2026-10-30 for [the rewrites page](../index.html), at the exact commits the six-ways benchmark measured.

**Rule.** Upstream's (Basecamp's `once-campfire-verification`, `docs/performance-review.md`): cloc 2.10 `--by-file
--skip-uniqueness` over the backend's handwritten source (`git ls-files 'src/**/*.fs'`), static data tables left out.
The script is theDotNetWay's `bin/kloc` with two changes so all three are counted the same way:

1. `src/Campfire.Assets.Build/` (a build-time tool in the port and onCrack, as Rust's `build.rs` sits outside its
   crates) is left out, as onCrack's own count leaves it out.
2. `ContentDispositionApproximations.fs` (195 lines of static data) is left out under both of its paths
   (`Campfire.RailsCompat/` in the port and onCrack, `Campfire.Rails/` in theDotNetWay).

**Columns.** "cloc" is the tool's own output. "corrected" is the same tool on a copy with `(*` rewritten to `(_`: cloc
2.10 reads `(*` as an F# block comment wherever it appears (`COUNT(*)` included) and drops every line up to the next
`*)`. The rewrites page uses "corrected" for all three.

| Rewrite | Commit | cloc | **corrected** |
|---|---|---:|---:|
| F# port | `9954ad0` | 37,985 (38.0) | **39,234 (39.2 KLOC)** |
| onCrack | `3770dff` | 41,703 (41.7) | **43,001 (43.0 KLOC)** |
| theDotNetWay | `75487b7` | 26,017 (26.0) | **26,464 (26.5 KLOC)** |

The "cloc" column reproduces each project's own published count once item 2 is put back: onCrack published 41.9
and the port 38.2, both with the 195 lines in (41.7 and 38.0 without them); theDotNetWay published 26.0 and 26.5.

Rails (5.5, `0aa339d`), Rust (31.0, `f9dca47`) and C (94.9, `cd0cbe4`) are onCrack's count of upstream's code under
the same rule:
[`bench/results/oncrack-r5-final/kloc/kloc-table.md`](https://github.com/ckluis/once-campfire-fSharp-onCrack/blob/fd5f3c41fad99ee2256a811cd4147eead13add4d/bench/results/oncrack-r5-final/kloc/kloc-table.md).
Basecamp's own table gives Rust 30.7 (`6838ead`) and C 94.8 (`ddaafaf`).

## Output, per project

```
== port 9954ad0
| Project | cloc | corrected |
|---|---:|---:|
| Campfire.App | 9,705 | 9,820 |
| Campfire.Assets | 429 | 429 |
| Campfire.Cable | 1,603 | 1,603 |
| Campfire.Db | 2,232 | 3,307 |
| Campfire.Kit | 8,341 | 8,341 |
| Campfire.RailsCompat | 1,271 | 1,271 |
| Campfire.RichText | 6,191 | 6,191 |
| Campfire.Routes | 82 | 82 |
| Campfire.Ruby | 631 | 631 |
| Campfire.Storage | 1,755 | 1,767 |
| Campfire.Views | 5,745 | 5,792 |
| **Total** | **37,985 (38.0 KLOC)** | **39,234 (39.2 KLOC)** |

Static data left out: 4,490 lines (corrected 4,793). Rust f9dca47: 31.0 KLOC. Rails 0aa339d: 5.5.
== oncrack 3770dff
| Project | cloc | corrected |
|---|---:|---:|
| Campfire.App | 10,404 | 10,519 |
| Campfire.Assets | 429 | 429 |
| Campfire.Cable | 3,003 | 3,003 |
| Campfire.Db | 3,283 | 4,407 |
| Campfire.Kit | 8,882 | 8,882 |
| Campfire.RailsCompat | 1,289 | 1,289 |
| Campfire.RichText | 6,191 | 6,191 |
| Campfire.Routes | 82 | 82 |
| Campfire.Ruby | 631 | 631 |
| Campfire.Storage | 1,764 | 1,776 |
| Campfire.Views | 5,745 | 5,792 |
| **Total** | **41,703 (41.7 KLOC)** | **43,001 (43.0 KLOC)** |

Static data left out: 4,490 lines (corrected 4,793). Rust f9dca47: 31.0 KLOC. Rails 0aa339d: 5.5.
== dnw 75487b75
| Project | cloc | corrected |
|---|---:|---:|
| Campfire.App | 12,077 | 12,474 |
| Campfire.Cable | 1,051 | 1,051 |
| Campfire.Db | 2,429 | 2,467 |
| Campfire.Rails | 1,533 | 1,533 |
| Campfire.RichText | 2,268 | 2,268 |
| Campfire.Storage | 1,440 | 1,452 |
| Campfire.Views | 5,219 | 5,219 |
| **Total** | **26,017 (26.0 KLOC)** | **26,464 (26.5 KLOC)** |

Static data left out: 4,512 lines (corrected 4,815). Rust f9dca47: 31.0 KLOC. Rails 0aa339d: 5.5.
```
