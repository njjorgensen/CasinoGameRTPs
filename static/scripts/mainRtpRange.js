// mainRtpRange.js
// Main-games summary page. Shared logic lives in rtpRange.js.

function displayMainRTPs() {
    window.location.href = 'static/rtpResults.html';
}

function displayMinMaxRTPs() {
    return displayRTPRanges('#main-game-names .game-item a', 'main_games');
}
