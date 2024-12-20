import { type DoubleEndedIterator, type ExactSizeDoubleEndedIterator, type IterInputType, type Iterator, type Range, iter, range } from "joshkaposh-iterator";
import { type Ord, swap, swap_2 } from "./util";
import { Drain, Splice } from "./iter";
import { type Option, is_none, is_some } from "joshkaposh-option";


function oob(index: number, bounds: number) {
    return index < 0 || index >= bounds
}

export type Bucket<T> = [number, T];
export type Entry<K, V> = [number, K, V];

export type Hasher<K1, K2> = (key: K1) => K2
export type DefaultHasher<K> = Hasher<K, K>;

const INDEX = 0;
const VALUE = 1;
export class IndexMap<K extends Ord, V, S extends Hasher<K, any> = DefaultHasher<K>> {
    #map: Map<K, Bucket<V>>;
    #indices: K[];
    #hash: S;

    constructor(map?: IterInputType<readonly [K, V]>)
    constructor(map?: Map<K, Bucket<V>>, indices?: K[])
    constructor(map: Map<K, Bucket<V>>, indices: K[], hasher: Hasher<K, any>)
    constructor(map: Map<K, Bucket<V>> | IterInputType<readonly [K, V]> = new Map(), indices: K[] = [], hasher: S = ((key) => key) as S) {
        if (map instanceof Map) {
            this.#map = map;
            this.#indices = indices;
        } else {
            const entries = iter(map).enumerate().map(([i, [k, v]]) => [k, [i, v]] as [K, Bucket<V>]).collect();
            const keys = iter(entries).map(([k]) => k).collect() as K[]
            this.#map = new Map(entries)
            this.#indices = keys
        }
        this.#hash = hasher;
    }


    static with_capacity<K extends Ord, V>(capacity: number): IndexMap<K, V, DefaultHasher<K>> {
        return new IndexMap<K, V, DefaultHasher<K>>(new Map(), new Array(capacity))
    }

    static with_hasher<K extends Ord, V, S extends Hasher<K, any> = Hasher<K, any>>(hasher: S): IndexMap<K, V, S> {
        return new IndexMap(new Map(), [], hasher);
    }

    static with_capacity_and_hasher<K extends Ord, V, S extends Hasher<K, any>>(capacity: number, hasher: S): IndexMap<K, V, S> {
        const m = IndexMap.with_capacity<K, V>(capacity);
        m.#hash = hasher;
        return m as IndexMap<K, V, S>;
    }

    static from<K extends Ord, V, S extends Hasher<K, any>>(iterable: IterInputType<[K, V]>): IndexMap<K, V, S> {
        const entries = iter(iterable).enumerate().map(([i, [k, v]]) => [k, [i, v]] as [K, Bucket<V>]).collect();
        const indices = iter(entries).map(([k]) => k).collect() as K[]

        return new IndexMap(new Map(entries), indices);
    }


    as_array(): [K, V][] {
        return this.entries().collect();
    }

    entries(): DoubleEndedIterator<[K, V]> {
        return iter(this.#indices).map((k) => {
            const v = this.#map.get(k)![VALUE];
            return [k, v]
        })

    }

    clear(): void {
        this.#map.clear();
        this.#indices.length = 0;
    }

    contains_key(key: K): boolean {
        return this.#map.has(this.#hash(key));
    }

    drain(r: Range): Drain<K, V> {
        return new Drain(r, this);
    }

    first(): Option<V> {
        return this.#indices.length === 0 ?
            undefined :
            this.#map.get(this.#indices[0])![1];
    }

    get(key: K): Option<V> {
        const bucket = this.#get_unchecked(key);
        return bucket ? bucket[1] : undefined;
    }

    get_full(key: K): Option<Entry<K, V>> {
        const v = this.#get_unchecked(key)!;
        if (!v) {
            return
        }
        const [index, value] = v;
        return [index, key, value];
    }

    get_index(index: number): Option<V> {
        return oob(index, this.len()) ? undefined : this.#map.get(this.#indices[index])![1]!
    }

    /**
     * Returns the key-value pair found at the given index, if one was found.
     */
    get_index_entry(index: number): Option<[K, V]> {
        if (oob(index, this.len())) {
            return
        }

        const k = this.#indices[index];
        const [_, v] = this.#map.get(k)!
        return [k, v];
    }

    /**
     * Gets the index of the key if one is present.
     */
    get_index_of(key: K): Option<number> {
        const bucket = this.#get_unchecked(key);
        return bucket ? bucket[INDEX] : undefined;
    }

    /**
     * Returns the key-value pair if one was found
     */
    get_key_value(key: K): Option<[K, V]> {
        const bucket = this.#get_unchecked(key);
        return bucket ? [key, bucket[VALUE]] : undefined;
    }

    /**
     * Returns an Iterator over V in the given range.
     */
    get_range(range: Range): Iterator<V> {
        return this.values()
            .skip(range.start)
            .take(range.end - range.start)
    }

    /**
     * Inserts the key-value pair into the Map and returns the old value is one was present.
     */
    insert(key: K, value: V): Option<V> {
        key = this.#hash(key)
        const bucket = this.#map.get(key);
        if (bucket) {
            const old_val = bucket[VALUE]
            bucket[VALUE] = value
            return old_val;
        }
        this.#map.set(key, [this.len(), value]);
        this.#indices.push(key);
        return undefined;
    }

    /**
     * Inserts the key-value pair and returns the previous index-value if one was present,
     *  or the current index-value pair if a new insert.
     */
    insert_full(key: K, value: V): [number, Option<V>] {
        key = this.#hash(key);
        const bucket = this.#map.get(key);
        if (bucket) {
            const old_val = bucket[VALUE]
            bucket[VALUE] = value
            return [bucket[INDEX], old_val];
        }
        const idx = this.len()
        this.#map.set(key, [idx, value]);
        this.#indices.push(key);
        return [idx, null];
    }


    // /**
    //  * Insert a key-value pair in the map at its ordered position among sorted keys.
    //  * This is equivalent to finding the position with binary_search_keys, then either updating it or calling shift_insert for a new key.
    //  * 
    //  * If the sorted key is found in the map, its corresponding value is updated with value, and the older value is returned inside `[index, oldValue]`. Otherwise, the new key-value pair is inserted at the sorted position, and `[index, null]` is returned.
    //  * 
    //  * If the existing keys are not already sorted, then the insertion index is unspecified (like binary_search), but the key-value pair is moved to or inserted at that position regardless.
    //  * 
    //  * Computes in `O(n)` time (average). Instead of repeating calls to insert_sorted, it may be faster to call batched insert or extend and only call sort_keys or sort_unstable_keys once.
    //  */
    // insert_sorted(key: K, value: V): [number, Option<V>] {
    //     return TODO('IndexMap::insert_sorted()', key, value);
    // }

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
        return this.entries();
    }

    keys(): ExactSizeDoubleEndedIterator<K> {
        return iter(this.#indices);
    }

    last(): Option<V> {
        const last_index = this.len() - 1;
        return last_index >= 0 ? this.get_index(last_index) : undefined;
    }

    len(): number {
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
            : undefined
    }

    pop_full(): Option<Entry<K, V>> {
        const index = this.#map.size - 1;
        if (index > 0) {
            const full = this.get_full(this.#indices[index])!
            this.#map.delete(full[1]);
            this.#indices.pop();
            return full;
        }
        return undefined
    }

    retain(keep: (key: K, value: V) => boolean) {
        // keep only the elements this closure returns true for
        const entries = this.iter().rev();
        entries.rev().for_each(([k, v]) => {
            if (!keep(k, v)) {
                this.shift_remove(k);
            }
        })
    }

    reverse() {
        this.#indices.reverse();
        this.#sync_indices()
    }

    /**
     * Similar to array.shift().
     * shift() pops the key-value pair at the front of the map
     * and returns V or nothing if the map is empty
     */
    shift(): Option<V> {
        return this.#map.size > 0 ?
            this.shift_remove(this.#indices[0]) :
            undefined
    }

    shift_insert(index: number, key: K, value: V): Option<V> {
        if (index > this.len()) {
            throw new RangeError(`index ${index} cannot exceed length ${this.len()}`)
        }

        const bucket = this.get_full(key);
        if (bucket) {
            const oldval = bucket[2]
            bucket[2] = value
            this.move_index(bucket[INDEX], index);
            return oldval;
        } else {
            key = this.#hash(key);
            this.#indices.splice(index, 0, key);
            this.#map.set(key, [index, value]);
            this.#sync_indices(index);
            return undefined;
        }
    }

    shift_remove(key: K): Option<V> {
        key = this.#hash(key);
        const v = this.#map.get(key);
        if (is_none(v)) {
            return
        }
        return this.#shift_remove_full_unchecked(v[0], key, v[1])[2];
    }

    shift_remove_entry(key: K): Option<[K, V]> {
        key = this.#hash(key);
        const item = this.#map.get(key);
        if (!item) {
            return undefined
        }
        const [i, v] = item;
        this.#shift_remove_full_unchecked(i, key, v);
        return [key, v];
    }

    shift_remove_full(key: K): Option<Entry<K, V>> {
        key = this.#hash(key);
        const item = this.#map.get(key);
        if (!item) {
            return
        }
        const [index, value] = item
        return this.#shift_remove_full_unchecked(index, key, value);
    }

    shift_remove_index(index: number): Option<V> {
        const k = this.#indices[index];
        if (!is_some(k)) {
            return
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

    splice(range: Range, replace_with: IterInputType<[K, V]>): Splice<K, V> {
        return new Splice(this.#map, this.#indices, range, iter(replace_with).map(([k, v]) => [this.#hash(k), v]))
    }

    split_off(at: number): IndexMap<K, V, S> {
        if (at > this.len() || at < 0) {
            throw new RangeError(`IndexMap::slit_off() index ${at} cannot be > ${this.len()} and < 0`)
        }

        const indices = range(at, this.#indices.length).map(i => this.#indices[i]).collect() as K[];
        const entries = Array.from(indices, (k, i) => {
            const v = this.#map.get(k)![1];
            return [k, [i, v]] as [K, Bucket<V>]
        })
        this.truncate(at);

        return new IndexMap<K, V, S>(new Map(entries), indices, this.#hash);
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
        return full ? full[2] : undefined;
    }

    swap_remove_entry(key: K): Option<[K, V]> {
        const full = this.swap_remove_full(key);
        return full ? [full[1], full[2]] : undefined;
    }

    swap_remove_full(key: K): Option<Entry<K, V>> {
        const value = this.get_full(key);
        if (!value) {
            return
        }

        const [index] = value;
        const max = this.len() - 1;
        // remove from indices / map
        this.swap_indices(index, max);
        const v = this.pop()!;
        return [index, key, v];

    }

    swap_remove_index(index: number): Option<V> {
        const k = this.#indices[index];
        return is_some(k) ? this.swap_remove(k) : undefined;
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
        return this.iter().map(([_, v]) => v);
    }

    #remove_shift_indices(index: number) {
        if (index === this.len()) {
            return
        }
        let idx = -1;
        for (const bucket of this.#map.values()) {
            idx++;
            if (idx < index) {
                continue
            }
            bucket[INDEX] -= 1;
        }
    }

    #get_unchecked(key: K): Option<[number, V]> {
        return this.#map.get(this.#hash(key));
    }

    #shift_remove_full_unchecked(index: number, key: K, value: V): Entry<K, V> {
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
        return this.iter();
    }
}