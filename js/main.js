define([
    "esri/map",
    "esri/config",
    "arcgis/config",
    "arcgis/symbols",
    "arcgis/wmsManager",
    "arcgis/polygonManager",
    "arcgis/popupManager",
    "arcgis/uiManager",
    "arcgis/toolManager",
    "dojo/on",
    "dojo/dom",
    "dojo/domReady!",
], function (
    Map,
    esriConfig,
    Config,
    Symbols,
    WMSManager,
    PolygonManager,
    PopupManager,
    UIManager,
    ToolManager,
    on,
    dom
) {
    var map = null;

    function createBaseMap(containerId, mapConfig) {
        var mapDiv = containerId || "map";
        var config = Object.assign({}, Config.MAP_CONFIG, mapConfig || {});

        map = new Map(mapDiv, {
            basemap: config.basemap,
            center: config.center,
            zoom: config.zoom,
        });

        return map;
    }

    function initializeUIManager() {
        UIManager.initialize(map, PolygonManager);
        UIManager.createToggleButtons();
        UIManager.updateUI();
    }
    function initializePolygonManager() {
        PolygonManager.initialize(map);
    }
    function initializePopupManager() {
        PopupManager.initialize(map);
    }
    function initializeToolManager() {
        ToolManager.initialize(map, PolygonManager, UIManager);
    }
    function initializeWMSManager() {
        WMSManager.initialize(map);
    }

    function bindToolEvents() {
        var drawBtn = dom.byId("drawBtn");
        var selectBtn = dom.byId("selectBtn");
        var splitBtn = dom.byId("splitBtn");
        var mergeBtn = dom.byId("mergeBtn");
        var clearBtn = dom.byId("clearBtn");

        if (drawBtn) on(drawBtn, "click", ToolManager.activateDrawTool);
        if (selectBtn) on(selectBtn, "click", ToolManager.activateSelectTool);
        if (splitBtn) on(splitBtn, "click", ToolManager.activateSplitTool);
        if (mergeBtn) on(mergeBtn, "click", ToolManager.mergePolygons);
        if (clearBtn) on(clearBtn, "click", ToolManager.clearAllGraphics);
    }

    function bindMapClick() {
        map.on("click", function (event) {
            var currentTool = ToolManager.getCurrentTool();
            if (currentTool === "select") {
                ToolManager.handleMapClick(event);
            } else if (!ToolManager.hasActiveTool()) {
                WMSManager.queryWMSLayers(event);
            }
        });
    }

    var MapApp = {
        createBaseMap: createBaseMap,
        initializeUIManager: initializeUIManager,
        initializePolygonManager: initializePolygonManager,
        initializePopupManager: initializePopupManager,
        initializeToolManager: initializeToolManager,
        initializeWMSManager: initializeWMSManager,
        bindToolEvents: bindToolEvents,
        bindMapClick: bindMapClick,
        getMap: function () {
            return map;
        },
        getManagers: function () {
            return {
                wms: WMSManager,
                polygon: PolygonManager,
                popup: PopupManager,
                ui: UIManager,
                tool: ToolManager,
            };
        },
    };

    // Để dùng được ở ngoài, gán lên window (optional)
    window.MapApp = MapApp;

    // BẮT BUỘC phải return MapApp cho AMD/RequireJS
    return MapApp;
});
