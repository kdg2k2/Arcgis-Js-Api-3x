/**
 * Module quản lý polygon
 * Xử lý việc tạo, chọn, chia tách, hợp nhất polygon
 */
define([
    "esri/graphic",
    "esri/geometry/geometryEngine",
    "arcgis/symbols"
], function (Graphic, geometryEngine, Symbols) {
    
    var map = null;
    var selectedGraphics = [];
    var symbols = null;

    /**
     * Khởi tạo Polygon Manager
     * @param {Map} mapInstance - Instance của map
     */
    function initialize(mapInstance) {
        map = mapInstance;
        symbols = Symbols.createSymbols();
    }

    /**
     * Tạo polygon mới từ geometry
     * @param {Polygon} geometry - Geometry của polygon
     */
    function createPolygon(geometry) {
        var graphic = new Graphic(geometry, symbols.polygonSymbol);
        map.graphics.add(graphic);
    }

    /**
     * Lấy graphic tại điểm được click
     * @param {Point} point - Điểm trên bản đồ
     * @returns {Graphic|null} Graphic tại điểm đó hoặc null
     */
    function getGraphicAt(point) {
        if (!map || !map.graphics || !map.graphics.graphics) {
            return null;
        }

        var graphics = map.graphics.graphics;
        // Duyệt từ cuối về đầu để lấy graphic trên cùng
        for (var i = graphics.length - 1; i >= 0; i--) {
            var graphic = graphics[i];
            if (graphic.geometry && graphic.geometry.type === "polygon") {
                if (graphic.geometry.contains(point)) {
                    return graphic;
                }
            }
        }
        return null;
    }

    /**
     * Chuyển đổi trạng thái chọn của graphic
     * @param {Graphic} graphic - Graphic cần chuyển đổi trạng thái
     */
    function toggleSelection(graphic) {
        var index = selectedGraphics.indexOf(graphic);

        if (index > -1) {
            // Bỏ chọn graphic
            selectedGraphics.splice(index, 1);
            graphic.setSymbol(symbols.polygonSymbol);
        } else {
            // Chọn graphic
            selectedGraphics.push(graphic);
            graphic.setSymbol(symbols.selectedSymbol);
        }
    }

    /**
     * Chia tách polygon bằng đường polyline
     * @param {Polyline} line - Đường để chia tách polygon
     * @returns {boolean} True nếu chia tách thành công
     */
    function splitPolygon(line) {
        if (selectedGraphics.length !== 1) return false;

        try {
            var polygonToSplit = selectedGraphics[0];
            // Sử dụng geometryEngine để cắt polygon
            var splitResults = geometryEngine.cut(
                polygonToSplit.geometry,
                line
            );

            if (splitResults && splitResults.length > 1) {
                // Xóa polygon gốc
                map.graphics.remove(polygonToSplit);
                selectedGraphics = [];

                // Thêm các polygon mới sau khi chia tách
                splitResults.forEach(function (geometry) {
                    var newGraphic = new Graphic(geometry, symbols.polygonSymbol);
                    map.graphics.add(newGraphic);
                });
                return true;
            }
        } catch (error) {
            console.error("Error splitting polygon:", error);
        }
        return false;
    }

    /**
     * Hợp nhất các polygon được chọn
     * @returns {boolean} True nếu hợp nhất thành công
     */
    function mergePolygons() {
        if (selectedGraphics.length < 2) return false;

        try {
            var geometries = selectedGraphics.map(function (graphic) {
                return graphic.geometry;
            });

            // Hợp nhất từng cặp geometry
            var mergedGeometry = geometries[0];
            for (var i = 1; i < geometries.length; i++) {
                mergedGeometry = geometryEngine.union(
                    mergedGeometry,
                    geometries[i]
                );
            }

            if (mergedGeometry) {
                // Xóa các polygon cũ
                selectedGraphics.forEach(function (graphic) {
                    map.graphics.remove(graphic);
                });
                selectedGraphics = [];

                // Thêm polygon đã hợp nhất
                var mergedGraphic = new Graphic(mergedGeometry, symbols.polygonSymbol);
                map.graphics.add(mergedGraphic);
                return true;
            }
        } catch (error) {
            console.error("Error merging polygons:", error);
        }
        return false;
    }

    /**
     * Xóa tất cả graphic trên bản đồ
     */
    function clearAllGraphics() {
        if (map && map.graphics) {
            map.graphics.clear();
        }
        selectedGraphics = [];
    }

    /**
     * Lấy số lượng polygon trên bản đồ
     * @returns {number} Số lượng polygon
     */
    function getPolygonCount() {
        if (!map || !map.graphics) return 0;
        
        return map.graphics.graphics.filter(function (g) {
            return g.geometry && g.geometry.type === "polygon";
        }).length;
    }

    /**
     * Lấy số lượng polygon được chọn
     * @returns {number} Số lượng polygon được chọn
     */
    function getSelectedCount() {
        return selectedGraphics.length;
    }

    /**
     * Lấy danh sách graphic được chọn
     * @returns {Array} Mảng các graphic được chọn
     */
    function getSelectedGraphics() {
        return selectedGraphics;
    }

    return {
        initialize: initialize,
        createPolygon: createPolygon,
        getGraphicAt: getGraphicAt,
        toggleSelection: toggleSelection,
        splitPolygon: splitPolygon,
        mergePolygons: mergePolygons,
        clearAllGraphics: clearAllGraphics,
        getPolygonCount: getPolygonCount,
        getSelectedCount: getSelectedCount,
        getSelectedGraphics: getSelectedGraphics
    };
});