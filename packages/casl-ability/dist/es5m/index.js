import sift from 'sift';

function _defineProperties(target, props) {
  for (let i = 0; i < props.length; i++) {
    const descriptor = props[i];
    descriptor.enumerable = descriptor.enumerable || false;
    descriptor.configurable = true;
    if ('value' in descriptor) descriptor.writable = true;
    Object.defineProperty(target, descriptor.key, descriptor);
  }
}

function _createClass(Constructor, protoProps, staticProps) {
  if (protoProps) _defineProperties(Constructor.prototype, protoProps);
  if (staticProps) _defineProperties(Constructor, staticProps);
  return Constructor;
}

function ForbiddenError(message, options) {
  if (options === void 0) {
    options = {};
  }

  Error.call(this);
  this.constructor = ForbiddenError;
  this.subject = options.subject;
  this.subjectName = options.subjectName;
  this.action = options.action;
  this.field = options.field;
  this.message = message || `Cannot execute "${this.action}" on "${this.subjectName}"`;

  if (typeof Error.captureStackTrace === 'function') {
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  } else {
    this.stack = new Error(this.message).stack;
  }
}
ForbiddenError.prototype = Object.create(Error.prototype);

function wrapArray(value) {
  return Array.isArray(value) ? value : [value];
}
function getSubjectName(subject) {
  if (!subject || typeof subject === 'string') {
    return subject;
  }

  const Type = typeof subject === 'object' ? subject.constructor : subject;
  return Type.modelName || Type.name;
}
function clone(object) {
  return JSON.parse(JSON.stringify(object));
}

const Rule =
/* #__PURE__ */
(function () {
  function Rule(params) {
    this.actions = params.actions || params.action;
    this.subject = params.subject;
    this.fields = !params.fields || params.fields.length === 0 ? undefined : wrapArray(params.fields);
    this.inverted = !!params.inverted;
    this.conditions = params.conditions;
    this._matches = this.conditions ? sift(this.conditions) : undefined;
    this.reason = params.reason;
    this.scope = params.scope;
  }

  const _proto = Rule.prototype;

  _proto.matches = function matches(object) {
    let scope = true;

    if (typeof object !== 'string') {
      if (this.scope) {
        if (Array.isArray(this.scope)) {
          for (let i = 0; i < this.scope.length; i++) {
            const res = this.scope[i](object, this);
            if (!res) scope = res;
          }
        } else {
          scope = this.scope(object, this);
        }
      }

      if (scope === false) return !!this.inverted;
    }

    if (!this._matches) {
      return true;
    }

    if (typeof object === 'string') {
      return !this.inverted;
    }

    return this._matches(object);
  };

  _proto.isRelevantFor = function isRelevantFor(object, field) {
    if (!this.fields) {
      return true;
    }

    if (!field) {
      return !this.inverted;
    }

    return this.fields.indexOf(field) !== -1;
  };

  return Rule;
}());

const PRIVATE_FIELD = typeof Symbol !== 'undefined' ? Symbol('private') : `__${Date.now()}`;
const DEFAULT_ALIASES = {
  crud: ['create', 'read', 'update', 'delete']
};

function hasAction(action, actions) {
  return action === actions || Array.isArray(actions) && actions.indexOf(action) !== -1;
}

const Ability =
/* #__PURE__ */
(function () {
  Ability.addAlias = function addAlias(alias, actions) {
    if (alias === 'manage' || hasAction('manage', actions)) {
      throw new Error('Cannot add alias for "manage" action because it represents any action');
    }

    if (hasAction(alias, actions)) {
      throw new Error(`Attempt to alias action to itself: ${alias} -> ${actions.toString()}`);
    }

    DEFAULT_ALIASES[alias] = actions;
    return this;
  };

  function Ability(rules, _temp) {
    const _ref = _temp === void 0 ? {} : _temp;
    const _ref$RuleType = _ref.RuleType;
    const RuleType = _ref$RuleType === void 0 ? Rule : _ref$RuleType;
    const _ref$subjectName = _ref.subjectName;
    const subjectName = _ref$subjectName === void 0 ? getSubjectName : _ref$subjectName;

    this[PRIVATE_FIELD] = {
      RuleType,
      subjectName,
      originalRules: rules || [],
      indexedRules: Object.create(null),
      mergedRules: Object.create(null),
      events: {},
      aliases: clone(DEFAULT_ALIASES)
    };
    this.update(rules);
  }

  const _proto = Ability.prototype;

  _proto.update = function update(rules) {
    if (Array.isArray(rules)) {
      const payload = {
        rules,
        ability: this
      };
      this.emit('update', payload);
      this[PRIVATE_FIELD].originalRules = Object.freeze(rules.slice(0));
      this[PRIVATE_FIELD].indexedRules = this.buildIndexFor(rules);
      this[PRIVATE_FIELD].mergedRules = Object.create(null);
      this.emit('updated', payload);
    }

    return this;
  };

  _proto.buildIndexFor = function buildIndexFor(rules) {
    const indexedRules = Object.create(null);
    const { RuleType } = this[PRIVATE_FIELD];

    for (let i = 0; i < rules.length; i++) {
      const rule = new RuleType(rules[i]);
      const actions = this.expandActions(rule.actions);
      const subjects = wrapArray(rule.subject);
      const priority = rules.length - i - 1;

      for (let k = 0; k < subjects.length; k++) {
        const subject = subjects[k];
        indexedRules[subject] = indexedRules[subject] || Object.create(null);

        for (let j = 0; j < actions.length; j++) {
          const action = actions[j];
          indexedRules[subject][action] = indexedRules[subject][action] || Object.create(null);
          indexedRules[subject][action][priority] = rule;
        }
      }
    }

    return indexedRules;
  };

  _proto.expandActions = function expandActions(rawActions) {
    const { aliases } = this[PRIVATE_FIELD];
    let actions = wrapArray(rawActions);
    let i = 0;

    while (i < actions.length) {
      const action = actions[i++];

      if (aliases.hasOwnProperty(action)) {
        actions = actions.concat(aliases[action]);
      }
    }

    return actions;
  };

  // A subject might be an object (not a class) and not be otherwise identifiable
  // via a custom subjectName() function.  In that case, you can pass an array for the
  // subject: [ subject, 'SubjectName' ].
  _proto.can = function can(action, subject, field) {
    let subjectName;
    let subjectParam = subject;

    if (Array.isArray(subject)) {
      subjectParam = subject[0];
      subjectName = subject[1];
    }

    const rule = this.relevantRuleFor(action, subjectParam, field, subjectName);
    return !!rule && !rule.inverted;
  };

  _proto.relevantRuleFor = function relevantRuleFor(action, subject, field, subjectName) {
    const rules = this.rulesFor(action, subject, field, subjectName);

    for (let i = 0; i < rules.length; i++) {
      if (rules[i].matches(subject)) {
        return rules[i];
      }
    }

    return null;
  };

  _proto.possibleRulesFor = function possibleRulesFor(action, subject, _subjectName) {
    const subjectName = _subjectName || this[PRIVATE_FIELD].subjectName(subject);

    const { mergedRules } = this[PRIVATE_FIELD];
    const key = `${subjectName}_${action}`;

    if (!mergedRules[key]) {
      mergedRules[key] = this.mergeRulesFor(action, subjectName);
    }

    return mergedRules[key];
  };

  _proto.mergeRulesFor = function mergeRulesFor(action, subjectName) {
    const { indexedRules } = this[PRIVATE_FIELD];
    const mergedRules = [subjectName, 'all'].reduce((rules, subjectType) => {
      const subjectRules = indexedRules[subjectType];

      if (!subjectRules) {
        return rules;
      }

      return Object.assign(rules, subjectRules[action], subjectRules.manage);
    }, []); // TODO: think whether there is a better to way to prioritize rules
    // or convert sparse array to regular one

    return mergedRules.filter(Boolean);
  };

  _proto.rulesFor = function rulesFor(action, subject, field, subjectName) {
    // TODO: skip `isRelevantFor` method calls if there are not fields in rules
    return this.possibleRulesFor(action, subject, subjectName).filter(rule => rule.isRelevantFor(subject, field));
  };

  _proto.cannot = function cannot() {
    return !this.can.apply(this, arguments);
  };

  _proto.throwUnlessCan = function throwUnlessCan(action, subject, field) {
    let subjectTag;
    let subjectParam = subject;

    if (Array.isArray(subject)) {
      subjectParam = subject[0];
      subjectTag = subject[1];
    }

    const rule = this.relevantRuleFor(action, subjectParam, field, subjectTag);

    if (!rule || rule.inverted) {
      const subjectName = subjectTag || this[PRIVATE_FIELD].subjectName(subjectParam);
      throw new ForbiddenError(rule ? rule.reason : null, {
        action,
        subjectName,
        subject: subjectParam,
        field
      });
    }
  };

  _proto.on = function on(event, handler) {
    const { events } = this[PRIVATE_FIELD];
    let isAttached = true;

    if (!events[event]) {
      events[event] = [];
    }

    events[event].push(handler);
    return function () {
      if (isAttached) {
        const index = events[event].indexOf(handler);
        events[event].splice(index, 1);
        isAttached = false;
      }
    };
  };

  _proto.emit = function emit(event, payload) {
    const handlers = this[PRIVATE_FIELD].events[event];

    if (handlers) {
      handlers.slice(0).forEach(handler => handler(payload));
    }
  };

  _createClass(Ability, [{
    key: 'rules',
    get: function get() {
      return this[PRIVATE_FIELD].originalRules;
    }
  }]);

  return Ability;
}());

function isStringOrNonEmptyArray(value) {
  return ![].concat(value).some(item => typeof item !== 'string');
}

function isObject(value) {
  return value && typeof value === 'object';
}

const RuleBuilder =
/* #__PURE__ */
(function () {
  function RuleBuilder(rule) {
    this.rule = rule;
  }

  const _proto = RuleBuilder.prototype;

  _proto.because = function because(reason) {
    this.rule.reason = reason;
    return this;
  };

  return RuleBuilder;
}());
const AbilityBuilder =
/* #__PURE__ */
(function () {
  AbilityBuilder.define = function define(params, dsl) {
    const options = typeof params === 'function' ? {} : params;
    const define = params === options ? dsl : params;
    const builder = new this(options);
    const result = define(builder.can.bind(builder), builder.cannot.bind(builder));

    const buildAbility = function buildAbility() {
      return new Ability(builder.rules, options);
    };

    return result && typeof result.then === 'function' ? result.then(buildAbility) : buildAbility();
  };

  AbilityBuilder.extract = function extract() {
    const builder = new this();
    return {
      can: builder.can.bind(builder),
      cannot: builder.cannot.bind(builder),
      rules: builder.rules
    };
  };

  function AbilityBuilder(_temp) {
    const _ref = _temp === void 0 ? {} : _temp;
    const _ref$subjectName = _ref.subjectName;
    const subjectName = _ref$subjectName === void 0 ? getSubjectName : _ref$subjectName;

    this.rules = [];
    this.subjectName = subjectName;
  }

  const _proto2 = AbilityBuilder.prototype;

  _proto2.can = function can(actions, subject, scopeOrConditionsOrFields, conditionsOrFields, conditions) {
    if (!isStringOrNonEmptyArray(actions)) {
      throw new TypeError('AbilityBuilder#can expects the first parameter to be an action or array of actions');
    }

    const subjectName = [].concat(subject).map(this.subjectName);

    if (!isStringOrNonEmptyArray(subjectName)) {
      throw new TypeError('AbilityBuilder#can expects the second argument to be a subject name/type or an array of subject names/types');
    }

    const rule = {
      actions,
      subject: subjectName
    };

    if (scopeOrConditionsOrFields instanceof Function || Array.isArray(scopeOrConditionsOrFields) && scopeOrConditionsOrFields[0] instanceof Function) {
      rule.scope = scopeOrConditionsOrFields;
    } else {
      /* eslint-disable-next-line no-param-reassign */
      conditions = conditionsOrFields;
      /* eslint-disable-next-line no-param-reassign */

      conditionsOrFields = scopeOrConditionsOrFields;
    }

    if (Array.isArray(conditionsOrFields) || typeof conditionsOrFields === 'string') {
      rule.fields = conditionsOrFields;
    }

    if (isObject(conditions) || !rule.fields && isObject(conditionsOrFields)) {
      rule.conditions = conditions || conditionsOrFields;
    }

    this.rules.push(rule);
    return new RuleBuilder(rule);
  };

  _proto2.cannot = function cannot() {
    const builder = this.can.apply(this, arguments);
    builder.rule.inverted = true;
    return builder;
  };

  return AbilityBuilder;
}());

export { Ability, Rule, RuleBuilder, AbilityBuilder, ForbiddenError };
