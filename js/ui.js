/**
 * Manages UI interactions, Theme, Fonts, and Drag & Drop
 */
class UIController {
    constructor() {
        this.fontSize = 12;
        this.textA = document.getElementById('text-a');
        this.textB = document.getElementById('text-b');
        this.countA = document.getElementById('count-a');
        this.countB = document.getElementById('count-b');
        this.fileNameA = document.getElementById('file-name-a');
        this.fileNameB = document.getElementById('file-name-b');
        this.currentFileNames = { a: null, b: null }; // Track current filenames
        this.isFileModified = { a: false, b: false };   // Track modification state
        this.diffOutput = document.getElementById('diff-output');
        this.loadingBar = document.getElementById('loading-bar');
        this.diffStats = document.getElementById('diff-stats');
        this.loadMoreContainer = document.getElementById('load-more-container');
        this.btnLoadMore = document.getElementById('btn-load-more');
        this.toastContainer = document.getElementById('toast-container');
        this.mainContainer = document.getElementById('main-container');
        // Feature: Ignore Enter (Toggle)
        this.ignoreEnter = false;

        this.viewOnlyDiff = false;

        this.initTheme();
        this.initFontSize();
        this.initIgnoreEnterToggle();
        this.initViewOnlyDiffToggle();
        this.initScrollButtons();
        this.initDragAndDrop();
        this.initFileUploads();

        // Initialize Icons
        if (window.lucide) lucide.createIcons();
    }

    // =========================================
    // Initialization Methods
    // =========================================

    initTheme() {
        const btnTheme = document.getElementById('btn-theme');
        const htmlEl = document.documentElement;

        btnTheme.addEventListener('click', () => {
            const currentTheme = htmlEl.getAttribute(CSS_VARS.THEME);
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            htmlEl.setAttribute(CSS_VARS.THEME, newTheme);

            btnTheme.innerHTML = newTheme === 'dark' ? '<i data-lucide="moon"></i>' : '<i data-lucide="sun"></i>';
            if (window.lucide) {
                lucide.createIcons({
                    nameAttr: 'data-lucide',
                    attrs: { class: "lucide" }
                });
            }
        });
    }

    initFontSize() {
        const updateView = () => {
            document.documentElement.style.setProperty(CSS_VARS.FONT_SIZE, `${this.fontSize}pt`);
            document.getElementById('font-size-display').textContent = `${this.fontSize}pt`;
        };

        document.getElementById('font-increase').addEventListener('click', () => {
            if (this.fontSize < MAX_FONT_SIZE) {
                this.fontSize++;
                updateView();
            }
        });

        document.getElementById('font-decrease').addEventListener('click', () => {
            if (this.fontSize > MIN_FONT_SIZE) {
                this.fontSize--;
                updateView();
            }
        });
    }

    initIgnoreEnterToggle() {
        const btn = document.getElementById('btn-ignore-enter');
        if (!btn) return;

        btn.classList.toggle('active', this.ignoreEnter);

        btn.addEventListener('click', () => {
            this.ignoreEnter = !this.ignoreEnter;
            btn.classList.toggle('active', this.ignoreEnter);
            if (this.onInputCallback) this.onInputCallback(true);
        });
    }

    initViewOnlyDiffToggle() {
        const btn = document.getElementById('btn-view-only-diff');
        if (!btn) return;

        btn.addEventListener('click', () => {
            this.viewOnlyDiff = !this.viewOnlyDiff;
            btn.classList.toggle('active', this.viewOnlyDiff);
            if (this.onInputCallback) this.onInputCallback(true);
        });
    }

    initScrollButtons() {
        const btnTop = document.getElementById('btn-scroll-top');
        const btnBottom = document.getElementById('btn-scroll-bottom');
        const btnPrevChange = document.getElementById('btn-prev-change');
        const btnNextChange = document.getElementById('btn-next-change');

        if (btnTop) {
            btnTop.addEventListener('click', () => {
                btnTop.blur();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
        }
        if (btnBottom) {
            btnBottom.addEventListener('click', () => {
                btnBottom.blur();
                window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
            });
        }

        // Change Navigation Logic
        let currentChangeIndex = -1;

        const navigateChange = (direction) => {
            const changes = Array.from(document.querySelectorAll('.diff-add, .diff-del'));
            if (changes.length === 0) return;

            // Find current index based on viewport if user scrolled manually
            const viewportTop = window.scrollY + (window.innerHeight / 2); // Center of screen

            // Optimization: Find closest change to center of screen
            // This allows navigation to pick up from where the user is looking
            let closestIndex = -1;
            let minDistance = Infinity;

            changes.forEach((change, index) => {
                const rect = change.getBoundingClientRect();
                const absoluteTop = window.scrollY + rect.top;
                const distance = Math.abs(absoluteTop - viewportTop);

                if (distance < minDistance) {
                    minDistance = distance;
                    closestIndex = index;
                }
            });

            // If we are "lost" or just starting, use closest found.
            // If the closest one is the same as last known, proceed from there.
            if (currentChangeIndex === -1) {
                currentChangeIndex = closestIndex;
            } else {
                // If user scrolled far away, reset to closest
                // Threshold: if closest is different from current tracking by more than 1
                if (Math.abs(closestIndex - currentChangeIndex) > 1) {
                    currentChangeIndex = closestIndex;
                }
            }

            if (changes.length === 1 && currentChangeIndex === 0) {
                // Already at the only change, ensure it's visible but don't re-animate forcefully if already close
                const rect = changes[0].getBoundingClientRect();
                const isVisible = (rect.top >= 0) && (rect.bottom <= window.innerHeight);
                if (isVisible) return; // Do nothing if already looking at it
            }

            if (direction === 'next') {
                currentChangeIndex = (currentChangeIndex + 1) % changes.length;
            } else {
                currentChangeIndex = (currentChangeIndex - 1 + changes.length) % changes.length;
            }

            const target = changes[currentChangeIndex];
            target.scrollIntoView({ behavior: 'smooth', block: 'center' });

            // Temporary Highlight
            target.style.transition = 'filter 0.3s';
            target.style.filter = 'brightness(0.8)';
            setTimeout(() => {
                target.style.filter = '';
            }, 500);
        };

        if (btnNextChange) {
            btnNextChange.addEventListener('click', () => {
                btnNextChange.blur();
                navigateChange('next');
            });
        }
        if (btnPrevChange) {
            btnPrevChange.addEventListener('click', () => {
                btnPrevChange.blur();
                navigateChange('prev');
            });
        }

        // Keyboard Shortcuts
        document.addEventListener('keydown', (e) => {
            // Only trigger if not typing in input fields
            if (document.activeElement.tagName === 'TEXTAREA' || document.activeElement.tagName === 'INPUT') return;

            const k = e.key.toLowerCase();
            if (k === 'arrowright' || k === 'd') {
                e.preventDefault();
                navigateChange('next');
            } else if (k === 'arrowleft' || k === 'a') {
                e.preventDefault();
                navigateChange('prev');
            } else if (k === 'arrowup' || k === 'w') {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            } else if (k === 'arrowdown' || k === 's') {
                e.preventDefault();
                window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
            }
        });
    }

    initFileUploads() {
        ['upload-a', 'upload-b'].forEach((id, idx) => {
            const input = document.getElementById(id);
            if (!input) return;

            input.addEventListener('change', (e) => {
                const target = idx === 0 ? this.textA : this.textB;
                const file = e.target.files[0];
                if (!file) return;

                this.readFileContent(file, (text) => {
                    target.value = text;
                    // Update Filename Display
                    this.setFileName(idx === 0 ? 'a' : 'b', file.name);

                    if (this.onInputCallback) this.onInputCallback();
                });
                e.target.value = ''; // Reset input
            });
        });
    }

    initDragAndDrop() {
        const wrappers = [
            { el: document.querySelector('.panel-group.inputs .panel:nth-child(1) .input-wrapper'), target: this.textA },
            { el: document.querySelector('.panel-group.inputs .panel:nth-child(2) .input-wrapper'), target: this.textB }
        ];

        wrappers.forEach(({ el, target }) => {
            if (!el || !target) return;

            let dragCounter = 0;
            const events = ['dragenter', 'dragover', 'dragleave', 'drop'];
            events.forEach(evt => el.addEventListener(evt, (e) => { e.preventDefault(); e.stopPropagation(); }));

            el.addEventListener('dragenter', () => {
                dragCounter++;
                el.classList.add('drag-active');
            });

            el.addEventListener('dragleave', () => {
                dragCounter--;
                if (dragCounter === 0) el.classList.remove('drag-active');
            });

            el.addEventListener('drop', (e) => {
                dragCounter = 0;
                el.classList.remove('drag-active');
                if (e.dataTransfer.files.length > 0) {
                    this.readFileContent(e.dataTransfer.files[0], (text) => {
                        target.value = text;
                        // Determine which panel triggered the drop to set filename correctly
                        const panel = target.id === 'text-a' ? 'a' : 'b';
                        this.setFileName(panel, e.dataTransfer.files[0].name);

                        if (this.onInputCallback) this.onInputCallback();
                    });
                }
            });
        });
    }

    // =========================================
    // UI Feedback Methods
    // =========================================

    showLoadingBar() {
        if (this.loadingBar) {
            this.loadingBar.classList.add('active');
        }
    }

    hideLoadingBar() {
        if (this.loadingBar) {
            this.loadingBar.classList.remove('active');
        }
    }

    showLoading(msg) {
        this.showLoadingBar();
    }

    hideLoading() {
        this.hideLoadingBar();
    }

    showToast(message, type = 'info') {
        if (!this.toastContainer) return;

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;

        // Icon
        let iconName = 'info';
        if (type === 'error') iconName = 'alert-circle';
        if (type === 'success') iconName = 'check-circle';

        // DOM creation (Lucide requires innerHTML for icon rendering)
        const iconDiv = document.createElement('div');
        iconDiv.className = 'toast-icon';
        iconDiv.innerHTML = `<i data-lucide="${iconName}"></i>`;

        const msgDiv = document.createElement('div');
        msgDiv.textContent = message;

        toast.appendChild(iconDiv);
        toast.appendChild(msgDiv);

        this.toastContainer.appendChild(toast);

        if (window.lucide) lucide.createIcons({
            nameAttr: 'data-lucide',
            attrs: { class: "lucide" },
            root: iconDiv
        });

        // Remove after delay
        setTimeout(() => {
            toast.classList.add('fade-out');
            toast.addEventListener('animationend', () => {
                toast.remove();
            });
        }, 3000);
    }

    // =========================================
    // File Handling Methods
    // =========================================

    readFileContent(file, onSuccess) {
        if (!this.validateFile(file)) return;

        const reader = new FileReader();
        this.showLoading("Reading file...");

        reader.onload = (e) => {
            if (onSuccess) onSuccess(e.target.result);
            // Note: Loading bar is usually hidden by the subsequent input handling logic
        };

        reader.onerror = () => {
            this.showToast("Error reading file", "error");
            this.hideLoading();
        };

        reader.readAsText(file);
    }

    handleFileDrop(file, target) {
        // Deprecated in favor of direct usage or redirected to readFileContent if called externally
        // Keeping for backward compatibility if needed, but internally replaced.
        this.readFileContent(file, (text) => {
            target.value = text;
            if (this.onInputCallback) this.onInputCallback();
        });
    }

    validateFile(file) {
        if (!file) return false;

        // Reject media files
        if (file.type.match(/^(image|video|audio)\//)) {
            this.showToast("Images and media files are not supported.", "error");
            return false;
        }

        // Reject binary files
        const name = file.name.toLowerCase();
        if (name.match(/\.(exe|dll|bin|iso|msi)$/)) {
            this.showToast("Executable and binary files are not supported.", "error");
            return false;
        }

        if (file.size > MAX_FILE_SIZE) {
            this.showToast("File size exceeds 2MB limit.", "error");
            return false;
        }

        return true;
    }

    // =========================================
    // Core Update Methods
    // =========================================

    updateCharCounts() {
        const getUnit = (n) => n <= 1 ? 'char' : 'chars';
        this.countA.textContent = `${this.textA.value.length} ${getUnit(this.textA.value.length)}`;
        this.countB.textContent = `${this.textB.value.length} ${getUnit(this.textB.value.length)}`;
    }

    updateStats(diffs, preCalculatedStats = null) {
        if (!this.diffStats) return;

        let stats;

        if (preCalculatedStats) {
            stats = preCalculatedStats;
        } else {
            // MAIN THREAD FALLBACK: Use Shared Utils
            if (typeof DiffUtils !== 'undefined') {
                stats = DiffUtils.calculateStats(diffs, this.ignoreEnter);
            } else {
                console.error("DiffUtils not found!");
                return;
            }
        }

        const { added, removed, lines, totalChanges } = stats;
        const getUnit = (n) => n <= 1 ? 'char' : 'chars';
        const getLineUnit = (n) => n <= 1 ? 'line' : 'lines';

        this.diffStats.innerHTML = `
            Total Changes: ${totalChanges || 0} 
            <span style="opacity: 0.5; margin: 0 4px;">(</span> 
            <span style="color: var(--diff-add-text);">+${added} ${getUnit(added)}</span> 
            <span style="opacity: 0.5; margin: 0 2px;">&nbsp;</span> 
            <span style="color: var(--diff-del-text);">-${removed} ${getUnit(removed)}</span> 
            <span style="opacity: 0.5; margin: 0 4px;">)</span> 
            <span class="stat-divider">|</span> 
            ${lines} ${getLineUnit(lines)} modified
        `;
    }

    // =========================================
    // File Name Display Helpers
    // =========================================

    truncateFileName(name) {
        if (!name) return '';
        const MAX_LEN = 10; // Trigger truncation if longer than this
        if (name.length <= MAX_LEN) return name;

        // Strategy: First 5 chars ... Last 8 chars
        // Example: 12345...vwxyz.txt
        const start = name.substring(0, 5);
        const end = name.substring(name.length - 8);
        return `${start}......${end}`;
    }

    setFileName(panel, name) {
        // panel: 'a' or 'b'
        this.currentFileNames[panel] = name;
        this.isFileModified[panel] = false; // Reset modified state on new file load

        const el = panel === 'a' ? this.fileNameA : this.fileNameB;
        if (el) {
            el.textContent = this.truncateFileName(name);
            el.title = name; // Tooltip with full name
        }
    }

    markAsModified(panel) {
        if (!this.currentFileNames[panel]) return; // No file loaded, ignore
        if (this.isFileModified[panel]) return; // Already marked

        this.isFileModified[panel] = true;
        const el = panel === 'a' ? this.fileNameA : this.fileNameB;
        if (el) {
            el.textContent = `${this.truncateFileName(this.currentFileNames[panel])} (Modified)`;
        }
    }

    // =========================================
    // Input & Binding Helpers
    // =========================================

    getInputs() {
        return {
            a: this.textA.value,
            b: this.textB.value
        };
    }

    /**
     * Helper to determine if a change should be ignored based on current settings.
     * Delegates to Shared DiffUtils.
     */
    shouldIgnoreChange(text) {
        if (typeof DiffUtils !== 'undefined') {
            return DiffUtils.shouldIgnoreChange(text, this.ignoreEnter);
        }
        return false;
    }

    bindInput(callback) {
        this.onInputCallback = callback;
        this.textA.addEventListener('input', (e) => {
            this.markAsModified('a');
            if (callback) callback(e);
        });
        this.textB.addEventListener('input', (e) => {
            this.markAsModified('b');
            if (callback) callback(e);
        });
    }
}
