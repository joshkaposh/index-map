import { done, DoubleEndedIterator } from 'joshkaposh-iterator'
import { IndexSet } from ".";
import { Option } from 'joshkaposh-option';

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
                return { done: false, value: n.value }
            }
        }
        return done()
    }

    override next_back(): IteratorResult<T, any> {
        let n;
        while (!(n = this.#iter.next_back()).done) {
            if (this.#other.contains(n.value)) {
                return { done: false, value: n.value }
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
                return { done: false, value: n.value }
            }
        }
        return done()
    }

    override next_back(): IteratorResult<T, any> {
        let n
        while (!(n = this.#iter.next_back()).done) {
            if (!this.#other.contains(n.value)) {
                return { done: false, value: n.value }
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


