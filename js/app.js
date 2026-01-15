// Application Entry Point - Initializes UI, Renderer, and Worker

const ui = new UIController();

const renderer = new DiffRenderer(ui);
let debounceTimer;

const workerManager = new DiffWorkerManager(
    (diffs, stats) => {
        renderer.render(diffs);
        ui.updateStats(diffs, stats);
    },
    (error) => {
        ui.diffOutput.innerHTML = '';
        const div = document.createElement('div');
        div.style.color = 'var(--diff-del-text)';
        div.style.padding = '1rem';
        div.style.textAlign = 'center';
        div.textContent = `Error: ${error}`;
        ui.diffOutput.appendChild(div);
    }
);

// Load More Button Action
if (ui.btnLoadMore) {
    ui.btnLoadMore.addEventListener('click', () => renderer.resume());
}

/**
 * Handles text input changes with debouncing.
 * @param {boolean} force - If true, runs immediately without debounce
 */
const handleInput = (force = false) => {
    const shouldForce = force === true;

    clearTimeout(debounceTimer);

    const run = () => {
        ui.updateCharCounts();
        renderer.stop();
        const { a, b } = ui.getInputs();

        if (!a && !b) {
            ui.diffOutput.textContent = '';
            ui.updateStats([]);
            return;
        }

        ui.showLoading();
        workerManager.compute(a, b, ui.ignoreEnter);
    };

    /**
     * Calculates adaptive debounce time based on text length.
     * Large texts need longer delay to prevent freezing during typing.
     */
    const getDebounceTime = () => {
        const lenA = document.getElementById('text-a').value.length;
        const lenB = document.getElementById('text-b').value.length;
        const maxLen = Math.max(lenA, lenB);
        if (maxLen > 50000) return 1200;
        if (maxLen > 10000) return 600;
        return 300;
    };

    if (shouldForce) {
        run();
    } else {
        debounceTimer = setTimeout(run, getDebounceTime());
    }
};

// Bind Inputs
ui.bindInput(handleInput);
