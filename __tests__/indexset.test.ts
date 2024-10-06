import { test, expect, assert } from 'vitest'
import { IndexSet } from '../src/index';

test('difference', () => {
    const s1 = new IndexSet([1, 2, 3, 4])
    const s2 = new IndexSet([3, 4, 5, 6])
    expect(s1.difference(s2).collect()).toEqual([1, 2]);
    expect(s2.difference(s1).collect()).toEqual([5, 6]);

    expect(s1.symmetric_difference(s2).collect()).toEqual([1, 2, 5, 6])
})

test('union', () => {
    const s1 = new IndexSet([1, 2, 3, 4])
    const s2 = new IndexSet([3, 4, 5, 6])
    const s3 = new IndexSet(s1.union(s2));
    // expect(s3.values().collect()).toEqual([3, 4]);
})

test('iter', () => {
    const set = new IndexSet();
    const other = new IndexSet()
})

test('indexset', () => {

    let s1 = new IndexSet<number>()
    let s2 = new IndexSet<number>();

    s1.insert(0);
    s1.insert(1);

    s2.insert(4)
    s2.insert(5)

    s1.append(s2);

    expect(s1.values().collect()).toEqual([0, 1, 4, 5]);
    expect(s2.values().collect()).toEqual([]);

    s1 = new IndexSet([1, 2, 3, 4])
    s2 = new IndexSet([3, 4, 5, 6])
    const diff = s1.difference(s2)
})

test('is_subset_superset', () => {
    const a = new IndexSet();
    const b = new IndexSet();

    a.insert(1)
    a.insert(2)
    a.insert(3)

    assert(a.is_superset(b))
    assert(b.is_subset(a))

    b.insert(1)
    assert(b.is_subset(a))
    b.insert(2)
    assert(b.is_subset(a))
    b.insert(3)
    assert(b.is_subset(a))

    assert(a.is_superset(b) === b.is_superset(a))
    b.insert(4);
    assert(!a.is_superset(b))
    assert(b.is_superset(a))
    assert(!b.is_subset(a) === a.is_subset(b))
})

test('is_disjoint', () => {
    const a = new IndexSet();
    const b = new IndexSet();
    a.insert(1);
    a.insert(2);
    a.insert(3);

    assert(a.is_disjoint(b))
    b.insert(1);
    assert(!a.is_disjoint(b))
    a.remove(1);
    assert(a.is_disjoint(b))
    b.insert(2);
    assert(!a.is_disjoint(b))
})
