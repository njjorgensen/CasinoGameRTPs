// sideBetRtpRange.js
// Side-bets summary page. Shared logic lives in rtpRange.js.

function displaySideBetRTPs() {
    window.location.href = 'static/sideBetRtpResults.html';
}

function displayMinMaxRTPs() {
    return displayRTPRanges('#side-bets .game-item a', 'side_bets');
}
