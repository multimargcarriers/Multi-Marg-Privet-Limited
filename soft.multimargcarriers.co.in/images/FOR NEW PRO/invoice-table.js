document.addEventListener("DOMContentLoaded", function () {
    const rowsPerPage = 10;
    let currentPage = 1;

    const table = document.getElementById("invoice_table");
    const tbody = table.querySelector("tbody");
    const rows = Array.from(tbody.querySelectorAll("tr"));

    const totalPages = Math.ceil(rows.length / rowsPerPage);
    const pageInfo = document.getElementById("pageInfo");

    function renderTable() {
        rows.forEach((row, index) => {
            row.style.display =
                index >= (currentPage - 1) * rowsPerPage &&
                index < currentPage * rowsPerPage
                    ? ""
                    : "none";
        });
        pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
    }

    document.getElementById("prevPage").addEventListener("click", () => {
        if (currentPage > 1) {
            currentPage--;
            renderTable();
        }
    });

    document.getElementById("nextPage").addEventListener("click", () => {
        if (currentPage < totalPages) {
            currentPage++;
            renderTable();
        }
    });

    // Search functionality
    document.getElementById("searchBox").addEventListener("keyup", function () {
        const filter = this.value.toLowerCase();
        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(filter) ? "" : "none";
        });
    });

    // Initial render
    renderTable();
});