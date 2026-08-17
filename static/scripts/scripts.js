// scripts.js
// Page behavior for the index page and individual game/side-bet pages:
// search/filter, deck-select filtering, ETG (electronic table game)
// filtering, populating related side bets, and wiring up table sorting.
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
    const isSideBetPage = path.startsWith('/side_bet/');

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
        menuSelect.addEventListener('change', (event) => {
            filterMainGameTables(event.target.value);
            updateSideBets(event.target.value);
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

    // A value matches the page's ETG flag if either side is unset/"both",
    // or they're equal outright.
    function matchesETG(value, etgFlag) {
        return value == null || value === 'both' || etgFlag === 'both' || value === etgFlag;
    }

    function updateSideBets(selectedOption) {
        const dataEl = document.getElementById('side-bets-data');
        if (!dataEl) return;

        const sideBets = JSON.parse(dataEl.textContent);
        const etgFlag = document.body.getAttribute('data-etg');
        const mainGameFilters = document.querySelectorAll('#tables .menu-filter');
        const showDecks = sideBetsTable.classList.contains('table-4-columns');
        sideBetsTbody.innerHTML = '';

        sideBets.forEach(sideBet => {
            sideBet.tables.forEach(table => {
                const deckValue = table.variant;

                // Games like Three Card Poker have no deck value, so they
                // always count as a match.
                const mainGameHasDeck = deckValue
                    ? Array.from(mainGameFilters).some(mainFilter => mainFilter.getAttribute('data-filter') === deckValue)
                    : true;

                if (!matchesETG(table.etg, etgFlag)) return;
                if (!(selectedOption === 'all' || selectedOption === deckValue || !deckValue)) return;
                if (!mainGameHasDeck) return;

                table.rows.forEach(row => {
                    if (!matchesETG(row.etg, etgFlag)) return;

                    const cells = [`${sideBet.name} - ${row.cells[0]}`, ...row.cells.slice(1)];
                    if (showDecks && deckValue) {
                        cells.splice(1, 0, deckValue);
                    }

                    const tr = document.createElement('tr');
                    cells.forEach(text => {
                        const td = document.createElement('td');
                        td.textContent = text;
                        tr.appendChild(td);
                    });
                    sideBetsTbody.appendChild(tr);
                });
            });
        });

        addSortingToTable(sideBetsTable);
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
                row.style.display = matchesETG(row.dataset.etg, etgFlag) ? '' : 'none';
            });
        });
    }

    // Shows/hides entire tables that declare a `data-etg` attribute, based
    // on the page's ETG flag.
    function filterTablesByETG() {
        const etgFlag = document.body.dataset.etg;
        const tables = document.querySelectorAll('table[data-etg]');

        tables.forEach(table => {
            table.style.display = matchesETG(table.dataset.etg, etgFlag) ? '' : 'none';
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
