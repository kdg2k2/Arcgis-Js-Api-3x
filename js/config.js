define([], function () {
    return {
        // ================== CẤU HÌNH WMS ==================
        WMS_CONFIG: [
            {
                url: "https://bando.ifee.edu.vn:8453/geoserver/ws_ranhgioi/wms",
                layers: "ws_ranhgioi:rg_vn_tinh",
                domain: "bando.ifee.edu.vn",
            },
            {
                url: "https://bando.ifee.edu.vn:8453/geoserver/ws_ranhgioi/wms",
                layers: "ws_ranhgioi:rg_vn_xa",
                domain: "bando.ifee.edu.vn",
            },
            {
                url: "https://maps-150.ifee.edu.vn:8453/geoserver/_2025_EUDR/wms",
                layers: "_2025_EUDR:gardens",
                domain: "maps-150.ifee.edu.vn",
            },
        ],

        // ================== MAPPING FIELDS ==================
        // Ánh xạ tên field gốc sang tên hiển thị tiếng Việt
        FIELD_MAPPING: {
            land_type: "Loại đất",
            area: "Diện tích",
            farmer: "Nông hộ",
            name: "Tên",
            province: "Tỉnh/Thành phố",
            commune: "Phường/Xã",
            lon: "Kinh độ (WGS84)",
            lat: "Vĩ độ (WGS84)",
        },

        // ================== FIELDS ẨN ==================
        // Danh sách các field không hiển thị trong popup
        HIDDEN_FIELDS: ["gid", "geom", "tt", "province_code", "commune_code"],

        // ================== CẤU HÌNH BẢN ĐỒ ==================
        MAP_CONFIG: {
            basemap: "satellite",
            center: [108, 16],
            zoom: 5,
        },
    };
});
