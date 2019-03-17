import { rulesToQuery, permittedFieldsOf } from '@casl/ability/extra';

function convertToMongoQuery(rule) {
  return rule.inverted ? {
    $nor: [rule.conditions]
  } : rule.conditions;
}

function toMongoQuery(ability, subject, action = 'read') {
  return rulesToQuery(ability, action, subject, convertToMongoQuery);
}

function emptyQuery(query) {
  const originalExec = query.exec;
  query.where({
    __forbiddenByCasl__: 1
  });

  query.exec = function exec(operation, callback) {
    const op = typeof operation === 'string' ? operation : this.op;
    const cb = typeof operation === 'function' ? operation : callback;
    let value;

    if (op.indexOf('findOne') === 0) {
      value = null;
    } else if (op.indexOf('find') === 0) {
      value = [];
    } else if (op === 'count') {
      value = 0;
    } else {
      return originalExec.call(this, operation, callback);
    }

    return Promise.resolve(value).then((v) => {
      if (typeof cb === 'function') {
        cb(null, v);
      }

      return v;
    });
  };

  return query;
}

function accessibleBy(ability, action) {
  const query = toMongoQuery(ability, this.modelName || this.model.modelName, action);
  return query === null ? emptyQuery(this.where()) : this.where({
    $and: [query]
  });
}

function accessibleRecordsPlugin(schema) {
  schema.query.accessibleBy = accessibleBy;
  schema.statics.accessibleBy = accessibleBy;
  return schema;
}

function wrapArray(value) {
  return Array.isArray(value) ? value : [value];
}

function deprecate(name, { by: replacementName,
  fn }) {
  return function wrapDeprecated(...args) {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.warn(`"${name}" is deprecated, use "${replacementName}"`);
    }

    return fn.apply(this, args);
  };
}

function fieldsOf(schema, options) {
  const fields = Object.keys(schema.paths);

  if (!options.except) {
    return fields;
  }

  const excludedFields = wrapArray(options.except);
  return fields.filter(field => excludedFields.indexOf(field) === -1);
}

function accessibleFieldsPlugin(schema, options = {}) {
  let fieldsFrom;

  function accessibleFieldsBy(ability, action = 'read') {
    if (!fieldsFrom) {
      const ALL_FIELDS = options.only ? wrapArray(options.only) : fieldsOf(schema, options);

      fieldsFrom = rule => rule.fields || ALL_FIELDS;
    }

    const subject = typeof this === 'function' ? this.modelName : this;
    return permittedFieldsOf(ability, action, subject, {
      fieldsFrom
    });
  }

  const permittedFieldsBy = deprecate('permittedFieldsBy', {
    by: 'accessibleFieldsBy',
    fn: accessibleFieldsBy
  });
  schema.statics.permittedFieldsBy = permittedFieldsBy;
  schema.methods.permittedFieldsBy = permittedFieldsBy;
  schema.statics.accessibleFieldsBy = accessibleFieldsBy;
  schema.methods.accessibleFieldsBy = accessibleFieldsBy;
}
const permittedFieldsPlugin = deprecate('permittedFieldsPlugin', {
  by: 'accessibleFieldsPlugin',
  fn: accessibleFieldsPlugin
});

export { accessibleRecordsPlugin, accessibleFieldsPlugin, permittedFieldsPlugin, toMongoQuery };
