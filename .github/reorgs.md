This is a proposal for how Ponder will handle chain reorganizations.

# TL;DR

- Use `removed` logs returned by `eth_getFilterChanges` to determine if a reorg _that affects logs we care about_ has occurred.
- Maintain a **finalized block number** for each network.
- Store finalized and unfinalized log, block, and transaction data separately.
- Move the finalized block number forward as soon as possible based on the network's `finalizationBlockCount`. Also convert data from unfinalized -> finalized during this process.

# Questions

- Is is safe to rely on removed logs from `eth_getFilterChanges` to detect reorgs? Do all Ethereum clients behave the same way? The documentation around removed logs is spotty.
- Is it a bad idea for Ponder to rely on filters, when not all RPC providers support them (e.g. Cloudflare)?

# Background

Before diving in, here's some necessary context.

## Blockchain data service

Ponder has a number of internal services. The blockchain data service is responsible for fetching and caching blockchain data for the contracts and filters specified in `ponder.config.ts`.

During the backfill, the service uses `eth_getLogs` and `eth_getBlockByHash` to fetch every event log and its associated block & transaction, then writes this data to the `BlockchainDataStore`.

The "frontfill" (real-time data) process is slightly different. On startup, Ponder gets the _latest_ block for each network, and this is used as the cutoff block number separating the backfill and the frontfill. Then, an event filter is created using `eth_newFilter` and the service starts polling for new logs matching the filter using `eth_getFilterChanges`. Whenever new logs are returned, the service calls `eth_getBlockByHash` to fetch the block and tx for each log (just like in the backfill), and writes all this data to the `BlockchainDataStore`.

(Note: Ponder's other major service is the event handler service. It queries log, block, and transaction data from the `BlockchainDataStore`, constructs `event` objects, and passes them to user-defined handler functions. The handler functions then insert data into the `EntityStore`, which in turn powers the GraphQL API.)

## Cached ranges

The `BlockchainDataStore` has a table called `LogFilterCachedRanges` with the following (psuedo) schema:

```ts
type LogFilterCachedRanges = {
  logFilterKey: string; // Log filter key, `${chainId}-${addresses}-${topics}`
  fromBlock: number;
  toBlock: number;
};
```

Whenever the backfill or frontfill writes a log (and its associated block & transaction) to the `BlockchainDataStore`, this table gets updated to reflect the range of blocks that are now "cached" for this log filter.

## Problems with the current approach

1. At the moment, Ponder assumes any logs returned by `eth_getFilterChanges` are finalized, which is not true. This means that whenever there is a reorg, the `BlockchainDataStore` ends up out of sync with the network.
2. Using `eth_getBlockByNumber(blockTag: "latest")` as the cutoff block number between the backfill and the frontfill is unsafe, because it assumes all blocks up to the latest block are finalized.

# Proposal

## New concepts

### Finalized vs unfinalized blockchain data

Today, all of the tables in the `BlockchainDataStore` treat blockchain data as finalized. The proposed approach introduces a new set of tables for unfinalized data using the naming scheme `Unfinalized{TableName}`. The finalized tables are just called `{TableName}`.

### `eth_getFilterChanges` behavior

Quick note on the behavior of `eth_getFilterChanges`. Log objects returned by this method have a boolean `removed` field. Most of the time, `removed` is false, which means this is a new log. If `removed` is true, it means that this log was returned in a previous `eth_getFilterChanges` poll for this filter ID, but has since been reorged out. Example:

```ts
await eth_getFilterChanges();
// [
//   { logId: "0x1", blockNumber: 1, removed: false },
//   { logId: "0x2", blockNumber: 1, removed: false }
// ]

await eth_getFilterChanges();
// [
//   { logId: "0x3", blockNumber: 2, removed: false },
//   { logId: "0x4", blockNumber: 2, removed: false }
// ]

await eth_getFilterChanges();
// [
//   { logId: "0x1", blockNumber: 1, removed: true },
//   { logId: "0x2", blockNumber: 1, removed: true },
//   { logId: "0x7", blockNumber: 1, removed: false },
//   { logId: "0x5", blockNumber: 3, removed: false },
//   { logId: "0x6", blockNumber: 3, removed: false }
// ]
```

In the 3rd poll, the response contains removed logs from block `1`, and also includes a new log from the accepted block.

## Procedure

The proposed reorg handling approach uses removed logs to detect reorgs. Consider the following approach _for a single network_:

1. Determine the latest finalized block number. Use this as the cutoff between the backfill and the frontfill (finalization cutoff). Also determine the `finalizationBlockCount` for the network (64 on mainnet).
2. Run the backfill for the requested block range up to (and including) the finalization cutoff. Write data to the finalized tables.
3. For the frontfill, create a filter (`eth_newFilter`) for each log filter, with `fromBlock` equal to the finalization cutoff.
4. Poll for changes using `eth_getFilterChanges`. If we receive a batch of logs _without_ any removed logs, process them normally:

   1. Create an `UnfinalizedLog` record for each log.
   2. For each unique block among the logs, call `eth_getBlockByHash` (include transactions). Create an `UnfinalizedBlock` record and an `UnfinalizedTransaction` record for each transaction in the block that emitted a matched log. Also update the `blockTimestamp` field of any `UnfinalizedLog` records created.
   3. Update the `UnfinalizedLogFilterCachedRange` record accordingly.

5. If we receive a batch of logs _with_ removed logs:

   1. Delete the `UnfinalizedLog` record for each removed log. Also delete the `UnfinalizedBlock` and `UnfinalizedTransaction` associated with each removed log (by hash).
   2. Process any normal (non-removed) logs in the batch according to the logic in step 4.
   3. Once this batch of logs is handled, emit the `newReorganization` event.

6. Once a batch of logs is handled, if `UnfinalizedLogFilterCachedRange.toBlock > finalizationCutoff + (2*finalizationBlockCount)`, shift the finalization cutoff:

   1. Set `finalizationCutoff = previousFinalizationCutoff + finalizationBlockCount`.
   2. Copy all `UnfinalizedLog`, `UnfinalizedTransaction`, and `UnfinalizedBlock` records with `blockNumber < finalizationCutoff` over to their corresponding finalized table.
   3. Update `LogFilterCachedRange.toBlock` to `finalizationCutoff`.

## Misc notes

### Finding the current finalized block number

Some EVM networks support the `"finalized"` and `"safe"` commitment levels. If these are available, use `eth_getBlockByNumber("finalized")` to get the current finalized block number. If they are not available, this function could check if the chain ID is present in a manual list of known networks with slow finality (e.g. Polygon). Otherwise, we can assume instant/ single-slot finality and use `eth_getBlockByNumber("latest")`.

### Entity store snapshots

Today, the event handler service has no mechanism for reverting the execution of logs that are later reorged out. There are two potential approaches for resolving this: 1) entity table snapshots, or 2) store all entity versions (aka time-travel). This is out of scope for this proposal, but worth mentioning because it is a source of significant complexity elsewhere in the design.
