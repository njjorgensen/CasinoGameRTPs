// rtpRange.js
// Shared logic for the "min/max RTP per game" summary tables, used by both
// mainRtpRange.js (main games) and sideBetRtpRange.js (side bets). Depends
// on addSortingToTable from tableSort.js.

async function fetchAndParseHTML(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Network response was not ok for ${url}`);
    }
    const text = await response.text();
    return new DOMParser().parseFromString(text, 'text/html');
}

function extractRTPValues(doc, tableSelector) {
    const rtpData = [];

    doc.querySelectorAll(tableSelector).forEach(table => {
        const headers = table.querySelectorAll('thead th');
        let rtpColumnIndex = -1;
        let betTypeColumnIndex = -1;

        headers.forEach((header, index) => {
            const headerText = header.textContent.trim().toLowerCase();
            if (headerText === 'rtp') {
                rtpColumnIndex = index;
            } else if (headerText === 'bet type') {
                betTypeColumnIndex = index;
            }
        });

        if (rtpColumnIndex === -1 || betTypeColumnIndex === -1) return;

        table.querySelectorAll('tbody tr').forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length <= rtpColumnIndex || cells.length <= betTypeColumnIndex) return;

            const rtpValue = parseFloat(cells[rtpColumnIndex].textContent.trim());
            const betType = cells[betTypeColumnIndex].textContent.trim();
            if (!isNaN(rtpValue)) {
                rtpData.push({ rtpValue, betType });
            }
        });
    });

    return rtpData;
}

function calculateMinMaxRTP(rtpValues) {
    if (rtpValues.length === 0) {
        return { minRTP: '0.00', maxRTP: '0.00', minBetType: '', maxBetType: '' };
    }

    const rtpNumbers = rtpValues.map(item => item.rtpValue);
    const minIndex = rtpNumbers.indexOf(Math.min(...rtpNumbers));
    const maxIndex = rtpNumbers.indexOf(Math.max(...rtpNumbers));

    return {
        minRTP: rtpNumbers[minIndex].toFixed(2),
        maxRTP: rtpNumbers[maxIndex].toFixed(2),
        minBetType: rtpValues[minIndex].betType,
        maxBetType: rtpValues[maxIndex].betType
    };
}

function createMinMaxRTPTable(rtpData) {
    const section = document.createElement('section');
    section.innerHTML = `
        <table id="min-max-rtp-table">
            <thead>
                <tr>
                    <th data-sort="gameName">Game Name</th>
                    <th data-sort="minRTP">Min RTP</th>
                    <th data-sort="maxRTP">Max RTP</th>
                </tr>
            </thead>
            <tbody>
                ${rtpData.map(row => `
                    <tr>
                        <td>${row.gameName}</td>
                        <td title="Bet Type: ${row.minBetType}">${row.minRTP}%</td>
                        <td title="Bet Type: ${row.maxBetType}">${row.maxRTP}%</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    document.body.appendChild(section);

    addSortingToTable(document.getElementById('min-max-rtp-table'));
}

// Fetches the home page, follows every link matching `linkSelector`, pulls
// RTP values out of each linked page's tables matching `tableSelector`, and
// renders a summary table of min/max RTP per game.
async function displayRTPRanges(linkSelector, tableSelector) {
    try {
        const response = await fetch('../');
        if (!response.ok) {
            throw new Error('Failed to fetch index.html');
        }

        const text = await response.text();
        const doc = new DOMParser().parseFromString(text, 'text/html');

        const gameFiles = Array.from(doc.querySelectorAll(linkSelector))
            .map(link => link.getAttribute('href'));

        if (gameFiles.length === 0) {
            console.warn('No game files found in index.html.');
            return;
        }

        const gameData = [];

        for (const file of gameFiles) {
            try {
                const gameDoc = await fetchAndParseHTML(file);
                const rtpValues = extractRTPValues(gameDoc, tableSelector);

                if (rtpValues.length === 0) {
                    console.warn(`No RTP values found for ${file}`);
                    continue;
                }

                const gameName = gameDoc.querySelector('header h1').textContent.trim();
                gameData.push({ gameName, ...calculateMinMaxRTP(rtpValues) });
            } catch (error) {
                console.error(`Failed to process file ${file}:`, error);
            }
        }

        createMinMaxRTPTable(gameData);
    } catch (error) {
        console.error('Error fetching or parsing index.html:', error);
    }
}
