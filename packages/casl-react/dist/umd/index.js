(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('react'), require('prop-types'), require('@casl/ability'))
    : typeof define === 'function' && define.amd ? define(['exports', 'react', 'prop-types', '@casl/ability'], factory)
      : (global = global || self, factory((global.casl = global.casl || {}, global.casl.react = {}), global.React, global.React.PropTypes, global.casl));
}(this, (exports, React, PropTypes, ability) => {
  const React__default = 'default' in React ? React.default : React;
  PropTypes = PropTypes && PropTypes.hasOwnProperty('default') ? PropTypes.default : PropTypes;

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

  function _defineProperty(obj, key, value) {
    if (key in obj) {
      Object.defineProperty(obj, key, {
        value,
        enumerable: true,
        configurable: true,
        writable: true
      });
    } else {
      obj[key] = value;
    }

    return obj;
  }

  function _inheritsLoose(subClass, superClass) {
    subClass.prototype = Object.create(superClass.prototype);
    subClass.prototype.constructor = subClass;
    subClass.__proto__ = superClass;
  }

  const noop = function noop() {};

  const _renderChildren = React.Fragment ? function (children) {
    return React.createElement.apply(null, [React.Fragment, null].concat(children));
  } : React__default.Children.only;

  let propTypes = {};

  if (process.env.NODE_ENV !== 'production') {
    const REQUIRED_OBJECT_OR_STRING = PropTypes.oneOfType([PropTypes.object, PropTypes.string]).isRequired;

    const alias = function alias(names, validate) {
      return function (props) {
        // eslint-disable-line
        if (!names.split(' ').some(name => props[name])) {
          for (var _len = arguments.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
            args[_key - 1] = arguments[_key];
          }

          return validate.apply(void 0, [props].concat(args));
        }
      };
    };

    propTypes = {
      I: alias('do', PropTypes.string.isRequired),
      a: alias('on this of an', REQUIRED_OBJECT_OR_STRING),
      an: alias('on this of a', REQUIRED_OBJECT_OR_STRING),
      of: alias('on a this an', REQUIRED_OBJECT_OR_STRING),
      this: alias('on a of an', REQUIRED_OBJECT_OR_STRING),
      do: alias('I', PropTypes.string.isRequired),
      on: alias('this a of an', REQUIRED_OBJECT_OR_STRING),
      not: PropTypes.bool,
      passThrough: PropTypes.bool,
      children: PropTypes.any.isRequired,
      ability: PropTypes.instanceOf(ability.Ability).isRequired
    };
  }

  const Can =
  /* #__PURE__ */
  (function (_PureComponent) {
    _inheritsLoose(Can, _PureComponent);

    function Can() {
      let _this;

      for (var _len2 = arguments.length, args = new Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
        args[_key2] = arguments[_key2];
      }

      _this = _PureComponent.call.apply(_PureComponent, [this].concat(args)) || this;
      _this.unsubscribeFromAbility = noop;
      _this._isAllowed = false;
      _this._ability = null;
      return _this;
    }

    const _proto = Can.prototype;

    _proto.componentWillUnmount = function componentWillUnmount() {
      this.unsubscribeFromAbility();
    };

    _proto.connectToAbility = function connectToAbility(ability) {
      const _this2 = this;

      if (ability === this._ability) {
        return;
      }

      this.unsubscribeFromAbility();
      this._ability = null;

      if (ability) {
        this._ability = ability;
        this.unsubscribeFromAbility = ability.on('updated', () => _this2.forceUpdate());
      }
    };

    _proto.isAllowed = function isAllowed() {
      const params = this.props;

      const _split = (params.I || params.do).split(/\s+/);
      const action = _split[0];
      const field = _split[1];

      const subject = params.of || params.a || params.this || params.on;
      const can = params.not ? 'cannot' : 'can';
      return params.ability[can](action, subject, field);
    };

    _proto.render = function render() {
      this.connectToAbility(this.props.ability);
      this._isAllowed = this.isAllowed();
      return this.props.passThrough || this._isAllowed ? this.renderChildren() : null;
    };

    _proto.renderChildren = function renderChildren() {
      const _this$props = this.props;
      const { children } = _this$props;
      const { ability } = _this$props;
      const elements = typeof children === 'function' ? children(this._isAllowed, ability) : children;
      return _renderChildren(elements);
    };

    _createClass(Can, [{
      key: 'allowed',
      get: function get() {
        return this._isAllowed;
      }
    }]);

    return Can;
  }(React.PureComponent));

  _defineProperty(Can, 'propTypes', propTypes);

  function createCanBoundTo(ability$1) {
    let _class; let
      _temp;

    return _temp = _class =
    /* #__PURE__ */
    (function (_Can) {
      _inheritsLoose(BoundCan, _Can);

      function BoundCan() {
        return _Can.apply(this, arguments) || this;
      }

      return BoundCan;
    }(Can)), _defineProperty(_class, 'propTypes', Object.assign({}, Can.propTypes, {
      ability: PropTypes.instanceOf(ability.Ability)
    })), _defineProperty(_class, 'defaultProps', {
      ability: ability$1
    }), _temp;
  }
  function createContextualCan(Consumer) {
    return function ContextualCan(props) {
      return React.createElement(Consumer, null, ability => React.createElement(Can, {
        ability: props.ability || ability,
        I: props.I || props.do,
        a: props.on || props.a || props.an || props.of || props.this,
        not: props.not,
        children: props.children,
        passThrough: props.passThrough
      }));
    };
  }

  exports.Can = Can;
  exports.createCanBoundTo = createCanBoundTo;
  exports.createContextualCan = createContextualCan;

  Object.defineProperty(exports, '__esModule', { value: true });
}));
