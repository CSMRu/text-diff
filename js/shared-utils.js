/**
 * Shared Utilities for Text Diff Tool
 * Used by both Main Thread (UI) and Worker Thread to ensure consistent logic.
 */
(function (scope) {

    const DiffUtils = {
        /**
         * Determines if a change text implies it should be ignored based on settings.
         * @param {string} text - The text content of the diff chunk.
         * @param {boolean} ignoreEnter - Whether 'Ignore Enter' mode is active.
         * @returns {boolean} True if the change should be ignored (treated as context).
         */
        shouldIgnoreChange: function (text, ignoreEnter) {
            if (!ignoreEnter) return false;
            // Only ignore changes that are purely newlines (keep space/tab changes)
            return /^[\r\n]+$/.test(text);
        },

        /**
         * Calculates statistics for a set of diffs.
         * @param {Array} diffs - The diffs array [[type, text], ...].
         * @param {boolean} ignoreEnter - Whether 'Ignore Enter' mode is active.
         * @returns {Object} { added: number, removed: number, lines: number }
         */
        calculateStats: function (diffs, ignoreEnter) {
            let totalChanges = 0;
            let addedChars = 0;
            let removedChars = 0;
            const modifiedLines = new Set();

            diffs.forEach(([type, text]) => {
                const newlines = (text.match(/\n/g) || []).length;

                if (type !== 0) {
                    if (this.shouldIgnoreChange(text, ignoreEnter)) return;

                    let charCount = text.length;
                    if (ignoreEnter) {
                        charCount = text.replace(/[\r\n]+/g, '').length;
                    }

                    totalChanges++;
                    if (type === 1) addedChars += charCount;
                    if (type === -1) removedChars += charCount;

                    // Track lines affected by this change
                    const linesInChunk = newlines > 0 ? newlines + 1 : 1;
                    for (let i = 0; i < linesInChunk; i++) {
                        modifiedLines.add(`${type}_${totalChanges}_${i}`);
                    }
                }
            });

            return {
                added: addedChars,
                removed: removedChars,
                lines: modifiedLines.size,
                totalChanges: totalChanges
            };
        }
    };

    // Export to appropriate scope
    if (typeof self !== 'undefined') {
        scope.DiffUtils = DiffUtils;
    } else if (typeof window !== 'undefined') {
        window.DiffUtils = DiffUtils;
    } else {
        // CommonJS fallback if needed in future
        scope.DiffUtils = DiffUtils;
    }

})(typeof self !== 'undefined' ? self : this);
