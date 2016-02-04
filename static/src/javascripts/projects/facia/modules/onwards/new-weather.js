define([
    'common/utils/fastdom-promise',
    'common/utils/mount-component',
    'common/utils/$',
    'lodash/objects/assign',
    'common/utils/mediator',
    'common/utils/config',
    'facia/modules/onwards/search-tool',
    'common/utils/ajax-promise',
    'common/modules/user-prefs',
    'common/utils/detect'
], function (
    fastdom,
    mountComponent,
    $,
    assign,
    mediator,
    config,
    SearchTool,
    ajaxPromise,
    userPrefs,
    detect
) {
    var getUserLocation = function () {
        var prefs = userPrefs.get('weather-location');

        if (prefs && prefs.id) {
            var location = prefs;
            return Promise.resolve(location);
        } else {
            return ajaxPromise({
                url: config.page.weatherapiurl + '.json',
                type: 'json',
                method: 'get',
                crossOrigin: true
            });
        }
    };

    var getWeatherJson = function (location) {
        var url = config.page.weatherapiurl + '/' + location.id + '.json?_edition=' + config.page.edition.toLowerCase();
        return ajaxPromise({
            url: url,
            type: 'json',
            method: 'get',
            crossOrigin: true
        });
    };

    var getForecastJson = function (location) {
        var url = config.page.forecastsapiurl + '/' + location.id + '.json?_edition=' + config.page.edition.toLowerCase();
        return ajaxPromise({
            url: url,
            type: 'json',
            method: 'get',
            crossOrigin: true
        });
    };

    var getInitialState = function () {
        return getUserLocation().then(function (location) {
            return getLocationState(location).then(function (locationState) {
                return assign({}, locationState, {
                    expanded: true,
                    isPhabletOrLess: detect.isBreakpoint({max: 'phablet'})
                });
            });
        });
    };

    var getLocationState = function (location) {
        return getWeatherJson(location).then(function (weatherJson) {
            return getForecastJson(location).then(function (forecastJson) {
                return {
                    city: location.city,
                    template: weatherJson.html,
                    forecastHtml: forecastJson.html
                };
            });
        });
    };

    var $holder = $('#headlines .js-container__header');

    var reducer = function (previousState, action) {
        switch (action.type) {
            case 'HIDE':
                return assign({}, previousState, { expanded: false });
            case 'SHOW':
                return assign({}, previousState, { expanded: true });
            case 'SET_LOCATION':
                return assign({}, previousState, {
                    city: action.city,
                    template: action.template,
                    forecastHtml: action.forecastHtml
                });
            case 'REMOVE_LOCATION':
                return assign({}, previousState, {
                    city: action.city,
                    template: action.template,
                    forecastHtml: action.forecastHtml
                });
            default:
                return previousState;
        }
    };

    var render = function (state) {
        //
        // Remove previous
        //
        // TODO: Don't do this everytime
        var $oldWeather = $('.js-weather');
        $oldWeather.remove();

        //
        // Add new
        //
        var $newWeather = $.create(state.template.replace(new RegExp('<%=city%>', 'g'), state.city));
        $holder.append($newWeather);

        var $searchTool = $('.js-search-tool', $newWeather);

        var searchTool = new SearchTool({
            container: $searchTool,
            apiUrl: config.page.locationapiurl
        });
        searchTool.init();

        if (state.expanded) {
            $newWeather.addClass('is-expanded');
        } else {
            $newWeather.removeClass('is-expanded');
        }

        var $forecast = $('.js-weather-forecast', $newWeather);
        $forecast.empty().html(state.forecastHtml);

        if (state.isPhabletOrLess) {
            window.scrollTo(0, 0);
        }
    };

    var attachListeners = function (dispatch) {
        document.body.addEventListener('click', function (event) {
            if (event.target.matches('.js-toggle-forecast')) {
                // TODO: Prevent here?!
                event.preventDefault();
                var $weather = $('.js-weather');
                // TODO: state.expanded?
                dispatch({ type: ($weather.hasClass('is-expanded') ? 'HIDE' : 'SHOW') });
            }
        });

        // TODO: What would we use instead of global events?
        mediator.on('autocomplete:fetch', function (location) {
            getLocationState(location).then(function (locationState) {
                dispatch({
                    type: (location.store === 'set' ? 'SET_LOCATION' : 'REMOVE_LOCATION'),
                    city: locationState.city,
                    template: locationState.template,
                    forecastHtml: locationState.forecastHtml
                });
            });
        });
    };

    return function () {
        getInitialState().then(function (initialState) {
            mountComponent({
                initialState: initialState,
                reducer: reducer,
                render: render,
                attachListeners: attachListeners
            });
        });
    };

});
