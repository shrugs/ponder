import { Address, Hex } from "viem";

import { Network } from "./config/networks";

type LogFilter = {
  network: Network;
  addresses: Address[] | undefined;
  topics: (Hex | Hex[] | null)[] | undefined;
  fromBlock: number | undefined;
  toBlock: number | undefined;
};

type LogEvent = {
  log: any;
  block: any;
  transaction: any;
};

// In the future, this might also include TraceEvent (for transaction call handlers).
type Event = LogEvent;

interface BlockchainEventService {
  constructor_(options: { logFilters: LogFilter[] }): void;

  /*
   * Fetches and stores the initial finalization block number/timestamp
   * for each configured networks.
   *
   * Must be completed before starting the backfill or frontfill.
   */
  setup(): Promise<{
    // The minimum (oldest) finalization timestamp across all configured networks.
    // When events are available beyond this timestamp, the backfill is complete.
    initialFinalizationTimestamp: number;
  }>;

  /*
   * Fetches all logs, blocks and transactions up to the initial finalization block
   * number for each configured log filter.
   *
   * Emits the `newEvents` event.
   */
  backfill(): Promise<void>;

  /*
   * Begins polling for live logs matching each configured log filter.
   *
   * Emits the `newFinalizationCheckpoint`, `newReorganization`, and `newEvents` events.
   */
  startFrontfill(): void;

  /*
   * Gracefully shuts down the service.
   */
  kill(): void;

  /*
   * Returns all blockchain events (log + block/tx) for the configured log filters
   * matching the specified pagination parameters.
   *
   * The EventHandlerService uses this method to fetch events that are processed
   * by user-defined handler functions.
   */
  getEvents(options: {
    fromTimestamp: number;
    toTimestamp: number;
    skip: number | undefined;
    limit: number | undefined;
  }): { events: Event[] };

  events: {
    /*
     * Fired whenever the oldest finalization checkpoint among all
     * configured networks moves forward.
     *
     * In response to this event, the EventHandlerService fetches and runs
     * all newly-finalized events against the finalized user database.
     */
    newFinalizationCheckpoint: { timestamp: number };

    /*
     * Fired whenever the service receives and rectifies removed logs
     * for any of the configured log filters.
     *
     * In response to this event, the EventHandlerService creates a copy of the
     * finalized user database, fetches and runs all unfinalized events against it,
     * and swaps this new database in as the unfinalized user database.
     */
    newReorganization: undefined;

    /*
     * Fired whenever the service has recieved and stored new events
     * for the configured log filters.
     *
     * In response to this event, the EventHandlerService calls `getEvents`
     * for the new timestamp range and handles those events.
     */
    newEvents: { toTimestamp: number };
  };
}

/*
 * The remote/local event service stuff is really on a network level, i suspect.
 * Like, the cloud platform will probably have a list of supported chains,
 * And have basically just one API endpoint that looks like getEvents above.
 * The tricky bit will be interleaving remote and local, i think, and to get pagination working
 * As expected there. What's the solve?
 *
 * Ok maybe think less about remote/local for now. Like, for the near future, there will be no remote
 * networks. Interesting to think that maybe this interleaving problem will be unavoidable, like if
 * it ends up being possible to add arbitrary event sources.
 *
 */

interface EventHandlerService {
  /*
   * Runs whenever the BlockchainEventService emits a `newReorganization` event.
   *
   * 1) Create a copy of the finalized user database
   * 2) Set this as the new unfinalized database and drop the old unfinalized database
   * 3) Fetch and run the latest unfinalized events against the new unfinalized database
   */
  reloadUnfinalizedEvents(): Promise<void>;

  /*
   * Runs whenever the BlockchainEventService emits a `newFinalizationCheckpoint` event.
   *
   * 1) Create a copy of the finalized user database
   * 2) Set this as the new unfinalized database, drop the old unfinalized database
   * 3) Fetch and run all unfinalized events against the new unfinalized database
   */
  updateFinalizationCheckpoint(options: { timestamp: number }): Promise<void>;

  /*
   * Processes the specified range of events against the specified database.
   *
   * 1) Create a copy of the finalized user database
   * 2) Set this as the new unfinalized database, drop the old unfinalized database
   * 3) Fetch and run all unfinalized events against the new unfinalized database
   */
  processEvents(options: { store: EntityStore }): Promise<void>;
}
