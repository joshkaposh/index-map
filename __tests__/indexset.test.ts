import { test, expect, assert } from 'vitest'
import { IndexSet } from '../src/index';

test('difference', () => {
    const s1 = new IndexSet([1, 2, 3, 4] as number[])
    const s2 = new IndexSet([3, 4, 5, 6] as number[])

    // expect(s1.difference(s2).collect()).toEqual([1, 2]);
    // expect(s2.difference(s1).collect()).toEqual([5, 6]);
    // expect(s1.symmetricDifference(s2).collect()).toEqual([1, 2, 5, 6])
    // expect(s1.union(s2).collect()).toEqual([1, 2, 3, 4, 5, 6]);
})

test('indexset', () => {

    const s1 = new IndexSet<number>()
    const s2 = new IndexSet<number>();

    s1.add(0);
    s1.add(1);

    s2.add(4);
    s2.add(5);

    const s3 = s1.append(s2);

    expect(s1.keys().collect()).toEqual([0, 1]);
    expect(s2.keys().collect()).toEqual([4, 5]);
    expect(s3.keys().collect()).toEqual([0, 1, 4, 5]);
})

test('isSubset_superset', () => {
    const a = new IndexSet();
    const b = new IndexSet();

    a.add(1)
    a.add(2)
    a.add(3)

    assert(a.isSuperset(b))
    assert(b.isSubset(a))

    b.add(1)
    assert(b.isSubset(a))
    b.add(2)
    assert(b.isSubset(a))
    b.add(3)
    assert(b.isSubset(a))

    assert(a.isSuperset(b) === b.isSuperset(a))
    b.add(4);
    assert(!a.isSuperset(b))
    assert(b.isSuperset(a))
    assert(!b.isSubset(a) === a.isSubset(b))
})

test('isDisjoint', () => {
    const a = new IndexSet();
    const b = new IndexSet();
    a.add(1);
    a.add(2);
    a.add(3);

    assert(a.isDisjoint(b))
    b.add(1);
    assert(!a.isDisjoint(b))
    a.delete(1);
    assert(a.isDisjoint(b))
    b.add(2);
    assert(!a.isDisjoint(b))
})

test('retain', () => {
    const set = new IndexSet([1, 2, 3, 4, 5]);
    set.retain(v => v % 2 === 0);
    expect(set.iter().collect()).toEqual([2, 4]);
    assert(set.size === 2);
})
