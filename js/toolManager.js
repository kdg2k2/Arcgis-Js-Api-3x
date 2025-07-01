/**
 * Module quản lý các công cụ vẽ và chỉnh sửa
 * Xử lý việc kích hoạt/vô hiệu hóa các tool và xử lý sự kiện
 */
define([
    "esri/geometry/Point",
    "esri/geometry/geometryEngine",
    "esri/symbols/TextSymbol",
    "esri/symbols/Font",
    "dojo/_base/Color",
    "esri/toolbars/draw",
    "esri/toolbars/edit",
    "dojo/on",
], function (Point, geometryEngine, TextSymbol, Font, Color, Draw, Edit, on) {
    var map = null;
    var drawToolbar = null;
    var editToolbar = null;
    var currentTool = null;
    var polygonManager = null;
    var uiManager = null;
    var lengthLabels = [];
    var tempLengthLabels = [];

    /**
     * Khởi tạo Tool Manager
     * @param {Map} mapInstance - Instance của map
     * @param {Object} polygonManagerInstance - Instance của polygon manager
     * @param {Object} uiManagerInstance - Instance của UI manager
     */
    function initialize(
        mapInstance,
        polygonManagerInstance,
        uiManagerInstance
    ) {
        map = mapInstance;
        polygonManager = polygonManagerInstance;
        uiManager = uiManagerInstance;
        setupToolbars();
    }

    /**
     * Thiết lập các toolbar cho vẽ và chỉnh sửa
     */
    function setupToolbars() {
        drawToolbar = new Draw(map);
        editToolbar = new Edit(map);

        // Lắng nghe sự kiện khi vẽ xong
        on(drawToolbar, "draw-end", handleDrawEnd);

        // Đo chiều dài khi vẽ
        on(drawToolbar, "draw-start", clearTempLabels);
        on(drawToolbar, "vertex-add", showTempLengths);
        on(drawToolbar, "vertex-move", showTempLengths);
        on(drawToolbar, "vertex-remove", showTempLengths);
    }

    /**
     * Xử lý sự kiện khi vẽ xong
     * @param {Object} event - Event object chứa geometry đã vẽ
     */
    function handleDrawEnd(event) {
        drawToolbar.deactivate();

        if (currentTool === "draw") {
            // Tạo polygon mới
            polygonManager.createPolygon(event.geometry);
        } else if (currentTool === "split") {
            // Chia tách polygon
            polygonManager.splitPolygon(event.geometry);
        }

        // Vô hiệu hóa tool và cập nhật UI
        deactivateTools();
        if (uiManager) {
            uiManager.updateUI();
        }
    }

    /**
     * Kích hoạt công cụ vẽ polygon
     */
    function activateDrawTool() {
        setActiveTool("draw");
        drawToolbar.activate(Draw.POLYGON);

        // Đóng panel điều khiển
        if (uiManager) {
            uiManager.controlBtnClickEvent();
        }
    }

    /**
     * Kích hoạt công cụ chọn polygon
     */
    function activateSelectTool() {
        setActiveTool("select");
        drawToolbar.deactivate();
    }

    /**
     * Kích hoạt công cụ chia tách polygon
     * Chỉ hoạt động khi có đúng 1 polygon được chọn
     */
    function activateSplitTool() {
        if (!polygonManager) return;

        var selectedGraphics = polygonManager.getSelectedGraphics();
        if (selectedGraphics.length === 1) {
            setActiveTool("split");
            drawToolbar.activate(Draw.POLYLINE);
        } else {
            alert("Vui lòng chọn đúng 1 polygon để chia tách");
        }
    }

    /**
     * Thực hiện hợp nhất các polygon được chọn
     */
    function mergePolygons() {
        if (!polygonManager) return;

        var success = polygonManager.mergePolygons();
        if (!success) {
            alert("Vui lòng chọn ít nhất 2 polygon để hợp nhất");
        }

        if (uiManager) {
            uiManager.updateUI();
        }
    }

    /**
     * Xóa tất cả polygon trên bản đồ
     */
    function clearAllGraphics() {
        if (!polygonManager) return;

        var confirmed = confirm("Bạn có chắc chắn muốn xóa tất cả polygon?");
        if (confirmed) {
            polygonManager.clearAllGraphics();
            if (uiManager) {
                uiManager.updateUI();
            }
        }
    }

    /**
     * Set tool hiện tại và cập nhật UI button
     * @param {string} tool - Tên tool cần kích hoạt
     */
    function setActiveTool(tool) {
        currentTool = tool;

        if (uiManager) {
            uiManager.setActiveToolButton(tool);
        }
    }

    /**
     * Vô hiệu hóa tất cả các tool
     */
    function deactivateTools() {
        currentTool = null;
        drawToolbar.deactivate();

        if (uiManager) {
            uiManager.deactivateAllToolButtons();
        }
    }

    /**
     * Xử lý sự kiện click trên bản đồ
     * @param {Object} event - Map click event
     */
    function handleMapClick(event) {
        if (currentTool === "select") {
            // Chế độ chọn polygon
            var graphic = polygonManager.getGraphicAt(event.mapPoint);
            if (graphic) {
                polygonManager.toggleSelection(graphic);
                if (uiManager) {
                    uiManager.updateUI();
                }
            }
        }
        // Các chế độ khác sẽ được xử lý bởi WMS query trong main
    }

    /**
     * Lấy tool hiện tại
     * @returns {string|null} Tên tool hiện tại
     */
    function getCurrentTool() {
        return currentTool;
    }

    /**
     * Kiểm tra xem có tool nào đang active không
     * @returns {boolean} True nếu có tool đang active
     */
    function hasActiveTool() {
        return currentTool !== null;
    }

    function activateEditTool() {
        if (!polygonManager) return;
        var selectedGraphics = polygonManager.getSelectedGraphics();
        if (selectedGraphics.length === 1) {
            setActiveTool("edit");
            editToolbar.activate(Edit.EDIT_VERTICES, selectedGraphics[0]);
        } else {
            alert("Vui lòng chọn đúng 1 polygon để chỉnh sửa");
        }
    }

    function showLengthLabels(evt) {
        clearLengthLabels();

        var path = evt.geometry.rings?.[0] || evt.geometry.paths?.[0];
        if (!path || path.length < 2) return;

        for (var i = 1; i < path.length; i++) {
            var p1 = map.toMap(path[i - 1]);
            var p2 = map.toMap(path[i]);
            var mid = {
                x: (p1.x + p2.x) / 2,
                y: (p1.y + p2.y) / 2,
                spatialReference: p1.spatialReference,
            };

            var len = geometryEngine.geodesicLength(
                {
                    paths: [[p1, p2]],
                    spatialReference: p1.spatialReference,
                    type: "polyline",
                },
                "meters"
            );

            var label = new esri.Graphic(
                new esri.geometry.Point(mid),
                new esri.symbol.TextSymbol(len.toFixed(1) + " m")
                    .setColor(new dojo.Color("#000"))
                    .setFont(new esri.symbol.Font("12pt").setWeight("bold"))
                    .setAlign(esri.symbol.TextSymbol.ALIGN_MIDDLE)
            );

            lengthLabels.push(label);
            map.graphics.add(label);
        }
    }

    function clearLengthLabels() {
        lengthLabels.forEach(function (g) {
            map.graphics.remove(g);
        });
        lengthLabels = [];
    }

    function clearTempLabels() {
        tempLengthLabels.forEach(function (g) {
            map.graphics.remove(g);
        });
        tempLengthLabels = [];
    }

    function showTempLengths(evt) {
        clearTempLabels();

        var path = evt.geometry.rings?.[0] || evt.geometry.paths?.[0];
        if (!path || path.length < 2) return;

        for (var i = 1; i < path.length; i++) {
            var p1 = new Point(
                path[i - 1][0],
                path[i - 1][1],
                map.spatialReference
            );
            var p2 = new Point(path[i][0], path[i][1], map.spatialReference);
            var mid = new Point(
                (p1.x + p2.x) / 2,
                (p1.y + p2.y) / 2,
                map.spatialReference
            );

            var len = geometryEngine.geodesicLength(
                {
                    paths: [
                        [
                            [p1.x, p1.y],
                            [p2.x, p2.y],
                        ],
                    ],
                    spatialReference: map.spatialReference,
                    type: "polyline",
                },
                "meters"
            );

            var label = new esri.Graphic(
                mid,
                new TextSymbol(len.toFixed(1) + " m")
                    .setColor(new Color("red"))
                    .setFont(new Font("10pt").setWeight("bold"))
            );

            map.graphics.add(label);
            tempLengthLabels.push(label);
        }
    }

    return {
        initialize: initialize,
        activateDrawTool: activateDrawTool,
        activateSelectTool: activateSelectTool,
        activateSplitTool: activateSplitTool,
        mergePolygons: mergePolygons,
        clearAllGraphics: clearAllGraphics,
        handleMapClick: handleMapClick,
        getCurrentTool: getCurrentTool,
        hasActiveTool: hasActiveTool,
        deactivateTools: deactivateTools,
        activateEditTool: activateEditTool,
    };
});
