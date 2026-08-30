// ==========================================
// 3. ACTIVE HISTORY
// ==========================================

let historySearchKw = '';
let historySortType = 'desc';


function initActiveHistory() {

    loadHistoryData();


    const searchInput =
        document.getElementById(
            'search-history'
        );


    if (searchInput) {

        searchInput.addEventListener(
            'input',
            (e) => {

                historySearchKw =
                    e.target.value;

                loadHistoryData();
            }
        );
    }


    const sortSelect =
        document.getElementById(
            'sort-history'
        );


    if (sortSelect) {

        sortSelect.addEventListener(
            'change',
            (e) => {

                historySortType =
                    e.target.value;

                loadHistoryData();
            }
        );
    }
}


// ==========================================
// LOAD HISTORY DATA
// ==========================================

function loadHistoryData() {

    const url =
        `http://localhost:5000/api/history` +
        `?limit=100` +
        `&search=${historySearchKw}` +
        `&sort=${historySortType}`;


    fetch(url)

        .then(res => res.json())

        .then(data => {

            if (data.status === 'success') {

                renderHistoryTable(
                    data.data
                );
            }
        });
}


// ==========================================
// RENDER HISTORY TABLE
// ==========================================

function renderHistoryTable(data) {

    const tbody =
        document.getElementById(
            'table-history-body'
        );


    if (!tbody) return;


    tbody.innerHTML = '';


    data.forEach(row => {

        const timeObj =
            new Date(row.createAt);


        const formattedTime =
            `${timeObj.toLocaleTimeString('vi-VN')}, ` +
            `${timeObj.toLocaleDateString('vi-VN')}`;


        const actionColor =
            row.action === 'ON'
                ? '#fbbf24'
                : '#94a3b8';


        tbody.innerHTML +=
            `<tr>
                <td>${row.id}</td>
                <td>${row.device_name}</td>
                <td style="color:${actionColor}; font-weight:bold">
                    ${row.action}
                </td>
                <td>${formattedTime}</td>
            </tr>`;
    });
}