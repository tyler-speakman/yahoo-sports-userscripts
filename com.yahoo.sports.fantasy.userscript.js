// ==UserScript==
// @name       Yahoo Sports: NHL Statistic Extensions
// @namespace  http://use.i.E.your.homepage/
// @version    0.1
// @description  Includes 
// @include  /^http://hockey\.fantasysports\.yahoo\.com/hockey/.*$/
// @require  https://cdnjs.cloudflare.com/ajax/libs/jquery/2.0.3/jquery.min.js
// @require  https://cdnjs.cloudflare.com/ajax/libs/lodash.js/2.2.1/lodash.js
// @require  https://cdnjs.cloudflare.com/ajax/libs/async/1.22/async.min.js
// @require  https://cdnjs.cloudflare.com/ajax/libs/URI.js/1.7.2/URI.min.js
// @copyright  2012+, You
// ==/UserScript==

/* global console, _, async, $, URI */

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
        'Goals': +1,
        'Assists': +1,
        'Plus/Minus': +1,
        'Penalty Minutes': +1,
        'Powerplay Points': +1,
        'Shots on Goal': +1,
        'Faceoffs Won': +1,
        'Hits': +1,
        'Blocks': +1
    },
    GOALIES: {
        'O-Rank': -1,
        'Rank': -1,
        'Wins': +1,
        'Goals Against Average': -1,
        'Saves': +1,
        'Shots Against': +1,
        'Save Percentage': +1,
        'Shutouts': +1
    }
};

/**
 * Defines the target tables for stat-exentsions
 */
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


$(window.top).load(function(e) {
    // For debugging
    var isFrameElement = !! frameElement;
    var isTopWindow = window.top === window.self;
    console.log('window.top.load()');
    console.log('window.top.load()', window.top.location.href, arguments);
    console.log('window.top.load()', window.self.location.href, isFrameElement ? frameElement.src : '', frames.length, isFrameElement, isTopWindow, $(e.target.documentElement).find('head title').text());
    console.log('window.top.load()', URI(window.self.location.href).search(true).l, URI(window.self.location.href).search(true));
});

var stateManager = new StateManager();
tryLoading();

function tryLoading() {
    console.log('tryLoading()', arguments);

    var hasTargets = (undefined !== _.find(targets, function(value, index, list) {
        return $(value.selector, window.parent.document).length > 0;
    }));
    var hasAlreadyLoaded = stateManager.hasAlreadyLoaded();
    var isNewsRequest = stateManager.isNewsRequest();

    console.log(hasTargets, hasAlreadyLoaded, isNewsRequest);

    if (hasTargets) {
        if (hasAlreadyLoaded && isNewsRequest) {
            // Ignore news requests
        } else {
            main();
            stateManager.setLoaded();
        }
    } else {
        setTimeout(tryLoading, 5000);
    }
}

function main() {
    console.log('main()', arguments);

    addGlobalStyle(CSS.BOOTSTRAPPER.LABELS);
    addGlobalStyle(CSS.COLUMN_HIGHLIGHTER);

    _.each(targets, function(target, index, list) {
        applyStatExtensions($(target.selector, window.parent.document), target.stats);
    });
}


function applyStatExtensions($table, statDefinitions) {
    console.log('applyStatExtensions()', arguments);

    var statLabels = _.keys(statDefinitions);
    var columnManager = new ColumnManager(statLabels, $table);

    // Get stats
    var stats = getStats($table, columnManager);
    console.log('applyStatExtensions()', stats);

    // Add stat rows
    var $statCellTemplate = $('<small class="ysu"></small>');
    _.each(stats, function(value, key, list) {
        var statType = key;
        var $statRow = appendRow($table).addClass('ysu stat');
        $statRow.find('td').removeClass('Bg-shade2');

        // Apply label to stat row
        $statRow.find('td.Ta-start:visible:first').text(key);

        // Apply values to stat row
        _(columnManager.getItems()).each(function(item, index) {
            console.log('applyStatExtensions()', 'columnManager.getItems().each()', arguments, item.key);
            var columnKey = item.key;
            var columnIndex = item.index;

            var statValue = formatValue(stats[statType][columnKey]);
            var $statCell = $($statRow.find('td').get(columnIndex));
            $statCell.html($statCellTemplate.clone(true).text(statValue));

            /**
             * Formats a number value to a single decimal. If the decimal is zero, then it is removed.
             * @param  {number} value A number.
             * @return {string}       A formatted string representation of the number.
             */

            function formatValue(value) {
                if (value.toFixed) {
                    return value.toFixed(1).replace(/(.*)\.0/gi, '$1');
                }

                return value;
            }
        });

    });

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
        var columnIndex = $cell.index();
        var columnLabel = columnManager.getLabelFromIndex(columnIndex);

        if (columnLabel) {
            var columnKey = columnManager.getKey(columnLabel, columnIndex);

            var unparsedValue = $cell.text();
            var parsedValue = parseNumber(unparsedValue);
            if (!isNaN(parsedValue)) {

                // Calculate percentile value (there has to be a better way to do this..)
                var percentileValue;
                if (parsedValue < stats.averages[columnKey]) {
                    percentileValue = ((parsedValue - stats.minimums[columnKey]) / (stats.averages[columnKey] - stats.minimums[columnKey])) / 2;
                } else if (parsedValue > stats.averages[columnKey]) {
                    percentileValue = ((parsedValue - stats.averages[columnKey]) / (stats.maximums[columnKey] - stats.averages[columnKey])) / 2 + 0.5;
                } else {
                    percentileValue = 0.5;
                }

                // Invert the percentile, if this stat ranks in ascending order (as opposed to descending order)
                if (statDefinitions[columnLabel] < 0) {
                    percentileValue = 1 - percentileValue;
                }

                // Apply highlights
                var $cellHighlight = $('<span class="ysu label">' + unparsedValue + '</span>');
                if (percentileValue < 1 / 6) {
                    $cellHighlight.addClass('label-danger');
                } else if (percentileValue < 2 / 6) {
                    $cellHighlight.addClass('label-warning');
                } else if (percentileValue < 3 / 6 - 1 / 100) {
                    $cellHighlight.addClass('label-default');
                } else if (percentileValue > 5 / 6) {
                    $cellHighlight.addClass('label-success');
                } else if (percentileValue > 4 / 6) {
                    $cellHighlight.addClass('label-primary');
                } else if (percentileValue > 3 / 6 + 1 / 100) {
                    $cellHighlight.addClass('label-info');
                } else {
                    // Do nothing
                }
                $cell.html($cellHighlight);
            }
        }

        callback();
        return;
    }
}

function getStats($table, columnManager) {
    console.log('getStats()', arguments);

    var $bodyRows = $table.find('tbody>tr');

    // Get stat totals, minimums and maximums
    var statTotals = {}, statMinimums = {}, statMaximums = {}, statCounts = {};
    $bodyRows.each(function() {
        var $bodyRow = $(this);

        $bodyRow.find('td').each(function(index, value) {
            var columnIndex = index;
            var $cell = $(this);

            var columnLabel = columnManager.getLabelFromIndex(columnIndex);
            if (columnLabel) {
                var columnKey = columnManager.getKey(columnLabel, columnIndex);

                var unparsedValue = $cell.text();
                var parsedValue = (value === '-') ? 0 : parseNumber(unparsedValue);

                if (!isNaN(parsedValue)) {

                    // Update stat totals
                    statTotals[columnKey] = _.isNumber(statTotals[columnKey]) ? statTotals[columnKey] : 0;
                    statTotals[columnKey] += parsedValue;

                    // Update stat minimums
                    statMinimums[columnKey] = _.isNumber(statMinimums[columnKey]) ? statMinimums[columnKey] : Number.MAX_VALUE;
                    statMinimums[columnKey] = Math.min(statMinimums[columnKey], parsedValue);

                    // Update stat maximums
                    statMaximums[columnKey] = _.isNumber(statMaximums[columnKey]) ? statMaximums[columnKey] : Number.MIN_VALUE;
                    statMaximums[columnKey] = Math.max(statMaximums[columnKey], parsedValue);

                    // Update stat counts
                    statCounts[columnKey] = _.isNumber(statCounts[columnKey]) ? statCounts[columnKey] : 0;
                    statCounts[columnKey] = statCounts[columnKey] + 1;
                }
                console.log(columnLabel, value, parsedValue);
            }
        });
    });

    // Get stat averages
    var statAverages = {};
    _.each(statTotals, function(value, index, list) {
        statAverages[index] = value / statCounts[index];
    });


    // Set fallback value for all keys on all stats
    _.each(columnManager.getItems(), function(item, index, list) {
        console.log('getStats()', 'columnManager.getItems().each()', arguments, item.key);
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
        'maximums': statMaximums //,
        //'counts': statCounts
    };
}

function parseNumber(unparsedNumber) {
    //console.log('parseNumber()', arguments);

    var parsedNumber = unparsedNumber.indexOf('.') > -1 ? parseFloat(unparsedNumber) : parseInt(unparsedNumber, 10);

    // return isNaN(parsedNumber) ? 0 : parsedNumber;
    return parsedNumber;
}

/**
 * Appends a row to a table.
 * @param  {jQuery element} $table An HTML table element with jQuery wrapper.
 * @return {jQuery element}        An HTML row element with jQuery wrapper.
 */

function appendRow($table) {
    console.log('appendRow()', arguments, $table.find('tbody>tr').length);

    var $oldRow = $table.find('tbody>tr:last');
    var $newRow = $oldRow.clone(true); //.attr('class', '');

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


/**
 * Given a table an a collection of target label (i.e., column headers), this
 * object correlates column labels with column indices. It also produces a
 * series unique keys.
 * @param {string[]}        labels An array of labels (i.e., column headers).
 * @param {jQuery element}  $table $table An HTML table element with jQuery wrapper.
 */

function ColumnManager(labels, $table) {
    var $headerRows = $table.find('thead>tr:last');

    // Initialize labels and indices
    var items = [];
    $headerRows.find('th').each(function(index, value) {
        var $headerCell = $(this);

        var columnLabel = $headerCell.attr('title');

        if (_.contains(labels, columnLabel)) {
            items.push(new Item(columnLabel, index));
        }
    });

    var getItems = function() {
        return items;
    };

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

function StateManager() {
    var hasAlreadyLoaded = function() {
        return $('#ysu-is-loaded', window.top.document).length > 0;
    };
    var setLoaded = function() {
        if (!hasAlreadyLoaded()) {
            $('body', window.top.document).append('<div id="ysu-is-loaded" class="ysu"/>');
        }
    };
    var setUnloaded = function() {
        $('body #ysu-is-loaded', window.top.document).remove();
    };
    var isNewsRequest = function() {
        var newsRequests = ['n1FB', 'n2FB'];

        return _.contains(newsRequests, URI(window.self.location.href).search(true).l);
    };
    var isPjaxRequest = function() {
        return window.top === window.self;
    };

    return {
        hasAlreadyLoaded: hasAlreadyLoaded,
        setLoaded: setLoaded,
        setUnloaded: setUnloaded,
        isNewsRequest: isNewsRequest,
        isPjaxRequest: isPjaxRequest
    };
}