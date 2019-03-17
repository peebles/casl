function setByPath(object, path, value) {
  let ref = object;
  let lastKey = path;

  if (path.indexOf('.') !== -1) {
    const keys = path.split('.');
    lastKey = keys.pop();
    ref = keys.reduce((res, prop) => {
      res[prop] = res[prop] || {};
      return res[prop];
    }, object);
  }

  ref[lastKey] = value;
}

function rulesToQuery(ability, action, subject, convert) {
  const query = {};
  const ignoreOperators = {};
  const rules = ability.rulesFor(action, subject);

  for (let i = 0; i < rules.length; i++) {
    const rule = rules[i];
    const op = rule.inverted ? '$and' : '$or';

    if (!rule.conditions) {
      if (rule.inverted) {
        return null;
      }

      if (query[op]) {
        delete query[op];
      }

      ignoreOperators[op] = true;
    } else if (!ignoreOperators.hasOwnProperty(op)) {
      query[op] = query[op] || [];
      query[op].push(convert(rule));
    }
  }

  return rules.length > 0 ? query : null;
}
function rulesToFields(ability, action, subject) {
  return ability.rulesFor(action, subject).filter(rule => !rule.inverted && rule.conditions).reduce((values, rule) => Object.keys(rule.conditions).reduce((fields, fieldName) => {
    const value = rule.conditions[fieldName];

    if (!value || value.constructor !== Object) {
      setByPath(fields, fieldName, value);
    }

    return fields;
  }, values), {});
}

const getRuleFields = function getRuleFields(rule) {
  return rule.fields;
};

function permittedFieldsOf(ability, action, subject, options) {
  if (options === void 0) {
    options = {};
  }

  const fieldsFrom = options.fieldsFrom || getRuleFields;
  const uniqueFields = ability.possibleRulesFor(action, subject).slice(0).reverse().filter(rule => rule.matches(subject))
    .reduce((fields, rule) => {
      const names = fieldsFrom(rule);

      if (names) {
        const toggle = rule.inverted ? 'delete' : 'add';
        names.forEach(fields[toggle], fields);
      }

      return fields;
    }, new Set());
  return Array.from(uniqueFields);
}

const joinIfArray = function joinIfArray(value) {
  return Array.isArray(value) ? value.join(',') : value;
};

function packRules(rules) {
  return rules.map((_ref) => {
    const { actions } = _ref;
    const { subject } = _ref;
    const { conditions } = _ref;
    const { inverted } = _ref;
    const { fields } = _ref;
    const { reason } = _ref;
    // eslint-disable-line
    const rule = [joinIfArray(actions), joinIfArray(subject), conditions || 0, inverted ? 1 : 0, joinIfArray(fields) || 0, reason || 0];

    while (!rule[rule.length - 1]) {
      rule.pop();
    }

    return rule;
  });
}
function unpackRules(rules) {
  return rules.map((_ref2) => {
    const actions = _ref2[0];
    const subject = _ref2[1];
    const conditions = _ref2[2];
    const inverted = _ref2[3];
    const fields = _ref2[4];
    const reason = _ref2[5];
    return {
      actions: actions.split(','),
      subject: subject.split(','),
      inverted: !!inverted,
      conditions: conditions || null,
      fields: fields ? fields.split(',') : null,
      reason: reason || null
    };
  });
}

export { rulesToQuery, rulesToFields, permittedFieldsOf, packRules, unpackRules };
