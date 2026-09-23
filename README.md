# Nashra Flour Mill

Website for Nashra Flour Mill, Firdouse Nagar Maidan Road, Uppala, Kerala 671322. Freshly milled flours, spices and oils since 2015.

Live site: https://zahid-msg.github.io/nashra-flour-mill/

It is a plain static site: `index.html`, styles in `assets/css/`, scripts in `assets/js/`, and product data in `prices.json`. No build step.

## Editing prices

All products live in `prices.json` under `products`. Each key (for example `"wheat-flour"`) is one product:

| Field         | Meaning                                              |
|---------------|------------------------------------------------------|
| `name`        | Product name shown on the card                       |
| `price`       | Price in rupees (a number, no `₹` sign)              |
| `unit`        | Unit the price is for, `kg` or `ltr`                 |
| `category`    | `flours`, `spices` or `oils`                         |
| `badge`       | Small label on the card, e.g. `Flour`                |
| `description` | One-line description                                 |
| `image`       | Image URL                                            |

To change a price, edit the `price` number and push. Keep the file valid JSON (commas between entries, no trailing comma).

## Running locally

```sh
python3 -m http.server 8000
```

Then open http://localhost:8000. Opening `index.html` directly from disk will not load `prices.json`, so use the server.

## Visitor counter

The visitor counter uses a free public counter API, [abacus.jasoncameron.dev](https://abacus.jasoncameron.dev). Each visitor is counted once per day. The namespace, key and API URL are set at the top of `assets/js/visitor-counter.js`. Pages opened on localhost only read the count and never add to it.

## Deploying

Push to `main`. GitHub Pages publishes the site automatically within a minute or two.
