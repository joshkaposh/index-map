import { type IterInputType, type DoubleEndedIterator, type ExactSizeDoubleEndedIterator, type Range, iter } from 'joshkaposh-iterator';
import type { Option } from 'joshkaposh-option';
import type { Ord, Orderable } from './util'
import { IndexMap } from './map'
import { Difference, Intersection, SymmetricDifference, Union, Drain, Splice } from './iter';

export class IndexSet<T = Ord> {
    #map: IndexMap<Orderable<T>, null>;
    constructor(map?: IndexMap<Orderable<T>, null>)
    constructor(iterable?: IterInputType<T>)
    constructor(map: IndexMap<Orderable<T>, null> | IterInputType<T> = new IndexMap()) {
        map = (map instanceof IndexMap ? map : new IndexMap(iter(map).map(x => [x, null] as [Orderable<T>, null])))
        this.#map = map;
    }

    static with_capacity<T>(n: number): IndexSet<T> {
        return new IndexSet(IndexMap.with_capacity(n))
    }

    append(other: IndexSet<T>): void {
        other.drain(0, other.len()).for_each(([x]) => this.insert(x as Orderable<T>))
    }

    clear() {
        this.#map.clear();
    }

    contains(x: T): boolean {
        return this.#map.contains_key(x as Orderable<T>)
    }

    len(): number {
        return this.#map.len()
    }

    is_empty(): boolean {
        return this.#map.is_empty()
    }

    is_disjoint(other: IndexSet<T>): boolean {
        return !this.iter().any(x => other.contains(x))
    }

    is_subset(other: IndexSet<T>): boolean {
        // return true if and only if this contains only values found in other
        return this.iter().all(x => other.contains(x))
    }

    is_superset(other: IndexSet<T>): boolean {
        return other.is_subset(this);
    }

    last(): Option<T> {
        return this.#map.last()
    }

    move_index(from: number, to: number): void {
        this.#map.move_index(from, to)
    }

    difference(other: IndexSet<T>): DoubleEndedIterator<T> {
        return new Difference(this, other)
    }

    symmetric_difference(other: IndexSet<T>): DoubleEndedIterator<T> {
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

    remove(x: T): Option<T> {
        return this.#map.shift_remove(x as Orderable<T>)
    }

    replace(x: T): Option<T> {
        return this.insert(x as Orderable<T>)
    }

    replace_full(x: T) {
        return this.insert_full(x as Orderable<T>)
    }

    retain(keep: (x: T) => boolean) {
        this.#map.retain(keep)
    }

    reverse(): void {
        this.#map.reverse();
    }

    shift(): Option<T> {
        return this.#map.shift()
    }

    shift_insert(index: number, x: T): Option<T> {
        return this.#map.shift_insert(index, x as Orderable<T>, null);
    }

    shift_remove(x: T): Option<T> {
        return this.#map.shift_remove(x as Orderable<T>)
    }

    shift_remove_full(x: T): Option<[number, T, null]> {
        return this.#map.shift_remove_full(x as Orderable<T>)
    }

    shift_remove_index(index: number): Option<T> {
        return this.#map.shift_remove_index(index)
    }

    /**
     * @description Removes and returns the value in the set, if any, that is equal to the given one
     */
    shift_take(value: T) {
        return this.#map.shift_remove(value as Orderable<T>)
    }

    sort() {
        this.#map.sort_keys();
    }

    sort_by(cmp: (a: T, b: T) => -1 | 0 | 1) {
        this.#map.sort_by((a, _, b) => cmp(a, b))
    }

    is_sorted(): boolean {
        return this.#map.is_sorted();
    }

    splice(start: number, end: number, replace_with: IterInputType<[T, null]>): Splice<T, null> {
        return this.#map.splice(start, end, replace_with as IterInputType<[Orderable<T>, null]>)
    }

    split_off(at: number): IndexSet<T> {
        return new IndexSet(this.#map.split_off(at))
    }

    swap_indices(from: number, to: number): void {
        this.#map.swap_indices(from, to)
    }

    swap_remove(x: T): Option<T> {
        return this.#map.swap_remove(x as Orderable<T>)
    }

    swap_remove_full(x: T): Option<[number, T, null]> {
        return this.#map.swap_remove_full(x as Orderable<T>)

    }

    swap_remove_index(index: number): Option<T> {
        return this.#map.swap_remove_index(index)

    }

    swap_take(value: T): Option<T> {
        const entry = this.#map.swap_remove_entry(value as Orderable<T>);
        return entry ? entry[0] : undefined
    }

    truncate(new_len: number) {
        this.#map.truncate(new_len);
    }

    drain(from: number, to: number): Drain<T, null> {
        return new Drain(from, to, this.#map)
    }

    get(x: T): Option<T> {
        return this.#map.get(x as Orderable<T>)
    }

    get_full(x: T): Option<[number, T, null]> {
        return this.#map.get_full(x as Orderable<T>)
    }

    get_index(index: number): Option<T> {
        return this.#map.get_index(index)
    }

    get_range(range: Range) {
        return this.#map.get_range(range)
    }

    get_index_of(x: Orderable<T>): Option<number> {
        return this.#map.get_index_of(x)
    }

    insert(value: Orderable<T>): Option<T> {
        return this.#map.insert(value, null);
    }

    insert_full(value: Orderable<T>): [number, Option<T>] {
        return this.#map.insert_full(value, null);
    }

    insert_before(index: number, value: Orderable<T>): [number, boolean] {
        const res = this.#map.shift_insert(index, value, null)
        return [index, res === null];
    }

    keys(): ExactSizeDoubleEndedIterator<T> {
        return this.#map.keys()
    }

    values(): ExactSizeDoubleEndedIterator<T> {
        return this.#map.keys()
    }

    entries(): DoubleEndedIterator<[T, null]> {
        return this.#map.entries()
    }

    iter(): ExactSizeDoubleEndedIterator<T> {
        return this.#map.keys();
    }

    [Symbol.iterator]() {
        return this.iter();
    }
}