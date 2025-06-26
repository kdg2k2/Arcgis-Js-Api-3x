/**
 * Module quản lý popup hiển thị thông tin
 * Xử lý việc format và hiển thị thông tin từ WMS query
 */
define(["arcgis/config"], function (Config) {
    var map = null;

    /**
     * Khởi tạo Popup Manager
     * @param {Map} mapInstance - Instance của map
     */
    function initialize(mapInstance) {
        map = mapInstance;
    }

    /**
     * Hiển thị thông tin feature trong popup
     * @param {Array} features - Mảng các feature từ WMS query
     * @param {Point} mapPoint - Điểm trên bản đồ để hiển thị popup
     */
    function displayFeatureInfo(features, mapPoint) {
        var content = "<div class='popup-content'>";

        features.forEach(function (feature, index) {
            if (feature.properties) {
                content +=
                    "<div class='feature-info" +
                    (index > 0 ? " mt-3" : "") +
                    "'>";
                content +=
                    "<table class='table table-sm table-striped table-bordered'>";

                var hasData = false;
                // Sắp xếp properties theo thứ tự ưu tiên
                var sortedProperties = Object.keys(feature.properties).sort(
                    function (a, b) {
                        var aMapping = Config.FIELD_MAPPING[a.toLowerCase()];
                        var bMapping = Config.FIELD_MAPPING[b.toLowerCase()];
                        if (aMapping && !bMapping) return -1;
                        if (!aMapping && bMapping) return 1;
                        return a.localeCompare(b);
                    }
                );

                // Hiển thị từng property
                sortedProperties.forEach(function (prop) {
                    if (shouldHideField(prop.toLowerCase())) return;

                    var value = feature.properties[prop];
                    if (value === null || value === "" || value === undefined)
                        return;

                    var displayName = getDisplayName(prop);
                    var formattedValue = formatValue(value, prop);

                    content += "<tr>";
                    content +=
                        "<td class='fw-bold text-primary' style='width: 40%;'>" +
                        displayName +
                        "</td>";
                    content +=
                        "<td class='text-break'>" + formattedValue + "</td>";
                    content += "</tr>";
                    hasData = true;
                });

                if (!hasData) {
                    content +=
                        "<tr><td colspan='2' class='text-muted fst-italic text-center'>";
                    content += "Không có dữ liệu để hiển thị</td></tr>";
                }

                content += "</table>";
                content += "</div>";
            }
        });

        if (features.length === 0) {
            content += "<div class='text-muted fst-italic text-center p-3'>";
            content += "Không có dữ liệu tại vị trí này</div>";
        }

        content += "</div>";

        // Hiển thị InfoWindow
        map.infoWindow.setTitle(
            "<i class='bi bi-info-circle'></i> Thông tin chi tiết"
        );
        map.infoWindow.setContent(content);
        map.infoWindow.show(mapPoint);
    }

    /**
     * Kiểm tra xem field có nên được ẩn không
     * @param {string} fieldName - Tên field cần kiểm tra
     * @returns {boolean} True nếu field nên được ẩn
     */
    function shouldHideField(fieldName) {
        return Config.HIDDEN_FIELDS.some(function (hiddenField) {
            return fieldName.indexOf(hiddenField.toLowerCase()) !== -1;
        });
    }

    /**
     * Lấy tên hiển thị cho field
     * @param {string} fieldName - Tên field gốc
     * @returns {string} Tên hiển thị
     */
    function getDisplayName(fieldName) {
        var lowerFieldName = fieldName.toLowerCase();

        // Tìm trong mapping
        for (var mappedField in Config.FIELD_MAPPING) {
            if (mappedField.toLowerCase() === lowerFieldName) {
                return Config.FIELD_MAPPING[mappedField];
            }
        }

        // Nếu không có trong mapping, format tên field
        return formatFieldName(fieldName);
    }

    /**
     * Format tên field thành dạng dễ đọc
     * @param {string} fieldName - Tên field gốc
     * @returns {string} Tên field đã được format
     */
    function formatFieldName(fieldName) {
        return fieldName
            .replace(/_/g, " ")
            .replace(/([A-Z])/g, " $1")
            .toLowerCase()
            .replace(/\b\w/g, function (l) {
                return l.toUpperCase();
            });
    }

    /**
     * Format giá trị theo loại field
     * @param {*} value - Giá trị cần format
     * @param {string} fieldName - Tên field để xác định cách format
     * @returns {string} Giá trị đã được format
     */
    function formatValue(value, fieldName) {
        if (typeof value === "number") return value.toLocaleString("vi-VN");
        return value;
    }

    return {
        initialize: initialize,
        displayFeatureInfo: displayFeatureInfo,
    };
});
