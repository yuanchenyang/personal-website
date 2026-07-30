const CHART_SURFACE = '#f8f9fa';   // .chart-container background

class ChartManager {
    constructor() {
        this.charts = {};
    }

    // Splits items into fixed-size pages, aligned so the LAST page is full and
    // any short page is the oldest one. Every item appears in exactly one page.
    static pageSlices(items, pageSize) {
        if (!items.length) return [];

        const pageCount = Math.ceil(items.length / pageSize);
        const pages = [];
        for (let i = 0; i < pageCount; i++) {
            const end = items.length - (pageCount - 1 - i) * pageSize;
            pages.push(items.slice(Math.max(0, end - pageSize), end));
        }
        return pages;
    }

    // Union of several series' grade labels, ordered by the underlying numeric
    // grade so a merged axis never sorts "5.10a" next to "5.9" alphabetically.
    static mergeGradeLabels(series, direction = 'asc') {
        const byLabel = new Map();
        series.forEach(s => s.rows.forEach(r => {
            if (!byLabel.has(r.grade)) byLabel.set(r.grade, r.value);
        }));

        return [...byLabel.entries()]
            .sort((a, b) => (direction === 'asc' ? a[1] - b[1] : b[1] - a[1]))
            .map(([label]) => label);
    }

    // ------------------------------------------------------- shared plumbing

    // Hides a canvas behind a message instead of leaving an empty plot area.
    setEmpty(canvasId, message) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return true;

        if (this.charts[canvasId]) {
            this.charts[canvasId].destroy();
            delete this.charts[canvasId];
        }

        canvas.style.display = 'none';
        let note = canvas.parentElement.querySelector(`[data-empty-for="${canvasId}"]`);
        if (!note) {
            note = document.createElement('p');
            note.className = 'chart-empty';
            note.dataset.emptyFor = canvasId;
            canvas.parentElement.appendChild(note);
        }
        note.textContent = message;
        note.style.display = 'block';
        return true;
    }

    clearEmpty(canvasId) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return null;

        canvas.style.display = '';
        const note = canvas.parentElement.querySelector(`[data-empty-for="${canvasId}"]`);
        if (note) note.style.display = 'none';
        return canvas.getContext('2d');
    }

    render(canvasId, config) {
        // Chart.js is loaded from a CDN; on a locked-down network it may be
        // absent. Say so rather than throwing on every card.
        if (typeof Chart === 'undefined') {
            return this.setEmpty(canvasId, 'Charts unavailable: Chart.js failed to load.');
        }

        const ctx = this.clearEmpty(canvasId);
        if (!ctx) return;

        if (this.charts[canvasId]) this.charts[canvasId].destroy();
        this.charts[canvasId] = new Chart(ctx, config);
    }

    gridScale(titleText, extra = {}) {
        return {
            title: titleText ? { display: true, text: titleText, color: VIZ.axis } : { display: false },
            grid: { color: VIZ.grid, drawBorder: false },
            ticks: { color: VIZ.axis },
            ...extra
        };
    }

    // Grade axis with one tick per letter grade, so two adjacent ticks can never
    // round to the same label.
    gradeScale(values, labelFn) {
        const clean = values.filter(v => v !== null && v !== undefined);
        const min = clean.length ? Math.floor(Math.min(...clean)) : 0;
        const max = clean.length ? Math.ceil(Math.max(...clean)) : 1;
        const span = max - min;

        return this.gridScale('Grade', {
            min: Math.max(0, min - 1),
            max: max + 1,
            ticks: {
                color: VIZ.axis,
                stepSize: span > 14 ? 2 : 1,
                autoSkip: false,
                callback: value => (Number.isInteger(value) ? labelFn(value) : '')
            }
        });
    }

    baseOptions(extra = {}) {
        return {
            responsive: true,
            maintainAspectRatio: true,
            aspectRatio: 2,
            interaction: { intersect: false, mode: 'index' },
            ...extra
        };
    }

    legend(display = true) {
        return {
            display,
            position: 'top',
            labels: { usePointStyle: true, padding: 15, color: VIZ.axis }
        };
    }

    // Stacked/adjacent bar segments separated by a surface-colored gap rather
    // than an outline drawn around each mark.
    barSeries(label, data, color) {
        return {
            label,
            data,
            backgroundColor: color,
            borderColor: CHART_SURFACE,
            borderWidth: 2,
            borderRadius: 3
        };
    }

    // Straight segments only. Smoothing a grade series implies grades that were
    // never climbed and can overshoot the true maximum.
    lineSeries(label, data, color, extra = {}) {
        return {
            label,
            data,
            borderColor: color,
            backgroundColor: color,
            borderWidth: 2,
            tension: 0,
            fill: false,
            pointBackgroundColor: color,
            pointBorderColor: CHART_SURFACE,
            pointBorderWidth: 2,
            pointRadius: data.length > 60 ? 0 : 4,
            pointHoverRadius: 6,
            spanGaps: false,
            ...extra
        };
    }

    // ----------------------------------------------------------- heatmap

    // unit: the noun each cell counts ('pitch'/'pitches' roped, 'tick'/'ticks'
    // bouldering, where pitch counts mean nothing).
    createYearlyHeatmap(containerId, yearlyData, thresholds, unit = { one: 'pitch', many: 'pitches' }) {
        const container = document.getElementById(containerId);
        container.innerHTML = '';
        const plural = n => (n === 1 ? unit.one : unit.many);

        const years = Object.keys(yearlyData).sort().reverse();
        if (!years.length) {
            container.innerHTML = '<p class="chart-empty">No dated ticks yet.</p>';
            return;
        }

        let currentYearIndex = 0;

        const yearNav = document.createElement('div');
        yearNav.className = 'heatmap-year-nav';

        const prevButton = document.createElement('button');
        prevButton.textContent = '← Previous';
        prevButton.className = 'heatmap-nav-button';
        prevButton.disabled = currentYearIndex === years.length - 1;

        const yearDisplay = document.createElement('span');
        yearDisplay.className = 'heatmap-year-display';
        yearDisplay.textContent = years[currentYearIndex];

        const nextButton = document.createElement('button');
        nextButton.textContent = 'Next →';
        nextButton.className = 'heatmap-nav-button';
        nextButton.disabled = true;

        yearNav.appendChild(prevButton);
        yearNav.appendChild(yearDisplay);
        yearNav.appendChild(nextButton);
        container.appendChild(yearNav);

        const heatmapContainer = document.createElement('div');
        heatmapContainer.className = 'heatmap-display';
        container.appendChild(heatmapContainer);

        const levelFor = (pitches) => {
            if (pitches <= 0) return 0;
            if (pitches >= thresholds[2]) return 4;
            if (pitches >= thresholds[1]) return 3;
            if (pitches >= thresholds[0]) return 2;
            return 1;
        };

        const renderYear = (yearIndex) => {
            heatmapContainer.innerHTML = '';
            const year = Number(years[yearIndex]);

            // Grid and month labels share one content-width block so the whole
            // calendar can be centred as a unit and stay mutually aligned.
            const calendar = document.createElement('div');
            calendar.className = 'heatmap-calendar';

            const heatmapWrapper = document.createElement('div');
            heatmapWrapper.className = 'heatmap-wrapper';

            const startDate = new Date(year, 0, 1);
            const endDate = new Date(year, 11, 31);

            // Align the first column to the Monday on or before Jan 1.
            const firstDay = new Date(startDate);
            const dayOfWeek = firstDay.getDay();
            firstDay.setDate(firstDay.getDate() + (dayOfWeek === 0 ? -6 : 1 - dayOfWeek));

            const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
            const labelColumn = document.createElement('div');
            labelColumn.className = 'heatmap-day-labels';
            dayLabels.forEach(label => {
                const labelEl = document.createElement('div');
                labelEl.textContent = label;
                labelColumn.appendChild(labelEl);
            });
            heatmapWrapper.appendChild(labelColumn);

            const heatmapGrid = document.createElement('div');
            heatmapGrid.className = 'heatmap-grid';
            const monthLabels = {};

            for (let week = 0; week < 53; week++) {
                const weekColumn = document.createElement('div');
                weekColumn.className = 'heatmap-week';

                for (let day = 0; day < 7; day++) {
                    const currentDate = new Date(firstDay);
                    currentDate.setDate(currentDate.getDate() + (week * 7) + day);

                    const dayElement = document.createElement('div');
                    dayElement.className = 'heatmap-day';

                    if (currentDate >= startDate && currentDate <= endDate) {
                        const monthName = currentDate.toLocaleDateString('en-US', { month: 'short' });
                        if (!monthLabels[week] || day === 0) monthLabels[week] = monthName;

                        // Local day key -- must match how the data was bucketed.
                        const pitchCount = yearlyData[year][DateUtils.dayKey(currentDate)] || 0;
                        const level = levelFor(pitchCount);

                        if (level > 0) {
                            dayElement.classList.add(`level-${level}`);
                            dayElement.title =
                                `${DateUtils.formatDay(currentDate)}: ${pitchCount} ${plural(pitchCount)}`;
                        } else {
                            dayElement.title = `${DateUtils.formatDay(currentDate)}: rest day`;
                        }
                    } else {
                        dayElement.classList.add('outside-year');
                    }

                    weekColumn.appendChild(dayElement);
                }

                heatmapGrid.appendChild(weekColumn);
            }

            heatmapWrapper.appendChild(heatmapGrid);
            calendar.appendChild(heatmapWrapper);

            const monthLabelRow = document.createElement('div');
            monthLabelRow.className = 'heatmap-month-labels';
            let lastMonth = '';
            for (let week = 0; week < 53; week++) {
                const monthLabel = document.createElement('div');
                monthLabel.className = 'heatmap-month-label';
                if (monthLabels[week] && monthLabels[week] !== lastMonth) {
                    monthLabel.textContent = monthLabels[week];
                    lastMonth = monthLabels[week];
                }
                monthLabelRow.appendChild(monthLabel);
            }
            calendar.appendChild(monthLabelRow);
            heatmapContainer.appendChild(calendar);

            const total = Object.values(yearlyData[year] || {}).reduce((s, v) => s + v, 0);
            const daysOut = Object.keys(yearlyData[year] || {}).length;
            const summary = document.createElement('p');
            summary.className = 'heatmap-summary';
            summary.textContent =
                `${daysOut} day${daysOut === 1 ? '' : 's'} out · ${total} ${plural(total)} in ${year}`;
            heatmapContainer.appendChild(summary);
        };

        prevButton.addEventListener('click', () => {
            if (currentYearIndex < years.length - 1) {
                currentYearIndex++;
                yearDisplay.textContent = years[currentYearIndex];
                prevButton.disabled = currentYearIndex === years.length - 1;
                nextButton.disabled = false;
                renderYear(currentYearIndex);
            }
        });

        nextButton.addEventListener('click', () => {
            if (currentYearIndex > 0) {
                currentYearIndex--;
                yearDisplay.textContent = years[currentYearIndex];
                nextButton.disabled = currentYearIndex === 0;
                prevButton.disabled = false;
                renderYear(currentYearIndex);
            }
        });

        renderYear(currentYearIndex);

        // Legend carries the actual pitch counts each shade means.
        const legend = document.createElement('div');
        legend.className = 'heatmap-legend';
        legend.innerHTML = `
            <span>Rest</span>
            <div class="heatmap-legend-item">
                <div class="heatmap-day" title="no ${unit.many}"></div>
                <div class="heatmap-day level-1" title="1 to ${thresholds[0] - 1 || 1} ${unit.many}"></div>
                <div class="heatmap-day level-2" title="${thresholds[0]}+ ${unit.many}"></div>
                <div class="heatmap-day level-3" title="${thresholds[1]}+ ${unit.many}"></div>
                <div class="heatmap-day level-4" title="${thresholds[2]}+ ${unit.many}"></div>
            </div>
            <span>${thresholds[2]}+ ${unit.many}</span>
        `;
        container.appendChild(legend);
    }

    // ------------------------------------------------------ activity charts

    // Month-by-month bars, paged a year at a time so every month keeps its own
    // labelled slot instead of being auto-skipped off a crowded axis.
    // navId is the element that holds the Previous/Next controls.
    createPagedMonthlyChart(canvasId, navId, months, yAxisLabel, emptyMessage) {
        const nav = document.getElementById(navId);
        if (nav) nav.innerHTML = '';

        if (!months.length) {
            return this.setEmpty(canvasId, emptyMessage);
        }

        const pages = ChartManager.pageSlices(months, 12);
        const pageCount = pages.length;
        let pageIndex = pageCount - 1;

        const prevButton = document.createElement('button');
        prevButton.type = 'button';
        prevButton.className = 'heatmap-nav-button';
        prevButton.textContent = '← Previous';

        const rangeDisplay = document.createElement('span');
        rangeDisplay.className = 'heatmap-year-display chart-range';

        const nextButton = document.createElement('button');
        nextButton.type = 'button';
        nextButton.className = 'heatmap-nav-button';
        nextButton.textContent = 'Next →';

        if (nav) {
            nav.appendChild(prevButton);
            nav.appendChild(rangeDisplay);
            nav.appendChild(nextButton);
        }

        const draw = () => {
            const page = pages[pageIndex];
            const hasOther = page.some(p => p.other > 0);

            const datasets = [
                this.barSeries('Sport', page.map(p => p.sport), VIZ.sport),
                this.barSeries('Trad', page.map(p => p.trad), VIZ.trad)
            ];
            if (hasOther) {
                datasets.push(this.barSeries('Other', page.map(p => p.other), VIZ.other));
            }

            // One y-scale across every page, so paging cannot make a quiet month
            // look like a busy one.
            const maxTotal = Math.max(1, ...months.map(p => p.sport + p.trad + p.other));

            this.render(canvasId, {
                type: 'bar',
                data: { labels: page.map(p => p.label.replace(' ', '\n').split('\n')), datasets },
                options: this.baseOptions({
                    plugins: { legend: this.legend(true) },
                    scales: {
                        x: this.gridScale('Month', {
                            stacked: true,
                            ticks: { color: VIZ.axis, autoSkip: false, maxRotation: 0 }
                        }),
                        y: this.gridScale(yAxisLabel, {
                            stacked: true,
                            beginAtZero: true,
                            suggestedMax: maxTotal
                        })
                    }
                })
            });

            prevButton.disabled = pageIndex === 0;
            nextButton.disabled = pageIndex === pageCount - 1;
            rangeDisplay.textContent = page.length
                ? `${page[0].label} – ${page[page.length - 1].label}`
                : '';
        };

        prevButton.addEventListener('click', () => {
            if (pageIndex > 0) { pageIndex--; draw(); }
        });
        nextButton.addEventListener('click', () => {
            if (pageIndex < pageCount - 1) { pageIndex++; draw(); }
        });

        draw();
    }

    // Stacked yearly bar split by discipline.
    createStackedYearlyChart(canvasId, rows, valueKeys, yAxisLabel, emptyMessage) {
        if (!rows.length) {
            return this.setEmpty(canvasId, emptyMessage);
        }

        const datasets = valueKeys
            .filter(({ key }) => rows.some(r => r[key] > 0))
            .map(({ key, label, color }) => this.barSeries(label, rows.map(r => r[key]), color));

        this.render(canvasId, {
            type: 'bar',
            data: { labels: rows.map(r => r.year), datasets },
            options: this.baseOptions({
                plugins: { legend: this.legend(datasets.length > 1) },
                scales: {
                    x: this.gridScale('Year', { stacked: true }),
                    y: this.gridScale(yAxisLabel, { stacked: true, beginAtZero: true })
                }
            })
        });
    }

    // Single-series yearly bar (days out, vertical feet).
    createYearlyBarChart(canvasId, rows, valueKey, yAxisLabel, formatter = v => v) {
        if (!rows.length) {
            return this.setEmpty(canvasId, 'Not enough data yet.');
        }

        this.render(canvasId, {
            type: 'bar',
            data: {
                labels: rows.map(r => r.year),
                datasets: [this.barSeries(yAxisLabel, rows.map(r => r[valueKey]), VIZ.sport)]
            },
            options: this.baseOptions({
                plugins: {
                    legend: this.legend(false),
                    tooltip: {
                        callbacks: {
                            label: ctx => `${yAxisLabel}: ${formatter(ctx.parsed.y)}`
                        }
                    }
                },
                scales: {
                    x: this.gridScale('Year'),
                    y: this.gridScale(yAxisLabel, {
                        beginAtZero: true,
                        ticks: { color: VIZ.axis, callback: v => formatter(v) }
                    })
                }
            })
        });
    }

    // ------------------------------------------------------ grade over time

    createBestGradeChart(canvasId, rows, labelFn, emptyMessage) {
        if (!rows.length) {
            return this.setEmpty(canvasId, emptyMessage);
        }

        const values = rows.flatMap(r => [r.bestSend, r.bestOnsight]);

        this.render(canvasId, {
            type: 'line',
            data: {
                labels: rows.map(r => DateUtils.monthLabel(r.month)),
                datasets: [
                    // stepped: a personal best holds until it is beaten.
                    this.lineSeries('Best send', rows.map(r => r.bestSend), VIZ.redpoint, { stepped: true }),
                    this.lineSeries('Best onsight / flash', rows.map(r => r.bestOnsight), VIZ.onsight, { stepped: true })
                ]
            },
            options: this.baseOptions({
                plugins: {
                    legend: this.legend(true),
                    tooltip: {
                        callbacks: {
                            label: ctx => ctx.parsed.y === null
                                ? null
                                : `${ctx.dataset.label}: ${labelFn(ctx.parsed.y)}`
                        }
                    }
                },
                scales: {
                    x: this.gridScale('Month', {
                        ticks: { color: VIZ.axis, autoSkip: true, maxRotation: 0, maxTicksLimit: 12 }
                    }),
                    y: this.gradeScale(values, labelFn)
                }
            })
        });
    }

    createMedianSendChart(canvasId, series, labelFn, emptyMessage) {
        const active = series.filter(s => s.rows.length);
        if (!active.length) {
            return this.setEmpty(canvasId, emptyMessage);
        }

        // Union of months so both disciplines share one x-axis.
        const months = [...new Set(active.flatMap(s => s.rows.map(r => r.month)))].sort();
        const datasets = active.map(s => {
            const lookup = {};
            s.rows.forEach(r => { lookup[r.month] = r.medianGrade; });
            return this.lineSeries(s.label, months.map(m => (m in lookup ? lookup[m] : null)), s.color);
        });

        const values = datasets.flatMap(d => d.data);

        this.render(canvasId, {
            type: 'line',
            data: { labels: months.map(DateUtils.monthLabel), datasets },
            options: this.baseOptions({
                plugins: {
                    legend: this.legend(datasets.length > 1),
                    tooltip: {
                        callbacks: {
                            label: ctx => ctx.parsed.y === null
                                ? null
                                : `${ctx.dataset.label}: ${labelFn(ctx.parsed.y)}`
                        }
                    }
                },
                scales: {
                    x: this.gridScale('Month', {
                        ticks: { color: VIZ.axis, autoSkip: true, maxRotation: 0, maxTicksLimit: 12 }
                    }),
                    y: this.gradeScale(values, labelFn)
                }
            })
        });
    }

    // -------------------------------------------------------- distribution

    // Onsight / Flash / Redpoint / Other, in ticks. sharedMax lets the sport and
    // trad cards use one scale so their bar heights are comparable.
    createStyleDistribution(canvasId, data, emptyMessage, sharedMax = null) {
        if (!data.length) {
            return this.setEmpty(canvasId, emptyMessage);
        }

        this.render(canvasId, {
            type: 'bar',
            data: {
                labels: data.map(d => d.grade),
                datasets: [
                    this.barSeries('Onsight', data.map(d => d.onsight), VIZ.onsight),
                    this.barSeries('Flash', data.map(d => d.flash), VIZ.flash),
                    this.barSeries('Redpoint', data.map(d => d.redpoint), VIZ.redpoint),
                    this.barSeries('Other', data.map(d => d.other), VIZ.other)
                ]
            },
            options: this.baseOptions({
                plugins: { legend: this.legend(true) },
                scales: {
                    x: this.gridScale('Grade', { stacked: true }),
                    y: this.gridScale('Ticks', {
                        stacked: true,
                        beginAtZero: true,
                        ...(sharedMax ? { suggestedMax: sharedMax } : {})
                    })
                }
            })
        });
    }

    // ------------------------------------------------------- onsight rate

    createOnsightRateChart(canvasId, series, emptyMessage) {
        const active = series.filter(s => s.rows.length);
        if (!active.length) {
            return this.setEmpty(canvasId, emptyMessage);
        }

        const labels = ChartManager.mergeGradeLabels(active, 'asc');

        const datasets = active.map(s => {
            const lookup = {};
            s.rows.forEach(r => { lookup[r.grade] = r; });
            return {
                ...this.lineSeries(s.label, labels.map(g => (lookup[g] ? lookup[g].rate : null)), s.color, {
                    spanGaps: true
                }),
                attempts: labels.map(g => (lookup[g] ? lookup[g].attempts : 0))
            };
        });

        this.render(canvasId, {
            type: 'line',
            data: { labels, datasets },
            options: this.baseOptions({
                plugins: {
                    legend: this.legend(datasets.length > 1),
                    tooltip: {
                        callbacks: {
                            label: (ctx) => {
                                if (ctx.parsed.y === null) return null;
                                const n = ctx.dataset.attempts[ctx.dataIndex];
                                return `${ctx.dataset.label}: ${Math.round(ctx.parsed.y)}% first try (${n} lead attempt${n === 1 ? '' : 's'})`;
                            }
                        }
                    }
                },
                scales: {
                    x: this.gridScale('Grade'),
                    y: this.gridScale('First-try success', {
                        beginAtZero: true,
                        max: 100,
                        ticks: { color: VIZ.axis, callback: v => `${v}%` }
                    })
                }
            })
        });
    }

    // ----------------------------------------------------------- pyramid

    // Horizontal bars, hardest grade at the top -- the shape climbers read as a
    // pyramid, and long grade labels sit better on the y-axis.
    createSendPyramid(canvasId, series, emptyMessage) {
        const active = series.filter(s => s.rows.length);
        if (!active.length) {
            return this.setEmpty(canvasId, emptyMessage);
        }

        const labels = ChartManager.mergeGradeLabels(active, 'desc');
        const datasets = active.map(s => {
            const lookup = {};
            s.rows.forEach(r => { lookup[r.grade] = r.count; });
            return this.barSeries(s.label, labels.map(g => lookup[g] || 0), s.color);
        });

        this.render(canvasId, {
            type: 'bar',
            data: { labels, datasets },
            options: this.baseOptions({
                indexAxis: 'y',
                aspectRatio: 1.3,
                plugins: { legend: this.legend(datasets.length > 1) },
                scales: {
                    x: this.gridScale('Sends', { beginAtZero: true, ticks: { color: VIZ.axis, precision: 0 } }),
                    y: this.gridScale('Grade', { grid: { display: false } })
                }
            })
        });
    }

    destroyAll() {
        Object.values(this.charts).forEach(chart => {
            if (chart) chart.destroy();
        });
        this.charts = {};
    }
}
