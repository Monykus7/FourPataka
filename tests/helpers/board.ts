import { expect, type Page } from '@playwright/test';
const equipmentNames = {
  compressor: 'Compressor',
  overdrive: 'Overdrive',
  eq: 'Three-band EQ',
  delay: 'Delay',
};

export async function beginEquipmentDrag(page: Page, kind: keyof typeof equipmentNames) {
  await page.getByRole('button', { name: 'Equipment', exact: true }).click();
  const item = page.getByRole('menuitem', { name: equipmentNames[kind], exact: true });
  const source = (await item.boundingBox())!;
  await page.mouse.move(source.x + source.width / 2, source.y + source.height / 2);
  await page.mouse.down();
  // Native dragstart needs motion; dragTo checks the destination's hit target
  // before that motion, which cannot exercise a menu overlapping the first slot.
  await page.mouse.move(source.x + source.width / 2 + 16, source.y + source.height / 2, {
    steps: 4,
  });
  await expect(page.locator('.equipment-picker')).toHaveClass(/equipment-dragging/);
}

export async function dragEquipment(
  page: Page,
  kind: keyof typeof equipmentNames,
  row = 1,
  column = 1,
) {
  await beginEquipmentDrag(page, kind);
  const slot = page.getByRole('button', {
    name: `Place pedal row ${row} column ${column}`,
    exact: true,
  });
  await slot.evaluate((el) => el.scrollIntoView({ block: 'center', inline: 'nearest' }));
  const destination = (await slot.boundingBox())!;
  await page.mouse.move(
    destination.x + destination.width / 2,
    destination.y + destination.height / 2,
    { steps: 8 },
  );
  await page.mouse.up();
}

export async function placePedal(page: Page, kind: keyof typeof equipmentNames, wire = true) {
  const count = await page.locator('.compact-pedal').count();
  await page.getByRole('button', { name: 'Equipment', exact: true }).click();
  await page.getByRole('menuitem', { name: equipmentNames[kind], exact: true }).click();
  await expect(page.locator('.compact-pedal')).toHaveCount(count);
  await page.locator('.board-slot:not(:disabled)').first().click();
  await expect(page.locator('.compact-pedal')).toHaveCount(count + 1);
  if (wire) await patchBoard(page);
}
export async function patchBoard(page: Page, order?: number[]) {
  const kinds = await page
    .locator('.compact-pedal')
    .evaluateAll((els) =>
      els.map((el) =>
        ['compressor', 'overdrive', 'eq', 'delay'].find((kind) => el.classList.contains(kind))!,
      ),
    );
  const path = order ?? kinds.map((_, i) => i);
  let source = 'Board input output jack';
  for (const i of path) {
    await page.getByRole('button', { name: source, exact: true }).click();
    await page
      .getByRole('button', { name: `${kinds[i]} ${i + 1} input jack`, exact: true })
      .click();
    source = `${kinds[i]} ${i + 1} output jack`;
  }
  await page.getByRole('button', { name: source, exact: true }).click();
  await page.getByRole('button', { name: 'Board output input jack', exact: true }).click();
  await page.getByRole('button', { name: 'Cancel tool', exact: true }).click();
}

export async function selectCable(page: Page, label: string) {
  const path = page.getByRole('button', { name: label, exact: true }).locator('.cable-wire');
  await path.scrollIntoViewIfNeeded();
  // The bounding-box center of a curved cable need not lie on its visible stroke.
  const point = await path.evaluate((element) => {
    const cable = element as SVGPathElement;
    const local = cable.getPointAtLength(cable.getTotalLength() * 0.85);
    return new DOMPoint(local.x, local.y).matrixTransform(cable.getScreenCTM()!).toJSON();
  });
  await page.mouse.click(point.x, point.y);
}
