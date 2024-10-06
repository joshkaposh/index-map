import { type IterInputType, DoubleEndedIterator, iter, range, Range } from 'joshkaposh-iterator';
import { Drain, IndexMap, Ord, Orderable, Splice } from './map'
import { Option } from './util';
import { Difference, SymmetricDifference, Union } from './iter';
import { TODO } from 'joshkaposh-iterator/src/util';

export type Unit = null;
export const unit = null;


export class IndexSet<T = Ord> {
    #map: IndexMap<Orderable<T>, Unit>;
    constructor(map?: IndexMap<Orderable<T>, Unit>)
    constructor(iterable: IterInputType<T>)
    constructor(map: IndexMap<Orderable<T>, Unit> | IterInputType<T> = new IndexMap()) {
        map = (map instanceof IndexMap ? map : new IndexMap(iter(map).map(x => [x, unit] as [Orderable<T>, Unit])))
        this.#map = map;
    }

    static with_capacity<T>(n: number): IndexSet<T> {
        return new IndexSet(IndexMap.with_capacity(n))
    }

    append(other: IndexSet<T>): void {
        other.drain(range(0, other.len())).for_each(([x]) => this.insert(x as Orderable<T>))
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
        return this.#map.shift_insert(index, x as Orderable<T>, unit);
    }

    shift_remove(x: T): Option<T> {
        return this.#map.shift_remove(x as Orderable<T>)
    }

    shift_remove_full(x: T): Option<[number, T, Unit]> {
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

    splice(range: Range, replace_with: Iterable<[T, Unit]>): Splice<T, Unit> {
        return this.#map.splice(range, replace_with as Iterable<[Orderable<T>, Unit]>)
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

    swap_remove_full(x: T): Option<[number, T, Unit]> {
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

    drain(range: Range): Drain<T, Unit> {
        return new Drain(range, this.#map)
    }

    get(x: T): Option<T> {
        return this.#map.get(x as Orderable<T>)
    }

    get_full(x: T): Option<[number, T, Unit]> {
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
        return this.#map.insert(value, unit);
    }

    insert_full(value: Orderable<T>): [number, Option<T>] {
        return this.#map.insert_full(value, unit);
    }

    insert_before(index: number, value: Orderable<T>): [number, boolean] {
        return TODO('IndexSet::insert_before', index, value)
    }

    keys(): DoubleEndedIterator<T> {
        return this.#map.keys()
    }

    values(): DoubleEndedIterator<T> {
        return this.#map.keys()
    }

    entries(): DoubleEndedIterator<[T, Unit]> {
        return this.#map.as_entries()
    }

    iter(): DoubleEndedIterator<T> {
        return this.#map.keys();
    }

    [Symbol.iterator]() {
        return this.iter();
    }
}