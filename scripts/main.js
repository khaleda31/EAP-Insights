/**
 * Main application entry point.
 * Loads the cleaned dataset and initialises all visualisations.
 */
(async function () {
    const data = await d3.csv("data/processed_data/cleaned_data.csv", d3.autoType);
    const summaries = await fetch("data/attribute_summaries.json").then(r => r.json());

    console.log(`Loaded ${data.length} rows, ${new Set(data.map(d => d["Country Name"])).size} countries`);

    // Chart 1: Stacked Area Chart
    const stackedArea = new StackedAreaChart("#stacked-area-chart", 1000, 420, { top: 40, right: 30, bottom: 30, left: 90 });
    stackedArea.init(data);

    // Initialise Chart 2: Choropleth Map
    const choropleth = new ChoroplethMap("#choropleth-map", "#choropleth-summary", data);
    await choropleth.init();

    // Charts 3 & 4: Connected Scatter Plots with shared controls
    const scatterMargin = { top: 50, right: 180, bottom: 50, left: 80 };

    // Create chart instances
    const connectedScatterDemographic = new ConnectedScatterDemographic(
        "#scatter-demographic", 900, 600, scatterMargin
    );
    const connectedScatterSocial = new ConnectedScatterSocial(
        "#scatter-social", 900, 600, scatterMargin
    );

    // Create shared controller (renders dropdowns + tags)
    const controller = new ScatterController("#scatter-controls", data, summaries);
    controller.registerCharts(connectedScatterDemographic, connectedScatterSocial);

    // Trigger initial render
    controller.updateCharts();

})();
    