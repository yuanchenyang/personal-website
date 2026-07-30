class MountainProjectDashboard {
    constructor() {
        this.csvParser = new CSVParser();
        this.analytics = null;
        this.chartManager = new ChartManager();
        this.renderedTabs = new Set();
        this.initializeEventListeners();
        this.loadBundledDataIfRequested();
    }

    // Visiting the page with ?ticks loads the export served alongside it, so a
    // deployment can show its owner's data without anyone uploading a file.
    // Same-origin, so no proxy and no CORS involved.
    loadBundledDataIfRequested() {
        if (!new URLSearchParams(window.location.search).has('ticks')) return;

        const link = document.getElementById('bundledDataLink');
        const file = link && link.dataset.file;
        if (file) this.loadBundledData(file, link.dataset.label || file);
    }

    async loadBundledData(path, label) {
        this.showLoading(true);

        try {
            const response = await fetch(path);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const data = this.csvParser.parseText(await response.text());
            if (data.length === 0) {
                throw new Error('No valid ticks found in the bundled export.');
            }

            this.presentData(data, label);

        } catch (error) {
            console.error('Error loading bundled ticks:', error);
            alert(`Could not load ${path}: ${error.message}`);
        } finally {
            this.showLoading(false);
        }
    }

    initializeEventListeners() {
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('fileInput');

        // Drag and drop events
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');

            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleFile(files[0]);
            }
        });

        // Click to upload
        uploadArea.addEventListener('click', () => {
            fileInput.click();
        });

        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleFile(e.target.files[0]);
            }
        });

        document.querySelectorAll('.tab-button').forEach(button => {
            button.addEventListener('click', () => this.showTab(button.dataset.tab));
        });

        document.querySelectorAll('.subtab-button').forEach(button => {
            button.addEventListener('click', () =>
                this.showMilestoneStyle(button.dataset.milestone, button.dataset.style));
        });
    }

    async handleFile(file) {
        if (!file.name.toLowerCase().endsWith('.csv')) {
            alert('Please upload a CSV file.');
            return;
        }

        this.showLoading(true);

        try {
            const data = await this.csvParser.parseFile(file);

            if (data.length === 0) {
                throw new Error('No valid data found in CSV file.');
            }

            this.presentData(data, null);

        } catch (error) {
            console.error('Error processing file:', error);
            alert('Error processing file: ' + error.message);
        } finally {
            this.showLoading(false);
        }
    }

    // Shared tail of both load paths. `source` is a human-readable name for the
    // bundled data, or null when the visitor uploaded their own file.
    presentData(data, source) {
        this.analytics = new AnalyticsEngine(data);
        this.chartManager.destroyAll();
        this.renderedTabs.clear();
        this.showDataSource(source);
        this.showDataNotice(data.length, this.csvParser.skipped);
        this.showDashboard(true);
        this.showTab('routes');
    }

    // Bundled data is somebody else's ticks, so say so and offer a way back to
    // the upload page.
    showDataSource(source) {
        const el = document.getElementById('dataSource');
        el.replaceChildren();

        if (!source) {
            el.hidden = true;
            return;
        }

        el.appendChild(document.createTextNode(`Showing ${source} — `));
        const link = document.createElement('a');
        link.href = window.location.pathname;
        link.textContent = 'upload your own instead';
        el.appendChild(link);
        el.hidden = false;
    }

    // Never let rows disappear without saying so.
    showDataNotice(loaded, skipped) {
        const notice = document.getElementById('dataNotice');
        if (!skipped || !skipped.total) {
            notice.hidden = true;
            return;
        }

        const parts = [];
        if (skipped.malformed) parts.push(`${skipped.malformed} with unexpected column counts`);
        if (skipped.undated) parts.push(`${skipped.undated} without a readable date`);

        notice.textContent =
            `Loaded ${loaded.toLocaleString()} ticks. ` +
            `Skipped ${skipped.total} row${skipped.total === 1 ? '' : 's'} (${parts.join(', ')}).`;
        notice.hidden = false;
    }

    // Charts must be built while their panel is visible: Chart.js sizes itself
    // from the canvas's rendered box, and a hidden panel measures zero.
    showTab(name) {
        document.querySelectorAll('.tab-button').forEach(button => {
            const active = button.dataset.tab === name;
            button.classList.toggle('is-active', active);
            button.setAttribute('aria-selected', active ? 'true' : 'false');
        });

        document.querySelectorAll('.tab-panel').forEach(panel => {
            const active = panel.id === `tab-${name}`;
            panel.classList.toggle('is-active', active);
            panel.hidden = !active;
        });

        if (!this.renderedTabs.has(name)) {
            this.renderedTabs.add(name);
            if (name === 'routes') this.renderRoutesTab();
            if (name === 'boulder') this.renderBoulderTab();
        }
    }

    // ------------------------------------------------------------ routes tab

    renderRoutesTab() {
        const a = this.analytics;

        this.renderHeadlineStats();
        this.renderStatsTable();

        this.chartManager.createYearlyHeatmap(
            'heatmapContainer',
            a.getYearlyHeatmapData(a.roped),
            a.getHeatmapThresholds(a.roped)
        );

        this.chartManager.createPagedMonthlyChart(
            'monthlyChart', 'monthlyChartNav', a.getMonthlyActivity(),
            'Pitches', 'No roped ticks yet.');

        const yearly = a.getYearlyTotals();
        this.chartManager.createStackedYearlyChart('pitchesPerYearChart', yearly, [
            { key: 'sport', label: 'Sport', color: VIZ.sport },
            { key: 'trad', label: 'Trad', color: VIZ.trad },
            { key: 'other', label: 'Other', color: VIZ.other }
        ], 'Pitches', 'No roped ticks yet.');

        this.chartManager.createYearlyBarChart('daysOutChart', yearly, 'daysOut', 'Days out');
        this.chartManager.createYearlyBarChart(
            'verticalFeetChart', yearly, 'verticalFeet', 'Vertical feet',
            v => `${Math.round(v).toLocaleString()}`
        );

        this.chartManager.createOnsightRateChart('onsightRateChart', [
            { label: 'Sport', color: VIZ.sport, rows: a.getOnsightRateByGrade('sport') },
            { label: 'Trad', color: VIZ.trad, rows: a.getOnsightRateByGrade('trad') }
        ], 'No lead attempts with a recorded style yet.');

        this.chartManager.createSendPyramid('pyramidChart', [
            { label: 'Sport', color: VIZ.sport, rows: a.getSendPyramid('sport') },
            { label: 'Trad', color: VIZ.trad, rows: a.getSendPyramid('trad') }
        ], 'No clean sends recorded yet.');

        this.chartManager.createMedianSendChart('medianSendChart', [
            { label: 'Sport', color: VIZ.sport, rows: a.getMedianSendProgression('sport') },
            { label: 'Trad', color: VIZ.trad, rows: a.getMedianSendProgression('trad') }
        ], GradeUtils.gradeToYDS, 'No clean sends recorded yet.');

        this.chartManager.createBestGradeChart(
            'sportGradesChart', a.getBestGradeProgression('sport'),
            GradeUtils.gradeToYDS, 'No sport sends recorded yet.'
        );
        this.chartManager.createBestGradeChart(
            'tradGradesChart', a.getBestGradeProgression('trad'),
            GradeUtils.gradeToYDS, 'No trad sends recorded yet.'
        );

        // One shared y-max so the two cards' bar heights are comparable.
        const sportDist = a.getGradeDistribution('sport');
        const tradDist = a.getGradeDistribution('trad');
        const sharedMax = Math.max(
            0,
            ...[...sportDist, ...tradDist].map(d => d.onsight + d.flash + d.redpoint + d.other)
        );

        this.chartManager.createStyleDistribution(
            'sportDistributionChart', sportDist, 'No graded sport ticks yet.', sharedMax);
        this.chartManager.createStyleDistribution(
            'tradDistributionChart', tradDist, 'No graded trad ticks yet.', sharedMax);

        this.showMilestoneStyle('routes', 'onsight');
    }

    renderHeadlineStats() {
        const s = this.analytics.getHeadlineStats();

        this.setText('kpiDaysLabel', `Days out in ${new Date().getFullYear()}`);
        this.setText('kpiDaysThisYear', s.daysOutThisYear);
        this.setText('kpiDaysAllTime', `${s.daysOutAllTime} all time`);
        this.setText('kpiPitches', s.totalPitches.toLocaleString());
        this.setText('kpiPitchesNote',
            s.longestStreak > 1 ? `${s.longestStreak} days on in a row` : '');
        this.setText('kpiVerticalFeet', s.verticalFeet ? s.verticalFeet.toLocaleString() : '—');
        this.setText('kpiVerticalNote',
            s.verticalFeet ? `${(s.verticalFeet / 5280).toFixed(1)} miles of route` : 'no lengths recorded');
        this.setText('kpiHardest', s.hardestSend);
        this.setText('kpiHardestNote',
            s.longestGap ? `longest layoff ${s.longestGap} days` : '');
    }

    renderStatsTable() {
        const stats = this.analytics.getTimePeriodStats();
        const periods = ['lastWeek', 'lastMonth', 'lastYear', 'allTime'];

        periods.forEach(period => {
            const p = stats[period];
            this.setText(`${period}Routes`, p.routes);
            this.setText(`${period}Total`, p.totalPitches);
            this.setText(`${period}Sport`, p.sportPitches);
            this.setText(`${period}Trad`, p.tradPitches);
            this.setText(`${period}Other`, p.otherPitches);
            this.setText(`${period}Days`, p.daysOut);
        });
    }

    // ----------------------------------------------------------- boulder tab

    renderBoulderTab() {
        const a = this.analytics;

        this.setBoulderEmpty(!a.boulder.length);
        if (!a.boulder.length) return;

        const head = a.getBoulderHeadlineStats();
        this.setText('bKpiProblems', head.problems.toLocaleString());
        this.setText('bKpiProblemsNote', `${head.sends} clean send${head.sends === 1 ? '' : 's'}`);
        this.setText('bKpiDays', head.daysOut);
        this.setText('bKpiHardest', head.hardestSend);
        this.setText('bKpiFlashRate', head.flashRate === null ? '—' : `${head.flashRate}%`);
        this.setText('bKpiFlashNote', head.flashRate === null ? 'no graded attempts' : 'sent first try');

        const stats = a.getBoulderPeriodStats();
        [['bLastWeek', 'lastWeek'], ['bLastMonth', 'lastMonth'],
         ['bLastYear', 'lastYear'], ['bAllTime', 'allTime']].forEach(([prefix, key]) => {
            const p = stats[key];
            this.setText(`${prefix}Problems`, p.problems);
            this.setText(`${prefix}Ticks`, p.ticks);
            this.setText(`${prefix}Sends`, p.sends);
            this.setText(`${prefix}Flashes`, p.flashes);
            this.setText(`${prefix}Hardest`, p.hardest);
            this.setText(`${prefix}Days`, p.daysOut);
        });

        // Bouldering counts ticks: a pitch count carries no meaning on a boulder.
        this.chartManager.createYearlyHeatmap(
            'boulderHeatmapContainer',
            a.getYearlyHeatmapData(a.boulder, 'ticks'),
            a.getHeatmapThresholds(a.boulder, 'ticks'),
            { one: 'tick', many: 'ticks' }
        );

        this.chartManager.createStyleDistribution(
            'boulderDistributionChart', a.getGradeDistribution('boulder'),
            'No graded boulder ticks yet.');

        this.chartManager.createSendPyramid('boulderPyramidChart', [
            { label: 'Boulder', color: VIZ.sport, rows: a.getSendPyramid('boulder') }
        ], 'No clean boulder sends recorded yet.');

        this.chartManager.createBestGradeChart(
            'boulderGradesChart', a.getBestGradeProgression('boulder'),
            VGradeUtils.toLabel, 'No boulder sends recorded yet.');

        this.chartManager.createOnsightRateChart('boulderFlashRateChart', [
            { label: 'Boulder', color: VIZ.sport, rows: a.getOnsightRateByGrade('boulder') }
        ], 'No boulder attempts with a recorded style yet.');

        this.chartManager.createPagedMonthlyChart(
            'boulderMonthlyChart', 'boulderMonthlyChartNav',
            a.getMonthlyActivity(a.boulder, 'ticks'), 'Ticks', 'No boulder ticks yet.');

        const boulderYearly = a.getYearlyTotals(a.boulder, 'ticks');
        this.chartManager.createYearlyBarChart(
            'boulderTicksPerYearChart', boulderYearly, 'ticks', 'Ticks');
        this.chartManager.createYearlyBarChart(
            'boulderDaysOutChart', boulderYearly, 'daysOut', 'Days out');

        this.chartManager.createMedianSendChart('boulderMedianChart', [
            { label: 'Boulder', color: VIZ.sport, rows: a.getMedianSendProgression('boulder') }
        ], VGradeUtils.toLabel, 'No boulder sends recorded yet.');

        this.showMilestoneStyle('boulder', 'flash');
    }

    // Toggles a placeholder without discarding the panel's markup, so loading a
    // second export that does have boulder ticks still finds its canvases.
    setBoulderEmpty(isEmpty) {
        const panel = document.getElementById('tab-boulder');
        let note = panel.querySelector('.tab-empty');

        if (!note) {
            note = document.createElement('p');
            note.className = 'tab-empty';
            note.innerHTML =
                'No bouldering ticks in this export.<br>' +
                'Ticks appear here when Mountain Project types the climb as ' +
                '<strong>Boulder</strong> and the rating includes a V grade.';
            panel.appendChild(note);
        }

        note.style.display = isEmpty ? 'block' : 'none';
        Array.from(panel.children).forEach(child => {
            if (child !== note) child.style.display = isEmpty ? 'none' : '';
        });
    }

    // ------------------------------------------------------------- shared UI

    // Milestone tables are split by style: Onsight / Redpoint for routes,
    // Flash / Send for boulders.
    showMilestoneStyle(group, style) {
        if (!this.analytics) return;

        document.querySelectorAll(`.subtab-button[data-milestone="${group}"]`).forEach(button => {
            const active = button.dataset.style === style;
            button.classList.toggle('is-active', active);
            button.setAttribute('aria-selected', active ? 'true' : 'false');
        });

        if (group === 'routes') {
            this.renderMilestones('milestonesTable', [
                ...this.analytics.getGradeMilestones('sport', style),
                ...this.analytics.getGradeMilestones('trad', style)
            ], true, style);
        } else {
            this.renderMilestones(
                'boulderMilestonesTable',
                this.analytics.getGradeMilestones('boulder', style),
                false, style);
        }
    }

    // Milestones arrive per discipline; merge them onto one hardest-first list.
    // Rows are built as DOM nodes rather than interpolated HTML: route names and
    // URLs come from an arbitrary uploaded file and must never be parsed as markup.
    renderMilestones(tableId, rows, showDiscipline, style = 'send') {
        const table = document.getElementById(tableId);
        const body = table.querySelector('tbody');
        body.replaceChildren();

        if (!rows.length) {
            const label = { onsight: 'onsights', flash: 'flashes',
                            redpoint: 'redpoints', send: 'clean sends' }[style] || 'ascents';
            const tr = document.createElement('tr');
            const td = document.createElement('td');
            td.colSpan = table.querySelectorAll('thead th').length;
            td.className = 'chart-empty';
            td.textContent = `No ${label} recorded yet.`;
            tr.appendChild(td);
            body.appendChild(tr);
            return;
        }

        // Sorted on the numeric grade, not a label lookup, so a grade outside the
        // known scale still sorts correctly.
        [...rows].sort((a, b) => b.value - a.value).forEach(row => {
            const tr = document.createElement('tr');

            tr.appendChild(this.cell(row.grade, 'grade-cell'));
            tr.appendChild(this.cell(row.date));

            const routeCell = document.createElement('td');
            const href = MountainProjectDashboard.safeUrl(row.url);
            if (href) {
                const link = document.createElement('a');
                link.href = href;
                link.target = '_blank';
                link.rel = 'noopener noreferrer';
                link.textContent = row.route;
                routeCell.appendChild(link);
            } else {
                routeCell.textContent = row.route;
            }
            tr.appendChild(routeCell);

            // The routes table names the discipline; the boulder table names the
            // style, which varies only on its "Send" tab.
            tr.appendChild(showDiscipline
                ? this.cell(row.discipline, 'capitalize')
                : this.cell(row.style));

            body.appendChild(tr);
        });
    }

    cell(text, className) {
        const td = document.createElement('td');
        if (className) td.className = className;
        td.textContent = text ?? '';
        return td;
    }

    // Only absolute http(s) links are followed; anything else (javascript:,
    // data:, or a value that is not a URL at all) renders as plain text.
    // Parsed without a base URL on purpose: resolving against the page would
    // turn arbitrary text into a valid same-origin link to nowhere.
    static safeUrl(value) {
        if (!value) return null;
        try {
            const url = new URL(String(value).trim());
            return (url.protocol === 'http:' || url.protocol === 'https:') ? url.href : null;
        } catch (error) {
            return null;
        }
    }

    setText(id, value) {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    }

    showLoading(show) {
        document.getElementById('loading').style.display = show ? 'block' : 'none';
    }

    showDashboard(show) {
        document.getElementById('dashboard').style.display = show ? 'block' : 'none';
        document.querySelector('.upload-section').style.display = show ? 'none' : 'block';
    }
}

// Initialize the dashboard when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new MountainProjectDashboard();
});
