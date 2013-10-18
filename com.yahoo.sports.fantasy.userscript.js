// ==UserScript==
// @name       Yahoo Sports: NHL Statistic Extensions
// @namespace  http://use.i.E.your.homepage/
// @version    0.1
// @description  Includes 
// @include  /^http://hockey\.fantasysports\.yahoo\.com/hockey/.*$/
// @require  https://cdnjs.cloudflare.com/ajax/libs/jquery/2.0.3/jquery.min.js
// @require  https://cdnjs.cloudflare.com/ajax/libs/lodash.js/2.2.1/lodash.js
// @require  https://cdnjs.cloudflare.com/ajax/libs/async/1.22/async.min.js
// @copyright  2012+, You
// ==/UserScript==

/* global console, _, async, $ */

'use strict';


var CSS = {
    BOOTSTRAPPER: {
        LABELS: '.label {  display: inline;  padding: .2em .6em .3em;  font-size: 75%;  font-weight: bold;  line-height: 1;  color: #ffffff;  text-align: center;  white-space: nowrap;  vertical-align: baseline;  border-radius: .25em;}.label[href]:hover,.label[href]:focus {  color: #ffffff;  text-decoration: none;  cursor: pointer;}.label:empty {  display: none;}.label-default {  background-color: #999999;}.label-default[href]:hover,.label-default[href]:focus {  background-color: #808080;}.label-primary {  background-color: #428bca;}.label-primary[href]:hover,.label-primary[href]:focus {  background-color: #3071a9;}.label-success {  background-color: #5cb85c;}.label-success[href]:hover,.label-success[href]:focus {  background-color: #449d44;}.label-info {  background-color: #5bc0de;}.label-info[href]:hover,.label-info[href]:focus {  background-color: #31b0d5;}.label-warning {  background-color: #f0ad4e;}.label-warning[href]:hover,.label-warning[href]:focus {  background-color: #ec971f;}.label-danger {  background-color: #d9534f;}.label-danger[href]:hover,.label-danger[href]:focus {  background-color: #c9302c;}'
    },
    COLUMN_HIGHLIGHTER: 'table#statTable0, table#statTable1 {    border-spacing: 0;    border-collapse: collapse;    overflow: hidden;    z-index: 1;}table#statTable0 td, table#statTable0 th, table#statTable1 td, table#statTable1 th {    cursor: pointer;    padding: 10px;    position: relative;}'
};

var STAT_DEFINITIONS = {
    UTILS: {
        'O-Rank': -1,
        'Rank': -1,
        'G': +1,
        'A': +1,
        '+/-': +1,
        'PIM': +1,
        'PPP': +1,
        'SOG': +1,
        'FW': +1,
        'HIT': +1,
        'BLK': +1
    },
    GOALIES: {
        'O-Rank': -1,
        'Rank': -1,
        'W': +1,
        'GAA': -1,
        'SV': +1,
        'SA*': +1,
        'SV%': +1,
        'SHO': +1
    }
};

var targets = [
    // "Players List" page
    {
        selector: '#players-table table',
        stats: STAT_DEFINITIONS.UTILS
    },
    // "Matchup" page, utils
    {
        selector: '#statTable3',
        stats: STAT_DEFINITIONS.UTILS
    },
    // "Matchup" page, goalies
    {
        selector: '#statTable5',
        stats: STAT_DEFINITIONS.GOALIES
    },
    // "My Team" page, utils
    {
        selector: '#statTable0',
        stats: STAT_DEFINITIONS.UTILS
    },
    // "My Team" page, goalies
    {
        selector: '#statTable1',
        stats: STAT_DEFINITIONS.GOALIES
    }
];

function KeyManager(labels, $table) {
    var $headerRows = $table.find('thead>tr:last');

    // Initialize labels and indices
    var items = [];
    $headerRows.find('th').each(function(index, value) {
        var $headerColumn = $(this);
        var label = $($headerColumn.find('>:not(.F-icon)')).text();

        console.log(label, _.contains(labels, label), labels);
        if (_.contains(labels, label)) {
            items.push(new Item(label, index));
        }
    });

    var getItems = function() {
        return items;
    }

    // var getKeys = function() {
    //     return _.map(items, function(item, index, list) {
    //         return item.key;
    //     });
    // };

    // var getLabels = function() {
    //     return _.map(items, function(item, index, list) {
    //         return item.label;
    //     });
    // };

    // var getIndices = function() {
    //     return _.map(items, function(item, index, list) {
    //         return item.index;
    //     });
    // };

    var getLabelFromIndex = function(index) {
        var targetItem = _.find(items, function(item, key, list) {
            return item.index === index;
        });

        if (targetItem === undefined) {
            return undefined;
        }

        return targetItem.label;
    };

    var getIndexFromKey = function(key) {
        var targetItem = _.find(items, function(item, key, list) {
            return item.key === key;
        });

        if (targetItem === undefined) {
            return undefined;
        }

        return targetItem.index;
    };

    var getKey = function(label, index) {
        return label + index;
    };

    return {
        // getIndices: getIndices,
        // getLabels: getLabels,
        // getKeys: getKeys,
        getItems: getItems,
        getLabelFromIndex: getLabelFromIndex,
        getIndexFromKey: getIndexFromKey,
        getKey: getKey
    };



    function Item(label, index) {
        this.label = label;
        this.index = index;
        this.key = label + index;
    }
}

tryLoading();

function tryLoading() {
    var isReady = (undefined !== _.find(targets, function(value, index, list) {
        return $(value.selector, window.parent.document).length > 0;
    }));

    if (isReady) {
        main();
    } else {
        setTimeout(tryLoading, 1000);
    }
}

function main() {
    console.log('main()', arguments);

    addGlobalStyle(CSS.BOOTSTRAPPER.LABELS);
    addGlobalStyle(CSS.COLUMN_HIGHLIGHTER);

    _.each(targets, function(value, index, list) {
        applyStatExtensions($(value.selector, window.parent.document), value.stats);
    });

    console.log('main()', 'END');
}



function applyStatExtensions($table, statDefinitions) {
    console.log('applyStatExtensions()', arguments);

    var statLabels = _.keys(statDefinitions);
    var keyManager = new KeyManager(statLabels, $table);

    // Get stats
    var stats = getStats($table, keyManager);

    // Add stat rows
    var $statTotalsRow = appendRow($table).attr('class', '').addClass('stat stat-Total');
    var $statAveragesRow = appendRow($table).attr('class', '').addClass('stat stat-Average');

    // Apply values to stat rows
    _(keyManager.getItems()).each(function(item, index) {
        $($statTotalsRow.find('td').get(item.index)).text(stats.totals[item.key]);
        $($statAveragesRow.find('td').get(item.index)).text(stats.averages[item.key]);
    });

    // Apply labels to stat rows
    $($statTotalsRow.find('td.player')).html('Totals');
    $($statAveragesRow.find('td.player')).html('Averages');

    // Add stat highlights
    var applyHighlightQueue = async.queue(applyHighlightToCell, 10);
    var $bodyRows = $table.find('tbody>tr').filter(':visible').filter(':not(.stat)');
    $bodyRows.each(function() {
        var $bodyRow = $(this);

        $bodyRow.find('td').each(function(index, value) {
            applyHighlightQueue.push(value);
        });
    });

    console.log('stats', stats);

    function applyHighlightToCell(cell, callback) {
        var $cell = $(cell);

        var index = $cell.index();
        var label = keyManager.getLabelFromIndex(index);

        if (label) {
            var key = keyManager.getKey(label, index);

            var value = $cell.text();

            var parsedValue = parseNumber(value);
            if (!isNaN(parsedValue)) {
                var valueRange = stats.maximums[key] - stats.minimums[key];
                var percentileValue = (parsedValue - stats.minimums[key]) / valueRange;

                // Invert the percentile, if this stat ranks in ascending order (as opposed to descending order)
                if (statDefinitions[key] < 0) {
                    percentileValue = 1 - percentileValue;
                }

                // Apply highlights
                if (percentileValue < 0.17) {
                    $cell.html('<span class="label label-danger">' + value + '</span>');
                } else if (percentileValue < 0.34) {
                    $cell.html('<span class="label label-warning">' + value + '</span>');
                } else if (percentileValue < 0.51) {
                    $cell.html('<span class="label label-default">' + value + '</span>');
                } else if (percentileValue < 0.65) {
                    $cell.html('<span class="label label-primary">' + value + '</span>');
                } else if (percentileValue < 0.79) {
                    $cell.html('<span class="label label-info">' + value + '</span>');
                } else {
                    $cell.html('<span class="label label-success">' + value + '</span>');
                }
            }
        }

        callback();
        return;
    }
}

function getStats($table, keyManager) {
    console.log('getStats()', arguments);

    var $bodyRows = $table.find('tbody>tr');

    // Get stat totals, minimums and maximums
    var statTotals = {}, statMinimums = {}, statMaximums = {}, statCounts = {};
    $bodyRows.each(function() {
        var $bodyRow = $(this);

        $bodyRow.find('td').each(function(index, value) {
            var $cell = $(this);

            var label = keyManager.getLabelFromIndex(index);
            if (label) {
                var key = keyManager.getKey(label, index);

                var unparsedValue = $cell.text();
                var parsedValue = (value === '-') ? 0 : parseNumber(unparsedValue);

                if (!isNaN(parsedValue)) {

                    // Update stat totals
                    statTotals[key] = statTotals[key] || 0;
                    statTotals[key] += parsedValue;

                    // Update stat minimums
                    statMinimums[key] = statMinimums[key] || 0;
                    statMinimums[key] = Math.min(statMinimums[key], parsedValue);

                    // Update stat maximums
                    statMaximums[key] = statMaximums[key] || 0;
                    statMaximums[key] = Math.max(statMaximums[key], parsedValue);

                    // Update stat counts
                    statCounts[key] = statCounts[key] || 0;
                    statCounts[key] = statCounts[key] + 1;
                }
                console.log(label, value, parsedValue);
            }
        });
    });

    // Get stat averages
    var statAverages = {};
    _.each(statTotals, function(value, index, list) {
        statAverages[index] = Math.round(value / statCounts[index] * 100) / 100;
    });

    return {
        'averages': statAverages,
        'totals': statTotals,
        'minimums': statMinimums,
        'maximums': statMaximums
    };
}

function parseNumber(unparsedNumber) {
    //console.log('parseNumber()', arguments);

    var parsedNumber = unparsedNumber.indexOf('.') > -1 ? parseFloat(unparsedNumber) : parseInt(unparsedNumber, 10);

    // return isNaN(parsedNumber) ? 0 : parsedNumber;
    return parsedNumber;
}

function appendRow($table) {
    console.log('appendRow()', arguments, $table.find('tbody>tr').length);

    var $oldRow = $table.find('tbody>tr:last');
    var $newRow = $oldRow.clone(true);
    //console.log($newRow.find('td:text'));
    $newRow.find('td').html('');
    $newRow.insertAfter($oldRow);

    return $newRow;
}


function addGlobalStyle(css) {
    console.log('addGlobalStyle()', arguments);

    try {
        var elmHead, elmStyle;
        elmHead = document.getElementsByTagName('head')[0];
        elmStyle = document.createElement('style');
        elmStyle.type = 'text/css';
        elmHead.appendChild(elmStyle);
        elmStyle.innerHTML = css;
    } catch (e) {
        if (!document.styleSheets.length) {
            document.createStyleSheet();
        }
        document.styleSheets[0].cssText += css;
    }
}