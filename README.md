# Formbutton

One script tag that adds a floating contact button and a popup contact form to any website. Submissions go to [Formward](https://formward.eu), a form backend hosted in Sweden, so there is no backend, build step or dependency on your side.

Live demo and visual builder: [formward.eu/formbutton](https://formward.eu/formbutton) and [formward.eu/formbutton/builder](https://formward.eu/formbutton/builder).

## Install

```html
<script src="https://formward.eu/formbutton.js"
  data-form-id="your-form-id"
  data-button-text="Contact us"
  data-color="#00C871"></script>
```

Put it anywhere in the page, ideally before `</body>`. The button appears bottom right and opens a compact panel (live-chat style) that does not cover the page.

## Options

| Attribute | Required | What it does |
|---|---|---|
| `data-form-id` | yes | Your Formward form ID. Used to build the endpoint. |
| `data-endpoint` | no | Full POST URL. Overrides `data-form-id` when set. |
| `data-button-text` | no | Text on the floating button and the panel title. Defaults to "Contact". |
| `data-color` | no | Button and submit colour (any CSS colour). Defaults to `#00C871`. Text colour adjusts for contrast. |
| `data-style` | no | Button design: `pill` (default), `circle`, `tab` or `bar`. |
| `data-theme` | no | `studio` for the Formward studio palette (lime default colour, warm paper popup). Off by default. |
| `data-fields` | no | Comma-separated field names. Defaults to `name,email,message`. |

## How it works

`formbutton.js` is a self-contained, dependency-free script. It injects the button and the panel, posts the form with `fetch` to `https://forms.formward.eu/f/<form id>` with `Accept: application/json`, and shows the success or error state inline. It includes the `_gotcha` honeypot field, so Formward's spam filtering applies as for any other form.

The file in this repository is the same one served from `https://formward.eu/formbutton.js`. You can self-host it; the endpoint stays on Formward.

## Spam, privacy, EU hosting

Submissions are stored in Sweden and processed by Formward. The sub-processor list and the Data Processing Agreement are public at [formward.eu/compliance](https://formward.eu/compliance). Formbutton sets no cookies and loads nothing from third parties.

## License

MIT. See [LICENSE](./LICENSE).
