// tableSort.js
// Click-to-sort behavior for RTP tables, shared by scripts.js and the
// mainRtpRange.js / sideBetRtpRange.js summary pages.

const sortingInitialized = new WeakSet();

const NUMERIC_SORT_TYPES = new Set(['rtp', 'houseEdge', 'minRTP', 'maxRTP']);

function addSortingToTable(table) {
    if (!table || sortingInitialized.has(table)) return;
    sortingInitialized.add(table);

    const tbody = table.querySelector('tbody');
    const rows = tbody ? tbody.querySelectorAll('tr') : [];

    // Skip empty/single-row tables, except the side bets table, which is
    // still populated asynchronously after this first check.
    if (rows.length <= 1 && tbody?.id !== 'sideBets-tbody') return;

    const headers = table.querySelectorAll('th');
    headers.forEach(header => {
        header.addEventListener('click', () => {
            const currentOrder = header.getAttribute('data-sort-order');
            const newOrder = currentOrder === 'asc' ? 'desc' : 'asc';

            const columnIndex = Array.from(header.parentElement.children).indexOf(header);
            const dataType = header.getAttribute('data-sort');

            headers.forEach(h => {
                h.removeAttribute('data-sort-order');
                h.classList.remove('sort-asc', 'sort-desc');
            });

            header.setAttribute('data-sort-order', newOrder);
            header.classList.add(newOrder === 'asc' ? 'sort-asc' : 'sort-desc');

            sortTableByColumn(table, columnIndex, dataType, newOrder === 'asc');
        });
    });
}

function sortTableByColumn(table, columnIndex, dataType, isAscending) {
    const tbody = table.querySelector('tbody');
    const rows = Array.from(tbody.querySelectorAll('tr'));
    const direction = isAscending ? 1 : -1;

    rows.sort((a, b) => {
        const aText = a.cells[columnIndex].textContent.trim();
        const bText = b.cells[columnIndex].textContent.trim();

        if (NUMERIC_SORT_TYPES.has(dataType)) {
            return (parseFloat(aText) - parseFloat(bText)) * direction;
        }
        return aText.localeCompare(bText) * direction;
    });

    rows.forEach(row => tbody.appendChild(row));
}
