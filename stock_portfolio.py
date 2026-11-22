import requests
import json
from pathlib import Path

PORTFOLIO_FILE = Path(__file__).with_name("portfolio.json")

STOCKS = {
    "AAPL": {
        "name": "Apple Inc.",
        "domain": "apple.com"
    },
    "TSLA": {
        "name": "Tesla Inc.",
        "domain": "tesla.com"
    },
    "MSFT": {
        "name": "Microsoft",
        "domain": "microsoft.com"
    },
    "AMZN": {
        "name": "Amazon",
        "domain": "amazon.com"
    },
    "GOOGL": {
        "name": "Alphabet",
        "domain": "google.com"
    }
}


def get_market_data(api_key):

    market_data = {}

    for symbol, details in STOCKS.items():

        try:
            url = "https://api.twelvedata.com/quote"

            params = {
                "symbol": symbol,
                "apikey": api_key
            }

            response = requests.get(
                url,
                params=params,
                timeout=15
            )

            data = response.json()

            if "code" in data:
                market_data[symbol] = {
                    **details,
                    "price": None,
                    "error": data.get("message", "API error")
                }
                continue

            price = float(data.get("close", 0))

            if price <= 0:
                raise ValueError("Price unavailable")

            market_data[symbol] = {
                **details,
                "price": price,
                "change": float(data.get("change", 0)),
                "percent_change": float(
                    data.get("percent_change", 0)
                ),
                "currency": data.get("currency", "USD"),
                "error": None
            }

        except Exception as error:

            market_data[symbol] = {
                **details,
                "price": None,
                "error": str(error)
            }

    return market_data


def load_portfolio():

    if not PORTFOLIO_FILE.exists():
        return {}

    try:
        with open(PORTFOLIO_FILE, "r") as file:
            return json.load(file)

    except (json.JSONDecodeError, OSError):
        return {}


def save_portfolio(portfolio):

    with open(PORTFOLIO_FILE, "w") as file:
        json.dump(portfolio, file, indent=4)


def buy_stock(symbol, quantity, price):

    portfolio = load_portfolio()

    old_quantity = portfolio.get(symbol, {}).get(
        "quantity", 0
    )

    old_average = portfolio.get(symbol, {}).get(
        "average_price", 0
    )

    new_quantity = old_quantity + quantity

    total_cost = (
        old_quantity * old_average
        + quantity * price
    )

    average_price = total_cost / new_quantity

    portfolio[symbol] = {
        "quantity": new_quantity,
        "average_price": average_price
    }

    save_portfolio(portfolio)

    return portfolio


def sell_stock(symbol, quantity):

    portfolio = load_portfolio()

    if symbol not in portfolio:
        raise ValueError("You don't own this stock.")

    owned_quantity = portfolio[symbol]["quantity"]

    if quantity > owned_quantity:
        raise ValueError("You don't own enough shares.")

    remaining = owned_quantity - quantity

    if remaining == 0:
        del portfolio[symbol]

    else:
        portfolio[symbol]["quantity"] = remaining

    save_portfolio(portfolio)

    return portfolio