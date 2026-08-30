// ==========================================
// 2. DATA SENSOR
// ==========================================

let sensorSearchKw = '';
let sensorSortType = 'desc';


function initDataSensor() {

    loadSensorData();


    const searchInput =
        document.getElementById(
            'search-sensor'
        );


    if (searchInput) {

        searchInput.addEventListener(
            'input',
            (e) => {

                sensorSearchKw =
                    e.target.value;

                loadSensorData();
            }
        );
    }


    const sortSelect =
        document.getElementById(
            'sort-sensor'
        );


    if (sortSelect) {

        sortSelect.addEventListener(
            'change',
            (e) => {

                sensorSortType =
                    e.target.value;

                loadSensorData();
            }
        );
    }
}


// ==========================================
// LOAD SENSOR DATA
// ==========================================

function loadSensorData() {

    const url =
        `http://localhost:5000/api/sensors/history` +
        `?limit=100` +
        `&search=${sensorSearchKw}` +
        `&sort=${sensorSortType}`;


    fetch(url)

        .then(res => res.json())

        .then(data => {

            if (data.status === 'success') {

                renderSensorTable(
                    data.data
                );
            }
        });
}


// ==========================================
// RENDER SENSOR TABLE
// ==========================================

function renderSensorTable(data) {

    const tbody =
        document.getElementById(
            'table-sensor-body'
        );


    if (!tbody) return;


    tbody.innerHTML = '';


    data.forEach(row => {

        const timeObj =
            new Date(row.time);


        const formattedTime =
            `${timeObj.toLocaleTimeString('vi-VN')}, ` +
            `${timeObj.toLocaleDateString('vi-VN')}`;


        const temp =
            Math.round(
                row.temperature || 0
            );


        const hum =
            Math.round(
                row.humidity || 0
            );


        const light =
            Math.round(
                row.light || 0
            );


        tbody.innerHTML +=
            `<tr>
                <td>${row.id}</td>
                <td>${temp}</td>
                <td>${hum}</td>
                <td>${light}</td>
                <td>${formattedTime}</td>
            </tr>`;
    });
}