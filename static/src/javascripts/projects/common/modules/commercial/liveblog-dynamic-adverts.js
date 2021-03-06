define([
    'bonzo',
    'common/utils/fastdom-promise',
    'common/utils/config',
    'common/utils/mediator',
    'common/modules/commercial/create-ad-slot',
    'common/modules/article/space-filler',
    'common/modules/commercial/dfp-api'
], function (
    bonzo,
    fastdom,
    config,
    mediator,
    createAdSlot,
    spaceFiller,
    dfp
) {
    var INTERVAL = 5;      // number of posts between ads
    var OFFSET = 1.5;      // ratio of the screen height from which ads are loaded
    var MAX_ADS = 8;       // maximum number of ads to display

    var slotCounter = 0, windowHeight, firstSlot;

    function startListening() {
        mediator.on('modules:autoupdate:updates', onUpdate);
    }

    function stopListening() {
        mediator.off('modules:autoupdate:updates', onUpdate);
    }

    function getSpaceFillerRules(windowHeight, update) {
        var prevSlot, prevIndex;
        update = !!update;
        return {
            bodySelector: '.js-liveblog-body',
            slotSelector: ' > .block',
            fromBottom: update,
            startAt: update ? firstSlot : null,
            minAbove: update ? 0 : windowHeight * OFFSET,
            minBelow: 0,
            filter: filterSlot
        };

        function filterSlot(slot, index) {
            if (index === 0) {
                prevSlot = slot;
                prevIndex = index;
                return !update;
            } else if (index - prevIndex >= INTERVAL && Math.abs(slot.top - prevSlot.top) >= windowHeight) {
                prevSlot = slot;
                prevIndex = index;
                return true;
            }

            return false;
        }
    }

    function insertAds(slots) {
        for (var i = 0; i < slots.length && slotCounter < MAX_ADS; i++) {
            var $slot = bonzo(slots[i]);
            var $adSlot = bonzo(createAdSlot('inline1' + slotCounter++, 'liveblog-inline'));
            $slot.after($adSlot);
            dfp.addSlot($adSlot);
        }
    }

    function fill(rules) {
        return spaceFiller.fillSpace(rules, insertAds)
            .then(function (result) {
                if (slotCounter === MAX_ADS) {
                    result = false;
                }
                return result;
            })
            .then(function (result) {
                if (result) {
                    firstSlot = document.querySelector(rules.bodySelector + ' > .ad-slot').previousSibling;
                    startListening();
                } else {
                    firstSlot = null;
                }
            });
    }

    function onUpdate() {
        stopListening();
        Promise.resolve(getSpaceFillerRules(windowHeight, true)).then(fill);
    }

    function init() {
        return fastdom.read(function () {
            return windowHeight = document.documentElement.clientHeight;
        })
        .then(getSpaceFillerRules)
        .then(fill);
    }

    return {
        init: init
    };
});
