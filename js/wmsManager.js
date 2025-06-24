define([
    "esri/layers/WMSLayer",
    "esri/layers/WMSLayerInfo",
    "esri/geometry/Extent",
    "esri/SpatialReference",
    "esri/geometry/webMercatorUtils",
    "dojo/dom",
    "arcgis/config",
    "arcgis/popupManager",
], function (
    WMSLayer,
    WMSLayerInfo,
    Extent,
    SpatialReference,
    webMercatorUtils,
    dom,
    Config,
    PopupManager
) {
    var wmsLayers = [];
    var map = null;

    /**
     * Khởi tạo WMS Manager với map instance
     * @param {Map} mapInstance - Instance của map
     */
    function initialize(mapInstance) {
        map = mapInstance;
        setupCORS();
    }

    /**
     * Cấu hình CORS cho các domain WMS
     */
    function setupCORS() {
        const domains = Config.WMS_CONFIG.map((item) => {
            return item.domain;
        });
        const domainSet = new Set(domains);
        const domainUnique = [...domainSet];

        domainUnique.forEach((element) => {
            if (element) {
                esriConfig.defaults.io.corsEnabledServers.push(element);
            }
        });
    }

    /**
     * Thêm WMS layer vào bản đồ
     * Sử dụng cấu hình từ Config.WMS_CONFIG
     */
    function addWMSLayer() {
        try {
            const selectedWmsConfig = Config.WMS_CONFIG[0];

            // Tạo WMS Layer Info
            var layerInfo = new WMSLayerInfo({
                name: selectedWmsConfig.layers,
                title: selectedWmsConfig.name,
            });

            var wmsLayer = new WMSLayer(selectedWmsConfig.url, {
                resourceInfo: {
                    extent: new Extent(
                        -180,
                        -90,
                        180,
                        90,
                        new SpatialReference({ wkid: 4326 })
                    ),
                    layerInfos: [layerInfo],
                },
                visibleLayers: [selectedWmsConfig.layers],
                opacity: 0.8,
            });

            // Xử lý lỗi khi load WMS layer
            wmsLayer.on("error", function (error) {
                console.error("WMS Layer error:", error);
                alert(
                    "Không thể load WMS. Vui lòng kiểm tra cấu hình hoặc liên hệ quản trị server."
                );
            });

            map.addLayer(wmsLayer);
            wmsLayers.push({
                layer: wmsLayer,
                url: selectedWmsConfig.url,
                layerNames: selectedWmsConfig.layers,
            });

            // Zoom đến extent của WMS layer
            zoomToWMSExtent(selectedWmsConfig);
        } catch (error) {
            console.error("Error adding WMS layer:", error);
        }
    }

    /**
     * Xóa WMS layer cuối cùng khỏi bản đồ
     */
    function removeWMSLayer() {
        if (wmsLayers.length > 0) {
            var wmsInfo = wmsLayers.pop();
            map.removeLayer(wmsInfo.layer);

            if (wmsLayers.length === 0) {
                dom.byId("removeWmsBtn").disabled = true;
            }
        }
    }

    /**
     * Zoom bản đồ đến extent của WMS layer
     * @param {Object} selectedWmsConfig - Cấu hình WMS được chọn
     */
    function zoomToWMSExtent(selectedWmsConfig) {
        if (!selectedWmsConfig) return;

        // Tạo request để lấy GetCapabilities của WMS service
        var xhr = new XMLHttpRequest();
        var capsURL =
            selectedWmsConfig.url +
            "?SERVICE=WMS&REQUEST=GetCapabilities&VERSION=1.3.0";

        xhr.open("GET", capsURL, true);
        xhr.onload = function () {
            if (xhr.status === 200) {
                try {
                    // Parse XML response để lấy thông tin extent
                    var parser = new DOMParser();
                    var xmlDoc = parser.parseFromString(
                        xhr.responseText,
                        "text/xml"
                    );

                    var layerName = selectedWmsConfig.layers.split(":")[1];
                    var layers = xmlDoc.getElementsByTagName("Layer");

                    // Tìm layer phù hợp và lấy extent
                    for (var i = 0; i < layers.length; i++) {
                        var nameElement =
                            layers[i].getElementsByTagName("Name")[0];
                        if (
                            nameElement &&
                            nameElement.textContent.includes(layerName)
                        ) {
                            var bboxElement =
                                layers[i].getElementsByTagName(
                                    "BoundingBox"
                                )[0];
                            if (bboxElement) {
                                var minx = parseFloat(
                                    bboxElement.getAttribute("minx")
                                );
                                var miny = parseFloat(
                                    bboxElement.getAttribute("miny")
                                );
                                var maxx = parseFloat(
                                    bboxElement.getAttribute("maxx")
                                );
                                var maxy = parseFloat(
                                    bboxElement.getAttribute("maxy")
                                );

                                // Tạo extent và zoom đến đó
                                var extent = new Extent({
                                    xmin: minx,
                                    ymin: miny,
                                    xmax: maxx,
                                    ymax: maxy,
                                    spatialReference: {
                                        wkid: 4326,
                                    },
                                });

                                map.setExtent(extent.expand(1.1));
                                break;
                            }
                        }
                    }
                } catch (e) {
                    console.error("Error parsing WMS capabilities:", e);
                }
            }
        };
        xhr.onerror = function () {
            console.error("Error fetching WMS capabilities");
        };
        xhr.send();
    }

    /**
     * Hàm thực hiện GetFeatureInfo
     */
    function queryWMSLayers(clickEvent) {
        var screenPoint = clickEvent.screenPoint;
        var mapPoint = clickEvent.mapPoint;

        // Lấy layer đầu tiên để truy vấn
        var config = Config.WMS_CONFIG[0];

        // Lấy thông tin map
        var extent = map.extent;
        var mapWidth = map.width;
        var mapHeight = map.height;

        // Xử lý tọa độ click - chuẩn hóa về WGS84
        var clickPointWGS84;

        if (mapPoint.spatialReference.wkid === 4326) {
            // Đã là WGS84
            clickPointWGS84 = mapPoint;
        } else if (
            mapPoint.spatialReference.wkid === 102100 ||
            mapPoint.spatialReference.wkid === 3857
        ) {
            // Chuyển đổi từ Web Mercator sang WGS84
            clickPointWGS84 =
                webMercatorUtils.webMercatorToGeographic(mapPoint);
            if (!clickPointWGS84) {
                console.error("Failed to convert click point to WGS84");
                return;
            }
        } else {
            console.warn(
                "Unsupported spatial reference for click point:",
                mapPoint.spatialReference.wkid
            );
            clickPointWGS84 = mapPoint;
        }

        // Xử lý extent cho bbox
        var targetSRS = "EPSG:4326";
        var bboxForWMS;

        if (extent.spatialReference.wkid === 4326) {
            // Extent đã là WGS84
            bboxForWMS = extent;
        } else if (
            extent.spatialReference.wkid === 102100 ||
            extent.spatialReference.wkid === 3857
        ) {
            // Chuyển đổi extent từ Web Mercator sang WGS84
            try {
                bboxForWMS = webMercatorUtils.webMercatorToGeographic(extent);
                if (!bboxForWMS) {
                    console.error("Failed to convert extent to WGS84");
                    return;
                }
            } catch (error) {
                console.error("Error converting extent:", error);
                return;
            }
        } else {
            // Sử dụng SRS gốc của map
            targetSRS = "EPSG:" + extent.spatialReference.wkid;
            bboxForWMS = extent;
        }

        // Tính toán tọa độ pixel cho GetFeatureInfo
        var pixelX = Math.round(screenPoint.x);
        var pixelY = Math.round(screenPoint.y);

        // Tạo URL GetFeatureInfo
        var getFeatureInfoUrl = buildGetFeatureInfoUrl({
            baseUrl: config.url,
            layers: config.layers,
            queryLayers: config.layers,
            bbox: bboxForWMS,
            width: mapWidth,
            height: mapHeight,
            x: pixelX,
            y: pixelY,
            srs: targetSRS,
            format: "image/png",
            infoFormat: "application/json",
        });

        // Thực hiện request
        executeGetFeatureInfoRequest(getFeatureInfoUrl, mapPoint);
    }

    /**
     * Thực hiện request GetFeatureInfo
     */
    function executeGetFeatureInfoRequest(url, mapPoint) {
        var xhr = new XMLHttpRequest();
        xhr.open("GET", url, true);

        xhr.onload = function () {
            if (xhr.status === 200) {
                try {
                    // Kiểm tra content type hoặc nội dung response
                    var responseText = xhr.responseText.trim();

                    if (
                        responseText.startsWith("<?xml") ||
                        responseText.startsWith("<ServiceExceptionReport")
                    ) {
                        // Response là XML error
                        console.error("WMS Service Error:", responseText);

                        // Parse XML để lấy thông báo lỗi
                        var parser = new DOMParser();
                        var xmlDoc = parser.parseFromString(
                            responseText,
                            "text/xml"
                        );
                        var serviceException =
                            xmlDoc.getElementsByTagName("ServiceException")[0];

                        if (serviceException) {
                            var errorMessage = serviceException.textContent;
                            console.error("WMS Error:", errorMessage);
                            alert("Lỗi WMS: " + errorMessage);
                        } else {
                            alert("Lỗi không xác định từ WMS server");
                        }
                        return;
                    }

                    // Parse JSON response
                    var response = JSON.parse(responseText);

                    if (response.features && response.features.length > 0) {
                        // Có dữ liệu - hiển thị thông tin
                        PopupManager.initialize(map);
                        PopupManager.displayFeatureInfo(
                            response.features,
                            mapPoint
                        );
                    } else {
                        console.log("No features found at this location");
                    }
                } catch (e) {
                    console.error("Error parsing GetFeatureInfo response:", e);
                    console.log("Raw response:", xhr.responseText);
                }
            } else {
                console.error(
                    "GetFeatureInfo request failed:",
                    xhr.status,
                    xhr.statusText
                );
            }
        };

        xhr.onerror = function () {
            console.error("Error executing GetFeatureInfo request");
        };

        xhr.send();
    }

    /**
     * Hàm tạo URL GetFeatureInfo
     */
    function buildGetFeatureInfoUrl(params) {
        var url = params.baseUrl;

        // Thêm ? nếu chưa có
        if (url.indexOf("?") === -1) {
            url += "?";
        } else if (!url.endsWith("&")) {
            url += "&";
        }

        var queryParams = [
            "REQUEST=GetFeatureInfo",
            "SERVICE=WMS",
            "VERSION=1.1.1",
            "LAYERS=" + encodeURIComponent(params.layers),
            "QUERY_LAYERS=" + encodeURIComponent(params.queryLayers),
            "STYLES=",
            "BBOX=" +
                [
                    params.bbox.xmin,
                    params.bbox.ymin,
                    params.bbox.xmax,
                    params.bbox.ymax,
                ].join(","),
            "WIDTH=" + params.width,
            "HEIGHT=" + params.height,
            "FORMAT=" + encodeURIComponent(params.format),
            "INFO_FORMAT=" + encodeURIComponent(params.infoFormat),
            "SRS=" + params.srs,
            "X=" + params.x,
            "Y=" + params.y,
            "TRANSPARENT=true",
        ];

        return url + queryParams.join("&");
    }

    /**
     * Lấy danh sách WMS layers hiện tại
     * @returns {Array} Mảng các WMS layer
     */
    function getWMSLayers() {
        return wmsLayers;
    }

    return {
        initialize: initialize,
        setupCORS: setupCORS,
        addWMSLayer: addWMSLayer,
        removeWMSLayer: removeWMSLayer,
        queryWMSLayers: queryWMSLayers,
        getWMSLayers: getWMSLayers,
    };
});
