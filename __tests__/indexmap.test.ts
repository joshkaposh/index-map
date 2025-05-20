import { test, expect, assert } from 'vitest'
import { IndexMap } from '../src';
import { is_some } from 'joshkaposh-option';
import { iter, range } from 'joshkaposh-iterator';

function fill_str(str: string, len: number, start = 0) {
    return Array.from({ length: len }, (_, i) => `${str}-${start + i + 1}`);
}

function insert(map: IndexMap<string, string>, k: number, v: number) {
    map.set(`key-${k}`, `value-${v}`);
}

class Something {
    #is_system: boolean
    constructor(public index: number, is_system: boolean) {
        this.#is_system = is_system;
    }
    eq(other: Something) {
        return this.index === other.index;
    }

    to_primitive() {
        return `${this.index} ${this.#is_system}`;
    }

    [Symbol.toPrimitive]() {
        return this.to_primitive();
    }
}

test('hasher', () => {
    const m = IndexMap.withHasher<Something, number>((k) => k.to_primitive());
    m.set(new Something(0, true), 0);
    m.set(new Something(0, false), 1000);
    m.set(new Something(1, false), 2);

    assert(m.size === 3);
    assert(m.indexOf(new Something(0, true)) === 0);
    assert(m.indexOf(new Something(0, false)) === 1);
    assert(m.indexOf(new Something(1, false)) === 2);

    assert(m.get(new Something(0, true)) === 0)
    expect(m.set(new Something(0, true), 25)).toEqual(0);
    expect(m.get(new Something(0, true))).toEqual(25);


    assert(-1 < m.indexOf(new Something(0, true)))
    assert(-1 < m.indexOf(new Something(0, false)));
    assert(-1 === m.indexOf(new Something(1, true)));
    assert(-1 < m.indexOf(new Something(1, false)));
})

test('hasher_swap_remove', () => {
    const m = IndexMap.withHasher<Something, string>((k) => {
        return k.to_primitive()
    });
    m.set(new Something(1, true), 'a');
    m.set(new Something(2, true), 'b');
    m.set(new Something(3, true), 'c');
    m.set(new Something(4, true), 'd');

    assert(!!(m.swapRemove(new Something(1, true))));
    expect(m.keys().collect()).toEqual([
        new Something(4, true),
        new Something(2, true),
        new Something(3, true),
    ])

    assert(!!(m.swapRemove(new Something(4, true))));
    expect(m.keys().collect()).toEqual([
        new Something(3, true),
        new Something(2, true),
    ])

    assert(!!(m.swapRemove(new Something(2, true))));
    expect(m.keys().collect()).toEqual([
        new Something(3, true),
    ])


    assert(!!(m.swapRemove(new Something(3, true))));
    expect(m.keys().collect()).toEqual([])

    assert(m.size === 0);
})

class Key {
    value: string;
    constructor(value: string) {
        this.value = value;
    }
    [Symbol.toPrimitive]() {

    }
}

test('from', () => {
    const map = new IndexMap();


})

test('retain', () => {
    const map = new IndexMap<number, number>();

    for (const v of range(0, 5)) {
        map.set(v, v + 1);
    }
    assert(map.size === 5)

    map.retain((k) => k % 2 === 0);
    assert(map.size as number === 3)
})

test('sort', () => {
    const expected = [[0, 1], [1, 1], [2, 1], [5, 4]]
    const s = IndexMap.from([[1, 1], [0, 1], [5, 4], [2, 1]]);

    s.sort();
    expect(s.toArray()).toEqual(expected);
    s.sort((k1, _, k2, __) => {
        if (k1 < k2) {
            return 1
        } else if (k1 === k2) {
            return 0
        } else {
            return -1
        }
    })
    expect(s.toArray()).toEqual(iter(expected).rev().collect());
    assert(s.isSorted())
})

test('get_range', () => {
    const m = new IndexMap<string, string>()

    range(1, 11).for_each(i => insert(m, i, i));

    assert(m.size === 10);

    let r = m.getRange(0, 5);
    expect(r.collect()).toEqual(fill_str('value', 5, 0))
    r = m.getRange(5, 10);
    expect(r.collect()).toEqual(fill_str('value', 5, 5));
    r = m.getRange(3, 7);
    expect(r.collect()).toEqual(fill_str('value', 4, 3));

})

test('insert / shift_remove', () => {
    const m = new IndexMap<number, boolean>()

    m.set(0, true);
    assert(m.has(0));
    assert(m.get(0) === true);
    assert(m.getIndex(0) === true);
    m.set(0, false);
    assert(m.has(0));
    assert(m.get(0) === false);
    assert(m.getIndex(0) === false);
    m.set(1, true);
    m.set(2, true);
    m.set(3, true);
    assert(m.size === 4);

    expect(m.getFull(0)).toEqual([0, 0, false]);
    expect(m.getFull(1)).toEqual([1, 1, true]);
    expect(m.getFull(2)).toEqual([2, 2, true]);
    expect(m.getFull(3)).toEqual([3, 3, true]);
    // remove second last
    assert(is_some(m.delete(2)));
    expect(m.getFull(0)).toEqual([0, 0, false]);
    expect(m.getFull(1)).toEqual([1, 1, true]);
    expect(m.getFull(3)).toEqual([2, 3, true]);
    assert(is_some(m.delete(0)))
    expect(m.getFull(1)).toEqual([0, 1, true]);
    expect(m.getFull(3)).toEqual([1, 3, true]);
})

test('reverse', () => {
    const arr = Array.from({ length: 5 }, (_, i) => [`key-${i + 1}`, `value-${i + 1}`] as const);
    const m = new IndexMap<`key-${number}`, `value-${number}`>();
    for (const [k, v] of arr) {
        m.set(k, v);
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

    m.set(0, 0)
    m.set(1, 1)
    m.set(2, 2)
    m.set(3, 3)
    m.set(4, 4)
    m.set(5, 5)

    assert(m.last() === 5);
    assert(m.size === 6)
    m.truncate(3);
    assert(m.last() === 2);
    assert(m.size as number === 3);
})

test('split_off', () => {
    const m = new IndexMap();

    m.set(0, 'kept1');
    m.set(1, 'kept2');
    m.set(2, 'kept3');

    m.set(3, 'taken1');
    m.set(4, 'taken2');
    m.set(5, 'taken3');

    const taken = m.splitOff(3);
    assert(m.size === 3 && taken.size === 3);
    assert(taken.first() === 'taken1');
    assert(m.last() === 'kept3');
})

test('swap_indices', () => {
    const m = new IndexMap<string, string>()
    m.set('k1', 'v1');
    m.set('k2', 'v2');
    m.set('k3', 'v3');
    m.swapIndices(0, 2);

    assert(m.first() === 'v3');
    assert(m.last() === 'v1');
})

test('move_index', () => {
    const m = new IndexMap<string, string>()
    m.set('k1', 'v1');
    m.set('k2', 'v2');
    m.set('k3', 'v3');
    m.set('k4', 'v4');

    m.moveIndex(0, 3);
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
        map.set(c, null);
    })

    assert(map.indexOf('*') === -1);
    map.shiftInsert(10, '*', null);
    assert(map.indexOf('*') === 10);

    map.shiftInsert(10, 'a', null);
    assert(map.indexOf('a') === 10);
    assert(map.indexOf('*') === 9);

    map.shiftInsert(9, 'z', null);
    assert(map.indexOf('z') === 9);
    assert(map.indexOf('*') === 10);

    assert(map.size === 27);
    map.shiftInsert(map.size - 1, '*', null)
    assert(map.indexOf('*') === 26);
    map.shiftInsert(map.size, '+', null) === null;
    assert(map.indexOf('+') === 27);
    assert(map.size as number === 28);
})

test('shift_remove', () => {
    const map = new IndexMap();
    map.set('A', null)
    map.set('B', null)
    map.set('C', null)
    map.set('D', null)
    map.set('E', null)

    assert(map.indexOf('C') === 2);
    map.delete('C');
    assert(map.indexOf('D') === 2);
    assert(map.indexOf('E') === 3);
})

test('swap_remove', () => {
    const map = new IndexMap();

    map.set('A', null)
    map.set('B', null)
    map.set('C', null)
    map.set('D', null)
    map.set('E', null)
    map.swapRemove('A');
    assert(map.indexOf('E') === 0);
})

test('drain', () => {
    const map = new IndexMap();
    map.set('A', null)
    map.set('B', null)
    map.set('C', null)
    map.set('D', null)
    map.set('E', null)

    assert(map.drain(0, map.size).count() === 5)
    assert(map.size === 0);
})

test('splice', () => {
    const map = new IndexMap<number, any>();
    const count = 10

    for (let i = 1; i <= count; i++) {
        map.set(i, null)
    }

    let removed = map.splice(0, count, map.toArray().reverse())
    let i = -1
    let expected = count + 1;
    for (const [k] of removed) {
        i++;
        expected--;
        assert(i + 1 === k)
        assert(map.getIndexEntry(i)![0] === expected)
    }
})