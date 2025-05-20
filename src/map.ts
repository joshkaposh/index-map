import { type DoubleEndedIterator, type ExactSizeDoubleEndedIterator, type IterInputType, type Iterator, iter } from "joshkaposh-iterator";
import { Drain, Splice } from "./iter";
import { type Option } from "joshkaposh-option";

function oob(index: number, bounds: number) {
    return index < 0 || index >= bounds
}

/**
 * @description
 * Performs a swap operation on an array, given a `from_index` and `to_index`.
 * 
 * `swap` does nothing if either `index` is >= `array.length`.
 * @example
 * const array = [1, 2, 3, 4];
 * swap(0, 2) // [4, 2, 3, 1];
 */
export function swap<T>(array: T[], from_index: number, to_index: number) {
    const temp = array[to_index];
    array[to_index] = array[from_index];
    array[from_index] = temp;
}

export type Orderable<T> = T extends Ord ? T : never

export type Ord = (string | boolean | number | null | undefined | {
    [Symbol.toPrimitive](): string;
}) & {}

export type Bucket<T> = [number, T];
export type Entry<K, V> = [number, K, V];

export type Hasher<K1, K2> = (key: K1) => K2
export type DefaultHasher<K> = Hasher<K, K>;

export function valueOf<T>(key: T) {
    return key ? key.valueOf() as T : key
}

const INDEX = 0;
const BUCKET_VALUE = 1;
const ENTRY_KEY = 1;
const ENTRY_VALUE = 2;

export class IndexMap<K extends Ord = any, V extends any = any, S extends Hasher<NoInfer<K>, any> = DefaultHasher<NoInfer<K>>> {
    #map: Map<ReturnType<S>, Bucket<V>>;
    #indices: K[];
    #hash: S;

    constructor(map: Map<K, Bucket<V>> = new Map(), indices: K[] = [], hasher: S = valueOf as S) {
        this.#map = map as Map<ReturnType<S>, Bucket<V>>;
        this.#indices = indices;
        this.#hash = hasher;
    }

    static withCapacity<K extends Ord, V>(capacity: number): IndexMap<K, V, DefaultHasher<K>> {
        return new IndexMap<K, V, DefaultHasher<K>>(new Map(), new Array(capacity), valueOf)
    }

    static withHasher<K extends Ord, V, S extends Hasher<K, Ord> = Hasher<K, Ord>>(hasher: S): IndexMap<K, V, S> {
        return new IndexMap(new Map(), [], hasher);
    }

    static withCapacityAndHasher<K extends Ord, V, S extends Hasher<K, Ord>>(capacity: number, hasher: S): IndexMap<K, V, S> {
        const m = IndexMap.withCapacity<K, V>(capacity) as unknown as IndexMap<K, V, S>;
        m.#hash = hasher;
        return m
    }

    static from<K extends Ord, V, S extends Hasher<K, any> = DefaultHasher<K>>(iterable: IterInputType<[K, V]>, hasher: S = valueOf as S): IndexMap<K, V, S> {
        return new IndexMap(
            iter(iterable)
                .enumerate()
                .map(([i, [k, v]]) => [hasher(k), [i, v]] as [K, Bucket<V>])
                .collect(Map) as Map<K, Bucket<V>>,
            iter(iterable)
                .map(([k]) => k)
                .collect()
        );

    }

    get isEmpty(): boolean {
        return this.#map.size === 0;
    }

    get size(): number {
        return this.#map.size;
    }

    get hasher() {
        return this.#hash;
    }

    /**
     * This should only be used if [`IndexMap`] keys do not hold state
     * that changes hashing behaviour.
     * 
     * Can optionally be passed a `clone` function that will be used for cloning map values
     * 
     * The existing keys will be reused,
     * i.e. no new references for keys are made.
     * 
     * Can optionally be passed a `cloner` callback for each value in the map.
     *  
     * @returns a new [`IndexMap`] with it's elements cloned.
    */
    clone(cloner: (value: V) => V = valueOf): IndexMap<K, V, S> {
        const entries: [K, Bucket<V>][] = [];
        for (const [key, [index, value]] of this.#map.entries()) {
            entries.push([key, [index, cloner(value)]]);
        }

        return new IndexMap<K, V, S>(
            new Map(entries),
            [...this.#indices],
            this.#hash
        )
    }

    cloneFrom(src: IndexMap<K, V, S>, cloner: (value: V) => V = valueOf) {
        const src_indices = src.#indices,
            src_map = src.#map,
            dst_map = this.#map,
            indices = new Array(src.size);

        dst_map.clear();
        for (let i = 0; i < src_indices.length; i++) {
            const key = src_indices[i];
            indices[i] = key;
            const hashed_key = this.#hash(key);
            const [index, value] = src_map.get(hashed_key)!;
            dst_map.set(hashed_key, [index, cloner(value)]);
        }

        this.#indices = indices;
    }




    /**
     * @returns an iterator over the keys of this [`IndexMap`].
     */
    keys(): ExactSizeDoubleEndedIterator<K> {
        return iter(this.#indices);
    }

    /**
     * @returns an iterator over the values of this [`IndexMap`].
     */
    values(): DoubleEndedIterator<V> {
        return this.iter().map(([_, v]) => v);
    }


    /**
     * @returns an iterator over the key,value pairs of this [`IndexMap`].
     */
    entries(): DoubleEndedIterator<[K, V]> {
        return iter(this.#indices).map((k) => {
            const v = this.#map.get(this.#hash(k))![BUCKET_VALUE];
            return [k, v]
        })
    }

    /**
     * @returns an array of key, value pairs.
     */
    toArray(): [K, V][] {
        return this.entries().collect();
    }

    /**
     * Used by [Symbol.iterator], short-hand instead of calling `instance[Symbol.iterator]()`
     */
    iter(): DoubleEndedIterator<[K, V]> {
        return this.entries();
    }

    /**
     * Clears the [`IndexMap`]. This will also change the capacity.
     */
    clear() {
        this.#map.clear();
        this.#indices.length = 0;
    }

    /**
     * @returns true if `key` was in the [`IndexMap`]
     */
    has(key: K) {
        return this.#map.has(this.#hash(key));
    }

    /**
     * @returns a draining iterator (See `Drain` for more information) over the given range
     */
    drain(start = 0, end = this.#map.size): Drain<K, V> {
        return new Drain(start, end, this);
    }

    /**
     * @returns the value at index 0 or undefined if empty.
     */
    first(): Option<V> {
        return this.#indices.length === 0 ?
            undefined :
            this.#map.get(this.#hash(this.#indices[0]))![BUCKET_VALUE];
    }

    /**
     * @returns the value `V` in the map corresponding to `key`.
     * If the index of the key is known, consider using `getIndex`.
     */
    get(key: K): Option<V> {
        const bucket = this.#map.get(this.#hash(key));
        return bucket ? bucket[BUCKET_VALUE] : undefined;
    }

    /**
     * @returns the [index, key, value] entry corresponding to `key`
     */
    getFull(key: K): Option<Entry<K, V>> {
        const v = this.#map.get(this.#hash(key));
        if (!v) {
            return
        }
        const [index, value] = v;
        return [index, key, value];
    }

    /**
     * If the index of the key is not known, consider using `get`.
     * @returns the value `V` in the map by its index.
     */
    getIndex(index: number): Option<V> {
        return oob(index, this.#map.size) ? undefined : this.#map.get(this.#hash(this.#indices[index]))![BUCKET_VALUE]!
    }

    /**
     * @returns the key-value pair at the given index, if one was found.
     */
    getIndexEntry(index: number): Option<[K, V]> {
        if (oob(index, this.#map.size)) {
            return
        }

        const key = this.#indices[index];
        return [
            key,
            this.#map.get(this.#hash(key))![BUCKET_VALUE]
        ];
    }

    /**
     * @returns the index of the key or -1 if not present.
     */
    indexOf(key: K): number {
        return this.#map.get(this.#hash(key))?.[INDEX] ?? -1;
    }

    /**
     * @returns the key-value pair if one was found
     */
    getKeyValue(key: K): Option<[K, V]> {
        const bucket = this.#map.get(this.#hash(key));
        return bucket ? [key, bucket[BUCKET_VALUE]] : undefined;
    }

    /**
     * @returns an Iterator over V in the given range.
     */
    getRange(start = 0, end = this.#map.size): Iterator<V> {
        return this.values()
            .skip(start)
            .take(end - start);
    }

    /**
     * Inserts the key-value pair into the Map and returns the old value is one was present.
     * @returns the old value if one was present.
     */
    set(key: K, value: V): Option<V> {
        const hashed_key = this.#hash(key);
        const bucket = this.#map.get(hashed_key);
        if (bucket) {
            const old_val = bucket[BUCKET_VALUE]
            bucket[BUCKET_VALUE] = value
            return old_val;
        }
        const idx = this.#map.size;
        this.#map.set(hashed_key, [idx, value]);
        this.#indices[idx] = key;
        return undefined;
    }

    /**
     * Inserts the key-value pair.
     * @returns the previous index-value if one was present,
     *  or the current index-value pair if a new insert.
     */
    setFull(key: K, value: V): [number, Option<V>] {
        const hashed_key = this.#hash(key);
        const bucket = this.#map.get(hashed_key);

        if (bucket) {
            const old_val = bucket[BUCKET_VALUE];
            bucket[BUCKET_VALUE] = value;
            return [bucket[INDEX], old_val];
        }
        const idx = this.#map.size
        this.#map.set(hashed_key, [idx, value]);
        this.#indices[idx] = key;
        return [idx, value];
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

    isSorted(): boolean {
        let calls = 0;
        this.sort((a, _, b) => {
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

    /**
     * @returns the last value or undefined if empty.
     */
    last(): Option<V> {
        const last_index = this.#map.size - 1;
        return last_index >= 0 ? this.getIndex(last_index) : undefined;
    }

    /**
     * moves an `Entry` in the [`IndexMap`] from one index to another.
     */
    moveIndex(from: number, to: number) {
        const max = from <= to ? from : to;
        const min = from <= to ? from : to;

        if (min + 1 === max) {
            this.swapIndices(min, max)
            return
        }

        from < to ? this.#shiftUp(from, to) : this.#shiftDown(from, to);

        // if (from < to) {
        //     if (from + 1 === to) {
        //         this.swapIndices(from, to)
        //         return
        //     }
        //     this.#shiftUp(from, to)
        // } else {
        //     if (from - 1 === to) {
        //         this.swapIndices(from, to);
        //         return;
        //     }
        //     this.#shiftDown(from, to)
        // }
    }

    /**
     * @returns a value if the [`IndexMap`] was not empty, undefined otherwise. 
     */
    pop(): Option<V> {
        const size = this.#map.size
        return size > 0 ?
            this.delete(this.#indices[size - 1])
            : undefined
    }

    /**
     * @returns an [`Entry`] if the [`IndexMap`] was not empty, undefined otherwise. 
     */
    popFull(): Option<Entry<K, V>> {
        const index = this.#map.size - 1;
        if (index > 0) {
            const full = this.getFull(this.#indices[index])!
            this.#map.delete(this.#hash(full[ENTRY_KEY]));
            this.#indices.pop();
            return full;
        }

        return undefined
    }

    retain(keep: (key: K, value: V) => boolean) {
        // keep only the elements this closure returns true for
        this.iter().rev().for_each(([k, v]) => {
            if (!keep(k, v)) {
                this.delete(k);
            }
        })
    }

    /**
     * Reverses all the keys of this `IndexMap`.
     */
    reverse() {
        this.#indices.reverse();
        this.#syncIndices()
    }

    /**
     * Creates a new `IndexMap` and reverses it's keys.
     * This is equivalent to calling .clone().reverse().
     * @returns a new `IndexMap` with it's keys reversed. 
     */
    toReversed() {
        const reversed_indices = this.#indices.toReversed();
        const map = this.#map;
        const reversed_map = new Map(Array.from(reversed_indices, (key, i) => {
            const hashed_key = this.#hash(key as Orderable<K>);
            return [hashed_key, [i, map.get(hashed_key)![1]] as Bucket<V>];
        }))
        return new IndexMap(reversed_map, reversed_indices, this.#hash)
    }

    /**
     * Similar to `Array.prototype.shift`.
     * Pops the value at the front of the map
     * and returns it.
     * This does nothing if the `IndexMap` is empty.
     * @returns value `V` or nothing if the `IndexMap` is empty.
     */
    shift(): Option<V> {
        return this.#map.size > 0 ?
            this.delete(this.#indices[0]) :
            undefined
    }

    /**
     * Similar to `Array.prototype.shift`.
     * Pops the key-value pair at the front of the map
     * and returns it.
     * This does nothing if the `IndexMap` is empty.
     * @returns a key-value pair or nothing if the `IndexMap` is empty.
     */
    shiftEntry(): Option<[K, V]> {
        return this.#map.size > 0 ?
            this.deleteEntry(this.#indices[0]) : undefined;
    }

    /**
     * Inserts a key-value pair into the map at the given index.
     * 
     * This method will insert a new pair into the map at the index
     * by shifting any elements it replaced back one index.
     * 
     * @throws **Safety:** throws a RangeError if `index > map.size`.
     * @returns the value at `index` before it was moved, or undefined if moving wasn't needed.
     */
    shiftInsert(index: number, key: K, value: V): Option<V> {
        if (index > this.#map.size) {
            throw new RangeError(`index ${index} cannot exceed length ${this.#map.size}`)
        }

        const entry = this.getFull(key);
        if (entry) {
            const oldval = entry[ENTRY_VALUE];
            entry[ENTRY_VALUE] = value;
            this.moveIndex(entry[INDEX], index);
            return oldval;
        } else {
            this.#indices.splice(index, 0, key);
            key = this.#hash(key);
            this.#map.set(key as ReturnType<S>, [index, value]);
            this.#syncIndices(index);
            return undefined;
        }
    }

    shiftInsertEntry(index: number, key: K, value: V): Option<[K, V]> {
        const v = this.shiftInsert(index, key, value);
        return v === undefined ? undefined : [key, v as V];
    }

    delete(key: K): Option<V> {
        const hashed_key = this.#hash(key);
        const bucket = this.#map.get(hashed_key);
        if (!bucket) {
            return
        }

        return this.#shiftRemoveFullUnchecked(
            bucket[INDEX],
            hashed_key,
            bucket[BUCKET_VALUE]
        )[ENTRY_VALUE];
    }

    deleteEntry(key: K): Option<[K, V]> {
        const hashed_key = this.#hash(key);
        const item = this.#map.get(hashed_key);
        if (!item) {
            return undefined
        }
        const [i, v] = item;
        this.#shiftRemoveFullUnchecked(i, hashed_key, v);
        return [key, v];
    }

    deleteFull(key: K): Option<Entry<K, V>> {
        const hashed_key = this.#hash(key);
        const bucket = this.#map.get(hashed_key)
        if (!bucket) {
            return
        }
        const [index, value] = bucket;
        return this.#shiftRemoveFullUnchecked(index, hashed_key, value);
    }

    deleteIndex(index: number): Option<V> {
        const k = this.#indices[index];
        const hashed_key = this.#hash(k);
        if (k == null) {
            return
        }
        const [_, value] = this.#map.get(hashed_key)!
        return this.#shiftRemoveFullUnchecked(index, hashed_key, value)[ENTRY_VALUE];
    }

    sort(cmp?: (k1: K, v1: V, k2: K, v2: V) => -1 | 0 | 1) {
        const compare = cmp ? (a: K, b: K) => cmp(a, this.get(a)!, b, this.get(b)!) : (a: K, b: K) => {
            if (a < b) {
                return -1
            } else if (a > b) {
                return 1;
            } else {
                return 0
            }
        }

        this.#indices.sort(compare);
        this.#syncIndices();
    }

    toSorted(cmp?: (k1: K, v1: V, k2: K, v2: V) => -1 | 0 | 1) {
        const indices = this.#indices.toSorted(cmp ? (a: K, b: K) => cmp(a, this.get(a)!, b, this.get(b)!) : (a: K, b: K) => {
            if (a < b) {
                return -1
            } else if (a > b) {
                return 1;
            } else {
                return 0
            }
        });

        const map = new Map(Array.from(indices, (i, key) => {
            const hashed_key = this.#hash(key as Orderable<K>);
            return [hashed_key, [i, this.#map.get(hashed_key)![1]]] as [K, Bucket<V>];
        }))

        return new IndexMap(map, indices, this.#hash)
    }

    splice(from: number, to: number, replace_with: IterInputType<[K, V]>): Splice<K, V> {
        return new Splice(this.#map, this.#indices, from, to, iter(replace_with).map(([k, v]) => [this.#hash(k), v]))
    }

    splitOff(at: number): IndexMap<K, V, S> {
        if (at > this.#map.size || at < 0) {
            throw new RangeError(`IndexMap::splitOff() index ${at} cannot be > ${this.#map.size} and < 0`)
        }

        const indices = this.#indices.slice(at);
        const entries = Array.from(indices, (k, i) => {
            const hashed_key = this.#hash(k);
            const v = this.#map.get(hashed_key)![BUCKET_VALUE];
            return [hashed_key, [i, v]] as [K, Bucket<V>]
        })
        this.truncate(at);

        return new IndexMap<K, V, S>(new Map(entries), indices, this.#hash);
    }

    swapIndices(from: number, to: number) {
        const max = this.#map.size - 1
        if (from > max || to > max || from < 0 || to < 0) {
            return
        }
        // swap indices
        swap(this.#indices, from, to);
        // swap inner values
        const vfrom = this.#map.get(this.#hash(this.#indices[from]))!;
        const vto = this.#map.get(this.#hash(this.#indices[to]))!;

        const temp = vfrom[INDEX];
        vfrom[INDEX] = vto[INDEX];
        vto[INDEX] = temp;
    }

    swapRemove(key: K): Option<V> {
        const full = this.swapRemoveFull(key);
        return full ? full[ENTRY_VALUE] : undefined;
    }

    swapRemoveEntry(key: K): Option<[K, V]> {
        const full = this.swapRemoveFull(key);
        return full ? [full[ENTRY_KEY], full[ENTRY_VALUE]] : undefined;
    }

    swapRemoveFull(key: K): Option<Entry<K, V>> {
        const entry = this.getFull(key);
        if (!entry) {
            return
        }

        const [index] = entry;
        // remove from indices / map
        this.swapIndices(index, this.#map.size - 1);
        const v = this.pop()!;
        return [index, key, v];

    }

    swapRemoveIndex(index: number): Option<V> {
        if (this.#indices.length === 0 || index < 0 || index >= this.#indices.length) {
            return
        }
        const k = this.#indices[index];
        return this.swapRemove(k);
    }

    truncate(new_len: number) {
        if (new_len >= this.#indices.length) {
            return
        }

        while (this.#indices.length > new_len) {
            this.pop();
        }
    }

    #removeAndShiftIndices(index: number) {
        if (index === this.#map.size) {
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

    #shiftRemoveFullUnchecked(index: number, hash: ReturnType<S>, value: V): Entry<K, V> {
        this.#map.delete(hash);
        hash = this.#indices.splice(index, 1)[INDEX] as ReturnType<S>;
        this.#removeAndShiftIndices(index);
        return [index, hash, value];
    }

    #shiftUp(from: number, to: number) {
        for (let i = from; i < to; i++) {
            this.swapIndices(i, i + 1);
        }
    }

    #shiftDown(from: number, to: number) {
        for (let i = from - 1; i >= to; i--) {
            this.swapIndices(i + 1, i);
        }
    }

    #syncIndices(from = 0, to = this.#map.size) {
        for (let i = from; i < to; i++) {
            const tuple = this.#map.get(this.#hash(this.#indices[i]))!;
            tuple[INDEX] = i;
        }
    }

    [Symbol.iterator](): Iterator<[K, V]> {
        return this.iter();
    }
}