import { DoubleEndedIterator, ExactSizeDoubleEndedIterator, IterInputType, Iterator, Range, done, iter, range } from "joshkaposh-iterator";
import { is_none, is_some, swap, swap_2, type Option } from "./util";
import { TODO } from "joshkaposh-iterator/src/util";

export type Orderable<T> = T extends Ord ? T : never

export type Ord = Option<(string) & string | (boolean) & boolean | (number) & number | {
    [Symbol.toPrimitive](): string;
}> & {}

export type Bucket<T> = [number, T];

export class IndexMap<K extends Ord, V> {
    #map: Map<K, Bucket<V>>;
    #indices: K[];

    constructor(map?: Iterable<readonly [K, V]>)
    constructor(map?: Map<K, Bucket<V>>, indices?: K[])
    constructor(map: Map<K, Bucket<V>> | IterInputType<readonly [K, V]> = new Map(), indices: K[] = []) {
        if (map instanceof Map) {
            this.#map = map;
            this.#indices = indices;
        } else {
            const entries = iter(map).enumerate().map(([i, [k, v]]) => [k, [i, v]] as [K, Bucket<V>]).collect();
            // @ts-expect-error
            const keys = iter(entries).map(([k]) => k).collect() as K[]
            this.#map = new Map(entries)
            this.#indices = keys
        }
    }

    static from<K extends Ord, V>(iterable: IterInputType<[K, V]>): IndexMap<K, V> {
        const entries = iter(iterable).enumerate().map(([i, [k, v]]) => [k, [i, v]] as [K, Bucket<V>]).collect();
        // @ts-expect-error
        const indices = iter(entries).map(([k]) => k).collect() as K[]

        return new IndexMap(new Map(entries), indices);
    }

    static with_capacity<K, V>(capacity: number): IndexMap<Orderable<K>, V> {
        return new IndexMap<Orderable<K>, V>(new Map(), new Array(capacity))
    }

    as_array(): [K, V][] {
        return this.as_entries().collect();
    }

    as_entries(): DoubleEndedIterator<[K, V]> {
        return iter(this.#indices).map((k) => {
            const v = this.#map.get(k)![1];
            return [k, v]
        })
    }

    clear(): void {
        this.#map.clear();
        this.#indices.length = 0;
    }

    contains_key(key: K): boolean {
        return this.#map.has(key);
    }

    drain(r: Range): Drain<K, V> {
        return new Drain(r, this as any);
    }

    first(): Option<V> {
        return this.#indices.length === 0 ?
            null :
            this.#map.get(this.#indices[0])![1];
    }

    get(key: K): Option<V> {
        return this.#get_unchecked(key);
    }

    get_full(key: K): Option<[number, K, V]> {
        const v = this.#map.get(key);
        if (is_none(v)) {
            return null
        }
        const [index, value] = v;
        return [index, key, value];
    }

    get_index(index: number): Option<V> {
        if (index < 0 || index >= this.len()) {
            return null
        }
        return this.#map.get(this.#indices[index])![1];
    }

    get_index_entry(index: number): Option<[K, V]> {
        if (index < 0 || index >= this.len()) {
            return null
        }
        const k = this.#indices[index];
        const [_, v] = this.#map.get(k)!
        return [k, v];
    }

    get_index_of(key: K): Option<number> {
        const v = this.#map.get(key);
        return is_some(v) ? v[0] : null;
    }

    get_key_value(key: K): Option<[K, V]> {
        const value = this.#map.get(key);
        return is_some(value) ? [key, value[1]] : null;
    }

    get_range(range: Range): Iterator<V> {
        return this.values()
            .skip(range.start)
            .take(range.end - range.start)
    }

    insert(key: K, value: V): Option<V> {
        const data = this.#map.get(key);
        if (is_some(data)) {
            const old_val = data[1]
            data[1] = value
            return old_val;
        }
        this.#map.set(key, [this.len(), value]);
        this.#indices.push(key);
        return null;
    }

    insert_full(key: K, value: V): [number, Option<V>] {
        const data = this.#map.get(key);
        if (is_some(data)) {
            const old_val = data[1]
            data[1] = value
            return [data[0], old_val];
        }
        const idx = this.len()
        this.#map.set(key, [idx, value]);
        this.#indices.push(key);
        return [idx, null];
    }


    // /**
    //  * @summary
    //  * Insert a key-value pair in the map at its ordered position among sorted keys.
    //  * @description
    //  * This is equivalent to finding the position with binary_search_keys, then either updating it or calling shift_insert for a new key.
    //  * 
    //  * If the sorted key is found in the map, its corresponding value is updated with value, and the older value is returned inside `[index, oldValue]`. Otherwise, the new key-value pair is inserted at the sorted position, and `[index, null]` is returned.
    //  * 
    //  * If the existing keys are not already sorted, then the insertion index is unspecified (like binary_search), but the key-value pair is moved to or inserted at that position regardless.
    //  * 
    //  * Computes in `O(n)` time (average). Instead of repeating calls to insert_sorted, it may be faster to call batched insert or extend and only call sort_keys or sort_unstable_keys once.
    //  */


    insert_sorted(key: K, value: V): [number, Option<V>] {
        return TODO('IndexMap::insert_sorted()', key, value);
    }

    is_empty(): boolean {
        return this.len() === 0;
    }

    is_sorted(): boolean {
        let calls = 0;
        this.sort_by((a, _, b) => {
            if (a > b) {
                calls++;
                return 0
            } else if (a === b) {
                return 0
            } else {
                return 0;
            }
        })
        return calls === 0
    }


    iter(): DoubleEndedIterator<[K, V]> {
        return this.as_entries();
    }

    keys(): DoubleEndedIterator<K> {
        return iter(this.#indices);
    }

    last(): Option<V> {
        const last_index = this.len() - 1;
        return last_index >= 0 ? this.get_index(last_index) : null;
    }

    len() {
        return this.#map.size;
    }

    move_index(from: number, to: number) {
        if (from < to) {
            if (from + 1 === to) {
                this.swap_indices(from, to)
                return
            }
            this.#shift_up(from, to)
        } else {
            if (from - 1 === to) {
                this.swap_indices(from, to);
                return;
            }
            this.#shift_down(from, to)

        }
    }

    pop(): Option<V> {
        return this.#indices.length > 0 ?
            this.shift_remove(this.#indices[this.#indices.length - 1])
            : null
    }

    pop_full() {
        const index = this.#map.size - 1;
        if (index > 0) {
            const full = this.get_full(this.#indices[index])!
            this.#map.delete(full[1]);
            this.#indices.pop();
            return full;
        }
        return null
    }

    #remove_shift_indices(index: number) {
        if (index === this.len()) {
            return
        }
        let idx = -1;
        for (const value of this.#map.values()) {
            idx++;
            if (idx < index) {
                continue
            }
            value[0] -= 1;
        }
    }

    retain(keep: (key: K, value: V) => boolean) {
        TODO('IndexMap::retain()', keep);
    }

    reverse() {
        this.#indices.reverse();

        // TODO: iterate over indices and update map indices

        this.#sync_indices()
    }

    shift(): Option<V> {
        return this.#map.size > 0 ?
            this.shift_remove(this.#indices[0]) :
            null
    }

    shift_insert(index: number, key: K, value: V): Option<V> {
        if (index > this.len()) {
            throw new RangeError(`index ${index} cannot exceed length ${this.len()}`)
        }

        const old = this.get_full(key);
        if (old) {
            const oldval = old[2]
            old[2] = value
            this.move_index(old[0], index);
            return oldval;
        } else {
            this.#indices.splice(index, 0, key);
            this.#map.set(key, [index, value]);
            this.#sync_indices(index, this.#indices.length);
            return null;
        }
    }

    shift_remove(key: K): Option<V> {
        const v = this.#map.get(key);
        if (is_none(v)) {
            return
        }
        return this.#shift_remove_full_unchecked(v[0], key, v[1])[2];
    }

    shift_remove_entry(key: K): Option<[K, V]> {
        const item = this.#map.get(key);
        if (is_none(item)) {
            return null
        }
        const [i, v] = item;
        this.#shift_remove_full_unchecked(i, key, v);
        return [key, v];
    }

    shift_remove_full(key: K): Option<[number, K, V]> {
        // const item = this.#map.get(key);
        if (!this.#map.has(key)) {
            return null
        }
        const [index, value] = this.#map.get(key)!
        return this.#shift_remove_full_unchecked(index, key, value);
    }

    shift_remove_index(index: number): Option<V> {
        const k = this.#indices[index];
        if (!is_some(k)) {
            return null
        }
        const [_, value] = this.#map.get(k)!
        return this.#shift_remove_full_unchecked(index, k, value)[2];
    }

    sort_by(cmp: (k1: K, v1: V, k2: K, v2: V) => -1 | 0 | 1) {
        const compare = (a: K, b: K) => cmp(a, this.get(a)!, b, this.get(b)!)
        this.#indices.sort(compare);
        this.#sync_indices();
    }

    sort_keys() {
        this.#indices.sort();
        // sync indices in buckets
        this.#sync_indices();
    }

    splice(range: Range, replace_with: Iterable<[K, V]>): Splice<K, V> {
        return new Splice(this.#map, this.#indices, range, replace_with)
    }

    split_off(at: number): IndexMap<K, V> {
        if (at > this.len() || at < 0) {
            throw new RangeError(`IndexMap::slit_off() index ${at} cannot be > ${this.len()} and < 0`)
        }

        // @ts-expect-error
        const indices = range(at, this.#indices.length).map(i => this.#indices[i]).collect() as K[];
        const entries = Array.from(indices, (k, i) => {
            const v = this.#map.get(k)![1];
            return [k, [i, v]] as [K, Bucket<V>]
        })
        this.truncate(at);

        return new IndexMap<K, V>(new Map(entries), indices);
    }

    swap_indices(from: number, to: number) {
        const max = this.#map.size - 1
        if (from > max || to > max) {
            return
        }
        // swap indices
        swap(this.#indices, from, to);
        // swap inner values
        const vfrom = this.#map.get(this.#indices[from])!
        const vto = this.#map.get(this.#indices[to])!
        swap_2(vfrom, vto, 0);
    }

    swap_remove(key: K): Option<V> {
        const full = this.swap_remove_full(key);
        return full ? full[2] : null;
    }

    swap_remove_entry(key: K): Option<[K, V]> {
        const full = this.swap_remove_full(key);
        return full ? [full[1], full[2]] : null;
    }

    swap_remove_full(key: K): Option<[number, K, V]> {
        const value = this.get_full(key);
        // TODO
        if (is_none(value)) {
            return null;
        }

        const [index] = value;
        const max = this.len() - 1;
        this.swap_indices(index, max);
        // remove from indices / map
        // and return value if it exists
        const v = this.pop()!;
        return [index, key, v];
    }

    swap_remove_index(index: number): Option<V> {
        const k = this.#indices[index];
        return is_some(k) ? this.swap_remove(k) : null;
    }

    truncate(new_len: number) {
        if (new_len >= this.#indices.length) {
            return
        }

        while (this.#indices.length > new_len) {
            this.pop();
        }
    }

    values(): DoubleEndedIterator<V> {
        // @ts-expect-error
        return this.as_entries().map(([_, v]) => v);
    }

    #get_unchecked(key: K): Option<V> {
        const v = this.#map.get(key);
        return is_some(v) ? v[1] : null;
    }

    #shift_remove_full_unchecked(index: number, key: K, value: V): [number, K, V] {
        this.#map.delete(key);
        this.#indices.splice(index, 1);
        this.#remove_shift_indices(index);
        return [index, key, value];
    }

    #shift_up(from: number, to: number) {
        for (let i = from; i < to; i++) {
            this.swap_indices(i, i + 1);
        }
    }

    #shift_down(from: number, to: number) {
        for (let i = from - 1; i >= to; i--) {
            this.swap_indices(i + 1, i);
        }
    }

    #sync_indices(from = 0, to = this.len()) {
        for (let i = from; i < to; i++) {
            const tuple = this.#map.get(this.#indices[i])!;
            tuple[0] = i;
        }
    }

    [Symbol.iterator](): Iterator<[K, V]> {
        return this.as_entries();
    }
}

export class Drain<K, V> extends Iterator<[K, V]> {
    #map: IndexMap<Orderable<K>, V>;
    #taken: V[];
    #r: Range;
    constructor(range: Range, map: IndexMap<Orderable<K>, V>) {
        super();
        this.#r = range;
        this.#map = map;
        this.#taken = []
    }

    override into_iter(): Iterator<[K, V]> {
        return this
    }

    next(): IteratorResult<[K, V]> {
        const ni = this.#r.next();

        if (ni.done) {
            return done()
        } else {
            const index = ni.value - this.#taken.length;
            const elt = this.#map.get_index_entry(index)!;
            this.#taken.push(elt[1]);
            this.#map.shift_remove(elt[0]);
            return { done: false, value: [elt[0], elt[1]] }
        }
    }
}

export class Splice<K, V> extends ExactSizeDoubleEndedIterator<[K, V]> {
    #r: Range;
    #replace: Iterator<[K, V]>
    #map: Map<K, Bucket<V>>;
    #indices: K[];

    #front: number;
    #back: number;

    constructor(map: Map<K, NoInfer<Bucket<V>>>, indices: K[], range: Range, replace_with: Iterable<[K, V]>) {
        super();
        this.#map = map;
        this.#indices = indices
        this.#r = range;
        this.#replace = iter(replace_with);

        this.#front = -1;
        this.#back = map.size;

    }

    override into_iter(): ExactSizeDoubleEndedIterator<[K, V]> {
        return this;
    }

    #splice(i: number, k: K, v: V): IteratorResult<[K, V]> {
        const old_key = this.#indices[i];
        const old_val = this.#map.get(old_key)![1];
        this.#indices[i] = k
        if (old_key === k) {
            this.#map.delete(old_key)
        }
        this.#map.set(k, [i, v]);

        return { done: false, value: [old_key, old_val] };
    }

    override next(): IteratorResult<[K, V]> {
        this.#front++;
        if (this.#front >= this.#back) {
            return done()
        }

        const nexti = this.#r.next();
        const nextkv = this.#replace.next();
        if (nexti.done || nextkv.done) {
            return done();
        }

        const i = nexti.value;
        const [k, v] = nextkv.value;
        return this.#splice(i, k, v);
    }

    override next_back(): IteratorResult<[K, V]> {
        this.#back--;
        if (this.#front >= this.#back) {
            return done()
        }

        const nexti = this.#r.next_back();
        const nextkv = this.#replace.next();

        if (nexti.done || nextkv.done) {
            return done();
        }

        const i = nexti.value;
        const [k, v] = nextkv.value;
        return this.#splice(i, k, v);
    }

}