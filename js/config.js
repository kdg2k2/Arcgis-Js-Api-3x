define([], function () {
    return {
        // ================== CẤU HÌNH WMS ==================
        WMS_CONFIG: [
            {
                url: "https://maps-151.ifee.edu.vn:8453/geoserver/CucPhuongBio/wms",
                layers: "CucPhuongBio:bandodat",
                domain: "maps-151.ifee.edu.vn",
            },
        ],

        // ================== MAPPING FIELDS ==================
        // Ánh xạ tên field gốc sang tên hiển thị tiếng Việt
        FIELD_MAPPING: {
            gid: "Mã định danh",
            objectid: "ID đối tượng",
            bandodat: "Bản đồ đất",
            loaidat: "Loại đất",
            dientich: "Diện tích",
            sudung: "Mục đích sử dụng",
            tenquanly: "Tên cơ quan quản lý",
            diachi: "Địa chỉ",
            ghichu: "Ghi chú",
            ngaycapnhat: "Ngày cập nhật",
            shape_area: "Diện tích hình học",
            shape_length: "Chu vi",
        },

        // ================== FIELDS ẨN ==================
        // Danh sách các field không hiển thị trong popup
        HIDDEN_FIELDS: [
            "shape",
            "geom",
            "geometry",
            "wkb_geometry",
            "fid",
            "ogc_fid",
            "bbox",
            "the_geom",
        ],

        // ================== CẤU HÌNH BẢN ĐỒ ==================
        MAP_CONFIG: {
            basemap: "streets",
            center: [108, 16],
            zoom: 5,
        },
    };
});
