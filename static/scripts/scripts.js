// scripts.js
// Page behavior for the index page and individual game/side-bet pages:
// search/filter, deck-select filtering, ETG (electronic table game)
// filtering, fetching related side bets, and wiring up table sorting.
// Table sorting itself lives in tableSort.js.

document.addEventListener('DOMContentLoaded', () => {
    const menuSelect = document.getElementById('menu-select');
    const resetButton = document.getElementById('reset-button');
    const optionTables = document.querySelectorAll('.menu-filter');
    const sideBetsTable = document.getElementById('sideBets');
    const sideBetsTbody = document.getElementById('sideBets-tbody');

    const searchInput = document.getElementById('search-input');
    const gameItems = document.querySelectorAll('.game-item');

    const path = window.location.pathname;
    const isIndexPage = path === '/';
    const isMainPage = path.startsWith('/game/');
    const isSideBetPage = path.startsWith('/side_bets/');

    filterRowsByETG();
    filterTablesByETG();
    hideHeadingsForHiddenTables();

    if (isIndexPage && searchInput) {
        searchInput.addEventListener('input', () => {
            const filter = searchInput.value.toLowerCase();

            gameItems.forEach(item => {
                const gameName = item.getAttribute('data-name').toLowerCase();
                item.style.display = gameName.includes(filter) ? '' : 'none';
            });
        });
    }

    if (isIndexPage) {
        gameItems.forEach(item => {
            item.addEventListener('click', () => {
                const url = item.getAttribute('data-url');
                if (url) {
                    window.location.href = url;
                }
            });
        });

        sortListAlphabetically('main-game-names');
        sortListAlphabetically('side-bet-names');
        sortListAlphabetically('etg-main-game-names');
        sortListAlphabetically('etg-side-bet-names');
    }

    if (isMainPage || isSideBetPage) {
        const etgFlag = document.body.dataset.etg;
        const header = document.querySelector('header h1');

        if (header && (etgFlag === 'yes' || etgFlag === 'both')) {
            header.textContent = `${header.textContent} (Electronic)`;
        }
    }

    if (menuSelect) {
        menuSelect.addEventListener('change', async (event) => {
            filterMainGameTables(event.target.value);
            await updateSideBets(event.target.value);
        });

        filterMainGameTables(menuSelect.value);
        updateSideBets(menuSelect.value);
    } else {
        updateSideBets();
    }

    if (resetButton) {
        resetButton.addEventListener('click', () => {
            location.reload();
        });
    }

    function sortListAlphabetically(listId) {
        const list = document.getElementById(listId);
        if (!list) return;

        const items = Array.from(list.getElementsByTagName('li'));

        items.sort((a, b) => {
            const textA = a.textContent.trim().toUpperCase();
            const textB = b.textContent.trim().toUpperCase();
            return textA.localeCompare(textB);
        });

        list.innerHTML = '';
        items.forEach(item => list.appendChild(item));
    }

    function filterMainGameTables(selectedOption) {
        optionTables.forEach(table => {
            const optionValue = table.getAttribute('data-filter');
            table.style.display = (selectedOption === 'all' || selectedOption === optionValue) ? 'block' : 'none';
        });
    }

    async function updateSideBets(selectedOption) {
        if (!document.body.getAttribute('data-side-bets')) {
            return;
        }

        try {
            const sideBetFiles = document.body.getAttribute('data-side-bets').split(',');
            const mainGameFilters = document.querySelectorAll('.menu-filter');
            const etgFlag = document.body.getAttribute('data-etg');
            sideBetsTbody.innerHTML = '';

            for (const file of sideBetFiles) {
                const response = await fetch(file.trim());
                const htmlText = await response.text();
                const doc = new DOMParser().parseFromString(htmlText, 'text/html');

                const sideBetHeader = doc.querySelector('header h1').textContent.trim();

                const sideBetsTableColumns = document.getElementById('sideBets');
                const columnsCount = sideBetsTableColumns ? sideBetsTableColumns.querySelector('thead tr').cells.length : 0;

                // Select side bet tables, or fall back to the whole document
                // for side bets that aren't split by deck count.
                const sideBetsTables = doc.querySelectorAll('.menu-filter');
                const tablesToParse = sideBetsTables.length > 0 ? sideBetsTables : [doc];

                tablesToParse.forEach(table => {
                    const deckValue = table.getAttribute('data-filter');
                    const tableETG = table.getAttribute('data-etg');
                    const isRelevantETG = !tableETG || tableETG === etgFlag || etgFlag === 'both';

                    // Games like Three Card Poker have no deck value, so
                    // they always count as a match.
                    const mainGameHasDeck = deckValue
                        ? Array.from(mainGameFilters).some(mainFilter => mainFilter.getAttribute('data-filter') === deckValue)
                        : true;

                    if (isRelevantETG && (selectedOption === 'all' || selectedOption === deckValue || !deckValue) && mainGameHasDeck) {
                        const rows = table.querySelectorAll('tbody tr');

                        rows.forEach(row => {
                            const rowETG = row.getAttribute('data-etg');
                            const isRowRelevantETG = !rowETG || rowETG === etgFlag || rowETG === 'both';
                            if (!isRowRelevantETG) return;

                            const clonedRow = row.cloneNode(true);

                            const betTypeCell = clonedRow.querySelector('td:first-child');
                            betTypeCell.textContent = `${sideBetHeader} - ${betTypeCell.textContent}`;

                            // Add a deck column only when relevant (e.g. the
                            // side bets table has 4 columns).
                            if (columnsCount === 4 && deckValue) {
                                const deckCell = document.createElement('td');
                                deckCell.textContent = deckValue;
                                clonedRow.insertBefore(deckCell, clonedRow.querySelector('td:nth-child(2)'));
                            }

                            clonedRow.querySelectorAll('td').forEach((cell, index) => {
                                cell.classList.add(`column-${index + 1}`);
                            });

                            sideBetsTbody.appendChild(clonedRow);
                        });
                    }
                });
            }

            addSortingToTable(sideBetsTable);
        } catch (error) {
            console.error('Error fetching or processing side bets data:', error);
        }
    }

    document.querySelectorAll('table').forEach(table => addSortingToTable(table));

    // Shows/hides individual rows of `table.mainGame` / `table.sideBets`
    // tables based on the page's ETG flag (`data-etg` on <body>), falling
    // back to the row's table's own `data-etg` when the row has none.
    function filterRowsByETG() {
        const etgFlag = document.body.dataset.etg;
        const tables = document.querySelectorAll('table.mainGame, table.sideBets');

        tables.forEach(table => {
            const tableETG = table.dataset.etg || etgFlag;
            const rows = table.querySelectorAll('tbody tr');

            rows.forEach(row => {
                if (!row.dataset.etg) {
                    row.dataset.etg = tableETG;
                }
                row.style.display = (row.dataset.etg === etgFlag || row.dataset.etg === 'both') ? '' : 'none';
            });
        });
    }

    // Shows/hides entire tables that declare a `data-etg` attribute, based
    // on the page's ETG flag.
    function filterTablesByETG() {
        const etgFlag = document.body.dataset.etg;
        const tables = document.querySelectorAll('table[data-etg]');

        tables.forEach(table => {
            table.style.display = (table.dataset.etg === etgFlag || table.dataset.etg === 'both') ? '' : 'none';
        });
    }

    // Hides the heading above a menu-filter section when its table has been
    // hidden by filterTablesByETG/filterRowsByETG.
    function hideHeadingsForHiddenTables() {
        const menuFilters = document.querySelectorAll('.menu-filter');

        menuFilters.forEach(menuFilter => {
            const table = menuFilter.querySelector('table');
            const heading = menuFilter.querySelector('h2');
            if (!table || !heading) return;

            const isHidden = table.style.display === 'none' || getComputedStyle(table).display === 'none';
            heading.style.display = isHidden ? 'none' : '';
        });
    }
});
