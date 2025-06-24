/**
 * Module quản lý giao diện người dùng
 * Xử lý việc cập nhật UI, tạo buttons và xử lý events
 */
define([
    "dojo/dom"
], function (dom) {
    
    var map = null;
    var polygonManager = null;

    /**
     * Khởi tạo UI Manager
     * @param {Map} mapInstance - Instance của map
     * @param {Object} polygonManagerInstance - Instance của polygon manager
     */
    function initialize(mapInstance, polygonManagerInstance) {
        map = mapInstance;
        polygonManager = polygonManagerInstance;
    }

    /**
     * Cập nhật toàn bộ UI
     */
    function updateUI() {
        updateCounts();
        updateButtons();
    }

    /**
     * Cập nhật số lượng polygon và polygon được chọn
     */
    function updateCounts() {
        if (!polygonManager) return;

        var polygonCount = polygonManager.getPolygonCount();
        var selectedCount = polygonManager.getSelectedCount();

        var polygonCountEl = dom.byId("polygonCount");
        var selectedCountEl = dom.byId("selectedCount");

        if (polygonCountEl) {
            polygonCountEl.textContent = polygonCount;
        }
        if (selectedCountEl) {
            selectedCountEl.textContent = selectedCount;
        }
    }

    /**
     * Cập nhật trạng thái các button
     */
    function updateButtons() {
        if (!polygonManager) return;

        var selectedCount = polygonManager.getSelectedCount();

        var splitBtn = dom.byId("splitBtn");
        var mergeBtn = dom.byId("mergeBtn");

        if (splitBtn) {
            splitBtn.disabled = selectedCount !== 1;
        }
        if (mergeBtn) {
            mergeBtn.disabled = selectedCount < 2;
        }
    }

    /**
     * Tạo button tùy chỉnh với style giống button zoom mặc định
     * @param {string} text - Nội dung HTML của button
     * @param {Function} onClick - Hàm xử lý khi click button
     * @returns {HTMLElement} Element button đã tạo
     */
    function createCustomButton(text, onClick) {
        const button = document.createElement("div");
        button.className = "custom-map-button";
        button.innerHTML = text;

        // CSS cho button giống style của button zoom mặc định
        button.style.cssText = `
            width: 30px;
            height: 30px;
            background-color: #fff;
            border: 1px solid #999;
            border-radius: 2px;
            cursor: pointer;
            text-align: center;
            line-height: 30px;
            margin-bottom: 1px;
            box-shadow: 0 1px 5px rgba(0,0,0,0.65);
        `;

        // Thêm hover effect
        button.onmouseover = () => (button.style.backgroundColor = "#f4f4f4");
        button.onmouseout = () => (button.style.backgroundColor = "#fff");

        // Thêm click event
        button.onclick = onClick;

        return button;
    }

    /**
     * Sự kiện click cho button điều khiển
     * Toggle hiển thị panel điều khiển
     */
    function controlBtnClickEvent() {
        const panel = document.querySelector(".control-panel");
        if (!panel) return;

        if (
            !panel.classList.contains("visible") &&
            !panel.classList.contains("active")
        ) {
            panel.classList.add("visible");
        } else {
            panel.classList.toggle("visible");
            panel.classList.toggle("active");
        }
    }

    /**
     * Sự kiện click cho button thông tin
     * Toggle hiển thị panel thông tin
     */
    function infoBtnClickEvent() {
        const panel = document.querySelector(".info-panel");
        if (!panel) return;

        if (
            !panel.classList.contains("visible") &&
            !panel.classList.contains("active")
        ) {
            panel.classList.add("visible");
        } else {
            panel.classList.toggle("visible");
            panel.classList.toggle("active");
        }
    }

    /**
     * Tạo các button toggle trên bản đồ
     */
    function createToggleButtons() {
        // Tạo container mới cho các button tùy chỉnh
        const customButtonsContainer = document.createElement("div");
        customButtonsContainer.className = "custom-map-buttons";

        // CSS cho container
        customButtonsContainer.style.cssText = `
            position: absolute;
            top: 85px; 
            left: 21px;
            z-index: 50;
        `;

        // Tạo các button
        const controlBtn = createCustomButton(
            '<i class="bi bi-tools"></i>',
            controlBtnClickEvent
        );
        const infoBtn = createCustomButton(
            '<i class="bi bi-info-circle"></i>',
            infoBtnClickEvent
        );

        // Thêm các button vào container
        customButtonsContainer.appendChild(controlBtn);
        customButtonsContainer.appendChild(infoBtn);

        // Thêm container vào map
        map.root.appendChild(customButtonsContainer);
    }

    /**
     * Set trạng thái active cho tool button
     * @param {string} tool - Tên tool cần active
     */
    function setActiveToolButton(tool) {
        // Reset tất cả button states
        document.querySelectorAll(".btn-tool").forEach(function (btn) {
            btn.classList.remove("active");
        });

        // Set active button
        var activeBtn = {
            draw: "drawBtn",
            select: "selectBtn",
            split: "splitBtn",
        }[tool];

        if (activeBtn) {
            var btnElement = dom.byId(activeBtn);
            if (btnElement) {
                btnElement.classList.add("active");
            }
        }
    }

    /**
     * Deactivate tất cả tool buttons
     */
    function deactivateAllToolButtons() {
        document.querySelectorAll(".btn-tool").forEach(function (btn) {
            btn.classList.remove("active");
        });
    }

    return {
        initialize: initialize,
        updateUI: updateUI,
        updateCounts: updateCounts,
        updateButtons: updateButtons,
        createToggleButtons: createToggleButtons,
        setActiveToolButton: setActiveToolButton,
        deactivateAllToolButtons: deactivateAllToolButtons,
        controlBtnClickEvent: controlBtnClickEvent,
        infoBtnClickEvent: infoBtnClickEvent
    };
});