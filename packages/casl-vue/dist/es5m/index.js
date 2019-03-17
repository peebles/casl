import { Ability } from '@casl/ability';

const can = {
  name: 'Can',
  functional: true,
  props: {
    I: String,
    do: String,
    a: [String, Function],
    of: [String, Function, Object],
    this: [String, Function, Object],
    on: [String, Function, Object],
    not: Boolean,
    passThrough: Boolean
  },
  render: function render(h, _ref) {
    const { props } = _ref;
    const { children } = _ref;
    const { parent } = _ref;
    const { data } = _ref;

    const _split = (props.I || props.do || '').split(' ');
    const action = _split[0];
    const field = _split[1];

    const subject = props.of || props.a || props.this || props.on;

    if (!action) {
      throw new Error('[Vue Can]: neither `I` nor `do` property exist');
    }

    if (!subject) {
      throw new Error('[Vue Can]: neither `of` nor `a` nor `this` nor `on` property exist');
    }

    const allowed = !!(props.not ^ parent.$can(action, subject, field));

    if (!props.passThrough) {
      return allowed ? children : null;
    }

    if (!data.scopedSlots || !data.scopedSlots.default) {
      throw new Error('[Vue Can]: `passThrough` expects default scoped slot to be specified');
    }

    return data.scopedSlots.default({
      allowed,
      ability: parent.$ability
    });
  }
};

const WATCHER_KEY = typeof Symbol === 'undefined' ? `__w${Date.now()}` : Symbol('vue.watcher');
function abilitiesPlugin(Vue, providedAbility) {
  const defaultAbility = providedAbility || new Ability([]);

  function createWatcherFor(ability) {
    const watcher = new Vue({
      data: {
        rules: []
      }
    });
    ability.on('updated', (event) => {
      watcher.rules = event.rules;
    });
    ability[WATCHER_KEY] = watcher;
    return watcher;
  }

  Object.defineProperty(Vue.prototype, '$ability', {
    writable: true,
    value: defaultAbility
  });
  Vue.mixin({
    beforeCreate: function beforeCreate() {
      const _this$$options = this.$options;
      const { ability } = _this$$options;
      const { parent } = _this$$options;

      if (ability) {
        this.$ability = ability;
      } else if (parent && parent.$ability) {
        this.$ability = parent.$ability;
      }
    },
    methods: {
      $can: function $can() {
        const ability = this.$ability;
        const watcher = ability[WATCHER_KEY] ? ability[WATCHER_KEY] : createWatcherFor(ability); // create rendering dependency
        // eslint-disable-next-line

        watcher.rules = watcher.rules;
        return ability.can.apply(ability, arguments);
      }
    }
  });
}

export { can as Can, abilitiesPlugin };
