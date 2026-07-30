class AnalyticsEngine {
    constructor(data) {
        this.data = data;
        this.roped = data.filter(d => d.discipline !== 'boulder');
        this.boulder = data.filter(d => d.isBoulder);
    }

    // ---------------------------------------------------------------- helpers

    // Ticks of one discipline that carry a grade on the relevant scale.
    graded(discipline) {
        return this.data.filter(d => d.discipline === discipline && d.gradeValue !== null);
    }

    static daysOut(rows) {
        return new Set(rows.map(d => DateUtils.dayKey(d.date))).size;
    }

    // ------------------------------------------------------- period overview

    getTimePeriodStats(rows = this.roped) {
        const now = new Date();
        const daysAgo = n => new Date(now.getFullYear(), now.getMonth(), now.getDate() - n);

        const calculateStats = (filterDate) => {
            const filtered = filterDate ? rows.filter(d => d.date >= filterDate) : rows;

            // Each tick belongs to exactly one discipline, so these columns sum
            // to the total instead of double-counting "Trad, Sport" routes.
            const pitchesFor = disc =>
                filtered.reduce((sum, d) => sum + (d.discipline === disc ? d.pitches : 0), 0);

            return {
                routes: new Set(filtered.map(d => d.url || d.route)).size,
                totalPitches: filtered.reduce((sum, d) => sum + d.pitches, 0),
                sportPitches: pitchesFor('sport'),
                tradPitches: pitchesFor('trad'),
                otherPitches: pitchesFor('other'),
                daysOut: AnalyticsEngine.daysOut(filtered)
            };
        };

        return {
            lastWeek: calculateStats(daysAgo(7)),
            lastMonth: calculateStats(daysAgo(30)),
            lastYear: calculateStats(daysAgo(365)),
            allTime: calculateStats(null)
        };
    }

    getBoulderPeriodStats() {
        const now = new Date();
        const daysAgo = n => new Date(now.getFullYear(), now.getMonth(), now.getDate() - n);

        const calculateStats = (filterDate) => {
            const filtered = filterDate ? this.boulder.filter(d => d.date >= filterDate) : this.boulder;
            const sends = filtered.filter(d => d.isSend);
            const hardest = sends.length ? Math.max(...sends.map(d => d.vGrade)) : null;

            return {
                problems: new Set(filtered.map(d => d.url || d.route)).size,
                ticks: filtered.length,
                sends: sends.length,
                flashes: filtered.filter(d => d.isFlash).length,
                hardest: hardest === null ? '—' : VGradeUtils.toLabel(hardest),
                daysOut: AnalyticsEngine.daysOut(filtered)
            };
        };

        return {
            lastWeek: calculateStats(daysAgo(7)),
            lastMonth: calculateStats(daysAgo(30)),
            lastYear: calculateStats(daysAgo(365)),
            allTime: calculateStats(null)
        };
    }

    // ------------------------------------------------------------- headlines

    getHeadlineStats() {
        const thisYear = new Date().getFullYear();
        const yearRows = this.roped.filter(d => d.date.getFullYear() === thisYear);
        const sends = this.roped.filter(d => d.isSend && d.rating !== null);
        const best = sends.length ? Math.max(...sends.map(d => d.rating)) : null;
        const streaks = this.getStreaks();

        return {
            daysOutThisYear: AnalyticsEngine.daysOut(yearRows),
            daysOutAllTime: AnalyticsEngine.daysOut(this.roped),
            totalPitches: this.roped.reduce((s, d) => s + d.pitches, 0),
            verticalFeet: this.roped.reduce((s, d) => s + (d.length || 0), 0),
            hardestSend: best === null ? '—' : GradeUtils.gradeToYDS(best),
            longestStreak: streaks.longestStreak,
            longestGap: streaks.longestGap
        };
    }

    getBoulderHeadlineStats() {
        const sends = this.boulder.filter(d => d.isSend && d.vGrade !== null);
        const best = sends.length ? Math.max(...sends.map(d => d.vGrade)) : null;
        const attempts = this.boulder.filter(d => d.vGrade !== null).length;
        const flashes = this.boulder.filter(d => d.isFlash).length;

        return {
            problems: new Set(this.boulder.map(d => d.url || d.route)).size,
            sends: sends.length,
            daysOut: AnalyticsEngine.daysOut(this.boulder),
            hardestSend: best === null ? '—' : VGradeUtils.toLabel(best),
            flashRate: attempts ? Math.round((100 * flashes) / attempts) : null
        };
    }

    // Consecutive-days streak and the longest layoff between climbing days.
    getStreaks(rows = this.roped) {
        const days = [...new Set(rows.map(d => DateUtils.dayKey(d.date)))].sort();
        if (!days.length) return { longestStreak: 0, longestGap: 0 };

        const DAY = 24 * 60 * 60 * 1000;
        let streak = 1, longestStreak = 1, longestGap = 0;

        for (let i = 1; i < days.length; i++) {
            const gap = Math.round((new Date(days[i]) - new Date(days[i - 1])) / DAY);
            if (gap === 1) {
                streak++;
                longestStreak = Math.max(longestStreak, streak);
            } else {
                streak = 1;
                longestGap = Math.max(longestGap, gap - 1);
            }
        }

        return { longestStreak, longestGap };
    }

    // ------------------------------------------------------------- heatmap

    // countBy is 'pitches' for roped climbing and 'ticks' for bouldering, where a
    // pitch count carries no meaning.
    getYearlyHeatmapData(rows = this.data, countBy = 'pitches') {
        const yearlyData = {};

        rows.forEach(climb => {
            const year = climb.date.getFullYear();
            const dateKey = DateUtils.dayKey(climb.date);
            const amount = countBy === 'ticks' ? 1 : climb.pitches;

            if (!yearlyData[year]) yearlyData[year] = {};
            yearlyData[year][dateKey] = (yearlyData[year][dateKey] || 0) + amount;
        });

        return yearlyData;
    }

    // Level thresholds from the climber's own distribution, so a big-wall day and
    // a single-pitch cragging day are not both pinned to the darkest shade.
    getHeatmapThresholds(rows = this.data, countBy = 'pitches') {
        const perDay = {};
        rows.forEach(d => {
            const key = DateUtils.dayKey(d.date);
            perDay[key] = (perDay[key] || 0) + (countBy === 'ticks' ? 1 : d.pitches);
        });

        const counts = Object.values(perDay);
        if (!counts.length) return [1, 2, 3];

        const raw = [0.4, 0.7, 0.9].map(q => Math.round(StatUtils.quantile(counts, q)));

        // Keep the bands strictly increasing even for narrow distributions.
        const thresholds = [];
        raw.forEach((v, i) => {
            const floor = i === 0 ? 1 : thresholds[i - 1] + 1;
            thresholds.push(Math.max(v, floor));
        });
        return thresholds;
    }

    // ----------------------------------------------------- grade progression

    // Personal best over time: a monotonic staircase. Monthly maxima jump around
    // with a single lucky send, and drawing them as a smoothed line through
    // missing months invents progress that never happened.
    getBestGradeProgression(discipline) {
        const rows = this.graded(discipline)
            .filter(d => d.isSend)
            .sort((a, b) => a.date - b.date);

        if (!rows.length) return [];

        const months = DateUtils.monthRange(
            DateUtils.monthKey(rows[0].date),
            DateUtils.monthKey(rows[rows.length - 1].date)
        );

        const bestRedpointBy = {};
        const bestOnsightBy = {};
        rows.forEach(d => {
            const key = DateUtils.monthKey(d.date);
            // A redpoint-grade PR counts any send; onsight/flash are stricter.
            bestRedpointBy[key] = Math.max(bestRedpointBy[key] ?? -Infinity, d.gradeValue);
            if (d.isOnsight || d.isFlash) {
                bestOnsightBy[key] = Math.max(bestOnsightBy[key] ?? -Infinity, d.gradeValue);
            }
        });

        let runningRedpoint = null;
        let runningOnsight = null;

        return months.map(month => {
            if (bestRedpointBy[month] !== undefined) {
                runningRedpoint = Math.max(runningRedpoint ?? -Infinity, bestRedpointBy[month]);
            }
            if (bestOnsightBy[month] !== undefined) {
                runningOnsight = Math.max(runningOnsight ?? -Infinity, bestOnsightBy[month]);
            }
            return { month, bestSend: runningRedpoint, bestOnsight: runningOnsight };
        });
    }

    // Current form: median grade of sends per month, over a uniform month axis.
    getMedianSendProgression(discipline) {
        const rows = this.graded(discipline)
            .filter(d => d.isSend)
            .sort((a, b) => a.date - b.date);

        if (!rows.length) return [];

        const byMonth = {};
        rows.forEach(d => {
            const key = DateUtils.monthKey(d.date);
            (byMonth[key] = byMonth[key] || []).push(d.gradeValue);
        });

        return DateUtils.monthRange(
            DateUtils.monthKey(rows[0].date),
            DateUtils.monthKey(rows[rows.length - 1].date)
        ).map(month => ({
            month,
            medianGrade: byMonth[month] ? StatUtils.median(byMonth[month]) : null
        }));
    }

    // ---------------------------------------------------- grade distribution

    // Onsight / Flash / Redpoint / Other, counted in ticks. Pitches would let one
    // 5-pitch route contribute 5 to a grade the climber did once.
    getGradeDistribution(discipline) {
        const distribution = {};

        this.graded(discipline).forEach(climb => {
            const label = discipline === 'boulder'
                ? VGradeUtils.toLabel(climb.gradeValue)
                : GradeUtils.gradeToYDS(climb.gradeValue);

            if (!distribution[label]) {
                distribution[label] = {
                    onsight: 0, flash: 0, redpoint: 0, other: 0,
                    numericValue: climb.gradeValue
                };
            }
            distribution[label][climb.styleBucket] += 1;
        });

        return Object.keys(distribution)
            .sort((a, b) => distribution[a].numericValue - distribution[b].numericValue)
            .map(grade => ({ grade, ...distribution[grade] }));
    }

    // ---------------------------------------------------------- onsight rate

    // Share of lead attempts at each grade that went first try (onsight or flash).
    // Where this crosses ~50% is a more honest read on ability than a max grade.
    getOnsightRateByGrade(discipline) {
        const buckets = {};

        this.graded(discipline)
            .filter(d => d.isLeadAttempt)
            .forEach(d => {
                const label = discipline === 'boulder'
                    ? VGradeUtils.toLabel(d.gradeValue)
                    : GradeUtils.gradeToYDS(d.gradeValue);

                if (!buckets[label]) {
                    buckets[label] = { attempts: 0, firstTry: 0, numericValue: d.gradeValue };
                }
                buckets[label].attempts += 1;
                if (d.isOnsight || d.isFlash) buckets[label].firstTry += 1;
            });

        return Object.keys(buckets)
            .sort((a, b) => buckets[a].numericValue - buckets[b].numericValue)
            .map(grade => ({
                grade,
                value: buckets[grade].numericValue,
                attempts: buckets[grade].attempts,
                firstTry: buckets[grade].firstTry,
                rate: (100 * buckets[grade].firstTry) / buckets[grade].attempts
            }));
    }

    // -------------------------------------------------------- send pyramid

    // Sends per grade, hardest at the top. Grades between the hardest send and
    // four below are always present so gaps in the pyramid are visible.
    getSendPyramid(discipline, depth = 8) {
        const sends = this.graded(discipline).filter(d => d.isSend);
        if (!sends.length) return [];

        const counts = {};
        sends.forEach(d => {
            counts[d.gradeValue] = (counts[d.gradeValue] || 0) + 1;
        });

        const hardest = Math.max(...sends.map(d => d.gradeValue));
        const softest = Math.min(...sends.map(d => d.gradeValue));
        const floor = Math.max(softest, hardest - depth + 1);
        const label = discipline === 'boulder' ? VGradeUtils.toLabel : GradeUtils.gradeToYDS;

        const rows = [];
        for (let g = hardest; g >= floor; g--) {
            rows.push({ grade: label(g), value: g, count: counts[g] || 0 });
        }
        return rows;
    }

    // ----------------------------------------------------------- milestones

    // First ascent at every letter grade, in a given style. `style` is one of
    // 'onsight' | 'flash' | 'redpoint' | 'send' ('send' = any clean send).
    getGradeMilestones(discipline, style = 'send') {
        const matches = {
            onsight: d => d.isOnsight,
            flash: d => d.isFlash,
            redpoint: d => d.isRedpoint,
            send: d => d.isSend
        }[style];

        const firstByGrade = {};

        this.graded(discipline)
            .filter(matches)
            .sort((a, b) => a.date - b.date)
            .forEach(d => {
                if (firstByGrade[d.gradeValue] === undefined) {
                    firstByGrade[d.gradeValue] = d;
                }
            });

        const label = discipline === 'boulder' ? VGradeUtils.toLabel : GradeUtils.gradeToYDS;

        return Object.keys(firstByGrade)
            .map(Number)
            .sort((a, b) => b - a)
            .map(value => {
                const d = firstByGrade[value];
                return {
                    grade: label(value),
                    value,
                    date: DateUtils.formatDay(d.date),
                    route: d.route,
                    url: d.url,
                    style: d.isOnsight ? 'Onsight' : d.isFlash ? 'Flash' : 'Redpoint',
                    discipline: d.discipline
                };
            });
    }

    // ------------------------------------------------------ activity by time

    // Every calendar month from the first tick to the last, zero-filled, so the
    // axis is uniform time. The chart pages through this a year at a time; the
    // long view lives in the per-year charts.
    getMonthlyActivity(rows = this.roped, countBy = 'pitches') {
        if (!rows.length) return [];

        const sorted = [...rows].sort((a, b) => a.date - b.date);
        const months = DateUtils.monthRange(
            DateUtils.monthKey(sorted[0].date),
            DateUtils.monthKey(sorted[sorted.length - 1].date)
        );

        const buckets = {};
        months.forEach(k => { buckets[k] = { sport: 0, trad: 0, other: 0, days: new Set() }; });

        rows.forEach(d => {
            const bucket = buckets[DateUtils.monthKey(d.date)];
            if (!bucket) return;
            const amount = countBy === 'ticks' ? 1 : d.pitches;
            bucket[d.discipline === 'boulder' ? 'other' : d.discipline] += amount;
            bucket.days.add(DateUtils.dayKey(d.date));
        });

        return months.map(key => ({
            key,
            label: DateUtils.monthLabel(key),
            sport: buckets[key].sport,
            trad: buckets[key].trad,
            other: buckets[key].other,
            days: buckets[key].days.size
        }));
    }

    // Per calendar year: days out, vertical feet, and pitches split by discipline.
    getYearlyTotals(rows = this.roped, countBy = 'pitches') {
        if (!rows.length) return [];

        const years = {};
        rows.forEach(d => {
            const y = d.date.getFullYear();
            if (!years[y]) {
                years[y] = { days: new Set(), feet: 0, total: 0, ticks: 0, sport: 0, trad: 0, other: 0 };
            }
            const amount = countBy === 'ticks' ? 1 : d.pitches;
            years[y].days.add(DateUtils.dayKey(d.date));
            years[y].feet += d.length || 0;
            years[y].total += amount;
            years[y].ticks += 1;
            years[y][d.discipline === 'boulder' ? 'other' : d.discipline] += amount;
        });

        const keys = Object.keys(years).map(Number);
        const range = [];
        for (let y = Math.min(...keys); y <= Math.max(...keys); y++) {
            const bucket = years[y];
            range.push({
                year: String(y),
                daysOut: bucket ? bucket.days.size : 0,
                verticalFeet: bucket ? bucket.feet : 0,
                pitches: bucket ? bucket.total : 0,
                ticks: bucket ? bucket.ticks : 0,
                sport: bucket ? bucket.sport : 0,
                trad: bucket ? bucket.trad : 0,
                other: bucket ? bucket.other : 0
            });
        }
        return range;
    }
}
