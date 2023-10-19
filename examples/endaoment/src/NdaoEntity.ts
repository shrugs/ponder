import { ponder } from "@/generated";

ponder.on("OrgFundFactory:EntityDeployed", async ({ event, context }) => {
  const { NdaoEntity } = context.entities;
  await NdaoEntity.upsert({
    id: event.params.entity,
    create: { totalEthReceived: 0n, totalUsdcDonationsReceived: 0n },
    update: {},
  });
});

ponder.on("NdaoEntity:EntityDonationReceived", async ({ event, context }) => {
  const { NdaoEntity } = context.entities;

  await NdaoEntity.update({
    id: event.log.address,
    data: ({ current }) => ({
      totalUsdcDonationsReceived:
        current.totalUsdcDonationsReceived + event.params.amountReceived,
    }),
  });
});

ponder.on("NdaoEntity:EntityEthReceived", async ({ event, context }) => {
  const { NdaoEntity } = context.entities;

  await NdaoEntity.update({
    id: event.log.address,
    data: ({ current }) => ({
      totalEthReceived: current.totalEthReceived + event.params.amount,
    }),
  });
});
