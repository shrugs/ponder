import { ponder } from "@/generated";

const BURN_ADDRESS = "0x0000000000000000000000000000000000000000";

ponder.on("Blitmap:Transfer", async ({ event, context }) => {
  // Upsert Account entities for the sender and recipient.
  await context.entities.Account.upsert(event.params.from, {
    isOnAllowlist: false,
  });

  await context.entities.Account.upsert(event.params.to, {
    isOnAllowlist: false,
  });

  if (event.params.from === BURN_ADDRESS) {
    // If this was a mint, read the name and tokenURI from the contract, then insert the entity.
    const name = await context.contracts.Blitmap.tokenNameOf(
      event.params.tokenId
    );
    const tokenUri = await context.contracts.Blitmap.tokenURI(
      event.params.tokenId
    );
    await context.entities.Token.insert(event.params.tokenId.toString(), {
      owner: event.params.to,
      name: name,
      tokenUri: tokenUri,
    });
  } else {
    // Otherwise, just update `owner` to the recipient of the Transfer.
    await context.entities.Token.update(event.params.tokenId.toString(), {
      owner: event.params.to,
    });
  }
});

ponder.on("Blitmap:AddedToAllowedList", async ({ event, context }) => {
  await context.entities.Account.upsert(event.params.account, {
    isOnAllowlist: true,
  });
});

ponder.on("Blitmap:RemovedFromAllowedList", async ({ event, context }) => {
  await context.entities.Account.upsert(event.params.account, {
    isOnAllowlist: false,
  });
});
