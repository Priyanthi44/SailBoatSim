/**
 * This function will observer the contest.
 * @param {String} url                     The URL of the proxy, localhost if none provided.
 * @param {function} contestChangeCallback   The callback for when the contest changes.
 */
function ContestObserver(url, contestChangeCallback) { // eslint-disable-line no-unused-vars

    'use strict';

    url = typeof url === 'string' ? url : 'localhost';

    //
    // Connection stuff
    //
    var wrc = require('web-remote-control');
    var observer = wrc.createObserver({
        proxyUrl: url,
        channel: 'ContestManager',
        log: function() {}
    });
    observer.on('status', function(obj) {
        if (isNewContest(obj)) contestChangeCallback(obj);
        console.log('Refreshed contest: ', obj.request.location, obj.request.type);
    });

    function isNewContest(obj) {
        if (typeof obj !== 'object') return false;
        if (obj.type === 'new-contest') return true;
        return false;
    }
}

if (typeof module !== 'undefined') {
    module.exports = ContestObserver;
}
