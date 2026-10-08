/*! formbutton.js - Formward embeddable contact widget. First-party, versioned, no deps.
 *  Opens a compact bottom-right panel (live-chat style) that does NOT cover the page. */
(function () {
  "use strict";

  if (window.__formwardButtonInit) return;
  window.__formwardButtonInit = true;

  // Capture our own script element at load time (currentScript is only valid synchronously).
  var script =
    document.currentScript ||
    (function () {
      var s = document.getElementsByTagName("script");
      return s[s.length - 1] || null;
    })();

  // Derive the script origin from its src, falling back to the page origin.
  function originFromScript(el) {
    try {
      if (el && el.src) return new URL(el.src).origin;
    } catch (e) {}
    return location.origin;
  }

  // Same logic as the TS parser in src/lib/formbutton-config.ts.
  var STYLES = ["pill", "circle", "tab", "bar"];

  // Ingestion host. NOT derived from where this script is served: the widget is
  // embedded from app./formward.eu, neither of which has a /f/ route, so
  // deriving it produced a 404 (or a CORS-less 301) on every submission.
  var INGEST_ORIGIN = "https://forms.formward.eu";

  function parseConfig(data, scriptOrigin) {
    var formId = data.formId || "";
    var endpoint = data.endpoint || (formId ? INGEST_ORIGIN + "/f/" + formId : "");
    var buttonText = data.buttonText || "Contact";
    var color = data.color || "#00C871";
    var style = String(data.style || "pill").toLowerCase();
    if (STYLES.indexOf(style) === -1) style = "pill";
    var fields = (data.fields || "name,email,message")
      .split(",")
      .map(function (s) {
        return s.trim();
      })
      .filter(Boolean);
    return { endpoint: endpoint, buttonText: buttonText, color: color, fields: fields, style: style };
  }

  var ds = (script && script.dataset) || {};
  var cfg = parseConfig(
    {
      formId: ds.formId,
      endpoint: ds.endpoint,
      buttonText: ds.buttonText,
      color: ds.color,
      fields: ds.fields,
      style: ds.style,
    },
    originFromScript(script),
  );

  if (!cfg.endpoint) {
    console.warn("[formbutton] missing data-form-id or data-endpoint");
    return;
  }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  function fieldLabel(name) {
    return name.charAt(0).toUpperCase() + name.slice(1);
  }

  // Pick a readable text colour (near-black or white) for a given background so
  // the label on the coloured trigger/submit always meets contrast - the default
  // brand green is bright, so it needs dark text, not white.
  function readableText(c) {
    var r, g, b;
    c = String(c).trim();
    if (c.charAt(0) === "#") {
      var h = c.slice(1);
      if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
      r = parseInt(h.slice(0, 2), 16);
      g = parseInt(h.slice(2, 4), 16);
      b = parseInt(h.slice(4, 6), 16);
    } else {
      var m = c.match(/(\d+)[ ,]+(\d+)[ ,]+(\d+)/);
      if (!m) return "#ffffff";
      r = +m[1];
      g = +m[2];
      b = +m[3];
    }
    if (isNaN(r) || isNaN(g) || isNaN(b)) return "#ffffff";
    // WCAG relative luminance, then pick whichever of near-black / white has the
    // higher contrast against the background. Bright brand green (#00C871) scores
    // ~9.5:1 with dark text vs ~2.2:1 with white, so it correctly gets dark text.
    function lin(v) {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    }
    var L = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
    var contrastWhite = 1.05 / (L + 0.05);
    var contrastBlack = (L + 0.05) / 0.05;
    return contrastBlack >= contrastWhite ? "#0b0b0c" : "#ffffff";
  }

  var FG = readableText(cfg.color);

  // The side tab is anchored mid-right, so there is no floating button at the
  // bottom to clear - the panel can sit lower in that case.
  var lowPanel = cfg.style === "tab";

  // Inline chat-bubble icon for the trigger (currentColor inherits the text colour).
  var ICON =
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">' +
    '<path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.8-.9L3 21l1.9-5.7A8.38 8.38 0 0 1 4 11.5 8.5 8.5 0 0 1 12.5 3 8.38 8.38 0 0 1 21 11.5z" ' +
    'stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  // Close (chevron-down) icon for the panel header.
  var ICON_CLOSE =
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">' +
    '<path d="m6 9 6 6 6-6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  var PLACEHOLDERS = {
    name: "Your name",
    email: "you@email.com",
    message: "How can we help?",
    subject: "Subject",
    phone: "Phone number",
    company: "Company",
  };

  function injectStyles() {
    if (document.getElementById("fwbtn-styles")) return;
    var css =
      "@keyframes fwbtn-pop{from{opacity:0;transform:translateY(12px) scale(.97)}to{opacity:1;transform:none}}" +
      // Floating trigger (default: pill, bottom-right).
      ".fwbtn-trigger{position:fixed;right:20px;bottom:20px;z-index:2147483000;display:inline-flex;align-items:center;gap:8px;" +
      "border:none;border-radius:9999px;padding:13px 20px;font:600 15px/1 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;" +
      "cursor:pointer;box-shadow:0 8px 24px rgba(0,0,0,.16),0 2px 6px rgba(0,0,0,.12);transition:transform .14s cubic-bezier(.2,.8,.2,1),box-shadow .14s ease}" +
      ".fwbtn-trigger:hover{transform:translateY(-2px);box-shadow:0 14px 34px rgba(0,0,0,.22),0 3px 8px rgba(0,0,0,.14)}" +
      ".fwbtn-trigger:active{transform:translateY(0) scale(.98)}" +
      ".fwbtn-trigger:focus-visible{outline:none;box-shadow:0 0 0 3px rgba(0,0,0,.18),0 8px 24px rgba(0,0,0,.16)}" +
      ".fwbtn-trigger svg{flex:none}" +
      // Design variants (data-style). pill is the default styling above.
      ".fwbtn-trigger.fwbtn-bar{border-radius:12px}" +
      ".fwbtn-trigger.fwbtn-circle{padding:0;width:58px;height:58px;border-radius:50%;justify-content:center;gap:0}" +
      ".fwbtn-trigger.fwbtn-circle svg{width:23px;height:23px}" +
      ".fwbtn-trigger.fwbtn-tab{right:0;bottom:auto;top:50%;transform:translateY(-50%);border-radius:10px 0 0 10px;" +
      "padding:16px 11px;writing-mode:vertical-rl;letter-spacing:.01em;box-shadow:-8px 6px 24px rgba(0,0,0,.18)}" +
      ".fwbtn-trigger.fwbtn-tab:hover{transform:translateY(-50%) translateX(-2px)}" +
      ".fwbtn-trigger.fwbtn-tab:active{transform:translateY(-50%) scale(.99)}" +
      // Compact panel anchored bottom-right ABOVE the trigger - does not cover the page.
      ".fwbtn-panel{position:fixed;right:20px;bottom:92px;z-index:2147483001;width:380px;max-width:calc(100vw - 32px);" +
      "max-height:min(640px,calc(100vh - 120px));display:flex;flex-direction:column;overflow:hidden;box-sizing:border-box;" +
      "background:#fff;color:#15151a;border-radius:18px;border:1px solid rgba(0,0,0,.08);" +
      "box-shadow:0 20px 60px rgba(0,0,0,.22),0 4px 14px rgba(0,0,0,.12);transform-origin:bottom right;" +
      "font:400 15px/1.5 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;" +
      "animation:fwbtn-pop .2s cubic-bezier(.2,.85,.25,1)}" +
      ".fwbtn-panel.fwbtn-low{bottom:20px}" +
      ".fwbtn-panel *{box-sizing:border-box}" +
      // Header (coloured bar carrying the title + a close control).
      ".fwbtn-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;padding:16px 16px 15px 18px;flex:none}" +
      ".fwbtn-title{margin:0;font-size:16px;font-weight:700;letter-spacing:-.015em}" +
      ".fwbtn-sub{margin:2px 0 0;font-size:12.5px;opacity:.82}" +
      ".fwbtn-close{flex:none;width:30px;height:30px;border:none;background:rgba(255,255,255,.18);cursor:pointer;" +
      "border-radius:8px;display:flex;align-items:center;justify-content:center;color:inherit;transition:background .12s}" +
      ".fwbtn-close:hover{background:rgba(255,255,255,.3)}" +
      ".fwbtn-close:focus-visible{outline:2px solid rgba(255,255,255,.7);outline-offset:1px}" +
      // Scrollable body.
      ".fwbtn-body{padding:16px 18px 16px;overflow:auto;flex:1 1 auto}" +
      ".fwbtn-field{margin-bottom:13px}" +
      ".fwbtn-label{display:block;margin-bottom:6px;font-size:12.5px;font-weight:600;color:#52525a}" +
      ".fwbtn-input,.fwbtn-textarea{width:100%;border:1px solid #e1e1e6;border-radius:10px;padding:11px 13px;" +
      "font:inherit;font-size:14.5px;color:#15151a;background:#fcfcfd;transition:border-color .12s,box-shadow .12s,background .12s}" +
      ".fwbtn-input::placeholder,.fwbtn-textarea::placeholder{color:#a6a6ad}" +
      ".fwbtn-input:focus,.fwbtn-textarea:focus{outline:none;background:#fff;border-color:#0b0b0c;box-shadow:0 0 0 3px rgba(11,11,12,.08)}" +
      ".fwbtn-textarea{min-height:92px;resize:vertical}" +
      ".fwbtn-hp{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden}" +
      ".fwbtn-submit{width:100%;border:none;border-radius:11px;padding:12px 18px;margin-top:2px;font:600 15px/1 inherit;" +
      "cursor:pointer;transition:filter .12s ease,opacity .12s ease}" +
      ".fwbtn-submit:hover{filter:brightness(1.05)}.fwbtn-submit:active{filter:brightness(.96)}" +
      ".fwbtn-submit:disabled{opacity:.6;cursor:default;filter:none}" +
      ".fwbtn-err{margin-top:12px;font-size:13.5px;border-radius:9px;padding:10px 12px;background:#fdecec;color:#a01919;display:none}" +
      ".fwbtn-err.fwbtn-on{display:block}" +
      ".fwbtn-done{display:none;text-align:center;padding:14px 0 6px}" +
      ".fwbtn-done.fwbtn-on{display:block;animation:fwbtn-pop .25s cubic-bezier(.2,.85,.25,1)}" +
      ".fwbtn-check{width:52px;height:52px;border-radius:50%;background:#e7f8ee;color:#0b6b3a;display:flex;align-items:center;justify-content:center;margin:0 auto 14px}" +
      ".fwbtn-done h3{margin:0 0 4px;font-size:17px;font-weight:700;color:#0b0b0c}" +
      ".fwbtn-done p{margin:0;font-size:14px;color:#74747c}" +
      ".fwbtn-pb{margin-top:16px;text-align:center;font-size:11.5px;color:#a6a6ad}" +
      ".fwbtn-pb a{color:#74747c;text-decoration:none}.fwbtn-pb a:hover{color:#0b0b0c;text-decoration:underline}" +
      // On narrow screens the panel becomes a near-full-width card, still corner-anchored (not a full overlay).
      "@media(max-width:480px){.fwbtn-panel{left:12px;right:12px;bottom:88px;width:auto;max-height:76vh}" +
      ".fwbtn-panel.fwbtn-low{bottom:12px}}";
    var style = document.createElement("style");
    style.id = "fwbtn-styles";
    style.textContent = css;
    (document.head || document.documentElement).appendChild(style);
  }

  var panel = null;
  var trigger = null;
  var prevFocus = null;

  function onKeydown(e) {
    if (e.key === "Escape") closePanel();
  }

  function closePanel() {
    if (panel) {
      panel.remove();
      panel = null;
    }
    document.removeEventListener("keydown", onKeydown);
    if (trigger) trigger.setAttribute("aria-expanded", "false");
    if (prevFocus && prevFocus.focus) prevFocus.focus();
  }

  function buildField(name) {
    var wrap = document.createElement("div");
    wrap.className = "fwbtn-field";
    var id = "fwbtn-f-" + name;
    var label = document.createElement("label");
    label.className = "fwbtn-label";
    label.setAttribute("for", id);
    label.textContent = fieldLabel(name);
    var control;
    if (name === "message") {
      control = document.createElement("textarea");
      control.className = "fwbtn-textarea";
    } else {
      control = document.createElement("input");
      control.className = "fwbtn-input";
      control.type = name === "email" ? "email" : name === "phone" ? "tel" : "text";
    }
    control.id = id;
    control.name = name;
    if (PLACEHOLDERS[name]) control.setAttribute("placeholder", PLACEHOLDERS[name]);
    wrap.appendChild(label);
    wrap.appendChild(control);
    return wrap;
  }

  function openPanel() {
    if (panel) return;
    prevFocus = document.activeElement;

    panel = document.createElement("div");
    panel.className = "fwbtn-panel" + (lowPanel ? " fwbtn-low" : "");
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "false");
    panel.setAttribute("aria-label", cfg.buttonText);

    // Header - uses the brand colour as its background with auto-contrast text.
    var head = document.createElement("div");
    head.className = "fwbtn-head";
    head.style.background = cfg.color;
    head.style.color = FG;

    var headText = document.createElement("div");
    var title = document.createElement("h2");
    title.className = "fwbtn-title";
    title.textContent = cfg.buttonText;
    var sub = document.createElement("p");
    sub.className = "fwbtn-sub";
    sub.textContent = "We usually reply within a day.";
    headText.appendChild(title);
    headText.appendChild(sub);

    var close = document.createElement("button");
    close.type = "button";
    close.className = "fwbtn-close";
    close.setAttribute("aria-label", "Close");
    close.innerHTML = ICON_CLOSE;
    close.addEventListener("click", closePanel);

    head.appendChild(headText);
    head.appendChild(close);

    // Body - the form, success panel, and powered-by footer all scroll together.
    var body = document.createElement("div");
    body.className = "fwbtn-body";

    var form = document.createElement("form");
    form.noValidate = false;

    cfg.fields.forEach(function (name) {
      form.appendChild(buildField(name));
    });

    // Honeypot
    var hp = document.createElement("input");
    hp.type = "text";
    hp.name = "_gotcha";
    hp.className = "fwbtn-hp";
    hp.tabIndex = -1;
    hp.setAttribute("autocomplete", "off");
    hp.setAttribute("aria-hidden", "true");
    form.appendChild(hp);

    var submit = document.createElement("button");
    submit.type = "submit";
    submit.className = "fwbtn-submit";
    submit.style.background = cfg.color;
    submit.style.color = FG;
    submit.textContent = "Send message";

    var err = document.createElement("div");
    err.className = "fwbtn-err";
    err.setAttribute("aria-live", "polite");

    form.appendChild(submit);
    form.appendChild(err);

    // Success panel (revealed in place of the form on a successful send).
    var done = document.createElement("div");
    done.className = "fwbtn-done";
    done.innerHTML =
      '<div class="fwbtn-check"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
      '<path d="M20 6 9 17l-5-5" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg></div>' +
      "<h3>Message sent</h3><p>Thanks - we got it and will be in touch.</p>";

    var pb = document.createElement("div");
    pb.className = "fwbtn-pb";
    pb.innerHTML = 'Powered by <a href="https://formward.eu" target="_blank" rel="noopener">Formward</a>';

    function showErr(text) {
      err.textContent = text;
      err.className = "fwbtn-err fwbtn-on";
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      submit.disabled = true;
      submit.textContent = "Sending…";
      err.className = "fwbtn-err";
      fetch(cfg.endpoint, {
        method: "POST",
        headers: { Accept: "application/json" },
        body: new FormData(form),
      })
        .then(function (res) {
          if (res.ok) {
            form.style.display = "none";
            done.className = "fwbtn-done fwbtn-on";
          } else {
            showErr("Something went wrong. Please try again.");
            submit.disabled = false;
            submit.textContent = "Send message";
          }
        })
        .catch(function () {
          showErr("Something went wrong. Please try again.");
          submit.disabled = false;
          submit.textContent = "Send message";
        });
    });

    body.appendChild(form);
    body.appendChild(done);
    body.appendChild(pb);

    panel.appendChild(head);
    panel.appendChild(body);
    document.body.appendChild(panel);

    document.addEventListener("keydown", onKeydown);
    if (trigger) trigger.setAttribute("aria-expanded", "true");

    var first = form.querySelector("input,textarea");
    if (first) first.focus();
  }

  function togglePanel() {
    if (panel) closePanel();
    else openPanel();
  }

  function injectTrigger() {
    injectStyles();
    trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "fwbtn-trigger fwbtn-" + cfg.style;
    trigger.style.background = cfg.color;
    trigger.style.color = FG;
    if (cfg.style === "circle") {
      // Icon-only FAB: text moves to an accessible label.
      trigger.innerHTML = ICON;
      trigger.setAttribute("aria-label", cfg.buttonText);
    } else if (cfg.style === "tab") {
      // Vertical side tab: text only (the icon doesn't read well rotated).
      trigger.textContent = cfg.buttonText;
    } else {
      trigger.innerHTML = ICON + "<span>" + esc(cfg.buttonText) + "</span>";
    }
    trigger.setAttribute("aria-haspopup", "dialog");
    trigger.setAttribute("aria-expanded", "false");
    trigger.addEventListener("click", togglePanel);
    document.body.appendChild(trigger);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", injectTrigger);
  } else {
    injectTrigger();
  }
})();
