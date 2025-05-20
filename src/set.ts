import { type IterInputType, type DoubleEndedIterator, type ExactSizeDoubleEndedIterator, iter } from 'joshkaposh-iterator';
import type { Option } from 'joshkaposh-option';
import { type DefaultHasher, type Hasher, IndexMap, valueOf, Bucket, Ord } from './map'
import { Difference, Intersection, SymmetricDifference, Union, Drain, Splice } from './iter';

export class IndexSet<
    T extends Ord = any,
    S extends Hasher<NoInfer<T>, any> = DefaultHasher<NoInfer<T>>
> {
    #map: IndexMap<T, T, S>;
    constructor(iterable?: Iterable<T>);
    constructor(map?: IndexMap<T, T, S>)
    constructor(
        map: IndexMap<T, T, S> | Iterable<T> = new IndexMap<T, T, S>(),
        hasher: S = valueOf as S
    ) {
        if (map instanceof IndexMap) {
            this.#map = map;
        } else {
            this.#map = new IndexMap(new Map(
                iter(map)
                    .enumerate()
                    .map(([i, key]) => [hasher(key), [i, key]] as [T, Bucket<T>])
            ),
                Array.from(map)
            )
        }
    }
    /**
     * @returns a new `IndexSet` with the given capacity.
     */
    static withCapacity<T extends Ord>(capacity: number): IndexSet<T, DefaultHasher<T>> {
        return new IndexSet(IndexMap.withCapacity(capacity) as unknown as IndexMap<T, T, DefaultHasher<T>>)
    }


    /**
     * @returns a new `IndexSet` with the given hash function.
     */
    static withHasher<T extends Ord, S extends Hasher<T, any>>(hasher: S): IndexSet<T, S> {
        return new IndexSet(IndexMap.withHasher<T, T, S>(hasher))
    }

    /**
     * @returns a new `IndexSet` with the given capacity and hash function.
     */
    static withCapacityAndHasher<T extends Ord, S extends Hasher<T, any>>(capacity: number, hash: S): IndexSet<T, S> {
        return new IndexSet(IndexMap.withCapacityAndHasher<T, T, S>(capacity, hash))
    }

    /**
     * the hash function of this IndexSet.
     */
    get hasher() {
        return this.#map.hasher;
    }

    /**
     * This should only be used if IndexSet keys do not hold state
     * that changes hashing behaviour.
     * 
     * The existing values will be reused,
     * i.e. no new references for key/value pairs are made.
     *  no new memory allocations expect for internal array.     * 
     * @returns a new IndexSet with it's elements cloned.
     */
    clone() {
        return new IndexSet(this.#map.clone());
    }

    append(other: IndexSet<T>): IndexSet<T, S> {
        const set = IndexSet.withCapacityAndHasher<T, S>(this.size, this.#map.hasher)
        this.#map.keys().for_each(x => set.add(x));
        other.#map.keys().for_each(x => set.add(x));
        return set;
    }

    extend(iterable: Iterable<T>) {
        for (const x of iterable) {
            this.add(x);
        }
        return this;
    }

    clear() {
        this.#map.clear();
    }

    has(x: T): boolean {
        return this.#map.has(x)
    }

    hasIndex(index: number): boolean {
        return this.#map.getIndex(index) === null;
    }

    get size(): number {
        return this.#map.size
    }

    get isEmpty(): boolean {
        return this.#map.isEmpty
    }

    /**
     * 
     * @returns true if and only if this `IndexSet` has no elements that are in `other`.
     */
    isDisjoint(other: IndexSet<T>): boolean {
        const self = this;
        for (const x of self) {
            if (other.has(x)) {
                return false
            }
        }

        return true;
    }

    /**
     * @returns true if and only if this `IndexSet` contains only values found in `other`.
     */
    isSubset(other: IndexSet<T>): boolean {
        const self = this;
        for (const x of self) {
            if (!other.has(x)) {
                return false
            }
        }

        return true;
    }

    /**
     * @returns true if and only if `other` contains only values found in this `IndexSet`
     */
    isSuperset(other: IndexSet<T>): boolean {
        return other.isSubset(this);
    }

    /**
     * @returns the last element in the set or undefined if empty.
     */
    last(): Option<T> {
        return this.#map.last();
    }

    /**
     * moves the element at index `from` to the new index `to`.
     */
    moveIndex(from: number, to: number): void {
        this.#map.moveIndex(from, to)
    }

    /**
     * @returns an Iterator over the "difference" between this IndexSet and `other`
     */
    difference(other: IndexSet<T>): DoubleEndedIterator<T> {
        return new Difference(this, other)
    }

    /**
     * @returns an Iterator over the "symmetric difference" between this [`IndexSet`] and `other`
     */
    symmetricDifference(other: IndexSet<T>): DoubleEndedIterator<T> {
        return new SymmetricDifference(this, other)
    }

    /**
     * @returns an Iterator over the "union" between this [`IndexSet`] and `other`
     */
    union(other: IndexSet<T>): DoubleEndedIterator<T> {
        return new Union(this, other)
    }

    /**
     * @returns an Iterator over the "intersection" between this [`IndexSet`] and `other`
     */
    intersection(other: IndexSet<T>): DoubleEndedIterator<T> {
        return new Intersection(this, other)
    }

    /**
     * @returns the element at the back of the [`IndexSet`] or undefined if empty. 
     */
    pop(): Option<T> {
        return this.#map.pop()
    }

    /**
     * @returns true if an element existed and was removed from the [`IndexSet`]
     */
    delete(x: T): boolean {
        return this.#map.delete(x) != null
    }

    /**
     * Executes the provided callback for each element any will remove any elements the callback returns false for.
     */
    retain(keep: (x: T) => boolean) {
        this.#map.retain(keep);
    }

    /**
     * Performs an in-place reverse of the underlying keys.
     * 
     * If you would rather a non-mutating method or create a new `IndexSet` that is reversed, see `IndexSet.toReversed`.
     */
    reverse() {
        this.#map.reverse();
    }

    /**
     * @returns a copy of an [`IndexSet`] with its elements reversed.
     * If you would rather a mutating method, see `IndexSet.reverse`.
     * 
     */
    toReversed() {
        return this.#map.toReversed();
    }

    shift(): Option<T> {
        return this.#map.shiftEntry()?.[0];
    }

    /**
     * Inserts an element into the set at the given index.
     * This method will insert a new element at the index by shifting any elements it replaced back one index.
     * @throws — Safety: throws a RangeError if index > set.size.
     * @returns — the value at index before it was moved, or undefined if moving wasn't needed.
     */
    shiftInsert(index: number, x: T): Option<T> {
        return this.#map.shiftInsert(index, x, x)
    }

    deleteFull(x: T): Option<[number, T, T]> {
        return this.#map.deleteFull(x);
    }

    /**
     * @returns the element at `index` if one was present.
     */
    deleteIndex(index: number): Option<T> {
        return this.#map.deleteIndex(index);
    }

    sort(cmp?: (a: T, b: T) => -1 | 0 | 1) {
        this.#map.sort(cmp ? (a, _, b) => cmp(a, b) :
            //             L            G         E
            (a, _, b) => a < b ? -1 : a > b ? 1 : 0
        );
    }

    isSorted(): boolean {
        return this.#map.isSorted();
    }

    splice(start: number, end: number, replace_with: IterInputType<[T, T]>): Splice<T, T> {
        return this.#map.splice(start, end, replace_with as IterInputType<[T, T]>)
    }

    splitOff(at: number): IndexSet<T, S> {
        return new IndexSet(this.#map.splitOff(at)) as unknown as IndexSet<T, S>
    }

    swapIndices(from: number, to: number): void {
        this.#map.swapIndices(from, to)
    }

    swapRemove(x: T): Option<T> {
        return this.#map.swapRemove(x);
    }

    swapRemoveFull(x: T): Option<[number, T, T]> {
        return this.#map.swapRemoveFull(x)
    }

    swapRemoveIndex(index: number): Option<T> {
        return this.#map.swapRemoveIndex(index)
    }

    swapTake(value: T): Option<T> {
        const entry = this.#map.swapRemoveEntry(value);
        return entry ? entry[0] : undefined
    }

    truncate(new_length: number) {
        this.#map.truncate(new_length);
    }

    drain(start = 0, end = this.#map.size): Drain<T, T> {
        return new Drain(start, end, this.#map);
    }

    getRange(start = 0, end = this.#map.size) {
        this.#map
            .keys()
            .skip(start)
            .take(end - start);
    }

    indexOf(x: T): Option<number> {
        return this.#map.indexOf(x);
    }

    add(value: T): Option<T> {
        return this.#map.set(value, value);
    }

    addFull(value: T): [number, Option<T>] {
        return this.#map.setFull(value, value);
    }

    addBefore(index: number, value: T): [number, boolean] {
        const res = this.#map.shiftInsert(index, value, value)
        return [index, res === null];
    }

    addAfter(index: number, value: T): [number, boolean] {
        const res = this.#map.shiftInsert(Math.min(this.#map.size, index + 1), value, value)
        return [index, res === null];
    }

    keys(): ExactSizeDoubleEndedIterator<T> {
        return this.#map.keys();
    }

    values(): ExactSizeDoubleEndedIterator<T> {
        return this.#map.keys();
    }

    entries(): ExactSizeDoubleEndedIterator<[T, T]> {
        return this.#map.keys().map(k => [k, k]) as ExactSizeDoubleEndedIterator<[T, T]>
    }

    iter(): ExactSizeDoubleEndedIterator<T> {
        return this.#map.keys();
    }

    [Symbol.iterator]() {
        return this.iter();
    }
}