# Soccer Conquest: England ground locations

Verified 2026-09-07 for Round 511. Research only; no club membership, roster, strength, source code or database changes.

## Result and scope

All 20 existing ENG club IDs have a supported home-ground identity and a stadium-scale geographic anchor. The anchors below use latitude, longitude in decimal degrees, rounded from the first linked coordinate source to four decimal places. They are suitable for a national territory map. They are not surveyed pitch centers, navigational destinations or evidence of real club territory.

Verification followed the data guardian skill: an official club or venue source establishes the ground and its location; the independent geographic sources corroborate the location. The two published coordinate pairs were also compared numerically. Their largest separation is 76.4 metres (MUN), before rounding. Treat the precision as approximately 100 metres, not the number of decimal places displayed by a provider.

The current [Premier League introductory directory](https://www.premierleague.com/en/news/4365156/new-to-the-premier-league-heres-all-you-need-to-know) explicitly lists the same 20 clubs as the ENG slice in `src/data/soccerConquest.ts`. The league's [2026/27 fixture announcement](https://www.premierleague.com/en/news/4675508/premier-league-fixture-schedulereleased-for-season-202627) separately identifies Coventry, Hull and Ipswich in the opening fixtures. No current official membership contradiction was found. This audit does not replace the existing two-source season-membership record.

## Map anchors and evidence

"Official" verifies club, ground and the locality shown. "Coordinates" supplies the unrounded primary table value. "Check" is another location publisher's numeric point, detailed in the comparison table below. Wikipedia is used as an independent venue reference, not as an official club source. Mapcarta is an explicitly identified mirror of geographic records; its descriptive prose may incorporate Wikipedia and is not counted as another independent sports-history source.

| ID | Club | Ground | Latitude | Longitude | Official location | Sources |
|---|---|---|---:|---:|---|---|
| ARS | Arsenal | Emirates Stadium | 51.5550 | -0.1083 | Hornsey Road, London N7 7AJ | [Official](https://www.arsenal.com/news/get-to-emirates-stadium-aErsq4S9pmwx), [Coordinates](https://en.wikipedia.org/wiki/Emirates_Stadium), [Check](https://www.latlong.net/place/emirates-stadium-london-uk-31651.html) |
| AVL | Aston Villa | Villa Park | 52.5092 | -1.8847 | Birmingham B6 6HE | [Official](https://www.avfc.co.uk/club/legal/terms-conditions), [Coordinates](https://en.wikipedia.org/wiki/Villa_Park), [Check](https://www.latlong.net/location/uefa-euro-2028-venues-locations-2269) |
| BOU | Bournemouth | Vitality Stadium (Dean Court) | 50.7353 | -1.8383 | Kings Park, Bournemouth BH7 7AF | [Official](https://superstore.afcb.co.uk/pages/visit-us), [Coordinates](https://en.wikipedia.org/wiki/Dean_Court), [Check](https://mapcarta.com/27636532) |
| BRE | Brentford | Gtech Community Stadium | 51.4908 | -0.2886 | Lionel Road South, Brentford | [Official](https://www.brentfordfc.com/en/news/article/supporter-information-brentford-vs-leeds-united-14-12-2025), [Coordinates](https://en.wikipedia.org/wiki/Brentford_Community_Stadium), [Check](https://mapcarta.com/W703196592) |
| BHA | Brighton & Hove Albion | American Express Stadium (Falmer) | 50.8618 | -0.0833 | Village Way, Brighton BN1 9BL | [Official](https://www.brightonandhovealbion.com/contact-us), [Coordinates](https://en.wikipedia.org/wiki/Falmer_Stadium), [Check](https://mapcarta.com/30858394) |
| CHE | Chelsea | Stamford Bridge | 51.4817 | -0.1911 | Fulham Road, London SW6 1HS | [Official](https://hospitality.chelseafc.com/contact-us), [Coordinates](https://en.wikipedia.org/wiki/Stamford_Bridge_(stadium)), [Check](https://www.latlong.net/place/stamford-bridge-london-uk-31913.html) |
| COV | Coventry City | Coventry Building Society Arena | 52.4481 | -1.4956 | Judds Lane, Coventry CV6 6GE | [Official](https://images.gc.coventrycityfcservices.co.uk/6c950d60-5652-11f0-b8df-ed80f5f21ae3.pdf), [Coordinates](https://en.wikipedia.org/wiki/Coventry_Building_Society_Arena), [Check](https://mapcarta.com/W31991381) |
| CRY | Crystal Palace | Selhurst Park | 51.3983 | -0.0856 | Whitehorse Lane, London SE25 6PU | [Official](https://www.cpfc.co.uk/information/guide-visiting-selhurst-park/), [Coordinates](https://en.wikipedia.org/wiki/Selhurst_Park), [Check](https://www.latlong.net/place/selhurst-park-london-uk-31914.html) |
| EVE | Everton | Hill Dickinson Stadium | 53.4251 | -3.0028 | Bramley-Moore Dock, Vauxhall, Liverpool L5 9SR | [Official](https://premium.evertonfc.com/venue-information), [Coordinates](https://en.wikipedia.org/wiki/Hill_Dickinson_Stadium), [Check](https://www.latlong.net/location/uefa-euro-2028-venues-locations-2269) |
| FUL | Fulham | Craven Cottage | 51.4750 | -0.2217 | Stevenage Road, London SW6 6HH | [Official](https://riverside.fulhamfc.com/contact-us), [Coordinates](https://en.wikipedia.org/wiki/Craven_Cottage), [Check](https://mapcarta.com/24922768) |
| HUL | Hull City | MKM Stadium | 53.7461 | -0.3678 | West Park, Hull HU3 6HU | [Official](https://www.wearehullcity.co.uk/getting-to-the-mkm-stadium/), [Coordinates](https://en.wikipedia.org/wiki/MKM_Stadium), [Check](https://mapcarta.com/24922852) |
| IPS | Ipswich Town | Portman Road | 52.0550 | 1.1453 | Portman Road, Ipswich | [Official](https://www.itfc.co.uk/club/policies), [Coordinates](https://en.wikipedia.org/wiki/Portman_Road), [Check](https://mapcarta.com/27637768) |
| LEE | Leeds United | Elland Road | 53.7778 | -1.5722 | Elland Road, Leeds LS11 0ES | [Official](https://www.leedsunited.com/en/terms-and-conditions), [Coordinates](https://en.wikipedia.org/wiki/Elland_Road), [Check](https://www.latlong.net/place/elland-road-leeds-uk-31654.html) |
| LIV | Liverpool | Anfield | 53.4308 | -2.9608 | Anfield Road, Liverpool L4 0TH | [Official](https://stadiumtours.liverpoolfc.com/contactus), [Coordinates](https://en.wikipedia.org/wiki/Anfield), [Check](https://www.latlong.net/place/anfield-liverpool-uk-31652.html) |
| MCI | Manchester City | Etihad Stadium | 53.4831 | -2.2004 | Ashton New Road, Manchester M11 3FF | [Official](https://www.mancity.com/etihad-stadium/visiting-the-etihad-stadium), [Coordinates](https://en.wikipedia.org/wiki/City_of_Manchester_Stadium), [Check](https://www.latlong.net/location/uefa-euro-2028-venues-locations-2269) |
| MUN | Manchester United | Old Trafford | 53.4631 | -2.2914 | Sir Matt Busby Way, Manchester M16 0RA | [Official](https://assets.manutd.com/AssetPicker/images/0/0/20/122/1342105/Access_Statement_24_251722591625011.pdf), [Coordinates](https://en.wikipedia.org/wiki/Old_Trafford), [Check](https://www.latlong.net/place/old-trafford-manchester-uk-31930.html) |
| NEW | Newcastle United | St James' Park | 54.9756 | -1.6217 | Strawberry Place, Newcastle upon Tyne NE1 4ST | [Official](https://www.newcastleunited.com/en/stadium), [Coordinates](https://en.wikipedia.org/wiki/St_James%27_Park), [Check](https://www.latlong.net/location/uefa-euro-2028-venues-locations-2269) |
| NFO | Nottingham Forest | The City Ground | 52.9400 | -1.1328 | Nottingham NG2 5FJ | [Official](https://shop.nottinghamforest.co.uk/pages/terms-conditions), [Coordinates](https://en.wikipedia.org/wiki/City_Ground), [Check](https://mapcarta.com/27637808) |
| SUN | Sunderland | Stadium of Light | 54.9144 | -1.3882 | Sunderland SR5 1SU | [Official](https://help.asksafc.com/hc/en-us/articles/26726656539153-Where-is-the-Stadium-of-Light), [Coordinates](https://en.wikipedia.org/wiki/Stadium_of_Light), [Check](https://www.latlong.net/place/the-stadium-of-light-in-sunderland-home-of-sunderland-a-f-c-34402.html) |
| TOT | Tottenham Hotspur | Tottenham Hotspur Stadium | 51.6044 | -0.0664 | High Road, London N17 | [Official](https://www.tottenhamhotspur.com/the-stadium/visitor-attractions/attractions/), [Coordinates](https://en.wikipedia.org/wiki/Tottenham_Hotspur_Stadium), [Check](https://www.latlong.net/location/uefa-euro-2028-venues-locations-2269) |

## Numeric cross-checks

These are the other published coordinate pairs, not averaged or substituted values. Separation is a derived great-circle distance between the unrounded first coordinate source and this pair. The matching points fall within the same stadium complex. Small differences therefore do not establish a competing city or ground location.

| ID | Check latitude | Check longitude | Separation, metres | Geographic source lineage |
|---|---:|---:|---:|---|
| ARS | 51.554867 | -0.109112 | 56.1 | LatLong |
| AVL | 52.509094 | -1.884859 | 12.3 | LatLong |
| BOU | 50.7352 | -1.83832 | 8.9 | OSM mirror, way 612208694 |
| BRE | 51.49077 | -0.28899 | 27.1 | OSM mirror, way 703196592 |
| BHA | 50.86154 | -0.08371 | 43.6 | OSM mirror, way 28537290 |
| CHE | 51.481834 | -0.19139 | 26.8 | LatLong |
| COV | 52.44812 | -1.49566 | 9.5 | OSM mirror, pitch way 31991381 |
| CRY | 51.398338 | -0.086084 | 36.4 | LatLong |
| EVE | 53.424995 | -3.00286 | 12.3 | LatLong |
| FUL | 51.4749 | -0.22153 | 14.6 | OSM mirror, way 4380344 |
| HUL | 53.74622 | -0.36782 | 12.5 | OSM mirror, way 219432070 |
| IPS | 52.05493 | 1.14529 | 7.8 | OSM mirror, way 117953386 |
| LEE | 53.777782 | -1.573049 | 54.5 | LatLong |
| LIV | 53.430759 | -2.961425 | 40.2 | LatLong |
| MCI | 53.483158 | -2.200519 | 8.7 | LatLong |
| MUN | 53.463493 | -2.292279 | 76.4 | LatLong |
| NEW | 54.975529 | -1.622068 | 25.8 | LatLong |
| NFO | 52.93992 | -1.13293 | 13.4 | OSM mirror, way 24724754 |
| SUN | 54.91449 | -1.388603 | 28.3 | LatLong |
| TOT | 51.604355 | -0.066384 | 5.1 | LatLong |

## Verification limits and traps

- Everton's anchor is Hill Dickinson Stadium at Bramley-Moore Dock, not Goodison Park. Everton's [official naming announcement](https://www.hilldickinsonstadium.com/news/2025/may/16/hill-dickinson-named-as-official-stadium-naming-rights-partner-/) identifies the new home. A further [OSM-backed venue record](https://mapcarta.com/W1367633428) places it at 53.42490, -3.00271, agreeing with the listed anchor. Do not reuse an older generic Premier League stadium file without checking this move.
- Tottenham's anchor is the current stadium opened in 2019. An official search result titled "DIRECTIONS" is dated 2005 and describes White Hart Lane. It was deliberately excluded. The current visitor page gives the High Road location; the coordinate source identifies the 2019 venue.
- Hull's geographic mirror still uses the old "KC Stadium" heading and stale Championship prose. Its aliases, locality and geographic feature match MKM Stadium. Only the location was used; the official Hull guide supplies the current venue name, and the Premier League directory supplies current league membership.
- Coventry has multiple map records. The cross-check uses the OSM football pitch (way 31991381), not the adjacent conference-building/venue point at roughly 52.44846, -1.49744. The official club access statement confirms Judds Lane and CV6 6GE. Some other club terms use a different postcode for the complex, so postcode centroids must not seed this map.
- Brentford's club events contact page lists a Great West Road office address. That office was not used as the ground anchor. The official matchday guide and the geographic stadium record locate the ground at Lionel Road South.
- Ipswich's official terms distinguish the club correspondence postcode IP1 2DA and stadium postcode IP1 1EF. The map anchor comes from the venue's published coordinates, not either postcode centroid. Brighton and Tottenham also publish different administrative and visitor postal addresses within their respective complexes.
- OSM API and Overpass requests could not be completed in this environment (HTTP 406 or timed out). No direct OSM geometry was downloaded or claimed as inspected. Mapcarta's visible coordinate values and named OSM feature IDs are the geographic corroboration where marked "OSM mirror". Because Mapcarta combines OSM, GeoNames, Wikidata and Wikipedia, its upstream numerical lineage cannot be established beyond that visible attribution. The official source plus independent venue source establishes each location; the extra mirror is corroboration, not a second independent Wikipedia citation.
- LatLong publishes its own location pages and warns that its coordinates are not guaranteed. Its stadium points were used only to cross-check the independently published venue coordinates against the official street/locality. No capacity, attendance, ownership, season status or other incidental claims from these location pages were imported.
- This research supplies points only. An England outline, coastline, territory tessellation, distance projection, disjoint islands and London marker overlap still require implementation and visual checks. Club territories must be described as generated game areas, not administrative boundaries or real supporter catchments. Future La Liga, Europe and World presets need their own club-ground verification; these points do not justify placeholder locations for those presets.

