import { test, expect, assert } from 'vitest'
import { IndexMap } from '../src';
import { is_some } from 'joshkaposh-option';
import { iter, range } from 'joshkaposh-iterator';

function fill_str(str: string, len: number, start = 0) {
    return Array.from({ length: len }, (_, i) => `${str}-${start + i + 1}`);
}

function insert(map: IndexMap<string, string>, k: number, v: number) {
    map.insert(`key-${k}`, `value-${v}`);
}

test('retain', () => {
    const map = new IndexMap<number, number>();

    for (const v of range(0, 5)) {
        map.insert(v, v + 1);
    }
    assert(map.len() === 5)

    map.retain((k) => k % 2 === 0);
    assert(map.len() === 3)
})

test('sort', () => {
    const expected = [[0, 1], [1, 1], [2, 1], [5, 4]]
    const s = new IndexMap([[1, 1], [0, 1], [5, 4], [2, 1]]);

    s.sort_keys();
    expect(s.as_array()).toEqual(expected);
    s.sort_by((k1, v1, k2, v2) => {
        if (k1 < k2) {
            return 1
        } else if (k1 === k2) {
            return 0
        } else {
            return -1
        }
    })
    expect(s.as_array()).toEqual(iter(expected).rev().collect());
    assert(s.is_sorted())
})

test('get_range', () => {
    const m = new IndexMap<string, string>()

    range(1, 11).for_each(i => insert(m, i, i));

    assert(m.len() === 10);

    let r = m.get_range(range(0, 5));
    expect(r.collect()).toEqual(fill_str('value', 5, 0))
    r = m.get_range(range(5, 10));
    expect(r.collect()).toEqual(fill_str('value', 5, 5));
    r = m.get_range(range(3, 7));
    expect(r.collect()).toEqual(fill_str('value', 4, 3));

})

test('insert / shift_remove', () => {
    const m = new IndexMap<number, boolean>()

    m.insert(0, true);
    assert(m.contains_key(0));
    assert(m.get(0) === true);
    assert(m.get_index(0) === true);
    m.insert(0, false);
    assert(m.contains_key(0));
    assert(m.get(0) === false);
    assert(m.get_index(0) === false);
    m.insert(1, true);
    m.insert(2, true);
    m.insert(3, true);
    assert(m.len() === 4);

    expect(m.get_full(0)).toEqual([0, 0, false]);
    expect(m.get_full(1)).toEqual([1, 1, true]);
    expect(m.get_full(2)).toEqual([2, 2, true]);
    expect(m.get_full(3)).toEqual([3, 3, true]);
    // remove second last
    assert(is_some(m.shift_remove(2)));
    expect(m.get_full(0)).toEqual([0, 0, false]);
    expect(m.get_full(1)).toEqual([1, 1, true]);
    expect(m.get_full(3)).toEqual([2, 3, true]);
    assert(is_some(m.shift_remove(0)))
    expect(m.get_full(1)).toEqual([0, 1, true]);
    expect(m.get_full(3)).toEqual([1, 3, true]);
})

test('reverse', () => {
    const arr = Array.from({ length: 5 }, (_, i) => [`key-${i + 1}`, `value-${i + 1}`] as const);
    const m = new IndexMap<`key-${number}`, `value-${number}`>();
    for (const [k, v] of arr) {
        m.insert(k, v);
    }

    for (let i = 0; i < 5; i++) {
        assert(m.get(`key-${i + 1}`) === `value-${i + 1}`);
    }

    assert(m.first() === 'value-1')
    assert(m.last() === 'value-5')
    m.reverse();
    assert(m.first() === 'value-5')
    assert(m.last() === 'value-1')
})

test('truncate', () => {
    const m = new IndexMap<number, number>()

    m.insert(0, 0)
    m.insert(1, 1)
    m.insert(2, 2)
    m.insert(3, 3)
    m.insert(4, 4)
    m.insert(5, 5)

    assert(m.last() === 5);
    assert(m.len() === 6)
    m.truncate(3);
    assert(m.last() === 2);
    assert(m.len() === 3);
})

test('split_off', () => {
    const m = new IndexMap();

    m.insert(0, 'kept1');
    m.insert(1, 'kept2');
    m.insert(2, 'kept3');

    m.insert(3, 'taken1');
    m.insert(4, 'taken2');
    m.insert(5, 'taken3');

    const taken = m.split_off(3);
    assert(m.len() === 3 && taken.len() === 3);
    assert(taken.first() === 'taken1');
    assert(m.last() === 'kept3');
})

test('swap_indices', () => {
    const m = new IndexMap<string, string>()
    m.insert('k1', 'v1');
    m.insert('k2', 'v2');
    m.insert('k3', 'v3');
    m.swap_indices(0, 2);

    assert(m.first() === 'v3');
    assert(m.last() === 'v1');
})

test('move_index', () => {
    const m = new IndexMap<string, string>()
    m.insert('k1', 'v1');
    m.insert('k2', 'v2');
    m.insert('k3', 'v3');
    m.insert('k4', 'v4');

    m.move_index(0, 3);
    /**
     * [k1, v1] [v2, v2] [k3, v3] [k4, v4]
     * [k2, v2] [v1, v1] [k3, v3] [k4, v4]
     * [k2, v2] [v3, v3] [k1, v1] [k4, v4]
     * [k2, v2] [v3, v3] [k4, v4] [k1, v1]
     */
    expect([...m.values()]).toEqual(['v2', 'v3', 'v4', 'v1']);
})

test('shift_insert', () => {
    const map = new IndexMap<string, null>();
    const chars = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z']
    chars.forEach((c) => {
        map.insert(c, null);
    })

    assert(map.get_index_of('*') === undefined);
    map.shift_insert(10, '*', null);
    assert(map.get_index_of('*') === 10);

    map.shift_insert(10, 'a', null);
    assert(map.get_index_of('a') === 10);
    assert(map.get_index_of('*') === 9);

    map.shift_insert(9, 'z', null);
    assert(map.get_index_of('z') === 9);
    assert(map.get_index_of('*') === 10);

    assert(map.len() === 27);
    map.shift_insert(map.len() - 1, '*', null)
    assert(map.get_index_of('*') === 26);
    map.shift_insert(map.len(), '+', null) === null;
    assert(map.get_index_of('+') === 27);
    assert(map.len() === 28);
})

test('shift_remove', () => {
    const map = new IndexMap();
    map.insert('A', null)
    map.insert('B', null)
    map.insert('C', null)
    map.insert('D', null)
    map.insert('E', null)

    assert(map.get_index_of('C') === 2);
    map.shift_remove('C');
    assert(map.get_index_of('D') === 2);
    assert(map.get_index_of('E') === 3);
})

test('swap_remove', () => {
    const map = new IndexMap();

    map.insert('A', null)
    map.insert('B', null)
    map.insert('C', null)
    map.insert('D', null)
    map.insert('E', null)
    map.swap_remove('A');
    assert(map.get_index_of('E') === 0);
})

test('drain', () => {
    const map = new IndexMap();
    map.insert('A', null)
    map.insert('B', null)
    map.insert('C', null)
    map.insert('D', null)
    map.insert('E', null)

    assert(map.drain(range(0, map.len())).count() === 5)
    assert(map.len() === 0);
})

test('splice', () => {
    const map = new IndexMap<number, any>();
    const count = 10

    for (let i = 1; i <= count; i++) {
        map.insert(i, null)
    }

    let removed = map.splice(range(0, count), map.as_array().reverse())
    let i = -1
    let expected = count + 1;
    for (const [k] of removed) {
        i++;
        expected--;
        assert(i + 1 === k)
        assert(map.get_index_entry(i)![0] === expected)
    }
})