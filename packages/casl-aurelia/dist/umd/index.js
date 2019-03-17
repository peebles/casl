(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('@casl/ability'), require('aurelia-binding'))
    : typeof define === 'function' && define.amd ? define(['exports', '@casl/ability', 'aurelia-binding'], factory)
      : (global = global || self, factory((global.casl = global.casl || {}, global.casl.au = {}), global.casl, global.au));
}(this, (exports, ability, aureliaBinding) => {
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

  const ABILITY_CHANGED_SIGNAL = 'caslAbilityChanged';
  const ABILITY_HAS_SUBSCRIPTION_FIELD = typeof Symbol === 'undefined' ? `__hasAuSubscription${Date.now()}` : Symbol('hasAuSubscription');
  const CanValueConverter =
  /* #__PURE__ */
  (function () {
    function CanValueConverter(ability) {
      _defineProperty(this, 'signals', [ABILITY_CHANGED_SIGNAL]);

      this.ability = ability;
    }

    const _proto = CanValueConverter.prototype;

    _proto.toView = function toView(subject, action, field) {
      if (!this.ability[ABILITY_HAS_SUBSCRIPTION_FIELD]) {
        this.ability.on('updated', () => aureliaBinding.signalBindings(ABILITY_CHANGED_SIGNAL));
        this.ability[ABILITY_HAS_SUBSCRIPTION_FIELD] = true;
      }

      return this.ability.can(action, subject, field);
    };

    return CanValueConverter;
  }());

  _defineProperty(CanValueConverter, 'inject', [ability.Ability]);

  _defineProperty(CanValueConverter, '$resource', {
    name: 'can',
    type: 'valueConverter'
  });

  function configure(config, providedAbility) {
    if (providedAbility && providedAbility instanceof ability.Ability) {
      config.container.registerInstance(ability.Ability, providedAbility);
    }

    config.globalResources([CanValueConverter]);
  }

  exports.configure = configure;
  exports.CanValueConverter = CanValueConverter;

  Object.defineProperty(exports, '__esModule', { value: true });
}));
