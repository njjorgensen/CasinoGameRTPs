document.addEventListener('DOMContentLoaded', () => {
    const menuSelect = document.getElementById('menu-select');
    const resetButton = document.getElementById('reset-button');
    const optionTables = document.querySelectorAll('.menu-filter');
    const sideBetsTable = document.getElementById('sideBets');
    const sideBetsTbody = document.getElementById('sideBets-tbody');
    const gameType = document.body.getAttribute('data-game');

    filterRowsByETG(); // Filter rows
    filterTablesByETG(); // Filter tables
    hideHeadingsForHiddenTables();


    const searchInput = document.getElementById('search-input');
    const gameItems = document.querySelectorAll('.game-item');

    const path = window.location.pathname;
    const isIndexPage = path =='/';
    const isMainPage = path.startsWith('/game/');
    const isSideBetPage = path.startsWith('/side_bets/');

    const sortingInitialized = new WeakSet();

    if (isIndexPage && searchInput) {
        searchInput.addEventListener('input', () => {
            const filter = searchInput.value.toLowerCase();

            gameItems.forEach(item => {
                const gameName = item.getAttribute('data-name').toLowerCase();
                if (gameName.includes(filter)) {
                    item.style.display = ''; // Show the item
                } else {
                    item.style.display = 'none'; // Hide the item
                }
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
    }

    if (menuSelect) {
        menuSelect.addEventListener('change', async (event) => {
            const selectedOption = event.target.value;

            // Filter main game tables
            filterMainGameTables(selectedOption);

            // Fetch and update side bets based on selected deck
            await updateSideBets(selectedOption);

        });

        filterMainGameTables(menuSelect.value);
        updateSideBets(menuSelect.value);
    } else {
        // Run updateSideBets with default behavior when menuSelect is not present
        updateSideBets();
    }


    // Sort the main games and side bets lists
    if (isIndexPage) {
        sortListAlphabetically('main-game-names');
        sortListAlphabetically('side-bet-names');
        sortListAlphabetically('etg-main-game-names');
        sortListAlphabetically('etg-side-bet-names');
    }

    if (isMainPage || isSideBetPage) {
        const etgFlag = document.body.dataset.etg;
        const header = document.querySelector("header h1");

        if (etgFlag === 'yes' || etgFlag === 'both') {
            header.textContent = `${header.textContent} (Electronic)`;
        }
        
    }

    if (resetButton) {
        resetButton.addEventListener('click', () => {
            location.reload();
        });
    }

    function sortListAlphabetically(listId) {
        const list = document.getElementById(listId);
        const items = Array.from(list.getElementsByTagName('li'));

        items.sort((a, b) => {
            const textA = a.textContent.trim().toUpperCase();
            const textB = b.textContent.trim().toUpperCase();
            return textA.localeCompare(textB);
        });

        // Remove all items and append them in sorted order
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
        // Check if the page has side bets data
        if (!document.body.getAttribute('data-side-bets')) {
            return;
        }

        try {
            // Get the list of side bet files from the data-side-bets attribute
            const sideBetFiles = document.body.getAttribute('data-side-bets').split(',');
            const mainGameFilters = document.querySelectorAll('.menu-filter'); // Get all filters from the main game
            const etgFlag = document.body.getAttribute('data-etg'); // Get the ETG flag from the <body> tag
            sideBetsTbody.innerHTML = '';

            for (const file of sideBetFiles) {
                const response = await fetch(file.trim());
                const htmlText = await response.text();
                const parser = new DOMParser();
                const doc = parser.parseFromString(htmlText, 'text/html');

                const sideBetHeader = doc.querySelector('header h1').textContent.trim();

                const sideBetsTableColumns = document.getElementById('sideBets');
                const columnsCount = sideBetsTableColumns ? sideBetsTableColumns.querySelector('thead tr').cells.length : 0;

                // Select side bet tables or use document if not found
                const sideBetsTables = doc.querySelectorAll('.menu-filter');
                const tablesToParse = sideBetsTables.length > 0 ? sideBetsTables : [doc];

                tablesToParse.forEach(table => {
                    const deckValue = table.getAttribute('data-filter');
                    const tableETG = table.getAttribute('data-etg'); // Get the ETG flag for the side bet table

                    // Check if the side bet table matches the ETG flag
                    const isRelevantETG = !tableETG || tableETG === etgFlag || etgFlag === 'both';

                    // Handle main game filters only when deck values exist
                    const mainGameHasDeck = deckValue
                        ? Array.from(mainGameFilters).some(mainFilter => mainFilter.getAttribute('data-filter') === deckValue)
                        : true; // Default to true for games like Three Card Poker

                    // Populate side bet data only if selectedOption matches, main game has the deck, and ETG flag matches
                    if (isRelevantETG && (selectedOption === 'all' || selectedOption === deckValue || !deckValue) && mainGameHasDeck) {
                        const rows = table.querySelectorAll('tbody tr');

                        rows.forEach(row => {
                            const rowETG = row.getAttribute('data-etg');
                            const isRowRelevantETG = !rowETG || rowETG === etgFlag || rowETG === 'both';

                            if (isRowRelevantETG) {
                                const clonedRow = row.cloneNode(true);

                                const betTypeCell = clonedRow.querySelector('td:first-child');
                                betTypeCell.textContent = `${sideBetHeader} - ${betTypeCell.textContent}`;

                                // Add deck cell only when relevant (e.g., when there are 4 columns)
                                if (columnsCount === 4 && deckValue) {
                                    const deckCell = document.createElement('td');
                                    deckCell.textContent = deckValue;
                                    clonedRow.insertBefore(deckCell, clonedRow.querySelector('td:nth-child(2)'));
                                }

                                const cells = clonedRow.querySelectorAll('td');
                                cells.forEach((cell, index) => {
                                    cell.classList.add(`column-${index + 1}`);
                                });

                                sideBetsTbody.appendChild(clonedRow);
                            }
                        });
                    }
                });
            }

            addSortingToTable(sideBetsTable);

        } catch (error) {
            console.error('Error fetching or processing side bets data:', error);
        }
    }

    function addSortingToTable(table) {

        if (sortingInitialized.has(table)) return; // Avoid re-initializing

        sortingInitialized.add(table); // Mark this table as initialized

        const tbody = table.querySelector('tbody');
        const rows = tbody ? tbody.querySelectorAll('tr') : [];
    
        // Skip sorting if there's only one row or no rows
        if (rows.length <= 1 && tbody.id != 'sideBets-tbody') return;
        
        const headers = table.querySelectorAll('th');
        headers.forEach(header => {
            header.addEventListener('click', () => {
                const currentOrder = header.getAttribute('data-sort-order');
                let newOrder = 'asc';

                if (currentOrder) {
                    newOrder = currentOrder === 'asc' ? 'desc' : 'asc';
                }

                const columnIndex = Array.from(header.parentElement.children).indexOf(header);
                const dataType = header.getAttribute('data-sort');

                headers.forEach(h => {
                    h.removeAttribute('data-sort-order');
                    h.classList.remove('sort-asc', 'sort-desc');
                });

                header.setAttribute('data-sort-order', newOrder);
                header.classList.add(newOrder === 'asc' ? 'sort-asc' : 'sort-desc');

                sortTableByColumn(table, columnIndex, dataType, newOrder === 'asc');
                logSortingClasses(headers);
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

            if (dataType === 'rtp' || dataType === 'houseEdge') {
                const aValue = parseFloat(aText.replace('%', ''));
                const bValue = parseFloat(bText.replace('%', ''));
                return (aValue - bValue) * direction;
            } else {
                return aText.localeCompare(bText) * direction;
            }
        });

        rows.forEach(row => tbody.appendChild(row));
    }

    function logSortingClasses(headers) {
        headers.forEach((header, index) => {
            const sortOrder = header.classList.contains('sort-asc') ? 'sort-asc' :
                              header.classList.contains('sort-desc') ? 'sort-desc' :
                              'none';
        });
    }

    // Apply sorting to all tables, regardless of deck-table attribute
    const allTables = document.querySelectorAll('table');
    allTables.forEach(table => {
        addSortingToTable(table);
    });

    // Function to filter rows based on the ETG flag
    function filterRowsByETG() {
        // Get the ETG flag from the <body> tag
        const etgFlag = document.body.dataset.etg; // 'yes', 'no', or 'both'

        // Get all tables with the class `mainGame`
        const tables = document.querySelectorAll('table.mainGame, table.sideBets');

        tables.forEach(table => {
            // Get the `data-etg` attribute from the table, default to 'no' if not defined
            const tableETG = table.dataset.etg || etgFlag;

            // Get all rows in the current table
            const rows = table.querySelectorAll('tbody tr');

            rows.forEach(row => {
                // Assign the table's `data-etg` attribute to the row if not already defined
                if (!row.dataset.etg) {
                    row.dataset.etg = tableETG;
                }

                // Show or hide the row based on the `etgFlag` and the row's `data-etg` attribute
                if (row.dataset.etg === etgFlag || row.dataset.etg === 'both') {
                    row.style.display = ''; // Show the row
                } else {
                    row.style.display = 'none'; // Hide the row
                }
            });
        });
    }

    // Function to hide entire tables based on the ETG flag
    function filterTablesByETG() {
        // Get the ETG flag from the <body> tag
        const etgFlag = document.body.dataset.etg; // 'yes', 'no', or 'both'

        // Get all tables with the `data-etg` attribute
        const tables = document.querySelectorAll('table[data-etg]');

        // Loop through each table and show/hide based on the `data-etg` attribute
        tables.forEach(table => {
            if (table.dataset.etg === etgFlag || table.dataset.etg === 'both') {
                table.style.display = ''; // Show the table
            } else {
                table.style.display = 'none'; // Hide the table
            }
        });
    }

    function hideHeadingsForHiddenTables() {
        // Get all menu-filter divs
        const menuFilters = document.querySelectorAll('.menu-filter');

        menuFilters.forEach(menuFilter => {
            const table = menuFilter.querySelector('table');
            const heading = menuFilter.querySelector('h2');

            // Check if the table is hidden
            if (table && heading) {
                if (table.style.display === 'none' || getComputedStyle(table).display === 'none') {
                    // Hide the heading if the table is not displayed
                    heading.style.display = 'none';
                } else {
                    // Ensure the heading is visible if the table is displayed
                    heading.style.display = '';
                }
            }
        });
    }

});

