// rtpRange.js
// Shared logic for the "min/max RTP per game" summary tables, used by both
// mainRtpRange.js (main games) and sideBetRtpRange.js (side bets). Depends
// on addSortingToTable from tableSort.js.

// A value matches the page's ETG flag if either side is unset/"both", or
// they're equal outright. Mirrors scripts.js's matchesETG.
function matchesETG(value, etgFlag) {
    return value == null || value === 'both' || etgFlag === 'both' || value === etgFlag;
}

function extractRTPValues(gameData, etgFlag) {
    const rtpIndex = gameData.columns.findIndex(col => col.key === 'rtp');
    const betTypeIndex = gameData.columns.findIndex(col => col.key === 'betType');
    if (rtpIndex === -1 || betTypeIndex === -1) return [];

    const rtpData = [];
    gameData.tables.forEach(table => {
        if (!matchesETG(table.etg, etgFlag)) return;

        table.rows.forEach(row => {
            if (!matchesETG(row.etg, etgFlag)) return;

            const rtpValue = parseFloat(row.cells[rtpIndex]);
            const betType = row.cells[betTypeIndex];
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
                    <th data-sort="gameName" data-numeric="false">Game Name</th>
                    <th data-sort="minRTP" data-numeric="true">Min RTP</th>
                    <th data-sort="maxRTP" data-numeric="true">Max RTP</th>
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

// Fetches the home page, follows every link matching `linkSelector`, and for
// each one fetches its JSON data file from static/data/<dataDir>/<slug>.json
// to compute min/max RTP per game.
async function displayRTPRanges(linkSelector, dataDir) {
    try {
        const response = await fetch('../');
        if (!response.ok) {
            throw new Error('Failed to fetch index.html');
        }

        const text = await response.text();
        const doc = new DOMParser().parseFromString(text, 'text/html');

        const links = Array.from(doc.querySelectorAll(linkSelector));
        if (links.length === 0) {
            console.warn('No game links found in index.html.');
            return;
        }

        const gameData = [];

        for (const link of links) {
            const url = new URL(link.getAttribute('href'), location.href);
            const slug = url.pathname.split('/').filter(Boolean).pop();
            const etgFlag = url.searchParams.get('etg') || 'both';

            try {
                const dataResponse = await fetch(`../static/data/${dataDir}/${slug}.json`);
                if (!dataResponse.ok) {
                    throw new Error(`Network response was not ok for ${slug}.json`);
                }
                const data = await dataResponse.json();
                const rtpValues = extractRTPValues(data, etgFlag);

                if (rtpValues.length === 0) {
                    console.warn(`No RTP values found for ${slug}`);
                    continue;
                }

                gameData.push({ gameName: data.name, ...calculateMinMaxRTP(rtpValues) });
            } catch (error) {
                console.error(`Failed to process ${slug}:`, error);
            }
        }

        createMinMaxRTPTable(gameData);
    } catch (error) {
        console.error('Error fetching or parsing index.html:', error);
    }
}
