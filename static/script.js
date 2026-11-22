let chart = null;

const domains = {
    AAPL: "apple.com",
    TSLA: "tesla.com",
    MSFT: "microsoft.com",
    AMZN: "amazon.com",
    GOOGL: "google.com"
};


function money(value) {

    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD"
    }).format(value || 0);

}


function showToast(message) {

    const toast = document.getElementById("toast");

    toast.textContent = message;
    toast.style.display = "block";

    setTimeout(() => {
        toast.style.display = "none";
    }, 3500);

}


async function refreshDashboard() {

    try {

        const response = await fetch("/api/dashboard");
        const data = await response.json();

        document.getElementById("updatedAt").textContent =
            data.updated_at || "Unavailable";

        if (data.stocks.error) {

            document.getElementById("stockGrid").textContent =
                data.stocks.error;

            return;
        }

        renderStocks(data.stocks);
        renderPortfolio(data.portfolio, data.stocks);

    } catch (error) {

        showToast("Unable to connect to the server.");

    }

}


function renderStocks(stocks) {

    const grid = document.getElementById("stockGrid");

    grid.innerHTML = "";

    for (const [symbol, stock] of Object.entries(stocks)) {

        const price = stock.price === null
            ? "Unavailable"
            : money(stock.price);

        const change = stock.percent_change || 0;

        const changeClass = change >= 0
            ? "positive"
            : "negative";

        const card = document.createElement("div");

        card.className = "stock-card";

        const top = document.createElement("div");
        top.className = "stock-top";

        const logo = document.createElement("img");
        logo.className = "stock-logo";
        logo.src = `https://www.google.com/s2/favicons?domain=${domains[symbol]}&sz=128`;
        logo.alt = symbol;

        const name = document.createElement("div");
        name.className = "stock-name";

        const heading = document.createElement("h3");
        heading.textContent = stock.name;

        const ticker = document.createElement("p");
        ticker.textContent = symbol;

        name.append(heading, ticker);
        top.append(logo, name);

        const priceElement = document.createElement("div");
        priceElement.className = "stock-price";
        priceElement.textContent = price;

        const changeElement = document.createElement("div");
        changeElement.className = `stock-change ${changeClass}`;

        changeElement.textContent =
            stock.price === null
                ? stock.error || "Price unavailable"
                : `${change >= 0 ? "+" : ""}${change.toFixed(2)}% today`;

        const controls = document.createElement("div");
        controls.className = "trade-controls";

        const quantity = document.createElement("input");
        quantity.type = "number";
        quantity.min = "1";
        quantity.value = "1";

        quantity.id = `quantity-${symbol}`;

        const buyButton = document.createElement("button");
        buyButton.className = "buy-btn";
        buyButton.textContent = "Buy";

        buyButton.onclick = () => trade("buy", symbol);

        const sellButton = document.createElement("button");
        sellButton.className = "sell-btn";
        sellButton.textContent = "Sell";

        sellButton.onclick = () => trade("sell", symbol);

        controls.append(quantity, buyButton, sellButton);

        card.append(
            top,
            priceElement,
            changeElement,
            controls
        );

        grid.appendChild(card);

    }

}


function renderPortfolio(portfolio, stocks) {

    const body = document.getElementById("portfolioBody");

    body.innerHTML = "";

    let totalInvested = 0;
    let currentValue = 0;
    let totalShares = 0;

    const chartLabels = [];
    const chartValues = [];

    for (const [symbol, holding] of Object.entries(portfolio)) {

        const quantity = holding.quantity;
        const averagePrice = holding.average_price;

        const stock = stocks[symbol];

        const currentPrice = stock?.price;

        const invested = quantity * averagePrice;

        totalInvested += invested;
        totalShares += quantity;

        let valueText = "Unavailable";
        let profitText = "Unavailable";

        if (currentPrice !== null && currentPrice !== undefined) {

            const value = quantity * currentPrice;
            const profit = value - invested;

            currentValue += value;

            valueText = money(value);

            profitText =
                `${profit >= 0 ? "+" : ""}${money(profit)}`;

            chartLabels.push(symbol);
            chartValues.push(value);

        }

        const row = document.createElement("tr");

        const values = [
            symbol,
            quantity,
            money(averagePrice),
            currentPrice === null || currentPrice === undefined
                ? "Unavailable"
                : money(currentPrice),
            valueText,
            profitText
        ];

        values.forEach(value => {

            const cell = document.createElement("td");

            cell.textContent = value;

            row.appendChild(cell);

        });

        body.appendChild(row);

    }

    if (Object.keys(portfolio).length === 0) {

        const row = document.createElement("tr");
        const cell = document.createElement("td");

        cell.colSpan = 6;
        cell.textContent = "Your portfolio is empty. Buy your first stock!";

        row.appendChild(cell);
        body.appendChild(row);

    }

    const totalProfit = currentValue - totalInvested;

    document.getElementById("totalInvested").textContent =
        money(totalInvested);

    document.getElementById("currentValue").textContent =
        money(currentValue);

    const profitElement = document.getElementById("totalProfit");

    profitElement.textContent =
        `${totalProfit >= 0 ? "+" : ""}${money(totalProfit)}`;

    profitElement.className =
        totalProfit >= 0 ? "positive" : "negative";

    const percentage = totalInvested > 0
        ? (totalProfit / totalInvested) * 100
        : 0;

    document.getElementById("profitPercentage").textContent =
        `${percentage.toFixed(2)}% return`;

    document.getElementById("stockCount").textContent =
        Object.keys(portfolio).length;

    updateChart(chartLabels, chartValues);

}


function updateChart(labels, values) {

    const canvas = document.getElementById("portfolioChart");

    if (chart) {
        chart.destroy();
    }

    chart = new Chart(canvas, {

        type: "doughnut",

        data: {

            labels: labels,

            datasets: [{

                data: values,

                backgroundColor: [
                    "#4f7cff",
                    "#21b88b",
                    "#f2b84b",
                    "#e66d8b",
                    "#9267e8"
                ],

                borderWidth: 0

            }]

        },

        options: {

            responsive: true,

            plugins: {

                legend: {
                    position: "bottom"
                }

            }

        }

    });

}


async function trade(action, symbol) {

    const quantityInput =
        document.getElementById(`quantity-${symbol}`);

    const quantity = Number(quantityInput.value);

    if (!Number.isInteger(quantity) || quantity <= 0) {

        showToast("Enter a valid share quantity.");
        return;

    }

    try {

        const response = await fetch(`/api/${action}`, {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                symbol: symbol,
                quantity: quantity
            })

        });

        const result = await response.json();

        if (!response.ok) {

            showToast(result.error || "Transaction failed.");
            return;

        }

        showToast(result.message);

        await refreshDashboard();

    } catch (error) {

        showToast("Transaction failed. Please try again.");

    }

}


refreshDashboard();

setInterval(refreshDashboard, 60000);