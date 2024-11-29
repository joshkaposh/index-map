import { type IterInputType, type SizeHint, done, iter, DoubleEndedIterator, ExactSizeDoubleEndedIterator, ExactSizeIterator, Iterator, Range, item } from 'joshkaposh-iterator';
import { type Bucket, IndexMap, IndexSet } from ".";
import type { Orderable } from './util';
import type { Option } from 'joshkaposh-option';

export class Intersection<T> extends DoubleEndedIterator<T> {
    #iter: DoubleEndedIterator<T>;
    #other: IndexSet<T>
    constructor(a: IndexSet<T>, b: IndexSet<T>) {
        super()
        this.#iter = a.iter()
        this.#other = b;
    }

    override into_iter(): DoubleEndedIterator<T> {
        this.#iter.into_iter();
        return this;
    }

    override next(): IteratorResult<T, any> {
        let n;
        while (!(n = this.#iter.next()).done) {
            if (this.#other.contains(n.value)) {
                return item(n.value);
            }
        }
        return done()
    }

    override next_back(): IteratorResult<T, any> {
        let n;
        while (!(n = this.#iter.next_back()).done) {
            if (this.#other.contains(n.value)) {
                return item(n.value)
            }
        }
        return done()
    }

    override size_hint(): [number, Option<number>] {
        return [0, this.#iter.size_hint()[1]]
    }
}

export class Union<T> extends DoubleEndedIterator<T> {
    #iter: DoubleEndedIterator<T>
    constructor(a: IndexSet<T>, b: IndexSet<T>) {
        super()
        this.#iter = a.iter().chain(b.difference(a))
    }

    override into_iter(): DoubleEndedIterator<T> {
        this.#iter.into_iter();
        return this
    }

    override next(): IteratorResult<T, any> {
        return this.#iter.next()
    }

    override next_back(): IteratorResult<T, any> {
        return this.#iter.next_back()
    }

    override fold<B>(initial: B, fold: (acc: B, x: T) => B): B {
        return this.#iter.fold(initial, fold);
    }

    override rfold<B>(initial: B, fold: (acc: B, x: T) => B): B {
        return this.#iter.rfold(initial, fold);
    }

    override size_hint(): [number, Option<number>] {
        return this.#iter.size_hint()
    }
}

export class Difference<T> extends DoubleEndedIterator<T> {
    #iter: DoubleEndedIterator<T>;
    #other: IndexSet<T>;
    constructor(a: IndexSet<T>, b: IndexSet<T>) {
        super()
        this.#iter = a.iter();
        this.#other = b;
    }


    override into_iter(): DoubleEndedIterator<T> {
        this.#iter.into_iter();
        return this
    }

    override next(): IteratorResult<T, any> {
        let n
        while (!(n = this.#iter.next()).done) {
            if (!this.#other.contains(n.value)) {
                return item(n.value)
            }
        }
        return done()
    }

    override next_back(): IteratorResult<T, any> {
        let n
        while (!(n = this.#iter.next_back()).done) {
            if (!this.#other.contains(n.value)) {
                return item(n.value)
            }
        }
        return done()
    }

    override fold<B>(initial: B, fold: (acc: B, x: T) => B): B {
        return this.#iter.fold(initial, fold);
    }
}

export class SymmetricDifference<T> extends DoubleEndedIterator<T> {
    #iter: DoubleEndedIterator<T>;
    constructor(a: IndexSet<T>, b: IndexSet<T>) {
        super()
        const diffA = a.difference(b);
        const diffB = b.difference(a);
        this.#iter = diffA.chain(diffB);
    }

    override into_iter(): DoubleEndedIterator<T> {
        this.#iter.into_iter();
        return this
    }

    override next(): IteratorResult<T, any> {
        return this.#iter.next();
    }

    override next_back(): IteratorResult<T, any> {
        return this.#iter.next_back();
    }

    override fold<B>(initial: B, fold: (acc: B, x: T) => B): B {
        return this.#iter.fold(initial, fold);
    }

    override rfold<B>(initial: B, fold: (acc: B, x: T) => B): B {
        return this.#iter.rfold(initial, fold)
    }

    override size_hint(): [number, Option<number>] {
        return this.#iter.size_hint()
    }
}

export class Drain<K, V> extends ExactSizeIterator<[K, V]> {
    #map: IndexMap<Orderable<K>, V>;
    #taken: V[];
    #r: Range;
    constructor(range: Range, map: IndexMap<Orderable<K>, V>) {
        super();
        this.#r = range;
        this.#map = map;
        this.#taken = []
    }

    override into_iter(): ExactSizeIterator<[K, V]> {
        console.error('into_iter() does nothing on IndexMap::Iter::Drain')
        return this
    }

    next(): IteratorResult<[K, V]> {
        const ni = this.#r.next();

        if (ni.done) {
            return done()
        } else {
            const index = ni.value - this.#taken.length;
            const [k, v] = this.#map.get_index_entry(index)!;
            this.#taken.push(v);
            this.#map.shift_remove(k);
            return item<[K, V]>([k, v])
        }
    }

    override size_hint(): SizeHint<number, number> {
        return [0, this.#map.len() - this.#taken.length]
    }
}

export class Splice<K, V> extends ExactSizeDoubleEndedIterator<[K, V]> {
    #r: Range;
    #replace: Iterator<[K, V]>
    #map: Map<K, Bucket<V>>;
    #indices: K[];

    #front: number;
    #back: number;

    constructor(map: Map<K, Bucket<V>>, indices: K[], range: Range, replace_with: IterInputType<[K, V]>) {
        super();
        this.#map = map;
        this.#indices = indices
        this.#r = range;
        this.#replace = iter(replace_with);

        this.#front = -1;
        this.#back = map.size;
    }

    override into_iter(): ExactSizeDoubleEndedIterator<[K, V]> {
        console.error('into_iter() does nothing on IndexMap::Iter::Splice')
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

        return item<[K, V]>([old_key, old_val]);
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