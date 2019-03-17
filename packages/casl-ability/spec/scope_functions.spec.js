import { AbilityBuilder } from '../src';
import { Post } from './spec_helper';

/* eslint-disable no-undef */

class Should {
  constructor(b) {
    this.should = b;
  }
}

describe('SubjectTag', () => {
  let ability;
  const shouldFcn = (subject, rule) => {
    if (!rule) throw new Error('expect rule to be defined');
    if (!subject) throw new Error('expect subject to be defined');
    return (subject.should === true);
  };
  it('supports scope functions', () => {
    ability = AbilityBuilder.define((can, cannot) => {
      can('manage', 'Should', shouldFcn);
      cannot('delete', 'Should', shouldFcn);
    });
    const shouldInstance = new Should(true);
    const shouldNotInstance = new Should(false);
    expect(ability).to.allow('create', shouldInstance);
    expect(ability).not.to.allow('delete', shouldInstance);
    expect(ability).not.to.allow('create', shouldNotInstance);
  });
  it('supports arrayed scope functions', () => {
    const containsFoo = subject => subject.a === 'foo';
    const containsBar = subject => subject.b === 'bar';
    ability = AbilityBuilder.define((can) => {
      can('manage', 'Post', [containsFoo, containsBar]);
    });
    const good = new Post({ a: 'foo', b: 'bar' });
    const bad = new Post({ a: 'foo', b: 'bad' });
    expect(ability).to.allow('create', good);
    expect(ability).not.to.allow('create', bad);
  });
});
