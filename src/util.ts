import { is_some, Option } from "joshkaposh-option";

export type Orderable<T> = T extends Ord ? T : never

export type Ord = Option<(string | boolean | number | {
    [Symbol.toPrimitive](): string;
}) & {}>

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

export function swap_remove<T>(array: T[], i: number): Option<T> {
    if (array.length > 0 && i < array.length - 1) {
        throw new Error('cannot swap')
    }
    return swap_remove_unchecked(array, i)
}

export function swap_remove_unchecked<T>(array: T[], i: number): Option<T> {
    swap(array, i, array.length - 1)
    return array.pop()
}

/**
 * @description
 * Splices an array at the given index and returns it.
 * 
 * The new array will receive the elements starting `index` up to `N` elements,
 * where `N` is `array.length - index` 
 * 
 */
export function split_off<T>(array: T[], index: number) {
    return array.splice(index, array.length - index);
}

// @ts-ignore
export function reserve(array: any[], additional: number) { }

export function extend<T>(target: T[] | Set<T>, src: Iterable<T>, default_value?: Option<T>) {
    if (Array.isArray(target)) {
        extend_array(target, src as unknown as Iterable<T>, default_value)
    } else if (target instanceof Set) {
        extend_set(target, src as unknown as Iterable<T>, default_value);
    } else {
        console.warn('Cannot use a generic extend as it only works when target is an Array or Set. Try making your own implementation for extending your data structure.')
    }
}

export function extend_array<T>(target: T[], src: Iterable<T>, default_value?: Option<T>): void {
    if (is_some(default_value)) {
        target.push(...Array.from(src, () => default_value))
    } else {
        target.push(...src)
    }
}


export function extend_set<T>(target: Set<T>, src: Iterable<T>, default_value?: Option<T>): void {
    for (const v of src) {
        target.add(default_value ?? v);
    }
}

export function extend_map<K, V>(target: Map<K, V>, src: Iterable<[K, V]>) {
    for (const [k, v] of src) {
        target.set(k, v);
    }
}

// export function capacity(len: number): number {
//     if (len < 4) {
//         return 4
//     }
//     const cap = 1 << 31 - Math.clz32(len);
//     if (cap <= len) {
//         return cap << 1;
//     }

//     return cap
// }
