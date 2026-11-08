/**
 * Printable-report HTML safety helpers (COMMIT 09 / SEC-11).
 *
 * The clinical statement is assembled as a template string and written into a
 * print window with document.write(). Every interpolated value must therefore be
 * escaped; `reportHtml` is a tagged template that escapes all substitutions by
 * construction so a newly added field cannot silently reintroduce an injection.
 */

/** Escape a value for use as HTML text (also safe inside quoted attributes). */
export const escapeHtml = (value) => {
    if (value === null || value === undefined) return '';
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
};

const RAW_MARKER = Symbol('nutrimunch.rawHtml');

/** Mark a locally generated, trusted markup fragment (SVG charts) as raw. */
export const rawHtml = (value) => ({ [RAW_MARKER]: String(value ?? '') });

/**
 * Tagged template: escapes every substitution unless wrapped in rawHtml().
 * Numbers are stringified unchanged; null/undefined render as empty text.
 */
export const reportHtml = (strings, ...values) => {
    let out = strings[0];
    for (let i = 0; i < values.length; i += 1) {
        const value = values[i];
        out += (value && typeof value === 'object' && typeof value[RAW_MARKER] === 'string')
            ? value[RAW_MARKER]
            : escapeHtml(value);
        out += strings[i + 1];
    }
    return out;
};
