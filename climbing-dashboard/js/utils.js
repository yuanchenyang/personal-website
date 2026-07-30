// Shared utility functions

const YDS_GRADES = [
    '5.0', '5.1', '5.2', '5.3', '5.4', '5.5', '5.6', '5.7', '5.8', '5.9',
    '5.10a', '5.10b', '5.10c', '5.10d',
    '5.11a', '5.11b', '5.11c', '5.11d',
    '5.12a', '5.12b', '5.12c', '5.12d',
    '5.13a', '5.13b', '5.13c', '5.13d',
    '5.14a', '5.14b', '5.14c', '5.14d',
    '5.15a', '5.15b', '5.15c', '5.15d'
];

class GradeUtils {
    // Convert numeric grade to Yosemite Decimal System
    static gradeToYDS(numericGrade) {
        if (numericGrade === null || numericGrade === undefined) return '';

        const rounded = Math.round(numericGrade);
        if (rounded >= 0 && rounded < YDS_GRADES.length) {
            return YDS_GRADES[rounded];
        }

        // Fallback for out of range
        return `5.${rounded}`;
    }
}

class VGradeUtils {
    // Numeric scale: VB = -1, V0 = 0, V1 = 1, ... Open-ended at the top so a
    // future grade needs no table entry.
    static toLabel(numericGrade) {
        if (numericGrade === null || numericGrade === undefined) return '';

        const rounded = Math.round(numericGrade);
        return rounded < 0 ? 'VB' : `V${rounded}`;
    }

    // Pulls a V grade out of a Mountain Project rating string. Ratings can be
    // "V4", "V4-5", "V4+", "V-easy", "VB", or mixed like "5.10d V2".
    static parse(ratingString) {
        if (!ratingString) return null;

        const text = ratingString.trim();

        if (/\bV[-\s]?easy\b/i.test(text) || /\bVB\b/.test(text)) return -1;

        // "V4-5" / "V4-V5" -> take the lower end; "V4+" / "V4-" -> V4
        const range = text.match(/\bV(\d+)\s*-\s*V?(\d+)\b/i);
        if (range) return parseInt(range[1], 10);

        const single = text.match(/\bV(\d+)\b/i);
        if (single) return parseInt(single[1], 10);

        return null;
    }
}

class DateUtils {
    // Local-midnight day key. Never use toISOString() for this: it converts to
    // UTC first, which shifts the date (and therefore the weekday) for every
    // user not on UTC.
    static dayKey(date) {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    static monthKey(date) {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    }

    // Every month from startKey to endKey inclusive, including empty ones, so a
    // time axis stays uniform instead of silently skipping quiet months.
    static monthRange(startKey, endKey) {
        const [sy, sm] = startKey.split('-').map(Number);
        const [ey, em] = endKey.split('-').map(Number);
        const months = [];

        for (let y = sy, m = sm; y * 12 + m <= ey * 12 + em; m++) {
            if (m > 12) { m = 1; y++; }
            months.push(`${y}-${String(m).padStart(2, '0')}`);
        }

        return months;
    }

    static monthLabel(monthKey) {
        const [y, m] = monthKey.split('-').map(Number);
        return `${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m - 1]} ${y}`;
    }

    static formatDay(date) {
        return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    }
}

class StatUtils {
    static median(values) {
        if (!values.length) return null;
        const sorted = [...values].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    }

    // Linear-interpolated quantile of an unsorted array.
    static quantile(values, q) {
        if (!values.length) return null;
        const sorted = [...values].sort((a, b) => a - b);
        const pos = (sorted.length - 1) * q;
        const lo = Math.floor(pos);
        const hi = Math.ceil(pos);
        return lo === hi ? sorted[lo] : sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
    }
}

// Data-mark colors. Validated categorical slots against the #f8f9fa chart
// surface, not the page's brand gradient. Re-run the palette validator before
// changing any of them. Current standing:
//   - the identity hues below pass the lightness band, chroma floor, CVD
//     separation (worst adjacent dE 9.1) and normal-vision floor;
//   - `other` is deliberately gray -- a de-emphasis color for the catch-all
//     bucket, so it fails the chroma floor by design rather than by accident;
//   - `onsight` and `flash` sit below 3:1 contrast on this surface, which is why
//     every chart using them keeps its legend visible (the relief rule).
const VIZ = {
    sport:    '#2a78d6',   // categorical slot 1 (blue)
    trad:     '#eb6834',   // categorical slot 2 (orange)
    onsight:  '#1baf7a',   // slot 3 (aqua)
    flash:    '#eda100',   // slot 4 (yellow)
    redpoint: '#4a3aa7',   // slot 7 (violet)
    other:    '#7a7975',   // de-emphasis gray for the catch-all bucket
    grid:     '#e1e0d9',
    axis:     '#898781'
    // The heatmap's sequential ramp lives in css/style.css (.heatmap-day.level-*)
    // since those cells are styled, not drawn on a canvas.
};
