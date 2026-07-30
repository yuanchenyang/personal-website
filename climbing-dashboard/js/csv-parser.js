class CSVParser {
    constructor() {
        this.data = [];
        this.parsedData = [];
        // Rows the parser could not use, so the UI can say so instead of
        // quietly showing an incomplete dashboard.
        this.skipped = { malformed: 0, undated: 0, total: 0 };
    }

    async parseFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                try {
                    resolve(this.parseText(e.target.result));
                } catch (error) {
                    reject(error);
                }
            };

            reader.onerror = () => {
                reject(new Error('Failed to read file'));
            };

            reader.readAsText(file);
        });
    }

    parseText(csv) {
        this.skipped = { malformed: 0, undated: 0, total: 0 };
        this.data = this.parseCSV(csv);
        this.parsedData = this.processData(this.data);
        this.skipped.total = this.skipped.malformed + this.skipped.undated;
        return this.parsedData;
    }

    parseCSV(csv) {
        const rows = this.tokenizeCSV(csv);
        if (rows.length === 0) return [];

        const headers = rows[0];
        const data = [];

        for (let i = 1; i < rows.length; i++) {
            const values = rows[i];
            if (values.length === headers.length) {
                const row = {};
                headers.forEach((header, index) => {
                    row[header] = values[index];
                });
                data.push(row);
            } else {
                this.skipped.malformed++;
            }
        }

        return data;
    }

    // Splits CSV text into rows of fields. Mountain Project exports wrap notes in
    // quotes and those notes can contain commas, escaped quotes ("") and newlines,
    // so rows cannot simply be split on line breaks.
    tokenizeCSV(csv) {
        const text = csv.replace(/^﻿/, '');
        const rows = [];
        let row = [];
        let current = '';
        let inQuotes = false;

        const endField = () => {
            row.push(current.trim());
            current = '';
        };

        const endRow = () => {
            endField();
            // Skip rows that are entirely empty (e.g. a trailing newline).
            if (row.some(field => field !== '')) {
                rows.push(row);
            }
            row = [];
        };

        for (let i = 0; i < text.length; i++) {
            const char = text[i];

            if (inQuotes) {
                if (char === '"') {
                    if (text[i + 1] === '"') {
                        current += '"';
                        i++;
                    } else {
                        inQuotes = false;
                    }
                } else {
                    current += char;
                }
                continue;
            }

            if (char === '"') {
                inQuotes = true;
            } else if (char === ',') {
                endField();
            } else if (char === '\n') {
                endRow();
            } else if (char !== '\r') {
                current += char;
            }
        }

        if (current !== '' || row.length > 0) {
            endRow();
        }

        return rows;
    }

    processData(rawData) {
        return rawData.map(row => {
            const processed = {
                date: this.parseDate(row.Date),
                route: row.Route,
                rating: this.parseRating(row.Rating),
                vGrade: VGradeUtils.parse(row.Rating),
                rawRating: row.Rating || '',
                notes: row.Notes || '',
                url: row.URL || '',
                // A tick is at least one pitch; guard against blank, junk or
                // negative values in a hand-edited export.
                pitches: Math.max(1, parseInt(row.Pitches, 10) || 1),
                location: row.Location || '',
                avgStars: parseFloat(row['Avg Stars']) || 0,
                yourStars: parseInt(row['Your Stars']) || -1,
                style: row.Style || '',
                leadStyle: row['Lead Style'] || '',
                routeType: row['Route Type'] || '',
                yourRating: row['Your Rating'] || '',
                length: Math.max(0, parseInt(row.Length, 10) || 0),
                ratingCode: row['Rating Code'] || ''
            };

            const type = processed.routeType.toLowerCase();
            const style = processed.style.toLowerCase();
            const leadStyle = processed.leadStyle.toLowerCase();

            // Exactly one discipline per tick, so pitch and day counts never
            // double-count a "Trad, Sport" route or drop an "Ice" one.
            // "Boulder" only claims a tick when it is not also a roped route:
            // "Trad, Boulder" is a trad route with a boulder problem on it.
            const pureBoulder = type.includes('boulder')
                && !type.includes('trad') && !type.includes('sport');

            if (pureBoulder && processed.vGrade !== null) {
                processed.discipline = 'boulder';
            } else if (type.includes('trad')) {
                processed.discipline = 'trad';
            } else if (type.includes('sport')) {
                processed.discipline = 'sport';
            } else {
                processed.discipline = 'other';
            }

            processed.isSport = processed.discipline === 'sport';
            processed.isTrad = processed.discipline === 'trad';
            processed.isBoulder = processed.discipline === 'boulder';

            // Toproping or following is never a send of the lead, whatever got
            // recorded in Lead Style.
            const ropeAssisted = style === 'tr' || style === 'follow';

            // Climbing style. Flash is its own bucket -- previously it matched
            // nothing and fell through to the "fell/hung" catch-all.
            processed.isOnsight = !ropeAssisted && (leadStyle.includes('onsight') || style === 'onsight');
            processed.isFlash = !ropeAssisted && (leadStyle.includes('flash') || style === 'flash');
            processed.isRedpoint = !ropeAssisted && (leadStyle.includes('redpoint') || style === 'send');
            processed.isFell = leadStyle.includes('fell') || leadStyle.includes('hung');

            // A send is any style where the climber topped out without weighting
            // the rope. Everything else (TR, follow, fell, unrecorded) is "other".
            processed.isSend = processed.isOnsight || processed.isFlash || processed.isRedpoint;
            processed.isLeadAttempt = !ropeAssisted && (style.includes('lead') || leadStyle !== '');

            processed.styleBucket = processed.isOnsight ? 'onsight'
                : processed.isFlash ? 'flash'
                : processed.isRedpoint ? 'redpoint'
                : 'other';

            // The grade on the scale that matches this tick's discipline.
            processed.gradeValue = processed.isBoulder ? processed.vGrade : processed.rating;

            return processed;
        }).filter(row => {
            // A tick without a usable date cannot be placed on any axis.
            if (!row.date) this.skipped.undated++;
            return row.date;
        });
    }

    // Parses "YYYY-MM-DD" into LOCAL midnight. new Date("2025-11-22") would parse
    // as UTC midnight, which reads back as the previous day west of UTC and shifts
    // the weekday everywhere else -- wrong for a calendar heatmap.
    parseDate(dateString) {
        if (!dateString) return null;

        const iso = dateString.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (iso) {
            const date = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
            return isNaN(date.getTime()) ? null : date;
        }

        // Other formats: parse, then rebuild at local midnight.
        const parsed = new Date(dateString);
        if (isNaN(parsed.getTime())) {
            return null;
        }
        return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
    }

    parseRating(ratingString) {
        if (!ratingString) return null;

        // YDS grade mapping: 5.0-5.9 don't have letters, 5.10+ have a/b/c/d
        // Map to continuous numeric scale
        const gradeMap = {
            '5.0': 0, '5.1': 1, '5.2': 2, '5.3': 3, '5.4': 4,
            '5.5': 5, '5.6': 6, '5.7': 7, '5.8': 8, '5.9': 9,
            '5.10a': 10, '5.10b': 11, '5.10c': 12, '5.10d': 13,
            '5.11a': 14, '5.11b': 15, '5.11c': 16, '5.11d': 17,
            '5.12a': 18, '5.12b': 19, '5.12c': 20, '5.12d': 21,
            '5.13a': 22, '5.13b': 23, '5.13c': 24, '5.13d': 25,
            '5.14a': 26, '5.14b': 27, '5.14c': 28, '5.14d': 29,
            '5.15a': 30, '5.15b': 31, '5.15c': 32, '5.15d': 33
        };

        // Clean the rating string (remove PG13, R, X, etc.)
        const cleanRating = ratingString.trim().split(' ')[0];

        // Try direct lookup first
        if (gradeMap[cleanRating]) {
            return gradeMap[cleanRating];
        }

        // Try with lowercase and without +/- modifiers
        const normalized = cleanRating.replace(/[+-]/g, '').toLowerCase();
        if (gradeMap[normalized]) {
            return gradeMap[normalized];
        }

        // Parse manually for edge cases
        const match = cleanRating.match(/5\.(\d+)([a-d]?)/i);
        if (match) {
            const base = parseInt(match[1]);
            const letter = match[2] ? match[2].toLowerCase() : '';

            if (base < 10) {
                // 5.0-5.9 don't have letter grades
                return base;
            } else {
                // 5.10+ have letter grades
                const letterOffset = {
                    'a': 0, '': 0,
                    'b': 1,
                    'c': 2,
                    'd': 3
                };
                return (base - 10) * 4 + 10 + (letterOffset[letter] || 0);
            }
        }

        return null;
    }

}