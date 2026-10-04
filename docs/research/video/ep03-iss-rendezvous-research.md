# Ep03: How does a crew spacecraft catch up with the ISS in under 8 hours?

Researched 2026-10-05. Audience: curious adults. Full structured data: `video-pipeline/episodes/ep03-iss-rendezvous/research.json`.

## News hook: VERIFIED (with a correction)

- Mission: NASA's SpaceX Crew-13, Crew Dragon "Grace" on Falcon 9 (the "Grace" name appears in ClickOrlando; NASA pages I opened did not state it).
- Launch: 11:10 a.m. EDT, Thu Oct 1 2026, Space Launch Complex 40, Cape Canaveral.
- Docking: 7:05 p.m. EDT, Harmony module forward port, autonomous. Elapsed: 7 h 55 min. Hatch opening planned ~8:45 p.m.
- Crew: Jessica Watkins (commander), Luke Delaney (pilot), Joshua Kutryk (CSA), Sergey Teteryatnikov (Roscosmos).
- "Fastest": NASA's own blog says "fastest launch-to-docking of a U.S. spacecraft in the history of the International Space Station" (https://www.nasa.gov/blogs/spacestation/2026/10/01/dragon-docks-bringing-spacex-crew-13-to-station/). It is NOT the fastest ever: Soyuz MS-17 (Oct 2020) took about 3 hours (two orbits). Say "fastest American trip".
- Previous US record 12 h 33 min (uncrewed Dragon CRS-31, Nov 2024): seen in Interesting Engineering (opened), not on a NASA page I opened.
- Pre-launch plan said 7 h 50 min; actual 7 h 55 min.

## Corrections to your brief

1. "Fastest" must be "fastest by a U.S. spacecraft".
2. "Older ~1-2 day profile": that is old Soyuz (34 orbits, ~2 days, pre-2013), then 6 h (4 orbits), then ~3 h (2 orbits). Crew Dragon's Demo-2 took ~19 h. Dragon was never 2 days. "Typical 15-24 h" is from a Space.com snippet I could not open.
3. "Speed ~7.7 km/s, 92-93 min": correct (Wikipedia 7.67 km/s, 92.9 min; my calc 7.66 km/s, 92.7 min at 408 km). NASA's own pages round to 5 mi/s and "about 90 minutes".
4. "Lower orbit is faster; speeding up raises your orbit": correct, but be careful in the wording. A burn adds speed for a moment, which lifts you to a higher orbit where your average speed is lower. Phrase it as "speed up -> end up higher and slower".
5. "Fewer phasing orbits, earlier burns, precomputed targets": fewer orbits is verified (Soyuz history, Crew-13 ~8 h phasing). "Earlier burns" and "precomputed targets" are plausible but NO opened source states them for Crew-13. Treat as unverified. What is verified: Soyuz sent its post-insertion position to Moscow to confirm the ultrafast profile was still possible, and a slightly off insertion or missed burn could cancel it.
6. What drove the Crew-13 speed: NASA's Dragon program lead said the station was in an "opportune spot in space" (opened). The Space.com quote "we got lucky" is only from a search snippet.

## Mechanism chain (9 steps)

1. Orbiting is falling sideways: ~7.7 km/s at ~400 km, lap ~92-93 min. (verified)
2. You cannot just chase it: speeding up raises you to a higher, slower orbit. (verified)
3. Drop lower to go faster: lower circular orbits are faster and shorter-lap. Illustrative numbers (derived): 408 km = 7.66 km/s, 92.7 min; 308 km = 7.72 km/s, 90.7 min. (verified, derived)
4. Phasing: the gap is an angle; each lap in the lower orbit gains an angle. At 100 km lower: ~122 s and ~7.9 degrees per lap (derived, illustrative). (verified)
5. Launch at the right moment: station's orbital plane passes over the launch site; station is the right distance ahead. (verified from Interesting Engineering and Wikipedia Orbital rendezvous: same plane and same phase)
6. Fewer laps: 34 orbits (~2 days), 4 orbits (6 h), 2 orbits (~3 h), Crew-13 ~8 h phasing. (verified; Crew-13 orbit/burn count unverified)
7. Raise up and slow in: a burn lifts the orbit back to the station's height, settling a few km behind. (UNVERIFIED for Crew-13; standard theory only)
8. Approach with checkpoints: hold points, go/no-go, final approach few cm/s. (verified in general; no Crew-13 distances)
9. Self-docking and latching: soft capture, hooks, leak checks, hatch. Crew-13 hatch ~1 h 45 min after docking. (verified)

Visual ideas are in research.json.

## Sources actually opened

- NASA: docking blog; liftoff blog; reaches-orbit blog (phasing "just under 8 hours"); launch release; launch/docking coverage release; approaching-station blog; Space Station facts and figures; ISS FAQ.
- NASASpaceflight Soyuz MS-17: https://www.nasaspaceflight.com/2020/10/soyuz-ms17-ultrafast-journey-to-iss/
- Wikipedia: Orbital rendezvous, Orbit phasing, ISS, Crew Dragon Demo-2.
- Interesting Engineering, ClickOrlando, Sentinel Mission explainer.

## Could not open or unusable

Space.com articles (three, navigation text only), spacex.com/launches/crew13 (no content), pressbooks orbital mechanics chapter (403), braeunig.us (certificate error), two NTRS PDFs (unreadable). Not cited as verified.

## Where I am least sure

- Whether Crew-13 used a new procedure or the same procedure with luckier geometry. Only a "favorable geometry" quote is confirmed.
- The exact orbit and burn count for Crew-13, the phasing orbit altitude, and Dragon hold-point distances: nothing opened states them.
- "Raise up and slow in" step 7 and "burns computed in advance" are standard theory, not confirmed for this flight.
- The 12 h 33 min prior record and the 15-24 h typical Dragon duration come from secondary outlets or snippets.
- Port naming differs across sources (forward vs space-facing).

## The clearest explanation for a smart friend (6 lines)

1. The station moves at about 7.7 km/s and goes around Earth every 92-93 minutes, so you cannot chase it in a straight line.
2. If you fire your engine to speed up, you rise into a higher orbit and actually fall behind.
3. So you do the opposite: drop to a slightly lower orbit, where you go faster and your lap is shorter.
4. Each lap you gain a few degrees on the station, like the inside lane of a track.
5. Launch time matters: the station's path must pass over the pad and the station must be just the right distance ahead, so fewer laps are needed. Crew-13 got a lucky setup and used about 8 hours of this.
6. Then you climb back up, creep in at centimetres per second through checkpoints, and Dragon docks itself.
