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

    // Hàm tự động tạo WFS URL từ WMS URL
    function generateWFSUrl(wmsUrl) {
        try {
            // GeoServer pattern
            if (wmsUrl.includes("/geoserver/") && wmsUrl.includes("/wms")) {
                return wmsUrl.replace("/wms", "/wfs");
            }

            // MapServer pattern
            if (wmsUrl.includes("SERVICE=WMS")) {
                return wmsUrl.replace("SERVICE=WMS", "SERVICE=WFS");
            }

            // QGIS Server pattern
            if (wmsUrl.includes("SERVICE=WMS")) {
                return wmsUrl.replace("SERVICE=WMS", "SERVICE=WFS");
            }

            // Generic pattern - thay /wms bằng /wfs
            if (wmsUrl.endsWith("/wms")) {
                return wmsUrl.replace("/wms", "/wfs");
            }

            // Fallback - thêm wfs vào cuối
            const url = new URL(wmsUrl);
            url.pathname = url.pathname.replace("/wms", "/wfs");
            return url.toString();
        } catch (error) {
            console.error("Không thể tạo WFS URL từ WMS URL:", error);
            return null;
        }
    }

    /**
     * Thêm WMS layer vào bản đồ
     * Sử dụng cấu hình từ Config.WMS_CONFIG
     */
    function addWMSLayer(layerNames, cqlFilter = null, additionalParams = {}) {
        try {
            // ẩn info window
            map.infoWindow.hide();

            // tìm cấu hình wms trong global config
            const selectedWmsConfig = Config.WMS_CONFIG.find((value, index) => {
                return value.layers == layerNames;
            });

            if (!selectedWmsConfig) {
                console.error(
                    "Không tìm thấy cấu hình WMS cho layer:",
                    layerNames
                );
                return;
            }

            // Tạo WMS Layer Info
            var layerInfo = new WMSLayerInfo({
                name: selectedWmsConfig.layers,
                title: selectedWmsConfig.name,
            });

            // Chuẩn bị customParameters cho WMS request
            var customParameters = {
                ...additionalParams,
            };

            // Thêm CQL_FILTER nếu có
            if (cqlFilter) customParameters.CQL_FILTER = cqlFilter;

            // Cấu hình WMS Layer với custom parameters
            var wmsLayerConfig = {
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
            };

            // Thêm customParameters nếu có CQL filter hoặc params khác
            if (Object.keys(customParameters).length > 0) {
                wmsLayerConfig.customParameters = customParameters;
            }

            var wmsLayer = new WMSLayer(selectedWmsConfig.url, wmsLayerConfig);

            // Xử lý lỗi khi load WMS layer
            wmsLayer.on("error", function (error) {
                console.error("WMS Layer error:", error);
                alert(
                    "Không thể load WMS. Vui lòng kiểm tra cấu hình, CQL filter hoặc liên hệ quản trị server."
                );
            });

            // Xử lý sự kiện load thành công
            wmsLayer.on("load", function () {
                console.log("WMS Layer loaded successfully");
                if (cqlFilter) {
                    console.log("CQL Filter applied:", cqlFilter);
                }
            });

            map.addLayer(wmsLayer);
            wmsLayers.push({
                layer: wmsLayer,
                url: selectedWmsConfig.url,
                layerNames: selectedWmsConfig.layers,
                cqlFilter: cqlFilter,
                customParameters: customParameters,
            });

            // Zoom đến extent của WMS layer (có thể là filtered extent)
            zoomToWMSExtent(selectedWmsConfig, cqlFilter, customParameters);

            return wmsLayer;
        } catch (error) {
            console.error("Error adding WMS layer:", error);
            throw error;
        }
    }

    // Hàm cập nhật CQL filter cho layer đã tồn tại
    function updateWMSLayerFilter(layerNames, newCqlFilter) {
        try {
            removeWMSLayer(layerNames);

            // nếu layer truyền vào là xã thì bỏ lớp tỉnh
            if (layerNames == "ws_ranhgioi:rg_vn_xa") {
                removeWMSLayer("ws_ranhgioi:rg_vn_tinh");
            } else if (layerNames == "_2025_EUDR:gardens");
            {
                removeWMSLayer("ws_ranhgioi:rg_vn_xa");
            }

            const layerInfo = Config.WMS_CONFIG.find(
                (item) => item.layers === layerNames
            );
            if (!layerInfo)
                throw new Error(
                    "Không tìm thấy lớp bản đồ tương ứng trong cấu hình!"
                );

            // Thêm layer mới với filter mới
            const newCustomParams = {
                ...layerInfo.customParameters,
            };

            if (newCqlFilter) {
                newCustomParams.CQL_FILTER = newCqlFilter;
            } else {
                delete newCustomParams.CQL_FILTER;
            }

            // Tạo lại layer với filter mới
            addWMSLayer(layerNames, newCqlFilter, newCustomParams);

            return true;
        } catch (error) {
            console.error("Error updating WMS layer filter:", error);
            return false;
        }
    }

    /**
     * Xóa WMS layer cuối cùng khỏi bản đồ
     */
    function removeWMSLayer(layerNames) {
        if (wmsLayers.length > 0) {
            const wmsInfo = wmsLayers.find((value, index) => {
                return value.layerNames == layerNames;
            });
            if (wmsInfo) map.removeLayer(wmsInfo.layer);
        }
    }

    // Hàm zoom đến extent của WMS layer (hỗ trợ filtered data)
    function zoomToWMSExtent(wmsConfig, cqlFilter = null) {
        try {
            if (cqlFilter) {
                getFilteredExtent(wmsConfig, cqlFilter)
                    .then((extent) => {
                        if (extent) {
                            zoomToExtent(extent);
                        } else {
                            zoomToDefaultExtent(wmsConfig);
                        }
                    })
                    .catch((error) => {
                        console.warn(
                            "Không thể lấy filtered extent, sử dụng extent mặc định:",
                            error
                        );
                        zoomToDefaultExtent(wmsConfig);
                    });
            } else {
                zoomToDefaultExtent(wmsConfig);
            }
        } catch (error) {
            console.error("Error in zoomToWMSExtent:", error);
            zoomToDefaultExtent(wmsConfig);
        }
    }

    // Hàm zoom đến extent mặc định
    function zoomToDefaultExtent(wmsConfig) {
        if (!wmsConfig) return;

        // Tạo request để lấy GetCapabilities của WMS service
        var xhr = new XMLHttpRequest();
        var capsURL =
            wmsConfig.url +
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

                    var layerName = wmsConfig.layers.split(":")[1];
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

    // Hàm lấy extent của dữ liệu đã được filter
    async function getFilteredExtent(wmsConfig, cqlFilter) {
        try {
            if (generateWFSUrl(wmsConfig.url)) {
                return await getExtentFromWFS(wmsConfig, cqlFilter);
            }
        } catch (error) {
            console.error("Error getting filtered extent:", error);
            return null;
        }
    }

    // Lấy extent từ WFS service
    async function getExtentFromWFS(wmsConfig, cqlFilter) {
        try {
            const wfsUrl = wmsConfig.wfsUrl || generateWFSUrl(wmsConfig.url);

            // Thử với JSON trước
            let params = new URLSearchParams({
                service: "WFS",
                version: "1.1.0",
                request: "GetFeature",
                typeName: wmsConfig.layers,
                outputFormat: "application/json",
                maxFeatures: 1000,
                cql_filter: cqlFilter,
            });

            let response = await fetch(`${wfsUrl}?${params}`);

            if (!response.ok) {
                throw new Error(
                    `WFS request failed: ${response.status} ${response.statusText}`
                );
            }

            const contentType = response.headers.get("content-type");
            let geoJson;

            // Kiểm tra content type để xử lý phù hợp
            if (contentType && contentType.includes("application/json")) {
                geoJson = await response.json();
            } else if (
                contentType &&
                (contentType.includes("text/xml") ||
                    contentType.includes("application/xml"))
            ) {
                // Server trả về XML - có thể là error response
                const xmlText = await response.text();

                // Kiểm tra có phải là error message không
                if (
                    xmlText.includes("ServiceException") ||
                    xmlText.includes("ExceptionText") ||
                    xmlText.includes("java.lang.IllegalArgumentException")
                ) {
                    // Parse error message từ XML
                    const parser = new DOMParser();
                    const xmlDoc = parser.parseFromString(xmlText, "text/xml");
                    const errorElement = xmlDoc.querySelector(
                        "ServiceException, ExceptionText, ows\\:ExceptionText"
                    );
                    const errorMsg = errorElement
                        ? errorElement.textContent
                        : "Unknown server error";

                    console.error("Server error:", errorMsg);

                    // Skip sang fallback thay vì throw error
                    throw new Error(`Server error: ${errorMsg}`);
                }

                const alternativeFormats = [
                    "json",
                    "geojson",
                    "application/geo+json",
                ];

                for (const altFormat of alternativeFormats) {
                    try {
                        params.set("outputFormat", altFormat);
                        const altResponse = await fetch(`${wfsUrl}?${params}`);

                        if (altResponse.ok) {
                            const altContentType =
                                altResponse.headers.get("content-type");
                            if (
                                altContentType &&
                                altContentType.includes("json")
                            ) {
                                geoJson = await altResponse.json();
                                break;
                            }
                        }
                    } catch (formatError) {
                        console.error(
                            `Format ${altFormat} failed:`,
                            formatError.message
                        );
                        continue;
                    }
                }

                // Nếu tất cả JSON format đều thất bại, skip sang WMS fallback
                if (!geoJson) {
                    throw new Error(
                        "All JSON formats failed, trying WMS fallback"
                    );
                }
            } else {
                // Fallback: thử parse as JSON
                const text = await response.text();

                if (
                    text.trim().startsWith("<?xml") ||
                    text.trim().startsWith("<")
                ) {
                    // Đây là XML, parse nó
                    geoJson = await parseGMLToGeoJSON(text);
                } else {
                    // Thử parse as JSON
                    geoJson = JSON.parse(text);
                }
            }

            if (geoJson && geoJson.features && geoJson.features.length > 0) {
                return calculateExtentFromGeoJSON(geoJson);
            }

            console.warn("No features found in WFS response");
            return null;
        } catch (error) {
            console.error("Error getting extent from WFS:", error);

            // Fallback: thử với WMS GetFeatureInfo
            return await getExtentFromWMSFallback(wmsConfig, cqlFilter);
        }
    }

    // Fallback method sử dụng WMS thay vì WFS
    async function getExtentFromWMSFallback(wmsConfig, cqlFilter) {
        try {
            console.log("Trying WMS GetFeatureInfo fallback...");

            // Sử dụng WMS GetMap với bbox rộng để lấy extent
            const params = new URLSearchParams({
                service: "WMS",
                version: "1.1.1",
                request: "GetFeatureInfo",
                layers: wmsConfig.layers,
                query_layers: wmsConfig.layers,
                info_format: "application/json",
                feature_count: 1000,
                width: 1,
                height: 1,
                x: 0,
                y: 0,
                srs: "EPSG:4326",
                bbox: "-180,-90,180,90", // Bbox toàn cầu
                cql_filter: cqlFilter,
            });

            const response = await fetch(`${wmsConfig.url}?${params}`);

            if (response.ok) {
                const result = await response.json();
                if (result.features && result.features.length > 0) {
                    return calculateExtentFromGeoJSON(result);
                }
            }

            return null;
        } catch (error) {
            console.error("WMS fallback also failed:", error);
            return null;
        }
    }

    // Parse GML/XML sang GeoJSON
    async function parseGMLToGeoJSON(xmlText) {
        try {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlText, "text/xml");

            // Kiểm tra có lỗi XML không
            const parseError = xmlDoc.querySelector("parsererror");
            if (parseError) {
                throw new Error("Invalid XML response");
            }

            // Kiểm tra có phải là error response không
            const exceptionElement = xmlDoc.querySelector(
                "ServiceException, ExceptionText, ows\\:ExceptionText"
            );
            if (exceptionElement) {
                throw new Error(
                    `Server error: ${exceptionElement.textContent}`
                );
            }

            throw new Error("GML parsing not implemented - use WMS fallback");
        } catch (error) {
            console.error("Error parsing GML:", error);
            throw error;
        }
    }

    // Tính extent từ GeoJSON
    function calculateExtentFromGeoJSON(geoJson) {
        let minX = Infinity,
            minY = Infinity,
            maxX = -Infinity,
            maxY = -Infinity;

        geoJson.features.forEach((feature) => {
            const geometry = feature.geometry;
            const coords = getAllCoordinates(geometry);

            coords.forEach((coord) => {
                minX = Math.min(minX, coord[0]);
                maxX = Math.max(maxX, coord[0]);
                minY = Math.min(minY, coord[1]);
                maxY = Math.max(maxY, coord[1]);
            });
        });

        if (minX !== Infinity) {
            return new Extent(
                minX,
                minY,
                maxX,
                maxY,
                new SpatialReference({ wkid: 4326 })
            );
        }

        return null;
    }

    // Lấy tất cả coordinates từ geometry
    function getAllCoordinates(geometry) {
        const coords = [];

        switch (geometry.type) {
            case "Point":
                coords.push(geometry.coordinates);
                break;
            case "LineString":
            case "MultiPoint":
                coords.push(...geometry.coordinates);
                break;
            case "Polygon":
            case "MultiLineString":
                geometry.coordinates.forEach((ring) => coords.push(...ring));
                break;
            case "MultiPolygon":
                geometry.coordinates.forEach((polygon) =>
                    polygon.forEach((ring) => coords.push(...ring))
                );
                break;
            case "GeometryCollection":
                geometry.geometries.forEach((geom) =>
                    coords.push(...getAllCoordinates(geom))
                );
                break;
        }

        return coords;
    }

    // Hàm helper để zoom đến extent
    function zoomToExtent(extent) {
        if (map && extent) {
            map.setExtent(extent, true);
        }
    }

    /**
     * Hàm thực hiện GetFeatureInfo
     */
    function queryWMSLayers(clickEvent) {
        var screenPoint = clickEvent.screenPoint;
        var mapPoint = clickEvent.mapPoint;

        // Lấy layer đầu tiên để truy vấn
        var config = Config.WMS_CONFIG.find((value, index) => {
            return value.layers == window["currentLayerName"];
        });

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
        updateWMSLayerFilter: updateWMSLayerFilter,
        getWMSLayers: getWMSLayers,
    };
});
