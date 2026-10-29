/**
 * Release BS fix BS-cm410-2: the help says how a shootout with no order set is shown now. Since PR 410 a
 * default shootout is still one draw, but the report lists it kick by kick, and since BS-cm410-1 the list opens
 * with the penalty taker whose rating leans that draw. The help used to sell "the report lists every kick" as
 * what an order adds.
 */
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import ClubManagerHelp from '@/components/club-manager/ClubManagerHelp';

describe('Club Manager help on shootouts', () => {
  it('says a shootout with nobody listed is one draw shown kick by kick, penalty taker first', () => {
    const text = render(<ClubManagerHelp />).container.textContent ?? '';
    expect(text).toContain('With nobody listed it is still one draw that leans toward the stronger side and your penalty taker, and the report tells it kick by kick too: your penalty taker first, then your best players, the keeper last.');
    expect(text).not.toContain('where the old one draw');
  });
});
