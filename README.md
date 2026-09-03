# NER Route Guardian

Build a production-quality, SIH-ready full-stack web application for:



SIH26002 — AI-Based Smart Freight Movement Optimization for the North Eastern Region (NER)



Organization: Ministry of Development of North Eastern Region (MDoNER), Government of India

Category: Software

Theme: Smart Automation



PROJECT NAME:

NER-Route AI



CORE OBJECTIVE:

Create an intelligent freight-movement optimization platform for India's North Eastern Region covering:

Arunachal Pradesh, Assam, Manipur, Meghalaya, Mizoram, Nagaland, Sikkim and Tripura.



The platform should help logistics operators, government authorities and decision-makers choose safer, more reliable and cost-efficient freight routes despite difficult terrain, landslides, floods, rainfall, road closures, connectivity problems and other disruptions.



IMPORTANT:

This is an SIH prototype. Prioritize demonstrable functionality over decorative features.

Do NOT create a generic logistics dashboard.

Do NOT claim that fake/demo data is real-time.

Clearly label simulated data as "DEMO / SIMULATED DATA".

Build the application so real APIs can be connected later.



TECH STACK:

- React

- TypeScript

- Vite

- Tailwind CSS

- shadcn/ui

- Supabase for database/authentication

- MapLibre GL JS or Leaflet for maps

- Recharts for analytics

- Clean modular architecture

- Responsive desktop/tablet/mobile design



DESIGN:

Create a professional government/enterprise-grade interface.

Use a clean modern GIS dashboard aesthetic.

Strong information hierarchy.

Readable maps and charts.

Do not overuse gradients, animations or unnecessary cards.

Make it look like a serious operational platform, not a startup landing page.



MAIN NAVIGATION:



1. Dashboard

2. Smart Route Planner

3. Live GIS Map

4. Freight Management

5. Disaster & Risk

6. Road Incidents

7. Accessibility

8. Alerts

9. Analytics

10. Reports

11. Admin



DASHBOARD:

Show:

- Active shipments

- Shipments at risk

- Road closures

- High-risk corridors

- Average estimated delay

- Freight cost indicators

- Current regional risk level

- Recent alerts

- Active routes

- Risk distribution



Include an interactive NER map with important corridors and incidents.



SMART ROUTE PLANNER:

Create a working route-planning interface.



Inputs:

- Origin

- Destination

- Cargo type

- Cargo weight

- Vehicle type

- Priority

- Maximum acceptable delay

- Optional hazardous/perishable cargo flag



Generate THREE route alternatives:

1. Safest Route

2. Fastest Route

3. Cheapest Route



Each route must display:

- Distance

- Estimated travel time

- Estimated cost

- Safety score

- Accessibility score

- Reliability score

- Disaster risk

- Number of incidents

- Road closure warnings

- Reason for recommendation



Create an explainable route score using:



Safety: 35%

Accessibility: 20%

Time: 15%

Cost: 10%

Reliability: 10%

Environmental impact: 10%



Show the individual score components so judges can understand WHY a route was recommended.



EMERGENCY MODE:

Add an Emergency Mode that prioritizes:

- Safety

- Accessibility

- Road availability

- Emergency response

over cost.



GIS MAP:

Create an interactive map focused on the North Eastern Region.



Display layers for:

- Roads

- Freight routes

- Road closures

- Landslide/rockfall risk

- Flood risk

- Heavy rainfall

- Incidents

- High-risk zones

- Active shipments



Add:

- Layer controls

- Legend

- Search

- Zoom controls

- Route visualization

- Incident markers

- Risk heatmap



DISASTER & RISK:

Create a regional risk dashboard.



Show risk categories:

- Landslide

- Rockfall

- Flood

- Heavy rainfall

- Road blockage

- Connectivity disruption



Use a 0–100 risk score.



Provide an explainable risk assessment using factors such as:

- Rainfall

- Terrain

- Historical incidents

- Road condition

- Slope vulnerability

- Flood exposure



ROCKWATCH INTEGRATION:

Create an API-ready module called RockWatch AI.



It must be designed so a future machine-learning API can provide:

- Rockfall probability

- Landslide probability

- Risk score

- Confidence score



For the prototype, use clearly labelled DEMO/SIMULATED predictions.



Do NOT falsely claim that an ML model is actually running if it isn't connected.



ACCESSIBILITY:

Create an accessibility score from 0–100 for important roads/corridors.



Consider:

- Road condition

- Weather

- Disaster risk

- Road closure

- Vehicle suitability

- Terrain difficulty

- Connectivity



Show:

Green = accessible

Yellow = moderate

Red = difficult/high risk



FREIGHT MANAGEMENT:

Create shipment records containing:

- Shipment ID

- Origin

- Destination

- Cargo

- Weight

- Vehicle

- Priority

- Current route

- ETA

- Status

- Risk level



Statuses:

- Planned

- In Transit

- Delayed

- At Risk

- Delivered



Allow users to inspect shipment details.



ROAD INCIDENTS:

Create incident management with:

- Incident type

- Location

- Severity

- Date/time

- Status

- Affected road

- Estimated clearance time



Incident types:

- Landslide

- Rockfall

- Flood

- Accident

- Road closure

- Heavy rainfall

- Other



ALERT SYSTEM:

Create alerts for:

- Route blocked

- High disaster risk

- Severe rainfall

- Shipment delay

- Unsafe route

- Accessibility deterioration



Each alert should include:

severity, location, time, affected route and recommended action.



ANALYTICS:

Create charts for:

- Freight movement

- Delay trends

- Route reliability

- Risk trends

- Incident frequency

- Cost comparison

- Regional accessibility

- Shipment performance



REPORTS:

Allow users to generate a professional summary report containing:

- Route selected

- Alternative routes

- Risk factors

- Estimated cost

- ETA

- Accessibility

- Incidents

- Recommendation



DATABASE:

Create a clean Supabase schema for:

- users

- shipments

- routes

- incidents

- road_segments

- alerts

- risk_assessments

- freight_corridors

- route_scores



Use proper relationships and timestamps.



AUTHENTICATION:

Implement login/signup and role-based access.



Roles:

- Admin

- Government Authority

- Logistics Operator

- Analyst



Create appropriate navigation/permissions for each role.



DEMO DATA:

Seed realistic simulated data for the NER so every major screen works immediately.



Use realistic cities/corridors from the North Eastern Region.



Every simulated dataset must visibly indicate:

"DEMO DATA — Replace with live government/API data for production."



API-READY ARCHITECTURE:

Create service modules/interfaces for future integration with:

- Weather APIs

- Rainfall data

- Map/routing APIs

- Traffic/road-condition APIs

- Disaster data

- Government datasets

- RockWatch ML API



Do not fabricate live API responses.



IMPORTANT UX:

A judge should be able to open the application and understand the entire concept within 60 seconds.



Create a prominent workflow:



Origin → Destination → Freight Details → Risk Analysis → 3 Route Options → Explainable Recommendation → Shipment Tracking



Add a "Demo Mode" button that loads a complete sample scenario immediately.



SAMPLE DEMO SCENARIO:

Create a sample freight shipment in the NER where the shortest route is NOT necessarily the safest route.



Demonstrate:

- One route with lower distance but high landslide/flood risk

- One safer alternative with slightly longer travel time

- One cheaper alternative



The system should recommend the safest practical route and explain why.



FINAL REQUIREMENTS:

- All pages must be connected through navigation.

- Buttons must perform meaningful actions.

- No dead/empty pages.

- No lorem ipsum.

- No fake claims about real-time data.

- No unnecessary features.

- Make the prototype visually polished and technically demonstrable.

- Optimize for SIH judging: problem understanding, innovation, usability, technical feasibility, explainability and measurable impact.



FIRST BUILD:

Before making micro-level visual changes, build the complete application architecture, database schema, navigation, core pages, demo data and working Smart Route Planner.



Do NOT repeatedly rebuild the entire application for minor changes.

Preserve existing working functionality when making future modifications.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/a1157a72-1985-4b55-9510-c4a2234be547).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
