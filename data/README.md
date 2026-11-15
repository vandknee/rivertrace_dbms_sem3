# Data sources and limits

This pilot contains **18 CPCB stations, 31 annual records (2022 and 2023), and 612 HydroRIVERS reaches**. No water-quality values have been invented. It is a small historical pilot, not all of the Ganga basin.

## Water-quality records

Source: Central Pollution Control Board, National Water Quality Monitoring Programme.

- 2023: https://cpcb.nic.in/wqm/2023/WQuality_River-Data-2023.pdf
- 2022: https://cpcb.nic.in/wqm/2022/WQuality_River-Data-2022.pdf
- Retrieved 11 November 2026.
- Locate rows by the CPCB station code, not the shortened display name. Ganga and its Himalayan tributaries are in the Ganga tables; Hamirpur and Balua Ghat are in the Yamuna table.
- `records.csv` holds DO min/max, BOD min/max, pH min/max and faecal coliform min/max. DO and BOD use mg/L; coliform uses MPN/100 mL; pH is unitless.
- These are annual extremes, NOT individual samples or annual averages. The two extremes of different parameters may have occurred on different dates. Do not give an annual record a made-up sampling date.
- Station names shown are short labels based on the 2023 report. Always check the original row description before using a two-year comparison for scientific work; code continuity does not guarantee an unchanged sampling point.
- Station 5451 (Kedarnath) and 5452 (Badrinath) have no imported 2022 row. Their 2022 display correctly says “No data”.
- 2022 stations 1491 and 1489 report BDL for BOD and coliform. BDL means below detection limit, not zero. Those pairs are left blank because no numeric detection limit is supplied here.
- 2022 station 2283 has no coliform figures in the source; that pair is blank.
- Internally a missing pair is represented by -1. The API returns null; the website shows a dash. Negative values must not be entered into the CSV.
- The source's strict printed criteria are used: DO > 5, BOD < 3, pH 6.5–8.5 inclusive, FC < 2500. Consequently an exact boundary such as BOD=3 is flagged for review, even with a zero contribution to the exceedance score. This is explained in the interface.
- A station can be flagged even when another parameter is missing. “Within limits” requires all four parameter pairs. It is not a declaration of drinking-water or bathing safety.

## River network

Source: HydroRIVERS version 1.0, Asia shapefile.

https://www.hydrosheds.org/products/hydrorivers
https://data.hydrosheds.org/file/HydroRIVERS/HydroRIVERS_v10_as_shp.zip

- `segments.csv`: original HYRIV_ID, NEXT_DOWN within the subset, midpoint longitude/latitude and original LENGTH_KM.
- `network.geojson`: original reach geometry, HYRIV_ID and original NEXT_DOWN. Geometry is drawn by the frontend; C++ runs the traversal on IDs and adjacency lists.
- Paths were followed using actual NEXT_DOWN links from selected upper-river and Yamuna locations to the Ganga–Gomti confluence. Unselected lateral tributaries are not included.
- The last included reach, 40941978, has next=0 in the runtime CSV only because the pilot ends just after the Gomti confluence. The unchanged original downstream ID remains in GeoJSON. This is NOT the Ganga's sea outlet.
- The display's distance scaling is an approximate planar view, not a survey map. Length is included as source metadata but no travel-time or shortest-distance result is calculated.

## Station mapping: an explicit approximation

The CPCB tables used here do not supply surveyed coordinates. `station_mapping.csv` lists approximate locality anchors chosen for this educational pilot. They are NOT official station coordinates. Most stations were matched to nearby HydroRIVERS reaches with sufficient flow to avoid small side streams. Approximate matching distances are listed, not accuracy estimates.

Two confluence stations were adjusted to the first shared downstream reach to preserve their “after confluence” meaning:

- Devprayag (1489): 40679412, shared downstream of Bhagirathi and Alaknanda/Mandakini paths.
- Sangam (1049): 40948597, shared downstream of the Ganga and Yamuna paths.

Their distance fields are intentionally blank because they were selected by topology rather than nearest distance. The mapping needs official coordinates and field validation before scientific or operational use. Reach-level association cannot resolve order within a single reach.

`rivers.csv` is a manually curated partial river hierarchy: Ganga contains Bhagirathi, Alaknanda and Yamuna; Alaknanda contains Mandakini. Bhagirathi and Alaknanda are headstreams, represented as children for the project. This name tree is not a HydroRIVERS attribute and is not used to invent graph connections.

## Trace interpretation

Upstream traversal finds connected reaches. An upstream station is a candidate for further investigation only if its selected-year range is flagged. It does NOT identify a factory, prove causation, model dilution or establish that readings occurred at the same time. Downstream results are connected locations, not confirmed polluted locations. Unmonitored and omitted branches can contain other sources.

## Files and attribution

Keep `licenses/` with this data when redistributing the project. It contains the original HydroSHEDS terms and required attribution. The project-specific CSV and GeoJSON subset does not replace those source terms. See `licenses/ATTRIBUTION.txt`.

To add data, keep the CSV headers and column order. The loader checks numeric values, duplicate IDs, duplicate station/year pairs, missing references and min/max order. Restart the server after editing a CSV. GeoJSON must be updated alongside segment geometry if you change the network.

## Betwa extension

The Betwa branch runs from the approximate Orchha locality (78.64 E, 25.35 N) to the existing Yamuna network near Hamirpur. 60 original HydroRIVERS reaches were added, following NEXT_DOWN without invented edges. The first shared existing reach is 40918774. Betwa is a child of Yamuna in rivers.csv. This is a partial Betwa stretch, not the entire river.

CPCB station 1356 is Betwa before its Yamuna confluence at Hamirpur. Its 2023 row supplies DO 5.4–7.6, BOD 2.2–3.1, pH 7.2–7.9 and faecal coliform 7800–9300. No 2022 record was imported for this station. Its locality anchor (80.19 E, 25.94 N) is approximate, not an official surveyed coordinate; it was matched only against the Betwa branch before the confluence.

River context: https://www.mppcb.mp.gov.in/proc/Action_Plan-Rejuvenation_of_River_Betwa-2019.pdf

## Gomti extension

A partial Gomti main channel from Lucknow (approximate anchor 80.91 E, 26.88 N) joins the extended Ganga via original HydroRIVERS NEXT_DOWN links. Added 79 reaches, including the Ganga extension. The first shared downstream reach is 40941978, the new runtime outlet. The previous Varanasi cutoff now continues downstream. Betwa is retained.

CPCB 2023 stations 1353 (Jaunpur downstream, Gomti) and 10152 (Bhusaula after Gomti, Ganga) are included. No 2022 rows were imported for these additions. Jaunpur uses an approximate locality anchor (82.69 E, 25.75 N), restricted to the Gomti branch. Station 10152 is represented at the first shared downstream reach by topology, not surveyed coordinates; its anchor and distance are blank. This approximation does not locate the exact sampling site. Values are from the same CPCB 2023 source above.
