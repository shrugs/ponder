/**
 * Return the total sum of a list of numeric intervals.
 *
 * @param intervals List of numeric intervals to find the sum of.
 * @returns Sum of the intervals.
 */
export function intervalSum(intervals: [number, number][]) {
  let totalSum = 0;

  for (const [start, end] of intervals) {
    totalSum += end - start + 1;
  }

  return totalSum;
}

/**
 * Return the union of a list of numeric intervals.
 *
 * @param intervals List of numeric intervals to find the union of.
 * @returns Union of the intervals, represented as a list of intervals.
 */
export function intervalUnion(intervals: [number, number][]) {
  if (intervals.length === 0) return [];

  // Sort intervals based on the left end
  intervals.sort((a, b) => a[0] - b[0]);

  const result: [number, number][] = [];
  let currentInterval = intervals[0];

  for (let i = 1; i < intervals.length; i++) {
    const nextInterval = intervals[i];

    if (currentInterval[1] >= nextInterval[0] - 1) {
      // Merge overlapping intervals
      currentInterval[1] = Math.max(currentInterval[1], nextInterval[1]);
    } else {
      // No overlap, add current interval to result
      result.push(currentInterval);
      currentInterval = nextInterval;
    }
  }

  result.push(currentInterval); // Add the last interval
  return result;
}

/**
 * Return the intersection of two lists of numeric intervals.
 *
 * @param list1 First list of numeric intervals.
 * @param list2 Second list of numeric intervals.
 * @returns Intersection of the intervals, represented as a list of intervals.
 */
export function intervalIntersection(
  list1: [number, number][],
  list2: [number, number][]
) {
  const result: [number, number][] = [];
  let i = 0;
  let j = 0;

  while (i < list1.length && j < list2.length) {
    const [start1, end1] = list1[i];
    const [start2, end2] = list2[j];

    const intersectionStart = Math.max(start1, start2);
    const intersectionEnd = Math.min(end1, end2);

    if (intersectionStart <= intersectionEnd) {
      result.push([intersectionStart, intersectionEnd]);
    }

    if (end1 < end2) {
      i++;
    } else {
      j++;
    }
  }

  // Merge potentially overlapping intervals before returning.
  return intervalUnion(result);
}

/**
 * Return the intersection of many lists of numeric intervals.
 *
 * @param list1 First list of numeric intervals.
 * @param list2 Second list of numeric intervals.
 * @returns Difference of the intervals, represented as a list of intervals.
 */
export function intervalIntersectionMany(lists: [number, number][][]) {
  if (lists.length === 0) return [];
  if (lists.length === 1) return lists[0];

  let result: [number, number][] = lists[0];

  for (let i = 1; i < lists.length; i++) {
    result = intervalIntersection(result, lists[i]);
  }

  return intervalUnion(result);
}

/**
 * Return the difference between two lists of numeric intervals (initial - remove).
 *
 * @param initial Starting/base list of numeric intervals.
 * @param remove List of numeric intervals to remove.
 * @returns Difference of the intervals, represented as a list of intervals.
 */
export function intervalDifference(
  initial: [number, number][],
  remove: [number, number][]
) {
  const result: [number, number][] = [];

  let i = 0;
  let j = 0;

  while (i < initial.length && j < remove.length) {
    const interval1 = initial[i];
    const interval2 = remove[j];

    if (interval1[1] < interval2[0]) {
      // No overlap, add interval1 to the result
      result.push(interval1);
      i++;
    } else if (interval2[1] < interval1[0]) {
      // No overlap, move to the next interval in remove
      j++;
    } else {
      // There is an overlap
      if (interval1[0] < interval2[0]) {
        // Add the left part of interval1
        result.push([interval1[0], interval2[0] - 1]);
      }
      if (interval1[1] > interval2[1]) {
        // Update interval1's start to exclude the overlap
        interval1[0] = interval2[1] + 1;
        j++;
      } else {
        // No more overlap, move to the next interval in initial
        i++;
      }
    }
  }

  // Add any remaining intervals from initial
  while (i < initial.length) {
    result.push(initial[i]);
    i++;
  }

  return result;
}

export function getChunks({
  intervals,
  maxChunkSize,
}: {
  intervals: [number, number][];
  maxChunkSize: number;
}) {
  const _chunks: [number, number][] = [];

  for (const interval of intervals) {
    const [startBlock, endBlock] = interval;

    let fromBlock = startBlock;
    let toBlock = Math.min(fromBlock + maxChunkSize - 1, endBlock);

    while (fromBlock <= endBlock) {
      _chunks.push([fromBlock, toBlock]);

      fromBlock = toBlock + 1;
      toBlock = Math.min(fromBlock + maxChunkSize - 1, endBlock);
    }
  }

  return _chunks;
}

export class ProgressTracker {
  target: [number, number];
  private _completed: [number, number][];
  private _required: [number, number][] | null = null;
  private _checkpoint: number | null = null;

  /**
   * Constructs a new ProgressTracker object.

   * @throws Will throw an error if the target interval is invalid.
   */
  constructor({
    target,
    completed,
  }: {
    target: [number, number];
    completed: [number, number][];
  }) {
    if (target[0] > target[1])
      throw new Error(
        `Invalid interval: start (${target[0]}) is greater than end (${target[1]})`
      );

    this.target = target;
    this._completed = completed;
  }

  /**
   * Adds a completed interval.
   *
   * @throws Will throw an error if the new interval is invalid.
   */
  addCompletedInterval(interval: [number, number]) {
    if (interval[0] > interval[1])
      throw new Error(
        `Invalid interval: start (${interval[0]}) is greater than end (${interval[1]})`
      );

    const prevCheckpoint = this.getCheckpoint();
    this._completed = intervalUnion([...this._completed, interval]);
    this.invalidateCache();
    const newCheckpoint = this.getCheckpoint();

    return {
      isUpdated: newCheckpoint > prevCheckpoint,
      prevCheckpoint,
      newCheckpoint,
    };
  }

  /**
   * Returns the remaining required intervals.
   */
  getRequired() {
    if (!this._required) {
      this._required = intervalDifference([this.target], this._completed);
    }
    return this._required;
  }

  /**
   * Returns the checkpoint value. If no progress has been made, the checkpoint
   * is equal to the target start minus one.
   */
  getCheckpoint() {
    if (this._checkpoint !== null) return this._checkpoint;

    const completedIntervalIncludingRequiredStart = this._completed
      .sort((a, b) => a[0] - b[0])
      .find((i) => i[0] <= this.target[0] && i[1] >= this.target[0]);

    if (completedIntervalIncludingRequiredStart) {
      this._checkpoint = completedIntervalIncludingRequiredStart[1];
    } else {
      this._checkpoint = this.target[0] - 1;
    }

    return this._checkpoint;
  }

  private invalidateCache() {
    this._required = null;
    this._checkpoint = null;
  }
}