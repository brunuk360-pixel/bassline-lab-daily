# SUBLEVEL — development handover and living roadmap
Last verified: 27 November 2026, UK time. This file is the project handover, not a claim that all listed features are complete.

## Start a new chat here
Ask ChatGPT: "Resume SUBLEVEL development. Read sublevel/DEVELOPMENT.md in brunuk360-pixel/bassline-lab-daily on GitHub main. Verify the current live deployment, review the next unfinished task, and continue the agreed roadmap. Update the handover after each development pass."
The GitHub copy is authoritative; downloaded copies may become stale. If GitHub is not connected in a new chat, connect it and Render before changing the project. Do not rebuild from scratch.

## Product and design direction
SUBLEVEL is an independent underground electronic music discovery publication, not Bassline Lab, Bassline Inspect, CRATE or Chrome Requiem. The user delegates development leadership and wants a polished, mobile-first, editorial product, with a clear homepage hierarchy, coherent typography, compact navigation and real music research. Use dark charcoal, teal accents, geometric typography, atmospheric photography, genuine release art and distinct section headings. Keep the selected magazine masthead concept 4: compact ivory editorial strip, dark lettering, angled photographic edge. Avoid giant banners, repeated photos, producer initials masquerading as artwork, blank cover boxes, or generic feature grids. Prioritize professional design and working features over feature count. User uses a Samsung S25 Ultra; test narrow mobile layouts and desktop. Preserve existing saved record IDs and user data. User wants daily fresh releases across electronic genres, linked listening sources, and original editorial research. No fabricated facts, release dates, audio-analysis claims, artwork or community activity.

## Project infrastructure
- GitHub repository: brunuk360-pixel/bassline-lab-daily, branch main. Changes scoped to sublevel/; unrelated projects share the repo.
- Main live site: https://crate-music.onrender.com/
- Render workspace: tea-dc4ermff3r2c73b5r4rg; static service: srv-dc4qeo8u01pc73f12vqg.
- Main build: python3 sublevel/build.py; publish directory crate-public; auto-deploy OFF. Manually trigger deployment after functional edits, check deploy status and logs before claiming live.
- Original site is reconstructed from CRATE_SITE_* Render environment chunks; do not read or alter these values or overwrite the original with a saved HTML screenshot. Build injects scoped JS/CSS and data. Original account/community functions are not confirmed server-backed.
- Last verified main deployment: dep-dc50s0cipgvc73eggprg, commit 921b68c6b92cef1136a27b358e48caae62aff22e, live 23:11:50 UK time on 27 Nov 2026. Recommendation and listening state regression tests passed; 56 releases, 10 artist profiles, 7 relationships, 5 label catalogues, 15/56 covers in that build. Full live browser/mobile end-to-end test remains outstanding.
- Daily Dig automation ID 6b0a02c5a8d88191a565fb632dc108fe. Intended to append ten verified recent releases per day, deduplicate, preserve IDs and deploy. Verify actual execution rather than assuming daily updates worked. Do not create duplicate automation.

## Roadmap — current status
[x] Stage 1: Homepage contents index and numbered editorial departments implemented; local markup test previously reported, live mobile QA still pending.
[x] Stage 2: Shared design refinement across homepage, Explore, magazine and track details implemented. Verify user-selected compact masthead on actual phone; style patches may conflict.
[~] Stage 3: Artwork pipeline and crops improved, source captions and text-only fallback implemented. Coverage varies by build (last 15/56); needs persistent verified artwork manifest/cache, correct identities, distinct imagery and fuller coverage.
[~] Stage 4: Music Intelligence: 13 researched dossiers implemented, source-linked facts, timeline, chart journey, listening notes, sample/remix origins and artist profiles. Extend across more records; do not imply every release has a full dossier.
[x] Stage 5: Advanced Discovery implemented: explainable related records, local personalized recommendations, bidirectional Sample Detective, artist networks and label browsing. Regression tests passed; actual UI QA pending.
[x] Stage 6: Listening Room: persistent queue, play-next, reorder, remove, shuffle, resume, playlists, collection export/import and service links. Regression tests passed; audio playback is external, not in-app streaming.
[~] Stage 7: Unsigned producer community — CURRENT TASK. Server code and hosting plan prepared; NOT deployed or end-to-end tested. See exact next action below.
[ ] Stage 8: Personal library refinement: unify saved music with original site's Saved section, improve playlist UX, recently explored, recommendations, export/import preservation; real account sync only with secure backend and user consent.
[ ] Stage 9: Content operations: verify daily automation, reliable release metadata and source/art coverage; expand research and sample relationships, avoid duplicates; magazine issue freshness and article visuals.
[ ] Stage 10: Quality and launch: real mobile/desktop browser tests, navigation/back behavior, account/data flows, accessibility, contrast, performance, source links, broken images, legal/privacy/moderation review, security review and regression tests. Iterate on actual screenshots. Do not call it finished just because a deployment is live.

## Exact next task: Unsigned beta
The user approved development of Unsigned, but has NOT yet approved applying the reviewed infrastructure plan.
- Blueprint ID exs-dc512pei0phs73bvsj00, sync exe-dc512pmi0phs73bvsjhg; planned, no resources created. Review: https://dashboard.render.com/blueprint/exs-dc512pei0phs73bvsj00/sync/exe-dc512pmi0phs73bvsjhg
- Blueprint file sublevel/unsigned/render.yaml; current planned commit 8b5e2330c2fb32d9983009c6b7293e9ffa03621b. Creates a separate free Frankfurt web service and free PostgreSQL database, not adopting existing services. Free DB expires after 30 days; service may sleep. No paid services without separate explicit approval.
- Await explicit user approval of this reviewed plan before calling Render approve_blueprint. If approved, verify plan remains current, apply it, inspect resulting service/database IDs, URLs, logs, health check and build test results. If failed, diagnose and fix; never claim deployment succeeded until confirmed.
- Source: sublevel/unsigned/app.py, schema.sql, requirements.txt, templates/page.html, static/community.css, test_community.py, render.yaml, README.md.
- Implemented: separate invite-only accounts, scrypt password hashing, CSRF and secure cookies, profile bio, public music links (SoundCloud/Bandcamp/YouTube), moderation of submissions and feedback, 1–19 ratings, one rating per member/track, no self-ratings, weighted producer ranking with minimum five approved ratings, reports and account deletion. No fake users or votes. These are code-level implementations, not verified production behavior.
- Required verification: two consenting test accounts; registration/sign-in/sign-out, submission visibility before/after approval, rating/edit/self-vote prevention, moderation and ranking thresholds, authorization boundaries, invalid links, CSRF, data persistence, account deletion. Do not create fake public activity. Generated INVITE_CODE, ADMIN_CODE and SECRET_KEY stay in Render; owner retrieves invite/admin codes privately in dashboard, never commit or expose secrets. No email/password recovery, audio upload, strong anti-Sybil checks, independent audit or legal review yet. Public beta not production-ready.
- Only after successful end-to-end verification, add clear entry from main site, distinguish new community account from old local account. Add proper privacy/terms, abuse controls, durable DB plan and backups before public launch.

## Source map
sublevel/build.py assembles the actual static site. edition-navigation.js/.css: homepage contents, masthead and final visual refinements. coherence.css, record-feature.css, section_photos.py: visual system and photography. magazine.js/.css, magazine_images.py, editorial.js/.css: magazine reader and article enhancements. track-dossier.js/.css and research-edition.js/.css: original track details and shared dossier renderer. discovery-data.json: records/profiles/events/research/relationships/label catalogues; discovery_assets.py: artwork lookup. discovery.js/.css: discovery UI, saved collections, artist/label connections, listening room. listening-state.js, listening-test.cjs, discovery-test.cjs: state helpers and regression tests. sublevel/unsigned/: separate community service.

## Working protocol for all future chats
1. Read this file and latest relevant source, not only chat memory. Verify current deployment and outstanding decisions using GitHub and Render tools. Record any differences from the handover.
2. Pick the next unfinished priority; tell user the proposed scope and ask for approval for each major stage as agreed. User generally authorizes design decisions within approved stage. Never request information already provided. Hosting, charges, account changes and infrastructure-plan approval require explicit authorization where applicable.
3. Implement real changes in existing project, fetch latest blob SHA before updates, preserve old features/data, test before deploy when possible. Use source-backed content and distinguish editorial observations from measured audio analysis.
4. Commit scoped changes; deploy functional updates to the correct service. Check actual deployment status and build logs. Separate build verification from real browser/end-to-end verification, and disclose failures/blockers. Give the live URL with cache-busting version when useful.
5. Update this handover after EVERY meaningful development pass: last verified commit/deployment, tests, limitations, roadmap status, exact next action and approvals. Keep the GitHub copy current; do not rely solely on conversational memory. Avoid unnecessary deployment for documentation-only updates.
6. Never promise unperformed work or background development. Scheduled content updates are separate from development approvals.

## Change log
- 27 Nov 2026: Listening Edition confirmed live with queue and recommendation tests. Unsigned server-backed beta code committed; separate free Render Blueprint planned, awaiting approval. Handover established.
