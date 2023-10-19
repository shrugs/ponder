import { Model } from "@ponder/core";

import { NdaoEntity, ponder } from "@/generated";

const ensureNdaoEntity = (model: Model<NdaoEntity>, id: string) =>
  model.upsert({
    id,
    create: { totalEthReceived: 0n, totalUsdcDonationsReceived: 0n },
    update: {},
  });

ponder.on("NdaoEntity:EntityDonationReceived", async ({ event, context }) => {
  const id = event.log.address;
  const { NdaoEntity } = context.entities;

  // ensure the entity exists
  await ensureNdaoEntity(NdaoEntity, id);

  await NdaoEntity.update({
    id,
    data: ({ current }) => ({
      totalUsdcDonationsReceived:
        current.totalUsdcDonationsReceived + event.params.amountReceived,
    }),
  });
});

ponder.on("NdaoEntity:EntityEthReceived", async ({ event, context }) => {
  const id = event.log.address;
  const { NdaoEntity } = context.entities;

  // ensure the entity exists
  await ensureNdaoEntity(NdaoEntity, id);

  await NdaoEntity.update({
    id,
    data: ({ current }) => ({
      totalEthReceived: current.totalEthReceived + event.params.amount,
    }),
  });
});
