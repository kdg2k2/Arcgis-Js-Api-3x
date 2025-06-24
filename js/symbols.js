/**
 * Module quản lý symbols cho các đối tượng trên bản đồ
 * Tạo và cung cấp các symbol cho polygon thường và polygon được chọn
 */
define([
    "esri/symbols/SimpleFillSymbol",
    "esri/symbols/SimpleLineSymbol",
    "esri/Color"
], function (SimpleFillSymbol, SimpleLineSymbol, Color) {
    
    var symbols = {};

    /**
     * Khởi tạo các symbol cho polygon
     * @returns {Object} Đối tượng chứa các symbol đã tạo
     */
    function createSymbols() {
        // Symbol cho polygon thường (màu vàng với viền đỏ)
        symbols.polygonSymbol = new SimpleFillSymbol(
            SimpleFillSymbol.STYLE_SOLID,
            new SimpleLineSymbol(
                SimpleLineSymbol.STYLE_SOLID,
                new Color([255, 0, 0]),
                2
            ),
            new Color([255, 255, 0, 0.5])
        );

        // Symbol cho polygon được chọn (màu xanh lá với viền xanh lá đậm)
        symbols.selectedSymbol = new SimpleFillSymbol(
            SimpleFillSymbol.STYLE_SOLID,
            new SimpleLineSymbol(
                SimpleLineSymbol.STYLE_SOLID,
                new Color([0, 255, 0]),
                3
            ),
            new Color([0, 255, 0, 0.3])
        );

        return symbols;
    }

    /**
     * Lấy symbol cho polygon thường
     * @returns {SimpleFillSymbol} Symbol polygon thường
     */
    function getPolygonSymbol() {
        return symbols.polygonSymbol;
    }

    /**
     * Lấy symbol cho polygon được chọn
     * @returns {SimpleFillSymbol} Symbol polygon được chọn
     */
    function getSelectedSymbol() {
        return symbols.selectedSymbol;
    }

    return {
        createSymbols: createSymbols,
        getPolygonSymbol: getPolygonSymbol,
        getSelectedSymbol: getSelectedSymbol
    };
});