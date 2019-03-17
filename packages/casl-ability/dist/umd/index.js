!(function (e, t) { typeof exports === 'object' && typeof module !== 'undefined' ? t(exports, require('sift')) : typeof define === 'function' && define.amd ? define(['exports', 'sift'], t) : t((e = e || self).casl = {}, e.sift); }(this, (e, r) => {
  function s(e, t) { for (let r = 0; r < t.length; r++) { const n = t[r]; n.enumerable = n.enumerable || !1, n.configurable = !0, 'value' in n && (n.writable = !0), Object.defineProperty(e, n.key, n); } } function a(e, t) { void 0 === t && (t = {}), Error.call(this), this.constructor = a, this.subject = t.subject, this.subjectName = t.subjectName, this.action = t.action, this.field = t.field, this.message = e || `Cannot execute "${this.action}" on "${this.subjectName}"`, typeof Error.captureStackTrace === 'function' ? (this.name = this.constructor.name, Error.captureStackTrace(this, this.constructor)) : this.stack = new Error(this.message).stack; } function h(e) { return Array.isArray(e) ? e : [e]; } function u(e) { if (!e || typeof e === 'string') return e; const t = typeof e === 'object' ? e.constructor : e; return t.modelName || t.name; }r = r && r.hasOwnProperty('default') ? r.default : r, a.prototype = Object.create(Error.prototype); const c = (function () { function e(e) { this.actions = e.actions || e.action, this.subject = e.subject, this.fields = e.fields && e.fields.length !== 0 ? h(e.fields) : void 0, this.inverted = !!e.inverted, this.conditions = e.conditions, this._matches = this.conditions ? r(this.conditions) : void 0, this.reason = e.reason, this.scope = e.scope; } const t = e.prototype; return t.matches = function (e) { let t = !0; if (typeof e !== 'string') { if (this.scope) if (Array.isArray(this.scope)) for (let r = 0; r < this.scope.length; r++) { const n = this.scope[r](e, this); n || (t = n); } else t = this.scope(e, this); if (!1 === t) return !!this.inverted; } return !this._matches || (typeof e === 'string' ? !this.inverted : this._matches(e)); }, t.isRelevantFor = function (e, t) { return !this.fields || (t ? this.fields.indexOf(t) !== -1 : !this.inverted); }, e; }()); const d = typeof Symbol !== 'undefined' ? Symbol('private') : `__${Date.now()}`; const l = { crud: ['create', 'read', 'update', 'delete'] }; function o(e, t) { return e === t || Array.isArray(t) && t.indexOf(e) !== -1; } const f = (function () { function e(e, t) { let r; const n = void 0 === t ? {} : t; const i = n.RuleType; const s = void 0 === i ? c : i; const o = n.subjectName; const a = void 0 === o ? u : o; this[d] = { RuleType: s, subjectName: a, originalRules: e || [], indexedRules: Object.create(null), mergedRules: Object.create(null), events: {}, aliases: (r = l, JSON.parse(JSON.stringify(r))) }, this.update(e); }e.addAlias = function (e, t) { if (e === 'manage' || o('manage', t)) throw new Error('Cannot add alias for "manage" action because it represents any action'); if (o(e, t)) throw new Error(`Attempt to alias action to itself: ${e} -> ${t.toString()}`); return l[e] = t, this; }; let t; let r; let n; const i = e.prototype; return i.update = function (e) { if (Array.isArray(e)) { const t = { rules: e, ability: this }; this.emit('update', t), this[d].originalRules = Object.freeze(e.slice(0)), this[d].indexedRules = this.buildIndexFor(e), this[d].mergedRules = Object.create(null), this.emit('updated', t); } return this; }, i.buildIndexFor = function (e) { for (var t = Object.create(null), r = this[d].RuleType, n = 0; n < e.length; n++) for (let i = new r(e[n]), s = this.expandActions(i.actions), o = h(i.subject), a = e.length - n - 1, u = 0; u < o.length; u++) { const c = o[u]; t[c] = t[c] || Object.create(null); for (let l = 0; l < s.length; l++) { const f = s[l]; t[c][f] = t[c][f] || Object.create(null), t[c][f][a] = i; } } return t; }, i.expandActions = function (e) { for (var t = this[d].aliases, r = h(e), n = 0; n < r.length;) { const i = r[n++]; t.hasOwnProperty(i) && (r = r.concat(t[i])); } return r; }, i.can = function (e, t, r) { let n; let i = t; Array.isArray(t) && (i = t[0], n = t[1]); const s = this.relevantRuleFor(e, i, r, n); return !!s && !s.inverted; }, i.relevantRuleFor = function (e, t, r, n) { for (let i = this.rulesFor(e, t, r, n), s = 0; s < i.length; s++) if (i[s].matches(t)) return i[s]; return null; }, i.possibleRulesFor = function (e, t, r) { const n = r || this[d].subjectName(t); const i = this[d].mergedRules; const s = `${n}_${e}`; return i[s] || (i[s] = this.mergeRulesFor(e, n)), i[s]; }, i.mergeRulesFor = function (n, e) { const i = this[d].indexedRules; return [e, 'all'].reduce((e, t) => { const r = i[t]; return r ? Object.assign(e, r[n], r.manage) : e; }, []).filter(Boolean); }, i.rulesFor = function (e, t, r, n) { return this.possibleRulesFor(e, t, n).filter(e => e.isRelevantFor(t, r)); }, i.cannot = function () { return !this.can.apply(this, arguments); }, i.throwUnlessCan = function (e, t, r) { let n; let i = t; Array.isArray(t) && (i = t[0], n = t[1]); const s = this.relevantRuleFor(e, i, r, n); if (!s || s.inverted) { const o = n || this[d].subjectName(i); throw new a(s ? s.reason : null, { action: e, subjectName: o, subject: i, field: r }); } }, i.on = function (t, r) { const n = this[d].events; let i = !0; return n[t] || (n[t] = []), n[t].push(r), function () { if (i) { const e = n[t].indexOf(r); n[t].splice(e, 1), i = !1; } }; }, i.emit = function (e, t) { const r = this[d].events[e]; r && r.slice(0).forEach(e => e(t)); }, t = e, (r = [{ key: 'rules', get() { return this[d].originalRules; } }]) && s(t.prototype, r), n && s(t, n), e; }()); function p(e) { return ![].concat(e).some(e => typeof e !== 'string'); } function v(e) { return e && typeof e === 'object'; } const y = (function () { function e(e) { this.rule = e; } return e.prototype.because = function (e) { return this.rule.reason = e, this; }, e; }()); const t = (function () { function e(e) { const t = (void 0 === e ? {} : e).subjectName; const r = void 0 === t ? u : t; this.rules = [], this.subjectName = r; }e.define = function (e, t) { const r = typeof e === 'function' ? {} : e; const n = e === r ? t : e; const i = new this(r); const s = n(i.can.bind(i), i.cannot.bind(i)); const o = function () { return new f(i.rules, r); }; return s && typeof s.then === 'function' ? s.then(o) : o(); }, e.extract = function () { const e = new this(); return { can: e.can.bind(e), cannot: e.cannot.bind(e), rules: e.rules }; }; const t = e.prototype; return t.can = function (e, t, r, n, i) { if (!p(e)) throw new TypeError('AbilityBuilder#can expects the first parameter to be an action or array of actions'); const s = [].concat(t).map(this.subjectName); if (!p(s)) throw new TypeError('AbilityBuilder#can expects the second argument to be a subject name/type or an array of subject names/types'); const o = { actions: e, subject: s }; return r instanceof Function || Array.isArray(r) && r[0] instanceof Function ? o.scope = r : (i = n, n = r), (Array.isArray(n) || typeof n === 'string') && (o.fields = n), (v(i) || !o.fields && v(n)) && (o.conditions = i || n), this.rules.push(o), new y(o); }, t.cannot = function () { const e = this.can.apply(this, arguments); return e.rule.inverted = !0, e; }, e; }()); e.Ability = f, e.Rule = c, e.RuleBuilder = y, e.AbilityBuilder = t, e.ForbiddenError = a, Object.defineProperty(e, '__esModule', { value: !0 });
}));
