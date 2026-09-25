/**
 * Choropleth Map - Chart 2
 * Animated choropleth showing regional development across East Asia & Pacific.
 * Uses TopoJSON world map data and colors countries by selected indicator + year.
 *
 * Dependencies: D3.js v7+, topojson-client v3
 */

class ChoroplethMap {
    // ISO 3166-1 numeric -> alpha-3 mapping for EAP countries
    static ISO_TO_ALPHA3 = {
        '036': 'AUS', '096': 'BRN', '116': 'KHM', '156': 'CHN',
        '242': 'FJI', '344': 'HKG', '360': 'IDN', '392': 'JPN',
        '296': 'KIR', '418': 'LAO', '446': 'MAC', '458': 'MYS',
        '584': 'MHL', '583': 'FSM', '496': 'MNG', '104': 'MMR',
        '520': 'NRU', '554': 'NZL', '598': 'PNG', '585': 'PLW',
        '608': 'PHL', '882': 'WSM', '702': 'SGP', '090': 'SLB',
        '410': 'KOR', '764': 'THA', '626': 'TLS', '776': 'TON',
        '798': 'TUV', '548': 'VUT', '704': 'VNM'
    };

    // Attribute labels for dropdown (key = CSV column, value = display label)
    static ATTRIBUTES = {
        'gdp_per_capita':               'GDP per capita (US$)',
        'life_expectancy':              'Life expectancy (years)',
        'birth_rate':                   'Birth rate (per 1,000)',
        'fertility_rate':               'Fertility rate',
        'population_growth':            'Population growth (%)',
        'urban_population_pct':         'Urban population (%)',
        'health_expenditure_per_capita':'Health expenditure per capita (US$)',
        'labor_force_participation':    'Labor force participation (%)',
        'exports_pct_gdp':             'Exports (% of GDP)',
        'school_enrollment_primary':    'School enrollment, primary (%)',
        'school_enrollment_secondary':  'School enrollment, secondary (%)',
        'population_total':             'Population total'
    };

    // region color schemes - custom scales for better contrast
    static REGION_COLORS = {
        'East Asia':      t => d3.interpolate('#c6dbef', '#08519c')(t),
        'Southeast Asia': t => d3.interpolate('#fdcc8a', '#d94701')(t),
        'Pacific':        t => d3.interpolate('#b2e2b2', '#006d2c')(t)
    };

    constructor(mapContainer, summaryContainer, data) {
        this.mapContainer = mapContainer;
        this.summaryContainer = summaryContainer;
        this.data = data;

        this.width = 1150;
        this.height = 550;
        this.currentYear = 2023;
        this.currentAttr = 'gdp_per_capita';

        // build lookup: alpha3 -> { Country Name, Region }
        this.countryLookup = {};
        for (const row of data) {
            if (!this.countryLookup[row['Country Code']]) {
                this.countryLookup[row['Country Code']] = {
                    name: row['Country Name'],
                    region: row['Region']
                };
            }
        }

        // set of EAP alpha-3 codes for identification
        this.eapCodes = new Set(Object.values(this.countryLookup).length
            ? Object.keys(this.countryLookup) : []);
    }

    async init() {
        // 1. Load TopoJSON from CDN
        const world = await d3.json(
            'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'
        );
        this.geoFeatures = topojson.feature(world, world.objects.countries);

        // Tag each feature with alpha-3 code
        for (const f of this.geoFeatures.features) {
            const id = String(f.id).padStart(3, '0');
            f.properties.alpha3 = ChoroplethMap.ISO_TO_ALPHA3[id] || null;
        }

        // 2. Setup SVG
        this.svg = d3.select(this.mapContainer).append('svg')
            .attr('viewBox', `0 0 ${this.width} ${this.height}`)
            .attr('preserveAspectRatio', 'xMidYMid meet')
            .style('width', '100%');

        this.mapGroup = this.svg.append('g');

        // Tooltip
        this.tooltip = d3.select('#choropleth-tooltip');

        // 3. Projection centered on EAP region
        this.projection = d3.geoMercator()
            .center([100, 5])
            .scale(230)
            .translate([this.width / 2, this.height / 2]);
        this.pathGen = d3.geoPath().projection(this.projection);

        // 5. Draw all country paths
        this.mapGroup.selectAll('path.country')
            .data(this.geoFeatures.features)
            .join('path')
            .classed('country', true)
            .attr('d', this.pathGen)
            .attr('fill', '#e0e0e0')
            .attr('stroke', '#fff')
            .attr('stroke-width', 0.5);

        // 6. Country labels (visible when zoomed in)
        this.#addCountryLabels();

        // 7. Zoom
        this.#setZoom();

        // 8. Region legend
        this.#buildLegend();

        // 9. Controls
        this.#setupControls();

        // 10. Initial render
        this.update(true);

        // 11. Match summary height to map SVG
        this.#matchSummaryHeight();
        window.addEventListener('resize', () => this.#matchSummaryHeight());
    }

    #matchSummaryHeight() {
        const wrapper = document.getElementById('choropleth-map-wrapper');
        if (wrapper) {
            const h = wrapper.getBoundingClientRect().height;
            d3.select(this.summaryContainer).style('height', h + 'px');
        }
    }

    #setZoom() {
        const zoom = d3.zoom()
            .scaleExtent([1, 8])
            .translateExtent([[0, 0], [this.width, this.height]])
            .on('zoom', ({ transform }) => {
                this.mapGroup.attr('transform', transform);
                // Show/hide labels based on zoom level
                this.mapGroup.selectAll('text.country-label')
                    .attr('visibility', transform.k >= 2.5 ? 'visible' : 'hidden');
            });
        this.svg.call(zoom);
    }

    #addCountryLabels() {
        const eapFeatures = this.geoFeatures.features.filter(
            f => f.properties.alpha3 && this.eapCodes.has(f.properties.alpha3)
        );

        this.mapGroup.selectAll('text.country-label')
            .data(eapFeatures)
            .join('text')
            .classed('country-label', true)
            .attr('x', d => this.pathGen.centroid(d)[0])
            .attr('y', d => this.pathGen.centroid(d)[1])
            .attr('text-anchor', 'middle')
            .attr('font-size', '5px')
            .attr('font-weight', '600')
            .attr('fill', '#222')
            .attr('paint-order', 'stroke')
            .attr('stroke', '#fff')
            .attr('stroke-width', '1.5px')
            .attr('pointer-events', 'none')
            .attr('visibility', 'hidden')
            .text(d => this.countryLookup[d.properties.alpha3]?.name || '');
    }

    #buildLegend() {
        const legendData = [
            { region: 'East Asia', color: '#4292c6' },
            { region: 'Southeast Asia', color: '#e6550d' },
            { region: 'Pacific', color: '#31a354' }
        ];

        const legend = d3.select('#choropleth-legend');
        legend.selectAll('.legend-item')
            .data(legendData)
            .join('div')
            .classed('legend-item', true)
            .html(d => `<div class="legend-swatch" style="background:${d.color}"></div>${d.region}`);
    }

    #setupControls() {
        const select = d3.select('#attribute-select');
        const entries = Object.entries(ChoroplethMap.ATTRIBUTES);

        select.selectAll('option')
            .data(entries)
            .join('option')
            .attr('value', ([key]) => key)
            .text(([, label]) => label);

        // year slider
        d3.select('#year-slider').on('input', (event) => {
            this.currentYear = +event.target.value;
            d3.select('#year-display').text(this.currentYear);
            this.update(false); // no animation for slider
        });

        // attribute dropdown
        select.on('change', (event) => {
            this.currentAttr = event.target.value;
            this.update(true); // animate on dropdown change
        });

        // play button
        this.#setupPlayButton();
    }

    #setupPlayButton() {
        this.playing = false;
        this.playInterval = null;
        const btn = d3.select('#play-btn');
        const playIcon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="#555" stroke="none"><polygon points="5,3 19,12 5,21"/></svg>';
        const pauseIcon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="#555" stroke="none"><rect x="5" y="3" width="4" height="18"/><rect x="15" y="3" width="4" height="18"/></svg>';

        btn.on('click', () => {
            this.playing = !this.playing;
            btn.html(this.playing ? pauseIcon : playIcon);

            if (this.playing) {
                // If at the end, restart from beginning
                if (this.currentYear >= 2023) {
                    this.currentYear = 2005;
                    d3.select('#year-slider').property('value', this.currentYear);
                    d3.select('#year-display').text(this.currentYear);
                    this.update(true);
                }
                this.playInterval = setInterval(() => {
                    this.currentYear++;
                    d3.select('#year-slider').property('value', this.currentYear);
                    d3.select('#year-display').text(this.currentYear);
                    this.update(true);

                    if (this.currentYear >= 2023) {
                        clearInterval(this.playInterval);
                        this.playing = false;
                        btn.html(playIcon);
                    }
                }, 300);
            } else {
                clearInterval(this.playInterval);
            }
        });
    }

    #getValues(year, attr) {
        // returns { alpha3Code: numericValue, ... }
        return Object.fromEntries(
            this.data
                .filter(d => d['Year'] === year && d[attr] != null && d[attr] !== '' && !isNaN(d[attr]) && +d[attr] !== 0)
                .map(d => [d['Country Code'], +d[attr]])
        );
    }

    #getRegionScales(values) {
        // Build per-region color scales
        const regionVals = { 'East Asia': [], 'Southeast Asia': [], 'Pacific': [] };

        for (const [code, val] of Object.entries(values)) {
            const info = this.countryLookup[code];
            if (info && regionVals[info.region]) {
                regionVals[info.region].push(val);
            }
        }

        const scales = {};
        for (const [region, vals] of Object.entries(regionVals)) {
            if (vals.length > 0) {
                // Map data domain to [0.3, 1.0] of the color scale
                // so low values still have visible color (not near-white)
                const extent = d3.extent(vals);
                const t = d3.scaleLinear().domain(extent).range([0.1, 1.0]);
                const interpolator = ChoroplethMap.REGION_COLORS[region];
                scales[region] = (val) => interpolator(t(val));
            }
        }
        return scales;
    }

    update(animate = true) {
        const values = this.#getValues(this.currentYear, this.currentAttr);
        const regionScales = this.#getRegionScales(values);

        const paths = this.mapGroup.selectAll('path.country');

        // Color update
        const selection = animate
            ? paths.transition().duration(400)
            : paths;

        selection.attr('fill', d => {
            const alpha3 = d.properties.alpha3;
            if (!alpha3 || values[alpha3] == null) return '#e0e0e0';
            const info = this.countryLookup[alpha3];
            if (!info || !regionScales[info.region]) return '#e0e0e0';
            return regionScales[info.region](values[alpha3]);
        });

        // Tooltip events (rebind so they use current values)
        paths
            .on('mouseover', (event, d) => {
                const alpha3 = d.properties.alpha3;
                const info = this.countryLookup[alpha3];

                // Only show tooltip for EAP countries
                if (!info) return;

                const val = values[alpha3];
                const label = ChoroplethMap.ATTRIBUTES[this.currentAttr] || this.currentAttr;
                this.tooltip.style('display', 'block')
                    .html(`<strong>${info.name}</strong><br><span style="color:#888">${info.region}</span><hr style="margin:4px 0;border:none;border-top:1px solid #ddd"><strong>${label}:</strong> ${val != null ? val.toLocaleString() : 'No data'}`);

                d3.select(event.currentTarget)
                    .attr('stroke', '#333')
                    .attr('stroke-width', 1.5);
            })
            .on('mousemove', (event) => {
                this.tooltip
                    .style('left', (event.pageX + 12) + 'px')
                    .style('top', (event.pageY - 28) + 'px');
            })
            .on('mouseout', (event) => {
                this.tooltip.style('display', 'none');
                d3.select(event.currentTarget)
                    .attr('stroke', '#fff')
                    .attr('stroke-width', 0.5);
            });

        // summary panel
        this.#updateSummary(values);
    }

    static REGION_DOT = {
        'East Asia': '#4292c6',
        'Southeast Asia': '#e6550d',
        'Pacific': '#31a354'
    };

    #updateSummary(values) {
        const label = ChoroplethMap.ATTRIBUTES[this.currentAttr] || this.currentAttr;

        const sorted = Object.entries(values)
            .map(([code, val]) => ({
                name: this.countryLookup[code]?.name || code,
                region: this.countryLookup[code]?.region || '',
                value: val
            }))
            .sort((a, b) => b.value - a.value);

        const top3 = sorted.slice(0, 3);
        const bot3 = sorted.slice(-3).reverse();
        const maxVal = sorted[0]?.value || 1;

        // Region averages
        const regionTotals = {};
        const regionCounts = {};
        for (const d of sorted) {
            if (!regionTotals[d.region]) { regionTotals[d.region] = 0; regionCounts[d.region] = 0; }
            regionTotals[d.region] += d.value;
            regionCounts[d.region]++;
        }

        const rankRow = (d, i, icon) => {
            const barW = Math.max(4, (d.value / maxVal) * 100);
            const color = ChoroplethMap.REGION_DOT[d.region] || '#999';
            return `
                <div class="summary-rank-row">
                    <span class="rank-num">${icon}${i + 1}</span>
                    <div class="rank-info">
                        <div class="rank-name">
                            <span class="region-dot" style="background:${color}"></span>
                            ${d.name}
                        </div>
                        <div class="rank-bar-track">
                            <div class="rank-bar" style="width:${barW}%;background:${color}"></div>
                        </div>
                        <div class="rank-value">${d.value.toLocaleString()}</div>
                    </div>
                </div>`;
        };

        const regionAvgHtml = Object.keys(regionTotals)
            .sort((a, b) => (regionTotals[b] / regionCounts[b]) - (regionTotals[a] / regionCounts[a]))
            .map(r => {
            const avg = (regionTotals[r] / regionCounts[r]);
            const color = ChoroplethMap.REGION_DOT[r] || '#999';
            return `<div class="region-avg-row">
                <span class="region-dot" style="background:${color}"></span>
                <span class="region-avg-name">${r}</span>
                <span class="region-avg-val">${avg.toLocaleString(undefined, {maximumFractionDigits: 1})}</span>
            </div>`;
        }).join('');

        d3.select(this.summaryContainer).html(`
            <div class="summary-header">
                <div class="summary-year">${this.currentYear}</div>
                <div class="summary-label">${label}</div>
            </div>
            <div class="summary-section">
                <div class="summary-section-title">▲ Highest</div>
                ${top3.map((d, i) => rankRow(d, i, '')).join('')}
            </div>
            <div class="summary-section">
                <div class="summary-section-title">▼ Lowest</div>
                ${bot3.map((d, i) => rankRow(d, i, '')).join('')}
            </div>
            <div class="summary-section">
                <div class="summary-section-title">Regional Averages</div>
                ${regionAvgHtml}
            </div>
        `);
    }
}
