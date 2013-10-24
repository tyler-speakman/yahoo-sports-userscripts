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
    }
};

var STAT_DEFINITIONS = {
    UTILS: {
        '% Owned': +1,
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
        '% Owned': +1,
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


// $(window.top).load(function(e) {
//     // For debugging
//     var isFrameElement = !! frameElement;
//     var isTopWindow = window.top === window.self;
//     console.log('window.top.load()');
//     console.log('window.top.load()', window.top.location.href, arguments);
//     console.log('window.top.load()', window.self.location.href, isFrameElement ? frameElement.src : '', frames.length, isFrameElement, isTopWindow, $(e.target.documentElement).find('head title').text());
//     console.log('window.top.load()', URI(window.self.location.href).search(true).l, URI(window.self.location.href).search(true));
// });

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
    var columnManager = new ColumnManager($table);

    // Filter out columns that we don't care about
    _.each(columnManager.getItems(), function(item, key, length) {
        if (!_.contains(statLabels, item.label)) {
            columnManager.removeItem(item);
        }
    });

    // Get stats
    var stats = getStats($table, columnManager);
    console.log('applyStatExtensions()', 'getStats()', stats);

    //
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
            // console.log('applyStatExtensions()', 'columnManager.getItems().each()', arguments, item.key);
            var columnKey = item.key;
            var columnIndex = item.index;

            var statValue = formatValue(stats[statType][columnKey]);
            // var $statCell = $statRow.find('td:eq(' + columnIndex + ')');
            var $statCell = $statRow.find('td:eq(' + columnIndex + ')');
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

    //
    // Add stat highlights
    var $bodyRows = $table.find('tbody>tr:visible:not(.ysu)');
    $bodyRows.each(function() {
        var $bodyRow = $(this);

        _(columnManager.getItems()).each(function(item, index, list) {
            var columnIndex = item.index;
            var columnLabel = item.label;

            var columnKey = columnManager.getKey(columnLabel, columnIndex);
            console.log(columnKey)

            var $cell = $bodyRow.find('td:eq(' + columnIndex + ')');
            var unparsedValue = $cell.text();
            var parsedValue = parseNumber(unparsedValue);

            if (isNaN(parsedValue)) {
                return;
            }

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
            if (percentileValue < 1 /
                6) {
                $cellHighlight.addClass('label-danger');
            } else if (percentileValue < 2 / 6) {
                $cellHighlight.addClass('label-warning');
            } else if (percentileValue < 3 / 6 - 0.5 / 6) {
                $cellHighlight.addClass('label-default');
            } else if (percentileValue > 5 / 6) {
                $cellHighlight.addClass('label-success');
            } else if (percentileValue > 4 / 6) {
                $cellHighlight.addClass('label-primary');
            } else if (percentileValue > 3 / 6 + 0.5 / 6) {
                $cellHighlight.addClass('label-info');
            } else {
                // Do nothing
            }
            $cell.html($cellHighlight);
        });
    });

    //
    // Add rank ratios
    var columns = columnManager.getItems();
    var ownershipColumn =
        _.findWhere(columns, {
            label: '% Owned'
        });
    var oRankColumn =
        _.findWhere(columns, {
            label: 'O-Rank'
        });
    var rankColumn =
        _.findWhere(columns, {
            label: 'Rank'
        });
    if (ownershipColumn && oRankColumn && rankColumn) {
        var $performanceRatioLabel = $('<sup class="ysu"></sup>');
        $bodyRows.each(function() {
            var $bodyRow = $(this);

            var ownershipValue = parseNumber($bodyRow.find('td:eq(' + ownershipColumn.index + ')').text().replace('%', ''));
            var oRankValue = parseNumber($bodyRow.find('td:eq(' + oRankColumn.index + ')').text());
            var rankValue = parseNumber($bodyRow.find('td:eq(' + rankColumn.index + ')').text());
            // console.log(
            //     isNaN(ownershipValue),
            //     isNaN(oRankValue),
            //     isNaN(rankValue), 
            //     (ownershipColumn.index), 
            //     (oRankColumn.index),
            //     (rankColumn.index),                 
            //     (ownershipValue), 
            //     (oRankValue),
            //     (rankValue), 
            //     $bodyRow.find('td:eq(' + ownershipColumn.index + ')').text(), 
            //     $bodyRow.find('td:eq(' + oRankColumn.index + ')').text(),
            //     $bodyRow.find('td:eq(' + rankColumn.index + ')').text());

            // If any of the values aren't numbers, then exit
            if (isNaN(ownershipValue) || isNaN(oRankValue) || isNaN(rankValue)) {
                // Exit
                return;
            }

            var performanceRatio = oRankValue / rankValue;
            var confidenceRatio = performanceRatio * (ownershipValue / 100);

            $bodyRow.find('td.Ta-start:visible:first .ysf-player-name')
                .append($performanceRatioLabel.clone(true).text(confidenceRatio.toFixed(1) + ' / ' + performanceRatio.toFixed(1)));
        });
    }

    console.log('stats', stats);


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
}

function getStats($table, columnManager) {
    console.log('getStats()', arguments);

    var $bodyRows = $table.find('tbody>tr');

    var stats = {
        totals: {},
        minimums: {},
        maximums: {},
        counts: {},
        averages: {}
    };

    // Get stat totals, minimums and maximums
    $bodyRows.each(function() {
        var $bodyRow = $(this);


        _(columnManager.getItems()).each(function(item, index, list) {
            var columnIndex = item.index;
            var columnLabel = item.label;

            console.log('getStats()', 'columnManager.getItems().each()', item)
            var columnKey = columnManager.getKey(columnLabel, columnIndex);

            var $cell = $bodyRow.find('td:eq(' + columnIndex + ')');
            var unparsedValue = $cell.text();
            var parsedValue = (unparsedValue === '-') ? 0 : parseNumber(unparsedValue);

            if (isNaN(parsedValue)) {
                return;
            }


            // Update stat totals
            stats.totals[columnKey] = _.isNumber(stats.totals[columnKey]) ? stats.totals[columnKey] : 0;
            stats.totals[columnKey] += parsedValue;
            stats.totals.collection = stats.totals.collection || [];
            stats.totals.collection.push(parsedValue);

            // Update stat minimums
            stats.minimums[columnKey] = _.isNumber(stats.minimums[columnKey]) ? stats.minimums[columnKey] : Number.MAX_VALUE;
            stats.minimums[columnKey] = Math.min(stats.minimums[columnKey], parsedValue);
            stats.minimums.collection = stats.minimums.collection || [];
            stats.minimums.collection.push(parsedValue);

            // Update stat maximums
            stats.maximums[columnKey] = _.isNumber(stats.maximums[columnKey]) ? stats.maximums[columnKey] : Number.MIN_VALUE;
            stats.maximums[columnKey] = Math.max(stats.maximums[columnKey], parsedValue);
            stats.maximums.collection = stats.maximums.collection || [];
            stats.maximums.collection.push(parsedValue);

            // Update stat counts
            stats.counts[columnKey] = _.isNumber(stats.counts[columnKey]) ? stats.counts[columnKey] : 0;
            stats.counts[columnKey] = stats.counts[columnKey] + 1;
            stats.counts.collection = stats.counts.collection || [];
            stats.counts.collection.push(parsedValue);

            console.log('getStats()', '$bodyRows.each()', '$bodyRow.find("td")', columnLabel, item, parsedValue);
        });
    });

    // Get stat averages
    _.each(stats.totals, function(value, index, list) {
        stats.averages[index] = value / stats.counts[index];
    });

    // Set fallback value for all keys on all stats
    _.each(columnManager.getItems(), function(item, index, list) {
        // console.log('getStats()', 'columnManager.getItems().each()', arguments, item.key);
        stats.totals[item.key] = _.isNumber(stats.totals[item.key]) ? stats.totals[item.key] : '-';
        stats.minimums[item.key] = _.isNumber(stats.minimums[item.key]) ? stats.minimums[item.key] : '-';
        stats.maximums[item.key] = _.isNumber(stats.maximums[item.key]) ? stats.maximums[item.key] : '-';
        stats.counts[item.key] = _.isNumber(stats.counts[item.key]) ? stats.counts[item.key] : '-';
        stats.averages[item.key] = _.isNumber(stats.averages[item.key]) ? stats.averages[item.key] : '-';
    });

    // Remove the count. It isn't necessary outside.
    delete stats.counts;

    return stats;
}

function parseNumber(unparsedNumber) {
    //console.log('parseNumber()', arguments);

    var parsedNumber = unparsedNumber.indexOf('.') > -1 ? parseFloat(unparsedNumber) : parseInt(unparsedNumber, 10);

    // return isNaN(parsedNumber) ? 0 : parsedNumber;
    return parsedNumber;
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

function ColumnManager($table) {
    var $headerRows = $table.find('thead>tr:last');

    // Initialize labels and indices
    var items = [];
    var columnOffset = 0;
    $headerRows.find('th').each(function(index, value) {
        var $headerCell = $(this);

        var columnIndex = index + columnOffset;
        var columnLabel = $headerCell.attr('title');
        var columnSpan = parseInt($headerCell.attr('colspan'), 10);

        // Update column offset (using colspan attribute)
        if (!isNaN(columnSpan)) {
            columnOffset += columnSpan - 1;
        }

        // If the column is "unlabelled", then ignore it
        if ((columnLabel === null || columnLabel === undefined)) {
            // Exit
            return;
        }

        items.push(new Item(columnLabel, columnIndex));
    });
    var getItems = function() {
        return items;
    };
    var addItem = function(targetItem) {
        items.push(targetItem);

        return items.length;
    };
    var removeItem = function(targetItem) {
        items = _.filter(items, function(item, index, list) {
            return item.key !== targetItem.key;
        });

        return items.length;
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
        return label.toString() + index.toString();
    };

    return {
        getItems: getItems,
        addItem: addItem,
        removeItem: removeItem,
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