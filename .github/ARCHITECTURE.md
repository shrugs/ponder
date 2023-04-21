# Architecture

Note: this document is an incomplete work-in-progress.

A Ponder app is represented by an instance of the `Ponder` class. Each `Ponder` instance has a number of services:

1. Blockchain data service
2. Event handler service
3. HTTP server service
4. Reload service

Each of these services subclasses `EventEmitter` and primarily communicate with one another via events. Here's an example:

```ts
class Ponder {
  // ...

  registerHandlers() {
    this.reloadService.on("newHandlers", async ({ handlers }) => {
      await this.resources.entityStore.reset();
      this.eventHandlerService.resetEventQueue({ handlers });
      await this.eventHandlerService.processEvents();
    });
  }
}
```

Here's what this means: The `ReloadService` detected a change in a user file, say `src/index.ts` and then rebuilt the user's code using `esbuild`. Then, it emitted the `"newHandlers"` event passing the new `handlers` object. In response, the `EntityStore` resets, dropping all data from the entity tables. Then, the `EventHandlerService` resets the event queue using the new handlers, and finally processes all events.

All service event subscriptions are registered in the `Ponder` class.

## Blockchain data service

This is arguably the most complex and most important service. It's responsible for:

- Fetching finalized (historical) logs, blocks, and transactions
- Fetching unfinalized (live) logs, blocks, and transactions
- Maintaining a record of which block ranges have been fetched for each log filter key
- Handling chain reorganizations

## Key concepts

### Log filter

A **log filter** (can also be thought of as a log _source_) is an interface that Ponder uses internally to represent a collection of event logs. Ponder builds a log filter object for each `contract` and `filter` present in `ponder.config.ts`. Log filters are referenced by name in event handlers: `ponder.on("LogFilterName:EventName", ...)`.

Every log filter has a unique _key_ derived from the chain ID, addresses, and topics: `${chainId}-${addresses}-${topics}`. For a simple one-contract log filter, the key would look like: `1-["0x9746fD0A77829E12F8A9DBe70D7a322412325B91"]-null`.

Ponder uses log filter keys to keep track of which block ranges have been fetched and cached. The table has the following schema:

```ts
type LogFilterCachedRange = {
  key: string; // Log filter key, `${chainId}-${addresses}-${topics}`
  fromBlock: number;
  toBlock: number;
};
```

Consider a scenario where this record is present in the table. This means that all of the event logs emitted by the contract `"0x9746fD0A77829E12F8A9DBe70D7a322412325B91"` on mainnet between block `100` and `200` have been fetched, AND the block & transaction associated with each of those event logs are also present.

```ts
const cachedRange = {
  key: '1-["0x9746fD0A77829E12F8A9DBe70D7a322412325B91"]-null',
  fromBlock: 100,
  toBlock: 200
};
```
