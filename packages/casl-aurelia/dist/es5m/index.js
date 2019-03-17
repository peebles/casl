import { Ability } from '@casl/ability';
import { signalBindings } from 'aurelia-binding';

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
      this.ability.on('updated', () => signalBindings(ABILITY_CHANGED_SIGNAL));
      this.ability[ABILITY_HAS_SUBSCRIPTION_FIELD] = true;
    }

    return this.ability.can(action, subject, field);
  };

  return CanValueConverter;
}());

_defineProperty(CanValueConverter, 'inject', [Ability]);

_defineProperty(CanValueConverter, '$resource', {
  name: 'can',
  type: 'valueConverter'
});

function configure(config, providedAbility) {
  if (providedAbility && providedAbility instanceof Ability) {
    config.container.registerInstance(Ability, providedAbility);
  }

  config.globalResources([CanValueConverter]);
}

export { configure, CanValueConverter };
