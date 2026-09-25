/**
 * Shared controller for both connected scatter plots.
 * Renders dropdowns for countries & attributes, selected tags,
 * and triggers both charts to re-render on change.
 */
class ScatterController {
    constructor(containerSelector, data, summaries = {}) {
        this.container = d3.select(containerSelector);
        this.data = data;
        this.summaries = summaries;

        // Column detection
        const cols = Object.keys(data[0]);
        this.countryCol = "Country Name";
        this.yearCol = "Year";

        // Skip non-plottable columns
        const skipCols = new Set([
            this.countryCol, this.yearCol,
            "Country Code", "Region", "region"
        ]);

        // Find all numeric attribute columns
        this.attributeCols = cols.filter(col => {
            if (skipCols.has(col)) return false;
            // Check if at least some rows have numeric data
            const numericCount = data.slice(0, 100).filter(d => {
                const v = +d[col];
                return !isNaN(v) && v !== 0;
            }).length;
            return numericCount > 10;
        });

        console.log("Available attributes:", this.attributeCols);

        // Define fixed column lists
        this.demographicCols = [
            "life_expectancy", "birth_rate", "fertility_rate",
            "population_total", "population_growth"
        ].filter(c => this.attributeCols.includes(c));

        this.socialCols = this.attributeCols.filter(c =>
            c !== "gdp_per_capita" && !this.demographicCols.includes(c)
        );

        // Get all unique countries sorted
        this.allCountries = Array.from(new Set(data.map(d => d[this.countryCol])))
            .filter(Boolean)
            .sort();

        // Build country-to-region map and group by region
        this.countryRegionMap = {};
        data.forEach(d => {
            if (d[this.countryCol] && d.Region) {
                this.countryRegionMap[d[this.countryCol]] = d.Region;
            }
        });
        this.regionOrder = ["East Asia", "Southeast Asia", "Pacific"];
        this.countriesByRegion = {};
        this.regionOrder.forEach(r => { this.countriesByRegion[r] = []; });
        this.allCountries.forEach(c => {
            const r = this.countryRegionMap[c];
            if (r && this.countriesByRegion[r]) {
                this.countriesByRegion[r].push(c);
            }
        });

        // Shared color scale for consistent colors across both charts
        this.colorScale = d3.scaleOrdinal(d3.schemeTableau10);

        // State — x-axis is always GDP per capita
        this.selectedCountries = [];
        this.maxCountries = 3;
        this.selectedXAttr = "gdp_per_capita";
        this.selectedYAttrDemographic = this.demographicCols[0] || this.attributeCols[0];
        this.selectedYAttrSocial = this.socialCols[0] || this.attributeCols[0];

        // Chart references
        this.demographicChart = null;
        this.socialChart = null;

        this.render();
    }

    registerCharts(demographic, social) {
        this.demographicChart = demographic;
        this.socialChart = social;
    }

    render() {
        this.container.html("");

        const card = this.container
            .append("div")
            .attr("class", "controller-card")
            .style("background", "#fff")
            .style("border-radius", "12px")
            .style("box-shadow", "0 2px 12px rgba(0,0,0,0.08)")
            .style("padding", "24px 28px")
            .style("margin-bottom", "24px")
            .style("font-family", "Playfair Display, Georgia, serif");

        card.append("h3")
            .style("margin", "0 0 4px 0")
            .style("font-size", "18px")
            .style("font-weight", "600")
            .style("color", "#1e293b")
            .text("Connected Scatter Plot Controls");

        card.append("p")
            .style("margin", "0 0 20px 0")
            .style("font-size", "13px")
            .style("color", "#64748b")
            .text("Select countries and attributes. Both charts update together.");

        // ── Row of controls ──
        const row = card.append("div")
            .style("display", "flex")
            .style("gap", "24px")
            .style("flex-wrap", "wrap")
            .style("align-items", "flex-start");

        // ── Country Dropdown ──
        const countryGroup = row.append("div").style("flex", "1").style("min-width", "220px");
        countryGroup.append("label")
            .style("font-size", "12px")
            .style("font-weight", "600")
            .style("color", "#475569")
            .style("text-transform", "uppercase")
            .style("letter-spacing", "0.5px")
            .style("display", "block")
            .style("margin-bottom", "6px")
            .text("Countries");

        const countrySelect = countryGroup.append("select")
            .attr("id", "country-dropdown")
            .style("width", "100%")
            .style("padding", "8px 12px")
            .style("border", "1px solid #cbd5e1")
            .style("border-radius", "8px")
            .style("font-size", "13px")
            .style("font-family", "Playfair Display, Georgia, serif")
            .style("color", "#334155")
            .style("background", "#f8fafc")
            .style("cursor", "pointer");

        countrySelect.append("option")
            .attr("value", "")
            .attr("disabled", true)
            .attr("selected", true)
            .text("+ Add a country (max 3)…");

        // Group countries by region using <optgroup>
        this.regionOrder.forEach(region => {
            const countries = this.countriesByRegion[region];
            if (countries.length === 0) return;
            const group = countrySelect.append("optgroup")
                .attr("label", region);
            group.selectAll("option")
                .data(countries)
                .enter()
                .append("option")
                .attr("value", d => d)
                .text(d => d);
        });

        countrySelect.on("change", (event) => {
            const val = event.target.value;
            if (val && !this.selectedCountries.includes(val)) {
                if (this.selectedCountries.length >= this.maxCountries) {
                    event.target.selectedIndex = 0;
                    return;
                }
                this.selectedCountries.push(val);
                this.renderTags();
                this.updateCharts();
            }
            event.target.selectedIndex = 0; // reset to placeholder
        });

        // ── Y-Axis Demographic ──
        const yDemoGroup = row.append("div").style("flex", "1").style("min-width", "200px");
        yDemoGroup.append("label")
            .style("font-size", "12px")
            .style("font-weight", "600")
            .style("color", "#475569")
            .style("text-transform", "uppercase")
            .style("letter-spacing", "0.5px")
            .style("display", "block")
            .style("margin-bottom", "6px")
            .text("Y-Axis (Chart 1 – Demographic)");

        const yDemoSelect = yDemoGroup.append("select")
            .style("width", "100%")
            .style("padding", "8px 12px")
            .style("border", "1px solid #cbd5e1")
            .style("border-radius", "8px")
            .style("font-size", "13px")
            .style("font-family", "Playfair Display, Georgia, serif")
            .style("color", "#334155")
            .style("background", "#f8fafc")
            .style("cursor", "pointer");

        yDemoSelect.selectAll("option")
            .data(this.demographicCols)
            .enter()
            .append("option")
            .attr("value", d => d)
            .property("selected", d => d === this.selectedYAttrDemographic)
            .text(d => this.formatColName(d));

        yDemoSelect.on("change", (event) => {
            this.selectedYAttrDemographic = event.target.value;
            this.updateCharts();
        });

        // ── Y-Axis Social ──
        const ySocGroup = row.append("div").style("flex", "1").style("min-width", "200px");
        ySocGroup.append("label")
            .style("font-size", "12px")
            .style("font-weight", "600")
            .style("color", "#475569")
            .style("text-transform", "uppercase")
            .style("letter-spacing", "0.5px")
            .style("display", "block")
            .style("margin-bottom", "6px")
            .text("Y-Axis (Chart 2 – Social)");

        const ySocSelect = ySocGroup.append("select")
            .style("width", "100%")
            .style("padding", "8px 12px")
            .style("border", "1px solid #cbd5e1")
            .style("border-radius", "8px")
            .style("font-size", "13px")
            .style("font-family", "Playfair Display, Georgia, serif")
            .style("color", "#334155")
            .style("background", "#f8fafc")
            .style("cursor", "pointer");

        ySocSelect.selectAll("option")
            .data(this.socialCols)
            .enter()
            .append("option")
            .attr("value", d => d)
            .property("selected", d => d === this.selectedYAttrSocial)
            .text(d => this.formatColName(d));

        ySocSelect.on("change", (event) => {
            this.selectedYAttrSocial = event.target.value;
            this.updateCharts();
        });

        // ── Selected countries tags area ──
        card.append("div")
            .attr("id", "selected-tags")
            .style("margin-top", "16px")
            .style("min-height", "36px");

        // Seed with some default countries (max 3)
        if (this.selectedCountries.length === 0) {
            const defaults = ["China", "Japan", "Australia"];
            defaults.forEach(c => {
                if (this.allCountries.includes(c) && this.selectedCountries.length < this.maxCountries) {
                    this.selectedCountries.push(c);
                }
            });
            if (this.selectedCountries.length === 0) {
                this.selectedCountries = this.allCountries.slice(0, this.maxCountries);
            }
        }

        this.renderTags();
    }

    renderTags() {
        const container = d3.select("#selected-tags");
        container.html("");

        if (this.selectedCountries.length === 0) {
            container.append("span")
                .style("font-size", "13px")
                .style("color", "#94a3b8")
                .style("font-style", "italic")
                .text("No countries selected. Use the dropdown above to add countries.");
            return;
        }

        this.selectedCountries.forEach((country, i) => {
            const tag = container.append("span")
                .style("display", "inline-flex")
                .style("align-items", "center")
                .style("gap", "6px")
                .style("background", this.colorScale(country))
                .style("color", "#fff")
                .style("padding", "5px 10px 5px 12px")
                .style("border-radius", "20px")
                .style("font-size", "12px")
                .style("font-weight", "500")
                .style("font-family", "Playfair Display, Georgia, serif")
                .style("margin", "0 8px 8px 0")
                .style("cursor", "default")
                .style("opacity", 0)
                .style("transform", "scale(0.8)");

            tag.append("span").text(country);

            // Remove button
            tag.append("span")
                .text("✕")
                .style("cursor", "pointer")
                .style("font-size", "14px")
                .style("font-weight", "700")
                .style("opacity", "0.8")
                .style("line-height", "1")
                .on("mouseover", function () { d3.select(this).style("opacity", "1"); })
                .on("mouseout", function () { d3.select(this).style("opacity", "0.8"); })
                .on("click", () => {
                    this.selectedCountries = this.selectedCountries.filter(c => c !== country);
                    this.renderTags();
                    this.updateCharts();
                });

            // Animate in
            tag.transition()
                .delay(i * 40)
                .duration(300)
                .style("opacity", 1)
                .style("transform", "scale(1)");
        });
    }

    updateCharts() {
        if (this.selectedCountries.length === 0) {
            d3.select("#scatter-demographic").html("")
                .append("p")
                .style("text-align", "center")
                .style("color", "#94a3b8")
                .style("padding", "60px 20px")
                .style("font-family", "Playfair Display, Georgia, serif")
                .text("Select at least one country to display charts.");
            d3.select("#scatter-social").html("")
                .append("p")
                .style("text-align", "center")
                .style("color", "#94a3b8")
                .style("padding", "60px 20px")
                .style("font-family", "Playfair Display, Georgia, serif")
                .text("Select at least one country to display charts.");
            d3.select("#demographic-summary").html("");
            d3.select("#social-summary").html("");
            return;
        }

        if (this.demographicChart) {
            this.demographicChart.update(
                this.data,
                this.selectedCountries,
                this.selectedXAttr,
                this.selectedYAttrDemographic,
                this.colorScale
            );
        }
        if (this.socialChart) {
            this.socialChart.update(
                this.data,
                this.selectedCountries,
                this.selectedXAttr,
                this.selectedYAttrSocial,
                this.colorScale
            );
        }

        // Display summaries
        this.displaySummary("demographic", this.selectedYAttrDemographic);
        this.displaySummary("social", this.selectedYAttrSocial);
    }

    displaySummary(type, attributeKey) {
        const summaryContainer = d3.select(`#${type}-summary`);
        
        let attributeData = null;
        if (type === "demographic" && this.summaries.demographic_attributes) {
            attributeData = this.summaries.demographic_attributes[attributeKey];
        } else if (type === "social" && this.summaries.social_attributes) {
            attributeData = this.summaries.social_attributes[attributeKey];
        }

        if (!attributeData) {
            summaryContainer.html("");
            return;
        }

        summaryContainer.html("")
            .style("background", "#f8fafc")
            .style("border-left", "4px solid #3b82f6")
            .style("border-radius", "8px")
            .style("padding", "20px")
            .style("margin-top", "24px")
            .style("font-family", "Playfair Display, Georgia, serif");

        summaryContainer.append("h4")
            .style("margin", "0 0 12px 0")
            .style("font-size", "16px")
            .style("font-weight", "600")
            .style("color", "#1e293b")
            .text(`About ${attributeData.label}`);

        summaryContainer.append("p")
            .style("margin", "0")
            .style("font-size", "14px")
            .style("line-height", "1.6")
            .style("color", "#475569")
            .text(attributeData.summary);
    }

    formatColName(col) {
        return col
            .replace(/_/g, " ")
            .replace(/\(.*?\)/g, match => match) // keep parenthetical
            .replace(/\b\w/g, l => l.toUpperCase());
    }
}