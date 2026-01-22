import { testWithSynpress } from "@synthetixio/synpress";
import { Phantom, phantomFixtures } from "@synthetixio/synpress/playwright";
import basicSetup from "../test/wallet-setup/basic.setup";

const test = testWithSynpress(phantomFixtures(basicSetup));

const { expect } = test;

test("should connect wallet to the Phantom Test Dapp", async ({ context, page, phantomPage, extensionId }) => {
  // phantom instance
  const phantom = new Phantom(
    context,
    phantomPage,
    basicSetup.walletPassword,
    extensionId,
  );

  // await phantom.openSettings();
  // Toggle in Active Networks
  // await phantomPage.getByRole("button", { name: "Active Networks" }).click();
  // await phantomPage.getByRole("button", { name: "HyperEVM" }).click();
  // await phantomPage.getByRole("button", { name: "Ethereum" }).click();
  // await phantomPage.getByRole("button", { name: "Base" }).click();

  await page.goto("/");

  await page.locator("#connectButton").click();

  const modalHeader = page.getByText("Log in or sign up");
  await expect(modalHeader).toBeVisible({ timeout: 10000 });

  const phantomButton = page.getByRole("button", { name: "Phantom" });
  await expect(phantomButton).toBeVisible();
  await phantomButton.click();

  // Connect Phantom
  await phantom.connectToDapp();
  await page.waitForTimeout(10000);

  // Sign message to confirm login
  try {
    await phantom.confirmSignature();
  } catch (e) {
    console.log("Signature confirmation might not be needed or failed:", e);
  }


  await page.waitForTimeout(300000);
});
