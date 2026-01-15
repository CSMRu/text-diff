/**
 * Manages Rendering of Diffs with Performance Optimizations
 */
class DiffRenderer {
    constructor(ui) {
        this.ui = ui;
        this.renderTask = null; // { id, type: 'raf'|'timeout' }
        this.isRenderingPaused = false;
        this.currentResume = null;
    }

    render(diffs) {
        this.stop();

        this.ui.diffOutput.replaceChildren();

        const CHUNK_SIZE = 500;
        let index = 0;
        let renderLimit = SAFE_RENDER_LIMIT;
        let isLineDirty = false;
        let visibleItemCount = 0;

        // Init Progress
        if (this.ui.diffProgress) {
            this.ui.diffProgress.style.display = 'block';
            this.ui.diffProgress.textContent = 'Rendering: 0%';
        }

        /**
         * Renders diffs in chunks to prevent UI blocking.
         * Uses RequestAnimationFrame or setTimeout for scheduling.
         */
        const renderChunk = () => {
            // Safety check
            if (!this.ui.mainContainer.contains(this.ui.diffOutput)) return;

            // Check Limit
            if (index >= renderLimit && renderLimit !== Infinity) {
                this.pause(index, diffs.length, () => {
                    renderLimit = Infinity;
                    if (this.ui.loadMoreContainer) this.ui.loadMoreContainer.style.display = 'none';
                    renderChunk();
                });
                return;
            }

            const chunkFragment = document.createDocumentFragment();
            const endIndex = Math.min(index + CHUNK_SIZE, diffs.length);

            /**
             * Inserts a visual separator when hiding context in "View Only Diff" mode.
             * Displays line count or a simple break depending on the hidden content.
             */
            const insertSeparatorIfNeeded = (i, text) => {
                const lastEl = chunkFragment.lastElementChild || this.ui.diffOutput.lastElementChild;
                const newlines = (text.match(/\n/g) || []).length;
                let lineCount = newlines + 1;

                if (this.ui.ignoreEnter && /^\s*$/.test(text)) {
                    lineCount = 0;
                }

                if (lastEl && lastEl.classList.contains('diff-separator')) {
                    const match = lastEl.textContent.match(/(\d+)\s+Hidden/);
                    if (match) {
                        const currentCount = parseInt(match[1], 10);
                        const newCount = currentCount + lineCount;
                        if (newCount !== currentCount) {
                            lastEl.textContent = `... ${newCount} Hidden Line${newCount !== 1 ? 's' : ''} ...`;
                        }
                    }
                    return;
                }

                if (lineCount > 0) {
                    const sep = document.createElement('div');
                    sep.className = 'diff-separator';
                    sep.textContent = `... ${lineCount} Hidden Line${lineCount !== 1 ? 's' : ''} ...`;
                    chunkFragment.appendChild(sep);
                } else {
                    if (i > 0 && !this.ui.viewOnlyDiff) {
                        chunkFragment.appendChild(document.createElement('br'));
                    }
                }
            };

            /**
             * Handles Type 0 (Context) in View Only Mode.
             * Logic: Show Suffixes (end of dirty line), Show Prefixes (start of dirty line), Hide rest.
             */
            const processViewOnlyContext = (i, text) => {
                let currentText = text;

                // 1. Handle Suffix (Change precedes this on same line)
                if (isLineDirty) {
                    const firstNewlineIndex = currentText.indexOf('\n');
                    if (firstNewlineIndex === -1) {
                        // Whole token is suffix
                        chunkFragment.appendChild(document.createTextNode(currentText));
                        visibleItemCount++;
                        return; // Stays dirty, done with token
                    } else {
                        // Suffix up to newline
                        const suffix = currentText.substring(0, firstNewlineIndex);
                        if (suffix) {
                            chunkFragment.appendChild(document.createTextNode(suffix));
                            visibleItemCount++;
                        }
                        // \n resets dirty state
                        isLineDirty = false;
                        currentText = currentText.substring(firstNewlineIndex + 1); // Skip \n

                        // Break after suffix (since we explicitly consumed a newline)
                        chunkFragment.appendChild(document.createElement('br'));
                    }
                }

                // 2. Handle Remaining Text
                if (!currentText) return;

                const lastNewlineIndex = currentText.lastIndexOf('\n');
                let hiddenPart = '';
                let visiblePart = '';

                if (lastNewlineIndex !== -1) {
                    hiddenPart = currentText.substring(0, lastNewlineIndex + 1);
                    visiblePart = currentText.substring(lastNewlineIndex + 1);
                } else {
                    visiblePart = currentText;
                }

                // 3. Determine if visiblePart is a Prefix
                let isPrefix = false;
                if (visiblePart) {
                    const nextToken = diffs[i + 1];
                    const isNextChange = nextToken && nextToken[0] !== 0;
                    const nextStartsNewline = nextToken && /^\r?\n/.test(nextToken[1]);

                    if (isNextChange && !nextStartsNewline) {
                        isPrefix = true;
                    }
                }

                if (!isPrefix) {
                    hiddenPart += visiblePart;
                    visiblePart = '';
                }

                if (hiddenPart) {
                    insertSeparatorIfNeeded(i, hiddenPart);
                }

                if (visiblePart) {
                    chunkFragment.appendChild(document.createTextNode(visiblePart));
                    visibleItemCount++;
                }
            };

            for (let i = index; i < endIndex; i++) {
                let [type, text] = diffs[i];

                if (type === 0 && this.ui.viewOnlyDiff) {
                    processViewOnlyContext(i, text);
                    continue;
                }

                if (type !== 0) {
                    isLineDirty = !text.endsWith('\n');

                    if (this.ui.shouldIgnoreChange(text)) {
                        type = 0;
                        if (this.ui.viewOnlyDiff) {
                            insertSeparatorIfNeeded(i, text);
                            if (!text.endsWith('\n')) isLineDirty = true;
                            continue;
                        }
                    }
                    else if (/[\r\n]/.test(text)) {
                        const parts = text.split(/([\r\n]+)/);
                        parts.forEach(part => {
                            if (!part) return;
                            const isIgnored = this.ui.shouldIgnoreChange(part);
                            const partType = isIgnored ? 0 : type;
                            const span = document.createElement('span');
                            span.textContent = part;
                            if (partType !== 0) {
                                span.className = partType === 1 ? 'diff-add' : 'diff-del';
                            }
                            chunkFragment.appendChild(span);
                            if (!isIgnored) visibleItemCount++;
                        });
                        isLineDirty = !text.endsWith('\n');
                        continue;
                    }
                }

                if (type === 1) {
                    const span = document.createElement('span');
                    span.textContent = text;
                    span.classList.add('diff-add');
                    chunkFragment.appendChild(span);
                    visibleItemCount++;
                } else if (type === -1) {
                    const span = document.createElement('span');
                    span.textContent = text;
                    span.classList.add('diff-del');
                    chunkFragment.appendChild(span);
                    visibleItemCount++;
                } else if (type === 0) { // Normal Context
                    chunkFragment.appendChild(document.createTextNode(text));
                    visibleItemCount++;
                }
            }

            this.ui.diffOutput.appendChild(chunkFragment);
            index = endIndex;

            if (index < diffs.length) {
                this.scheduleNext(renderChunk);
            } else {
                this.renderTask = null;
                this.ui.hideLoadingBar();

                // FINAL CHECK: If ViewOnlyDiff is ON and No Visible Items were rendered
                if (this.ui.viewOnlyDiff && visibleItemCount === 0) {
                    this.ui.diffOutput.replaceChildren(); // Clear hidden line separators
                    const sep = document.createElement('div');
                    sep.className = 'diff-separator';
                    sep.textContent = 'No changes found';
                    this.ui.diffOutput.appendChild(sep);
                }
            }
        };

        renderChunk();
    }

    scheduleNext(task) {
        if (document.hidden) {
            // Background: Throttle to 10fps (100ms) to save CPU
            this.renderTask = {
                id: setTimeout(task, 100),
                type: 'timeout'
            };
        } else {
            // Foreground: Full speed (60fps)
            this.renderTask = {
                id: requestAnimationFrame(task),
                type: 'raf'
            };
        }
    }

    cancelTask() {
        if (!this.renderTask) return;

        if (this.renderTask.type === 'raf') {
            cancelAnimationFrame(this.renderTask.id);
        } else {
            clearTimeout(this.renderTask.id);
        }
        this.renderTask = null;
    }

    stop() {
        this.cancelTask();
        if (this.ui.diffProgress) this.ui.diffProgress.style.display = 'none';
        if (this.ui.loadMoreContainer) this.ui.loadMoreContainer.style.display = 'none';
        this.currentResume = null;
        this.isRenderingPaused = false;
    }

    pause(currentIndex, total, resumeCallback) {
        this.isRenderingPaused = true;
        if (this.ui.loadMoreContainer) {
            this.ui.loadMoreContainer.style.display = 'flex';
            const remaining = total - currentIndex;
            const span = this.ui.btnLoadMore.querySelector('span');
            if (span) span.textContent = `Load Remaining (${remaining.toLocaleString()} items)`;
        }
        if (this.ui.diffProgress) {
            this.ui.diffProgress.textContent = `Paused at ${Math.round((currentIndex / total) * 100)}%`;
        }
        this.currentResume = resumeCallback;
    }

    resume() {
        if (this.currentResume) {
            this.currentResume();
            this.currentResume = null;
        }
    }
}
