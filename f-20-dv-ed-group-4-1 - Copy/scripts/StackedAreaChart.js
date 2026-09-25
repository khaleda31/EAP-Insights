//Stacked Area Chart of Average GDP of each region throughout the years

class StackedAreaChart {
    
    // Attributes
    width; height; margin;
    svg; chart; area; axisX; axisY; labelX; labelY; title;
    scaleX; scaleY;
    data;
    
    //Constructor
    constructor(container, width, height, margin){
        this.width = width;
        this.height = height;
        this.margin = margin;
        this.container = container;
    }

    // Process data: calculate average GDP per capita by Region and Year
    processData(rawData) {
        // Group by Region and Year, calculate average GDP per capita
        const groupedData = d3.rollup(
            rawData,
            v => d3.mean(v, d => d.gdp_per_capita),
            d => d.Region,
            d => d.Year
        );

        // Transform into array format for stacking
        const years = Array.from(new Set(rawData.map(d => d.Year))).sort((a, b) => a - b);
        const regions = Array.from(groupedData.keys());

        const stackData = years.map(year => {
            const obj = { year };
            regions.forEach(region => {
                obj[region] = groupedData.get(region).get(year) || 0;
            });
            return obj;
        });

        return { stackData, regions };
    }

    // Initialize and render the chart
    init(rawData) {
        const { stackData, regions } = this.processData(rawData);
        this.data = stackData;
        this.regions = regions;

        // Create card container (matching connected scatter style)
        const card = d3.select(this.container)
            .html("")
            .style("background", "#fff")
            .style("border-radius", "12px")
            .style("box-shadow", "0 2px 12px rgba(0,0,0,0.08)")
            .style("padding", "24px")
            .style("margin-bottom", "24px");

        card.append("h3")
            .style("margin", "0 0 8px 0")
            .style("font-family", "Playfair Display, Georgia, serif")
            .style("font-weight", "600")
            .style("font-size", "18px")
            .style("color", "#1e293b")
            .text("Average GDP per Capita by Region Over Time");

        card.append("p")
            .style("margin", "0 0 16px 0")
            .style("font-family", "Playfair Display, Georgia, serif")
            .style("font-size", "13px")
            .style("color", "#64748b")
            .text("Stacked area chart showing regional GDP per capita averages. Hover over a region for details.");

        // Create tooltip
        const tooltip = card.append("div")
            .attr("class", "stacked-area-tooltip")
            .style("position", "absolute")
            .style("background", "rgba(255, 255, 255, 0.96)")
            .style("border", "1px solid #ddd")
            .style("border-radius", "8px")
            .style("padding", "10px 14px")
            .style("font-size", "12px")
            .style("line-height", "1.5")
            .style("color", "#333")
            .style("pointer-events", "none")
            .style("opacity", 0)
            .style("box-shadow", "0 4px 12px rgba(0,0,0,0.15)")
            .style("z-index", 1000)
            .style("max-width", "280px")
            .style("transition", "opacity 0.15s ease");

        // Make container position relative for tooltip
        card.style("position", "relative");

        this.svg = card.append('svg')
            .attr('width', this.width)
            .attr('height', this.height);

        // Create scales
        const innerWidth = this.width - this.margin.left - this.margin.right;
        const innerHeight = this.height - this.margin.top - this.margin.bottom;

        this.scaleX = d3.scaleLinear()
            .domain(d3.extent(this.data, d => d.year))
            .range([0, innerWidth]);

        this.scaleY = d3.scaleLinear()
            .domain([0, d3.max(this.data, d => d3.sum(regions, r => d[r]))])
            .range([innerHeight, 0]);

        // Create color scale
        const colorScale = d3.scaleOrdinal()
            .domain(regions)
            .range(d3.schemeSet2);

        // Create stack generator
        const stack = d3.stack()
            .keys(regions);

        const stackedData = stack(this.data);

        // Create area generator
        this.area = d3.area()
            .x(d => this.scaleX(d.data.year))
            .y0(d => this.scaleY(d[0]))
            .y1(d => this.scaleY(d[1]));

        // Create main chart group
        const chart = this.svg.append('g')
            .attr('transform', `translate(${this.margin.left},${this.margin.top})`);

        // Precompute overall average GDP per capita for each region (across all years)
        const regionAvgGdp = {};
        regions.forEach(region => {
            const values = this.data.map(d => d[region]).filter(v => v > 0);
            regionAvgGdp[region] = values.length > 0 ? d3.mean(values) : 0;
        });

        // Add areas
        chart.selectAll('.area')
            .data(stackedData)
            .enter()
            .append('path')
            .attr('class', 'area')
            .attr('d', this.area)
            .attr('fill', d => colorScale(d.key))
            .attr('opacity', 0.7)
            .on('mouseover', function(event, d) {
                d3.select(this)
                    .attr('opacity', 1)
                    .attr('stroke', colorScale(d.key))
                    .attr('stroke-width', 2);
                tooltip.style("opacity", 1);
            })
            .on('mousemove', function(event, d) {
                const avgGdp = regionAvgGdp[d.key];

                tooltip
                    .html(
                        `<strong>${d.key}</strong><br>` +
                        `Avg GDP per Capita (2005–2023): <strong>$${avgGdp.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>`
                    )
                    .style("left", (event.offsetX + 15) + "px")
                    .style("top", (event.offsetY - 10) + "px");
            })
            .on('mouseout', function(event, d) {
                d3.select(this)
                    .attr('opacity', 0.7)
                    .attr('stroke', 'none');
                tooltip.style("opacity", 0);
            });

        // Add X axis
        const allYears = Array.from({ length: 2023 - 2005 + 1 }, (_, i) => 2005 + i);
        const xAxis = d3.axisBottom(this.scaleX)
            .tickValues(allYears)
            .tickFormat(d3.format('d'));
        chart.append('g')
            .attr('transform', `translate(0,${innerHeight})`)
            .call(xAxis)
            .append('text')
            .attr('x', innerWidth / 2)
            .attr('y', 30)
            .attr('fill', 'black')
            .attr('text-anchor', 'middle')
            .text('Year');

        // Add Y axis
        const yAxis = d3.axisLeft(this.scaleY);
        chart.append('g')
            .call(yAxis)
            .append('text')
            .attr('transform', 'rotate(-90)')
            .attr('y', 0 - this.margin.left + 20)
            .attr('x', 0 - innerHeight / 2)
            .attr('dy', '1em')
            .attr('fill', 'black')
            .attr('text-anchor', 'middle')
            .text('Average GDP per Capita (USD)');

        // Add legend
        const legend = this.svg.append('g')
            .attr('transform', `translate(${this.margin.left + 10}, ${this.margin.top})`);

        regions.forEach((region, i) => {
            const legendRow = legend.append('g')
                .attr('transform', `translate(0, ${i * 20})`);

            legendRow.append('rect')
                .attr('width', 12)
                .attr('height', 12)
                .attr('fill', colorScale(region));

            legendRow.append('text')
                .attr('x', 20)
                .attr('y', 10)
                .attr('font-size', '12px')
                .text(region);
        });
    }
}