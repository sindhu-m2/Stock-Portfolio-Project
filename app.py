import os
import time

from flask import Flask, render_template, jsonify, request
from dotenv import load_dotenv

from stock_portfolio import (
    STOCKS,
    get_market_data,
    load_portfolio,
    buy_stock,
    sell_stock
)

load_dotenv()

app = Flask(__name__)

API_KEY = os.getenv("TWELVE_DATA_API_KEY")

cached_market_data = None
last_updated = 0


def get_cached_market_data():

    global cached_market_data, last_updated

    current_time = time.time()

    if (
        cached_market_data is None
        or current_time - last_updated >= 60
    ):

        if not API_KEY or API_KEY == "YOUR_API_KEY_HERE":
            return {
                "error": "Please configure your Twelve Data API key."
            }

        cached_market_data = get_market_data(API_KEY)
        last_updated = current_time

    return cached_market_data


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/api/dashboard")
def dashboard():

    market = get_cached_market_data()
    portfolio = load_portfolio()

    return jsonify({
        "stocks": market,
        "portfolio": portfolio,
        "updated_at": time.strftime(
            "%H:%M:%S",
            time.localtime(last_updated)
        ) if last_updated else None
    })


@app.route("/api/buy", methods=["POST"])
def buy():

    data = request.get_json(silent=True) or {}

    symbol = data.get("symbol")
    quantity = data.get("quantity")

    if symbol not in STOCKS:
        return jsonify({"error": "Invalid stock."}), 400

    try:
        quantity = int(quantity)

        if quantity <= 0:
            raise ValueError

    except (TypeError, ValueError):
        return jsonify({
            "error": "Enter a valid quantity."
        }), 400

    market = get_cached_market_data()

    if "error" in market:
        return jsonify({"error": market["error"]}), 503

    price = market[symbol].get("price")

    if price is None:
        return jsonify({
            "error": "Current stock price unavailable."
        }), 503

    portfolio = buy_stock(symbol, quantity, price)

    return jsonify({
        "message": f"Successfully bought {quantity} shares of {symbol}.",
        "portfolio": portfolio
    })


@app.route("/api/sell", methods=["POST"])
def sell():

    data = request.get_json(silent=True) or {}

    symbol = data.get("symbol")
    quantity = data.get("quantity")

    if symbol not in STOCKS:
        return jsonify({"error": "Invalid stock."}), 400

    try:
        quantity = int(quantity)

        if quantity <= 0:
            raise ValueError

    except (TypeError, ValueError):
        return jsonify({
            "error": "Enter a valid quantity."
        }), 400

    try:
        portfolio = sell_stock(symbol, quantity)

        return jsonify({
            "message": f"Successfully sold {quantity} shares of {symbol}.",
            "portfolio": portfolio
        })

    except ValueError as error:

        return jsonify({"error": str(error)}), 400


if __name__ == "__main__":
    app.run(debug=True)