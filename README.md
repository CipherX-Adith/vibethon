# Aetheris — circular materials marketplace

Aetheris is a two-sided exchange for surplus materials and industrial inputs. Sellers describe what they have; buyers request what they need. The discovery map links surplus families to recovery processes, recovered materials, and the industries that may use them. Its central purpose is to uncover useful cross-industry routes that a standard buy/sell catalog would miss.

## Run the prototype

Open `index.html` in a modern browser. The prototype needs no server, account, API key, or network connection.

## Marketplace features

- Search across materials, companies, locations, processes, and industries.
- Filter by offers, buyer requests, material family, industry, region, or saved items; sort by recency, listed quantity, price, and mapped routes.
- Save listings to a browser-local shortlist.
- Add a surplus offer or resource request using the shared material catalog. Common aliases in the description can resolve an “Other” entry to a known family.
- Open any listing in the discovery map to see the associated pathway.

New entries and saved items stay in this browser's local storage. The prototype does not publish listings, contact counterparties, arrange delivery, or process transactions.

## Discovery map

The main graph has four linked stages: **surplus stream → recovery process → recovered material → buyer industry**. Select a route, node, or edge to inspect its process hypothesis, related marketplace activity, and qualification checklist. Use the route filters, text search, zoom controls, and pathway list to explore different parts of the network.

Eight illustrative routes are represented:

1. Sulfur-bearing mine or smelter residue → sulfate purification → battery-material feedstock.
2. Rice husks → pyrolysis and activation → filtration media for water treatment.
3. Rice husks → controlled pyrolysis → potential soil amendment.
4. Food-processing organics → anaerobic digestion → biogas for local energy.
5. Food-processing organics → digestion and digestate treatment → a potential farm nutrient input.
6. Textile offcuts → fiber recovery and panelization → insulation products.
7. Spent catalyst → metal recovery → nickel/cobalt intermediates.
8. Construction rubble → sorting and grading → recycled aggregate for approved uses.

These are discovery hypotheses. The map does not claim that a specific feedstock will meet a buyer's specification or that a processor is available. Route cards explain the checks that matter, including composition, contamination, yield, safety, permits, engineering approval, and product qualification.

### Farm-cycle view

The agriculture view traces food and crop residues through source separation and anaerobic digestion. Biogas may serve farm or greenhouse energy needs; a separate digestate stream must be treated, lab-tested, and approved before any site-specific soil application. Crops may create new residues that re-enter collection. The map flags feedstock quality, operator and equipment needs, safety, and agronomic review as conditions in the loop.

## How matching works

1. Resolve seller and buyer descriptions to shared material families and extract a small set of stated attributes.
2. Traverse the local directed graph from a surplus family through a mapped conversion to a product family and industry.
3. Pair compatible offers and requests. Direct family matches are distinct from routes that require processing.
4. Compare listed attributes, region text, quantities, and prices only when the values are comparable. Conversion yield and processing costs are unknown, so source and output tonnage or prices are not treated as equivalent.
5. Show qualification steps and missing information for a human to review.

This is a transparent rules-based prototype, not a live AI service or a predictive model. Its seeded companies, quantities, prices, regions, and listings are synthetic examples. It has no live supplier database, verified specifications, processor capacity, logistics or emissions integrations, or independent certification data.

## SaaS direction

A production service could add organization workspaces, verified company and material profiles, private sourcing requests, processor capacity, logistics estimates, audit trails, and opt-in match alerts. The map could then be grounded in verified process data and region-specific supply chains. Those capabilities require a shared backend, user permissions, data governance, and expert review; they are not implemented by this local prototype.
