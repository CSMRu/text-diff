/**
 * Manages Web Worker for Diff Computation
 */
class DiffWorkerManager {
    constructor(onSuccess, onError) {
        this.worker = null;
        this.onSuccess = onSuccess;
        this.onError = onError;
        this.isBusy = false;
        this.useFallback = false;
        this.init();
    }

    init() {
        try {
            if (this.worker) this.worker.terminate();

            const blob = new Blob([DiffWorkerManager.workerCode], { type: 'application/javascript' });
            const workerUrl = URL.createObjectURL(blob);
            this.worker = new Worker(workerUrl);
            URL.revokeObjectURL(workerUrl);

            this.worker.onmessage = (e) => {
                this.isBusy = false;
                if (e.data.success) {
                    this.onSuccess(e.data.diff, e.data.stats);
                } else {
                    this.onError(e.data.error);
                }
            };

            this.worker.onerror = () => {
                this.isBusy = false;
                console.warn('Worker error occurred. Switching to fallback.');
                this.useFallback = true;
                this.worker.terminate();
                this.worker = null;
                // Notify UI of error so loading bar stops
                this.onError('Worker failed. Enabling fallback for next run.');
            };
        } catch (e) {
            console.error('Worker initialization failed:', e);
            this.useFallback = true;
        }
    }

    /**
     * Computes the diff using a Worker thread. Falls back to main thread if Worker fails.
     */
    compute(textA, textB, ignoreEnter) {
        if (!this.worker && !this.useFallback) this.init();

        if (this.useFallback) {
            try {
                if (typeof diff_match_patch === 'undefined') {
                    throw new Error('diff_match_patch library could not be loaded. Please ensure lib/diff_match_patch.js is present.');
                }
                const dmp = new diff_match_patch();
                dmp.Diff_Timeout = 1.0;
                const diffs = dmp.diff_main(textA, textB);
                dmp.diff_cleanupSemantic(diffs);

                // Fallback: Return null stats to let UI handle it, preventing blocking main thread with heavy calculation.
                this.onSuccess(diffs, null);
            } catch (err) {
                this.onError(err.message);
            }
            return;
        }

        // Cancel any running task before starting a new one
        if (this.isBusy) {
            this.worker.terminate();
            this.init();
        }

        if (this.useFallback) {
            this.compute(textA, textB, ignoreEnter);
            return;
        }

        this.isBusy = true;
        const libUrl = new URL('lib/diff_match_patch.js', window.location.href).href;
        // Construct absolute URL for shared-utils.js to ensure worker can load it
        const utilsUrl = new URL('js/shared-utils.js', window.location.href).href;

        this.worker.postMessage({ textA, textB, ignoreEnter, libUrl, utilsUrl });
    }
}

// Worker code executed in background thread
DiffWorkerManager.workerCode = `
self.onmessage = function(e) {
    const { textA, textB, ignoreEnter, libUrl, utilsUrl } = e.data;
    
    try {
        if(typeof diff_match_patch === 'undefined') {
            importScripts(libUrl);
        }
        
        // Import Shared Utils if not present
        if(typeof DiffUtils === 'undefined') {
             importScripts(utilsUrl);
        }

        const dmp = new diff_match_patch();
        dmp.Diff_Timeout = 1.0; 
        
        const diffs = dmp.diff_main(textA, textB);
        
        if (diffs.length > 20000) {
           // Skip semantic cleanup for extremely large diffs
        } else {
           dmp.diff_cleanupSemantic(diffs);
        }

        // --- Calculate Stats using Shared Utils ---
        let stats = { added: 0, removed: 0, lines: 0 };
        if (typeof DiffUtils !== 'undefined') {
             stats = DiffUtils.calculateStats(diffs, ignoreEnter);
        } else {
             throw new Error("DiffUtils failed to load in Worker");
        }

        self.postMessage({ success: true, diff: diffs, stats: stats });
    } catch (err) {
        self.postMessage({ success: false, error: err.toString() });
    }
};
`;
