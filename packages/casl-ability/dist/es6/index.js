import sift from 'sift';

function ForbiddenError(message, options = {}) {
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

class Rule {
  constructor(params) {
    this.actions = params.actions || params.action;
    this.subject = params.subject;
    this.fields = !params.fields || params.fields.length === 0 ? undefined : wrapArray(params.fields);
    this.inverted = !!params.inverted;
    this.conditions = params.conditions;
    this._matches = this.conditions ? sift(this.conditions) : undefined;
    this.reason = params.reason;
    this.scope = params.scope;
  }

  matches(object) {
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
  }

  isRelevantFor(object, field) {
    if (!this.fields) {
      return true;
    }

    if (!field) {
      return !this.inverted;
    }

    return this.fields.indexOf(field) !== -1;
  }
}

const PRIVATE_FIELD = typeof Symbol !== 'undefined' ? Symbol('private') : `__${Date.now()}`;
const DEFAULT_ALIASES = {
  crud: ['create', 'read', 'update', 'delete']
};

function hasAction(action, actions) {
  return action === actions || Array.isArray(actions) && actions.indexOf(action) !== -1;
}

class Ability {
  static addAlias(alias, actions) {
    if (alias === 'manage' || hasAction('manage', actions)) {
      throw new Error('Cannot add alias for "manage" action because it represents any action');
    }

    if (hasAction(alias, actions)) {
      throw new Error(`Attempt to alias action to itself: ${alias} -> ${actions.toString()}`);
    }

    DEFAULT_ALIASES[alias] = actions;
    return this;
  }

  constructor(rules, { RuleType = Rule,
    subjectName = getSubjectName } = {}) {
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

  update(rules) {
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
  }

  buildIndexFor(rules) {
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
  }

  expandActions(rawActions) {
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
  }

  get rules() {
    return this[PRIVATE_FIELD].originalRules;
  } // A subject might be an object (not a class) and not be otherwise identifiable
  // via a custom subjectName() function.  In that case, you can pass an array for the
  // subject: [ subject, 'SubjectName' ].


  can(action, subject, field) {
    let subjectName;
    let subjectParam = subject;

    if (Array.isArray(subject)) {
      [subjectParam, subjectName] = subject;
    }

    const rule = this.relevantRuleFor(action, subjectParam, field, subjectName);
    return !!rule && !rule.inverted;
  }

  relevantRuleFor(action, subject, field, subjectName) {
    const rules = this.rulesFor(action, subject, field, subjectName);

    for (let i = 0; i < rules.length; i++) {
      if (rules[i].matches(subject)) {
        return rules[i];
      }
    }

    return null;
  }

  possibleRulesFor(action, subject, _subjectName) {
    const subjectName = _subjectName || this[PRIVATE_FIELD].subjectName(subject);

    const { mergedRules } = this[PRIVATE_FIELD];
    const key = `${subjectName}_${action}`;

    if (!mergedRules[key]) {
      mergedRules[key] = this.mergeRulesFor(action, subjectName);
    }

    return mergedRules[key];
  }

  mergeRulesFor(action, subjectName) {
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
  }

  rulesFor(action, subject, field, subjectName) {
    // TODO: skip `isRelevantFor` method calls if there are not fields in rules
    return this.possibleRulesFor(action, subject, subjectName).filter(rule => rule.isRelevantFor(subject, field));
  }

  cannot(...args) {
    return !this.can(...args);
  }

  throwUnlessCan(action, subject, field) {
    let subjectTag;
    let subjectParam = subject;

    if (Array.isArray(subject)) {
      [subjectParam, subjectTag] = subject;
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
  }

  on(event, handler) {
    const { events } = this[PRIVATE_FIELD];
    let isAttached = true;

    if (!events[event]) {
      events[event] = [];
    }

    events[event].push(handler);
    return () => {
      if (isAttached) {
        const index = events[event].indexOf(handler);
        events[event].splice(index, 1);
        isAttached = false;
      }
    };
  }

  emit(event, payload) {
    const handlers = this[PRIVATE_FIELD].events[event];

    if (handlers) {
      handlers.slice(0).forEach(handler => handler(payload));
    }
  }
}

function isStringOrNonEmptyArray(value) {
  return ![].concat(value).some(item => typeof item !== 'string');
}

function isObject(value) {
  return value && typeof value === 'object';
}

class RuleBuilder {
  constructor(rule) {
    this.rule = rule;
  }

  because(reason) {
    this.rule.reason = reason;
    return this;
  }
}
class AbilityBuilder {
  static define(params, dsl) {
    const options = typeof params === 'function' ? {} : params;
    const define = params === options ? dsl : params;
    const builder = new this(options);
    const result = define(builder.can.bind(builder), builder.cannot.bind(builder));

    const buildAbility = () => new Ability(builder.rules, options);

    return result && typeof result.then === 'function' ? result.then(buildAbility) : buildAbility();
  }

  static extract() {
    const builder = new this();
    return {
      can: builder.can.bind(builder),
      cannot: builder.cannot.bind(builder),
      rules: builder.rules
    };
  }

  constructor({ subjectName = getSubjectName } = {}) {
    this.rules = [];
    this.subjectName = subjectName;
  }

  can(actions, subject, scopeOrConditionsOrFields, conditionsOrFields, conditions) {
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
  }

  cannot(...args) {
    const builder = this.can(...args);
    builder.rule.inverted = true;
    return builder;
  }
}

export { Ability, Rule, RuleBuilder, AbilityBuilder, ForbiddenError };
