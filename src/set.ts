import { type IterInputType, type DoubleEndedIterator, type ExactSizeDoubleEndedIterator, iter } from 'joshkaposh-iterator';
import type { Option } from 'joshkaposh-option';
import { type Ord, type Orderable, type DefaultHasher, type Hasher, IndexMap } from './map'
import { Difference, Intersection, SymmetricDifference, Union, Drain, Splice } from './iter';

export class IndexSet<
    T extends any,
    S extends Hasher<Orderable<T>, any> = DefaultHasher<Orderable<T>>
> {
    #map: IndexMap<Orderable<T>, Orderable<T>>;
    constructor(map?: IndexMap<Ord, Orderable<T>>)
    constructor(iterable?: IterInputType<T>)
    constructor(map: IndexMap<Orderable<T>, Orderable<T>> | IterInputType<T> = new IndexMap<Orderable<T>, Orderable<T>, S>()) {
        this.#map = (map instanceof IndexMap ? map : new IndexMap(iter(map).map(x => [x, x] as [Orderable<T>, Orderable<T>]))) as IndexMap<Orderable<T>, Orderable<T>, S>;
    }

    static withCapacity<T extends Ord>(capacity: number): IndexSet<T> {
        return new IndexSet(IndexMap.withCapacity(capacity))
    }

    static withHasher<S extends Hasher<Ord, any>>(hasher: S): IndexSet<Parameters<S>[0], S> {
        return new IndexSet(IndexMap.withHasher(hasher))
    }

    static withCapacityAndHasher<S extends Hasher<Ord, any>>(capacity: number, hasher: S): IndexSet<Parameters<S>[0], S> {
        return new IndexSet(IndexMap.withCapacityAndHasher(capacity, hasher))
    }

    append(other: IndexSet<T>): IndexSet<T, S> {
        const set = IndexSet.withCapacityAndHasher(this.size, this.#map.hasher as Hasher<Ord, any>)
        this.#map.keys().for_each(x => set.add(x));
        other.#map.keys().for_each(x => set.add(x));

        return set as unknown as IndexSet<T, S>;
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
        return this.#map.has(x as Orderable<T>)
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
        return !this.iter().any(x => other.has(x));
    }

    /**
     * @returns true if and only if this `IndexSet` contains only values found in `other`.
     */
    isSubset(other: IndexSet<T>): boolean {
        return this.iter().all(x => other.has(x))
    }

    /**
     * @returns true if and only if `other` contains only values found in this `IndexSet`
     */
    isSuperset(other: IndexSet<T>): boolean {
        return other.isSubset(this);
    }

    last(): Option<T> {
        return this.#map.last();
    }

    moveIndex(from: number, to: number): void {
        this.#map.moveIndex(from, to)
    }

    difference(other: IndexSet<T>): DoubleEndedIterator<T> {
        return new Difference(this, other)
    }

    symmetricDifference(other: IndexSet<T>): DoubleEndedIterator<T> {
        return new SymmetricDifference(this, other)
    }

    union(other: IndexSet<T>): DoubleEndedIterator<T> {
        return new Union(this, other)
    }

    intersection(other: IndexSet<T>): DoubleEndedIterator<T> {
        return new Intersection(this, other)
    }

    pop(): Option<T> {
        return this.#map.pop()
    }

    delete(x: T): boolean {
        return this.#map.delete(x as Orderable<T>) != null
    }

    replace(x: T): Option<T> {
        return this.add(x)
    }

    replaceFull(x: T) {
        return this.addFull(x);
    }

    retain(keep: (x: T) => boolean) {
        this.#map.retain(keep)
    }


    reverse() {
        this.#map.reverse();
    }

    /**
     * 
     * @returns a copy of an [`IndexSet`] with its elements reversed.
     */
    toReversed() {
        return this.#map.toReversed();
    }

    shift(): Option<T> {
        return this.#map.shiftEntry()?.[0];
    }

    shiftInsert(index: number, x: T): Option<T> {
        return this.#map.shiftInsert(index, x as Orderable<T>, x as Orderable<T>)
    }

    deleteFull(x: T): Option<[number, T, T]> {
        return this.#map.deleteFull(x as Orderable<T>);
    }

    /**
     * Deletes the element at `index` if one was present.
     * @returns the element at `index` if one was present.
     */
    deleteIndex(index: number): Option<T> {
        const entry = this.#map.getIndexEntry(index)
        if (entry) {
            this.#map.deleteIndex(index);
            return entry[0];
        }

        return;
    }

    /**
     * @description Removes and returns the value in the set, if any, that is equal to the given one
     */
    shiftTake(value: T): Option<T> {
        return this.#map.deleteEntry(value as Orderable<T>)?.[0]
    }

    sort(cmp?: (a: T, b: T) => -1 | 0 | 1) {
        this.#map.sort(cmp ? (a, _, b) => cmp(a, b) : (a, _, b) => {
            if (a < b) {
                return -1
            } else if (a > b) {
                return 1;
            } else {
                return 0
            }
        });
    }

    isSorted(): boolean {
        return this.#map.isSorted();
    }

    splice(start: number, end: number, replace_with: IterInputType<[T, T]>): Splice<T, T> {
        return this.#map.splice(start, end, replace_with as IterInputType<[Orderable<T>, Orderable<T>]>)
    }

    splitOff(at: number): IndexSet<T, S> {
        return new IndexSet(this.#map.splitOff(at)) as unknown as IndexSet<T, S>
    }

    swapIndices(from: number, to: number): void {
        this.#map.swapIndices(from, to)
    }

    swapRemove(x: T): Option<T> {
        return this.#map.swapRemove(x as Orderable<T>)
    }

    swapRemoveFull(x: T): Option<[number, T, T]> {
        return this.#map.swapRemoveFull(x as Orderable<T>)
    }

    swapRemoveIndex(index: number): Option<T> {
        return this.#map.swapRemoveIndex(index)
    }

    swapTake(value: T): Option<T> {
        const entry = this.#map.swapRemoveEntry(value as Orderable<T>);
        return entry ? entry[0] : undefined
    }

    truncate(new_length: number) {
        this.#map.truncate(new_length);
    }

    drain(start = 0, end = this.#map.size): Drain<T, T> {
        return new Drain(start, end, this.#map);
    }

    hasIndex(index: number): boolean {
        return this.#map.getIndex(index) === null;
    }

    getRange(start = 0, end = this.#map.size) {
        this.#map
            .keys()
            .skip(start)
            .take(end - start);
    }

    indexOf(x: T): Option<number> {
        return this.#map.indexOf(x as Orderable<T>);
    }

    add(value: T): Option<T> {
        return this.#map.set(value as Orderable<T>, value as Orderable<T>);
    }

    addFull(value: T): [number, Option<T>] {
        return this.#map.setFull(value as Orderable<T>, value as Orderable<T>);
    }

    addBefore(index: number, value: T): [number, boolean] {
        const res = this.#map.shiftInsert(index, value as Orderable<T>, value as Orderable<T>)
        return [index, res === null];
    }

    addAfter(index: number, value: T): [number, boolean] {
        const res = this.#map.shiftInsert(Math.min(this.#map.size, index + 1), value as Orderable<T>, value as Orderable<T>)
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