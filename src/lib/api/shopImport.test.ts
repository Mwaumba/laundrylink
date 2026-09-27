import { describe, expect, it } from 'vitest';
import { csvToSql, parseCsv, parseHours, parsePin, parseService, toShop } from '../../../scripts/shops-to-sql.mjs';

const header = 'name,type,neighborhood,map_pin,phone,mon_fri_hours,saturday_hours,sunday_hours,laundry,ironing';

describe('shop import', () => {
  it('parses quoted fields and blank lines', () => {
    expect(parseCsv('name,address\n"Mama\'s ""Best""","Shop 4, Plaza"\n\n')).toEqual([
      { name: 'Mama\'s "Best"', address: 'Shop 4, Plaza' },
    ]);
  });

  it('reads pins, hours and prices', () => {
    expect(parsePin('-1.2892, 36.7856')).toEqual({ lat: -1.2892, lng: 36.7856 });
    expect(parseHours('8-19:30')).toEqual({ open: '08:00', close: '19:30', closed: false });
    expect(parseHours('Closed').closed).toBe(true);
    expect(parseService('KES 1,200 per item')).toEqual({ price: 1200, unit: 'item' });
    expect(parseService('yes')).toEqual({ price: null, unit: null });
    expect(parseService('')).toBeNull();
  });

  it('builds an unclaimed, approved listing and escapes quotes', () => {
    const sql = csvToSql(`${header}\nMama's Wash,,Lang'ata,,0700000000,8:00-18:00,,closed,150/kg,\n`);
    expect(sql).toContain("NULL, 'Mama''s Wash', 'mama-s-wash-langata'");
    expect(sql).toContain("'approved', 12, now()");
    expect(sql).toContain("slug = 'laundry'), 150, 'kg'");
    expect(sql).not.toContain("slug = 'ironing'");
  });

  it('reports every bad row at once', () => {
    expect(() => csvToSql(`${header}\nA,,Mars,,0700,,,,yes,\nB,,Karen,,,,,,yes,\nC,,Karen,,0700,,,,,\n`))
      .toThrow(/Row 2 \(A\): neighborhood[\s\S]*Row 3 \(B\): phone[\s\S]*Row 4 \(C\): list at least one service/);
    expect(() => toShop({ name: 'EXAMPLE Shop', neighborhood: 'Karen', phone: '1', laundry: 'yes' })).toThrow(/example row/);
  });
});
