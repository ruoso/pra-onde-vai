// support.js — a small stand-in for the Design canvas's runtime, so the
// mockups (*.dc.html) open in any browser, straight from the file system.
//
// It implements the part of the Design Component format the mockups use:
//   - the <x-dc> template, rendered from `renderVals()` of the page's
//     `class Component extends DCLogic` (in <script type="text/x-dc">);
//   - `{{ path }}` holes (dotted lookups, literals true/false/numbers/'text'),
//     whole-value attributes taking the raw value, others interpolated;
//   - <sc-for list as> with `$index`, <sc-if value>, <helmet> (moved to <head>);
//   - onClick / onChange / onInput attributes bound to functions;
//   - `this.props` (data-props defaults, then the page URL's query string,
//     e.g. Practice.dc.html?scene=move), `this.state`, `setState` (a shallow
//     merge, as React's) and `forceUpdate`;
//   - <dc-import name="X" a-prop="…"> mounts X.dc.html beside the page; it
//     fetches the file, which browsers allow over http but not from file://.
//
// Re-rendering patches the existing DOM in place, so an input keeps focus
// while it is being dragged. Nothing here is needed to read the mockups'
// source; it only makes them run.
(function () {
  'use strict';

  // Keep the raw template (with its {{holes}}) from showing before it renders.
  const hide = document.createElement('style');
  hide.textContent = 'x-dc{display:none}';
  (document.head || document.documentElement).appendChild(hide);

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const HOLE = /\{\{\s*([^}]*?)\s*\}\}/g;
  const WHOLE = /^\s*\{\{\s*([^}]*?)\s*\}\}\s*$/;
  const EVENTS = { onclick: 'click', onchange: 'input', oninput: 'input' };

  function lookup(path, scope) {
    if (path === 'true') return true;
    if (path === 'false') return false;
    if (path === 'null') return null;
    if (/^-?\d+(\.\d+)?$/.test(path)) return Number(path);
    const quoted = /^'(.*)'$|^"(.*)"$/.exec(path);
    if (quoted) return quoted[1] ?? quoted[2];
    let value = scope;
    for (const part of path.split('.')) {
      if (value == null) return undefined;
      value = value[part];
    }
    return value;
  }

  const text = (v) => (v == null ? '' : String(v));
  const interpolate = (s, scope) => s.replace(HOLE, (_, p) => text(lookup(p, scope)));

  // ---- build a virtual tree from the template ------------------------------

  function build(node, scope, inSvg, out) {
    if (node.nodeType === Node.TEXT_NODE) {
      out.push({ text: interpolate(node.nodeValue, scope) });
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const tag = node.localName;
    if (tag === 'helmet') return; // handled once, at mount
    if (tag === 'sc-for') {
      const list = lookup(WHOLE.exec(node.getAttribute('list') || '')?.[1] || '', scope) || [];
      const as = node.getAttribute('as') || 'item';
      list.forEach((item, i) => {
        const inner = Object.assign(Object.create(scope), { [as]: item, $index: i });
        for (const child of node.childNodes) build(child, inner, inSvg, out);
      });
      return;
    }
    if (tag === 'sc-if') {
      const cond = lookup(WHOLE.exec(node.getAttribute('value') || '')?.[1] || '', scope);
      if (cond) for (const child of node.childNodes) build(child, scope, inSvg, out);
      return;
    }
    const svg = inSvg || tag === 'svg';
    const el = { tag: tag, svg: svg, attrs: {}, on: {}, props: {}, children: [] };
    for (const attr of Array.from(node.attributes)) {
      const name = attr.name;
      if (name.startsWith('hint-')) continue;
      const whole = WHOLE.exec(attr.value);
      const value = whole ? lookup(whole[1], scope) : interpolate(attr.value, scope);
      if (EVENTS[name]) {
        if (typeof value === 'function') el.on[EVENTS[name]] = value;
        continue;
      }
      if (tag === 'input' && name === 'value') { el.props.value = text(value); continue; }
      if (value === undefined || value === null || value === false) {
        if (name.startsWith('aria-')) el.attrs[name] = String(value === false ? 'false' : '');
        continue;
      }
      el.attrs[name] = value === true ? (name.startsWith('aria-') ? 'true' : '') : text(value);
    }
    if (tag === 'dc-import') {
      el.importName = node.getAttribute('name');
      el.importProps = {};
      for (const attr of Array.from(node.attributes)) {
        if (attr.name === 'name' || attr.name.startsWith('hint-')) continue;
        const camel = attr.name.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
        const whole = WHOLE.exec(attr.value);
        el.importProps[camel] = whole ? lookup(whole[1], scope) : interpolate(attr.value, scope);
      }
      const size = (node.getAttribute('hint-size') || '').split(',');
      el.attrs.style = 'display:block;' + (size[0] ? 'width:' + size[0] + ';' : '') + (size[1] ? 'height:' + size[1] + ';' : '');
    }
    for (const child of node.childNodes) build(child, scope, svg && tag !== 'foreignObject', el.children);
    out.push(el);
  }

  // ---- patch the real DOM to match the virtual tree ------------------------

  function create(v) {
    if (v.text !== undefined) return document.createTextNode(v.text);
    const el = v.svg ? document.createElementNS(SVG_NS, v.tag) : document.createElement(v.tag);
    update(el, v);
    return el;
  }

  function same(dom, v) {
    if (v.text !== undefined) return dom.nodeType === Node.TEXT_NODE;
    return dom.nodeType === Node.ELEMENT_NODE && dom.localName === v.tag &&
      (dom.namespaceURI === SVG_NS) === v.svg && (dom.__import || null) === (v.importName || null);
  }

  function update(el, v) {
    for (const attr of Array.from(el.attributes)) if (!(attr.name in v.attrs)) el.removeAttribute(attr.name);
    for (const [k, val] of Object.entries(v.attrs)) if (el.getAttribute(k) !== val) el.setAttribute(k, val);
    if ('value' in v.props && el.value !== v.props.value && document.activeElement !== el) el.value = v.props.value;
    el.__on = el.__on || {};
    for (const type of new Set([...Object.keys(el.__on), ...Object.keys(v.on)])) {
      if (!el.__on[type]) {
        el.addEventListener(type, (ev) => { const f = el.__on[type]; if (f) f(ev); });
        el.__on[type] = null;
      }
      el.__on[type] = v.on[type] || null;
    }
    if (v.importName) {
      if (el.__import !== v.importName) { el.__import = v.importName; mountImport(el, v.importName, v.importProps); }
      else if (el.__component) { el.__component.props = Object.assign({}, el.__component.props, v.importProps); el.__component.forceUpdate(); }
      return;
    }
    patchChildren(el, v.children);
  }

  function patchChildren(parent, vnodes) {
    const doms = Array.from(parent.childNodes);
    vnodes.forEach((v, i) => {
      const dom = doms[i];
      if (dom && same(dom, v)) {
        if (v.text !== undefined) { if (dom.nodeValue !== v.text) dom.nodeValue = v.text; }
        else update(dom, v);
      } else if (dom) {
        parent.replaceChild(create(v), dom);
      } else {
        parent.appendChild(create(v));
      }
    });
    for (let i = doms.length - 1; i >= vnodes.length; i -= 1) parent.removeChild(doms[i]);
  }

  // ---- components ----------------------------------------------------------

  class DCLogic {
    constructor(props) { this.props = props || {}; this.state = undefined; this.__render = () => {}; }
    setState(patch) {
      const next = typeof patch === 'function' ? patch(this.state, this.props) : patch;
      this.state = Object.assign({}, this.state || {}, next);
      this.__render();
    }
    forceUpdate() { this.__render(); }
    renderVals() { return {}; }
  }
  window.DCLogic = DCLogic;

  function readPage(doc) {
    const root = doc.querySelector('x-dc');
    const script = doc.querySelector('script[type="text/x-dc"]');
    if (!root || !script) throw new Error('not a Design Component page');
    const template = document.createElement('template');
    template.innerHTML = root.innerHTML;
    let declared = {};
    try { declared = JSON.parse(script.getAttribute('data-props') || '{}'); } catch (e) { declared = {}; }
    const defaults = {};
    for (const [k, spec] of Object.entries(declared)) {
      if (k.startsWith('$')) continue;
      if (spec && 'default' in spec) defaults[k] = spec.default;
    }
    const Component = new Function('DCLogic', script.textContent + '\n;return Component;')(DCLogic);
    return { template: template.content, Component: Component, defaults: defaults };
  }

  function mount(host, page, props) {
    const component = new page.Component(Object.assign({}, page.defaults, props));
    let scheduled = false;
    const render = () => {
      let vals;
      try { vals = component.renderVals() || {}; } catch (e) { console.error(e); return; }
      const out = [];
      for (const child of page.template.childNodes) build(child, vals, false, out);
      patchChildren(host, out);
    };
    component.__render = () => {
      if (scheduled) return;
      scheduled = true;
      Promise.resolve().then(() => { scheduled = false; render(); });
    };
    host.__component = component;
    render();
    if (typeof component.componentDidMount === 'function') component.componentDidMount();
    return component;
  }

  function mountImport(host, name, props) {
    fetch(name + '.dc.html')
      .then((r) => r.text())
      .then((html) => {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        mount(host, readPage(doc), props);
      })
      .catch(() => {
        host.textContent = 'Open this page over http (for example `python3 -m http.server`) to show ' + name + '.';
      });
  }

  function start() {
    const root = document.querySelector('x-dc');
    if (!root) return;
    const page = readPage(document);
    // Move the page's <helmet> (fonts, base styles) into <head>, once.
    const helmet = page.template.querySelector('helmet');
    if (helmet) for (const child of Array.from(helmet.childNodes)) document.head.appendChild(child.cloneNode(true));
    const host = document.createElement('div');
    root.replaceWith(host);
    const query = {};
    new URLSearchParams(location.search).forEach((v, k) => { query[k] = v; });
    mount(host, page, query);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
