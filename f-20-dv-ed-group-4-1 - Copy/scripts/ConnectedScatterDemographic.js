class ConnectedScatterDemographic {
    constructor(selector, width, height, margin) {
        this.selector = selector;
        this.width = width;
        this.height = height;
        this.margin = margin;
        this.innerWidth = width - margin.left - margin.right;
        this.innerHeight = height - margin.top - margin.bottom;
    }

    // Called by controller
    update(data, selectedCountries, xCol, yCol, colorScale) {
        this.xCol = xCol;
        this.yCol = yCol;
        this.countryCol = "Country Name";
        this.yearCol = "Year";
        this.sharedColorScale = colorScale || d3.scaleOrdinal(d3.schemeTableau10);

        // Force numeric
        data.forEach(d => {
            d[xCol] = +d[xCol];
            d[yCol] = +d[yCol];
            d[this.yearCol] = +d[this.yearCol];
        });

        // Filter
        const filtered = data.filter(
            d => d[xCol] > 0 &&
                 d[yCol] > 0 &&
                 !isNaN(d[xCol]) &&
                 !isNaN(d[yCol]) &&
                 selectedCountries.includes(d[this.countryCol]) &&
                 d[this.yearCol]
        );

        if (filtered.length === 0) {
            d3.select(this.selector).html("")
                .append("div")
                .style("text-align", "center")
                .style("color", "#94a3b8")
                .style("padding", "60px 20px")
                .style("font-family", "Playfair Display, Georgia, serif")
                .text("No data available for the selected countries and attributes.");
            return;
        }

        const grouped = d3.group(filtered, d => d[this.countryCol]);

        // Sort each country by year
        const groupedMap = new Map(
            selectedCountries
                .filter(c => grouped.has(c))
                .map(c => [c, grouped.get(c).sort((a, b) => a[this.yearCol] - b[this.yearCol])])
        );

        this.drawChart(groupedMap, Array.from(groupedMap.keys()));
    }

    drawChart(grouped, countries) {
        const { selector, width, height, margin, innerWidth, innerHeight } = this;
        const { xCol, yCol, countryCol, yearCol } = this;
        const xLabel = this.formatColName(xCol);
        const yLabel = this.formatColName(yCol);

        const color = this.sharedColorScale;

        // Clear & card
        const card = d3.select(selector)
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
            .text(`${xLabel} vs ${yLabel} Over Time`);

        card.append("p")
            .style("margin", "0 0 16px 0")
            .style("font-family", "Playfair Display, Georgia, serif")
            .style("font-size", "13px")
            .style("color", "#64748b")
            .text("Demographic indicators. Hover over points for details.");

        const svg = card.append("svg")
            .attr("width", width)
            .attr("height", height)
            .attr("viewBox", `0 0 ${width} ${height}`)
            .style("overflow", "visible");

        const g = svg.append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // Scales
        const allPoints = Array.from(grouped.values()).flat();
        const xExtent = d3.extent(allPoints, d => d[xCol]);
        const useLog = xExtent[0] > 0 && (xExtent[1] / xExtent[0]) > 100;

        const xScale = useLog
            ? d3.scaleLog().domain(xExtent).range([0, innerWidth]).nice()
            : d3.scaleLinear().domain(xExtent).range([0, innerWidth]).nice();

        const yExtent = d3.extent(allPoints, d => d[yCol]);
        const yPad = (yExtent[1] - yExtent[0]) * 0.1 || 1;
        const yScale = d3.scaleLinear()
            .domain([Math.max(0, yExtent[0] - yPad), yExtent[1] + yPad])
            .range([innerHeight, 0])
            .nice();

        // Grid
        g.append("g").call(d3.axisLeft(yScale).ticks(6).tickSize(-innerWidth).tickFormat(""))
            .selectAll("line").attr("stroke", "#e2e8f0").attr("stroke-dasharray", "3,3");
        g.selectAll(".domain").filter((_, i, nodes) => i === 0).remove();

        // Axes
        g.append("g").attr("transform", `translate(0,${innerHeight})`)
            .call(d3.axisBottom(xScale).ticks(6, useLog ? "~s" : ",.0f"))
            .selectAll("text").style("font-size", "11px").style("fill", "#475569");

        g.append("g").call(d3.axisLeft(yScale).ticks(6))
            .selectAll("text").style("font-size", "11px").style("fill", "#475569");

        // Axis labels
        svg.append("text")
            .attr("x", margin.left + innerWidth / 2).attr("y", height - 6)
            .attr("text-anchor", "middle")
            .style("font-family", "Playfair Display, Georgia, serif")
            .style("font-size", "13px").style("font-weight", "500").style("fill", "#334155")
            .text(xLabel);

        svg.append("text")
            .attr("transform", "rotate(-90)")
            .attr("x", -(margin.top + innerHeight / 2)).attr("y", 18)
            .attr("text-anchor", "middle")
            .style("font-family", "Playfair Display, Georgia, serif")
            .style("font-size", "13px").style("font-weight", "500").style("fill", "#334155")
            .text(yLabel);

        // Tooltip
        d3.selectAll(".scatter-demo-tooltip").remove();
        const tooltip = d3.select("body").append("div")
            .attr("class", "scatter-demo-tooltip")
            .style("position", "absolute").style("pointer-events", "none")
            .style("background", "#1e293b").style("color", "#f8fafc")
            .style("padding", "10px 14px").style("border-radius", "8px")
            .style("font-family", "Playfair Display, Georgia, serif")
            .style("font-size", "12px").style("line-height", "1.6")
            .style("box-shadow", "0 4px 16px rgba(0,0,0,0.2)")
            .style("opacity", 0).style("z-index", 1000);

        // Line generator
        const line = d3.line()
            .x(d => xScale(d[xCol]))
            .y(d => yScale(d[yCol]))
            .curve(d3.curveMonotoneX);

        // Country groups
        const countryGroups = g.selectAll(".country-group")
            .data(Array.from(grouped))
            .enter().append("g").attr("class", "country-group");

        countryGroups.each(function ([country, rows]) {
            const grp = d3.select(this);

            const path = grp.append("path").datum(rows)
                .attr("fill", "none").attr("stroke", color(country))
                .attr("stroke-width", 2.5).attr("stroke-linejoin", "round")
                .attr("stroke-linecap", "round").attr("opacity", 0.85).attr("d", line);

            const totalLength = path.node().getTotalLength();
            path.attr("stroke-dasharray", `${totalLength} ${totalLength}`)
                .attr("stroke-dashoffset", totalLength)
                .transition().duration(1500).ease(d3.easeCubicInOut)
                .attr("stroke-dashoffset", 0);

            grp.selectAll("circle").data(rows).enter().append("circle")
                .attr("cx", d => xScale(d[xCol])).attr("cy", d => yScale(d[yCol]))
                .attr("r", 0).attr("fill", color(country))
                .attr("stroke", "#fff").attr("stroke-width", 1.5)
                .style("cursor", "pointer")
                .transition().delay((_, i) => 1200 + i * 50).duration(350)
                .ease(d3.easeBackOut).attr("r", 5);

            if (rows.length >= 2) {
                [rows[0], rows[rows.length - 1]].forEach(d => {
                    grp.append("text")
                        .attr("x", xScale(d[xCol]) + 8).attr("y", yScale(d[yCol]) - 8)
                        .text(d[yearCol])
                        .style("font-family", "Playfair Display, Georgia, serif")
                        .style("font-size", "9px").style("fill", color(country))
                        .style("font-weight", "600").style("opacity", 0)
                        .transition().delay(1800).duration(400).style("opacity", 0.7);
                });
            }
        });

        // Hover
        setTimeout(() => {
            g.selectAll("circle")
                .on("mouseover", function (event, d) {
                    d3.select(this).transition().duration(150).attr("r", 9).attr("stroke-width", 2.5);
                    countryGroups.transition().duration(150)
                        .style("opacity", function () {
                            return d3.select(this).datum()[0] === d[countryCol] ? 1 : 0.15;
                        });
                    tooltip.html(`
                        <strong style="font-size:13px">${d[countryCol]}</strong><br/>
                        <span style="color:#94a3b8">Year:</span> ${d[yearCol]}<br/>
                        <span style="color:#94a3b8">${xLabel}:</span> ${ConnectedScatterDemographic.fmt(d[xCol])}<br/>
                        <span style="color:#94a3b8">${yLabel}:</span> ${ConnectedScatterDemographic.fmt(d[yCol])}
                    `).transition().duration(150).style("opacity", 1);
                })
                .on("mousemove", function (event) {
                    tooltip.style("left", (event.pageX + 16) + "px").style("top", (event.pageY - 20) + "px");
                })
                .on("mouseout", function () {
                    d3.select(this).transition().duration(150).attr("r", 5).attr("stroke-width", 1.5);
                    countryGroups.transition().duration(300).style("opacity", 1);
                    tooltip.transition().duration(200).style("opacity", 0);
                });
        }, 2500);

        // Legend
        const legend = svg.append("g")
            .attr("transform", `translate(${margin.left + innerWidth + 16}, ${margin.top})`);

        countries.forEach((country, i) => {
            const row = legend.append("g")
                .attr("transform", `translate(0, ${i * 24})`)
                .style("cursor", "pointer").style("opacity", 0);
            row.append("rect").attr("width", 14).attr("height", 14).attr("rx", 3).attr("fill", color(country));
            row.append("text").attr("x", 20).attr("y", 11)
                .text(country.length > 18 ? country.slice(0, 18) + "…" : country)
                .style("font-family", "Playfair Display, Georgia, serif")
                .style("font-size", "11px").style("fill", "#334155");
            row.transition().delay(1500 + i * 60).duration(400).style("opacity", 1);
            row.on("mouseover", () => {
                countryGroups.transition().duration(150)
                    .style("opacity", function () { return d3.select(this).datum()[0] === country ? 1 : 0.15; });
            }).on("mouseout", () => {
                countryGroups.transition().duration(300).style("opacity", 1);
            });
        });
    }

    formatColName(col) {
        return col.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
    }

    static fmt(val) {
        if (val >= 1e12) return (val / 1e12).toFixed(1) + "T";
        if (val >= 1e9) return (val / 1e9).toFixed(1) + "B";
        if (val >= 1e6) return (val / 1e6).toFixed(0) + "M";
        if (val >= 1e3) return (val / 1e3).toFixed(1) + "K";
        return typeof val === "number" ? val.toFixed(2) : val;
    }
}