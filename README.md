## Team
Group 4 - F20DV Data Visualisation and Analytics 2025-2026, Heriot-Watt University

# Economic Development in East Asia & Pacific
Interactive data story exploring how demographic and social indicators co-move with economic growth across 36 countries in East Asia and the Pacific (2005-2023). Built with D3.js v7, vanilla JavaScript, HTML and CSS.

## How to Run
Open `index.html` in a modern web browser (Chrome, Firefox, Edge), a local server (e.g VSCode Live Server via extension) is recommended

## Project Structure
```
index.html                              Main application (single HTML page)

styles/
    main.css                            Base styles, layout, tooltip, takeaway cards
    navbar.css                          Sticky navigation bar
    title_hero.css                      Hero section and introduction
    choropleth.css                      Choropleth map controls, summary panel, slider
    connectedscatter.css                Connected scatter plot styles and controls
    stackedareachart.css                Stacked area chart and section styles
    footer.css                          Footer and conclusion section

scripts/
    main.js                             Entry point - loads CSV data, initialises all charts
    choropleth.js                       Chart 2: Interactive choropleth map (ChoroplethMap class)
    StackedAreaChart.js                 Chart 1: Stacked area chart (StackedAreaChart class)
    ScatterController.js                Shared dropdown controls for scatter plots
    ConnectedScatterDemographic.js      Chart 3: GDP vs demographic indicators (ConnectedScatter)
    ConnectedScatterSocial.js           Chart 4: GDP vs social indicators (ConnectedScatter)

libs/
    d3/d3.v7.min.js                     D3.js v7.9.0 

data/
    processed_data/
        cleaned_data.csv                Cleaned dataset (684 rows, 16 columns)
        data_cleaning.ipynb             Python notebook used for data preparation
    raw_data/                           Original World Bank WDI exports
```

## Charts and Interactions
**01 - Regional GDP Overview** (Stacked Area Chart)
- Displays GDP per capita by region over time
- Hover to isolate individual region layers

**02 - Regional Development Map** (Choropleth)
- 12 switchable indicators via dropdown
- Year slider with play/pause animation (2005-2023)
- Zoom and pan with country labels on zoom
- Hover tooltips with country details
- Dynamic summary panel: top 3, bottom 3, regional averages

**03 - GDP vs Demographic Indicators** (Connected Scatter)
- Shared country dropdown with Chart 4 (up to 3 countries)
- Y-axis selector: life expectancy, birth rate, fertility rate, population growth
- Connected dots trace each country's trajectory over time
- Dynamic about panel: changeable depending on the y-axis selector 

**04 - GDP vs Social Indicators** (Connected Scatter)
- Bidirectional sync with Chart 3 (country selection updates both)
- Y-axis selector: urbanisation, health expenditure, exports, school enrollment
- Hover highlights individual country trajectory
- Dynamic about panel: changeable depending on the y-axis selector

## Libraries
- **D3.js v7.9.0** - loaded locally from `libs/d3/d3.v7.min.js`
- **topojson-client v3** - loaded from CDN (`cdn.jsdelivr.net/npm/topojson-client@3`)

## Data Source
World Bank World Development Indicators (WDI)
- URL: https://databank.worldbank.org/source/world-development-indicators
- License: Creative Commons Attribution 4.0 (CC BY 4.0)
- Coverage: 36 countries, 3 regions, 19 years (2005-2023), 12 indicators

