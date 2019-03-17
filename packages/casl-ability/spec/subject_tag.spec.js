import { Ability } from '../src';
import { Post } from './spec_helper';

/* eslint-disable no-undef */

describe('Ability', () => {
  let ability;
  it('allows subject tagging', () => {
    ability = new Ability([
      { actions: 'create', subject: 'Post' },
    ]);
    const post = new Post();
    expect(ability).to.allow('create', 'Post');
    expect(ability).to.allow('create', [{ plain: 'object' }, 'Post']);
    expect(ability).to.allow('create', post);
    expect(ability).not.to.allow('create', { plain: 'object' });
  });
});
