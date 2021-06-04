export const pEachSeries = async <T>(iterable: Iterable<PromiseLike<T> | T>, iterator: ((element: T, index: number) => unknown)): Promise<T[]> => {
	let index = 0;

	for (const value of iterable) {
		await iterator(await value, index++);
	}

    // @ts-expect-error
	return iterable;
};