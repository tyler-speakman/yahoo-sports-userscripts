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
        selector: '#statTable0,#statTable3,#players-table table',
        stats: STAT_DEFINITIONS.UTILS
    },
    // "Matchup" page, goalies
    {
        selector: '#statTable5,#statTable1',
        stats: STAT_DEFINITIONS.GOALIES
    }
];
// var targets = [
//     // "Players List" page
//     {
//         selector: '#players-table table',
//         stats: STAT_DEFINITIONS.UTILS
//     },
//     // "Matchup" page, utils
//     {
//         selector: '#statTable3',
//         stats: STAT_DEFINITIONS.UTILS
//     },
//     // "Matchup" page, goalies
//     {
//         selector: '#statTable5',
//         stats: STAT_DEFINITIONS.GOALIES
//     },
//     // "My Team" page, utils
//     {
//         selector: '#statTable0',
//         stats: STAT_DEFINITIONS.UTILS
//     },
//     // "My Team" page, goalies
//     {
//         selector: '#statTable1',
//         stats: STAT_DEFINITIONS.GOALIES
//     }
// ];

tryLoading();

function tryLoading() {
    var hasTargets = (undefined !== _.find(targets, function(value, index, list) {
        return $(value.selector, window.parent.document).length > 0;
    }));
    var hasAlreadyLoaded = $('#ysu-is-loaded', window.parent.document).length > 0;
    var isReady = hasTargets && !hasAlreadyLoaded;

    if (isReady) {
        main();
        $('body', window.parent.document).append('<div id="ysu-is-loaded" class="ysu"/>')
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
    console.log('applyStatExtensions()', stats)

    // Add stat rows
    var $statTotalsRow = appendRow($table).attr('class', '').addClass('ysu stat stat-Total');
    var $statAveragesRow = appendRow($table).attr('class', '').addClass('ysu stat stat-Average');

    // Apply values to stat rows
    _(keyManager.getItems()).each(function(item, index) {
        var $statCell = $('<small class="ysu"></small>');

        console.log('applyStatExtensions()', 'keyManager.getItems().each()', arguments, item.key);

        // Set stat value
        var statTotalValue = formatValue(stats.totals[item.key]);
        $($statTotalsRow.find('td').get(item.index)).html($statCell.clone(true).text(statTotalValue));

        // Set stat average value
        var statAverageValue = formatValue(stats.averages[item.key]);
        $($statAveragesRow.find('td').get(item.index)).html($statCell.clone(true).text(statAverageValue));

        function formatValue(value) {
            if (value.toFixed) {
                return value.toFixed(1).replace(/(.*)\.0/gi, '$1')
            }

            return value;
        }
    });

    // Apply labels to stat rows
    $($statTotalsRow.find('td.Ta-start:visible')).html('Totals');
    $($statAveragesRow.find('td.Ta-start:visible')).html('Averages');

    // Add stat highlights
    var applyHighlightQueue = async.queue(applyHighlightToCell, 10);
    var $bodyRows = $table.find('tbody>tr:visible:not(.stat)');
    $bodyRows.each(function() {
        var $bodyRow = $(this);

        $bodyRow.find('td').each(function(index, value) {
            applyHighlightQueue.push($(value));
        });
    });

    console.log('stats', stats);

    function applyHighlightToCell($cell, callback) {
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
                if (statDefinitions[label] < 0) {
                    percentileValue = 1 - percentileValue;
                }

                // Apply highlights
                var $cellHighlight = $('<span class="ysu label">' + value + '</span>');
                if (percentileValue < 0.17) {
                    $cellHighlight.addClass('label-danger');
                } else if (percentileValue < 0.34) {
                    $cellHighlight.addClass('label-warning');
                } else if (percentileValue < 0.51) {
                    $cellHighlight.addClass('label-default');
                } else if (percentileValue < 0.65) {
                    $cellHighlight.addClass('label-primary');
                } else if (percentileValue < 0.79) {
                    $cellHighlight.addClass('label-info');
                } else {
                    $cellHighlight.addClass('label-success');
                }
                $cell.html($cellHighlight);
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
                    statTotals[key] = _.isNumber(statTotals[key]) ? statTotals[key] : 0;
                    statTotals[key] += parsedValue;

                    // Update stat minimums
                    statMinimums[key] = _.isNumber(statMinimums[key]) ? statMinimums[key] : 0;
                    statMinimums[key] = Math.min(statMinimums[key], parsedValue);

                    // Update stat maximums
                    statMaximums[key] = _.isNumber(statMaximums[key]) ? statMaximums[key] : 0;
                    statMaximums[key] = Math.max(statMaximums[key], parsedValue);

                    // Update stat counts
                    statCounts[key] = _.isNumber(statCounts[key]) ? statCounts[key] : 0;
                    statCounts[key] = statCounts[key] + 1;
                }
                console.log(label, value, parsedValue);
            }
        });
    });

    // Get stat averages
    var statAverages = {};
    _.each(statTotals, function(value, index, list) {
        statAverages[index] = value / statCounts[index];
    });


    // Set fallback value for all keys on all stats
    _.each(keyManager.getItems(), function(item, index, list) {
        console.log('getStats()', 'keyManager.getItems().each()', arguments, item.key);
        statTotals[item.key] = _.isNumber(statTotals[item.key]) ? statTotals[item.key] : '-';
        statMinimums[item.key] = _.isNumber(statMinimums[item.key]) ? statMinimums[item.key] : '-';
        statMaximums[item.key] = _.isNumber(statMaximums[item.key]) ? statMaximums[item.key] : '-';
        statCounts[item.key] = _.isNumber(statCounts[item.key]) ? statCounts[item.key] : '-';
        statAverages[item.key] = _.isNumber(statAverages[item.key]) ? statAverages[item.key] : '-';
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