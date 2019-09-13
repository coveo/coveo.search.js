import { DynamicFacetRangeValueUtils } from '../../../../src/ui/DynamicFacet/DynamicFacetValues/DynamicFacetRangeValueUtils';
import { DynamicFacetRangeValueFormat } from '../../../../src/ui/DynamicFacet/DynamicFacetRange';

export function DynamicFacetRangeValueUtilsTest() {
  describe('DynamicFacetRangeValueUtils', () => {
    describe('testing formatDisplayValue with the number format', () => {
      it(`when the value a integer
        should return the format correctly`, () => {
        const value = DynamicFacetRangeValueUtils.formatDisplayValue(10, DynamicFacetRangeValueFormat.number);
        expect(value).toBe('10');
      });

      it(`when the value a big integer
        should return the format correctly`, () => {
        const value = DynamicFacetRangeValueUtils.formatDisplayValue(1000, DynamicFacetRangeValueFormat.number);
        expect(value).toBe('1,000');
      });

      it(`when the value a float
        should return the format correctly`, () => {
        const value = DynamicFacetRangeValueUtils.formatDisplayValue(1.001, DynamicFacetRangeValueFormat.number);
        expect(value).toBe('1.001');
      });
    });

    it('should return formatRangeDisplayValue correctly', () => {
      const value = DynamicFacetRangeValueUtils.formatRangeDisplayValue({ start: 0, end: 10 }, DynamicFacetRangeValueFormat.number, 'to');

      expect(value).toBe('0 to 10');
    });

    describe(`testing parseRange`, () => {
      it(`when sending a valid range
      should return it correctly parsed`, () => {
        const validatedRange = DynamicFacetRangeValueUtils.parseRange(
          {
            start: '0.1',
            end: 10,
            endInclusive: true
          },
          DynamicFacetRangeValueFormat.number
        );

        expect(validatedRange).toEqual({
          start: 0.1,
          end: 10,
          endInclusive: true
        });
      });

      it(`when sending a invalid range
      should return null`, () => {
        const validatedRange = DynamicFacetRangeValueUtils.parseRange(
          {
            start: 'yes',
            end: 10,
            endInclusive: true
          },
          DynamicFacetRangeValueFormat.number
        );

        expect(validatedRange).toBeNull();
      });
    });

    it('should return createValueFromRange correctly', () => {
      const value = DynamicFacetRangeValueUtils.createValueFromRange({ start: 0.0191, end: 100000, endInclusive: true });
      expect(value).toBe('0.0191..100000inc');
    });

    describe(`testing createRangeFromValue`, () => {
      it(`when sending a valid value
      should return the range correctly`, () => {
        const range = DynamicFacetRangeValueUtils.createRangeFromValue('0.1..10exc', DynamicFacetRangeValueFormat.number);

        expect(range).toEqual({
          start: 0.1,
          end: 10,
          endInclusive: false
        });
      });

      it(`when sending a value with a wrong range
      should return null`, () => {
        const range = DynamicFacetRangeValueUtils.createRangeFromValue('hello..10inc', DynamicFacetRangeValueFormat.number);
        expect(range).toBeNull();
      });

      it(`when sending a value with an unknown endInclusive value
      should return null`, () => {
        const range = DynamicFacetRangeValueUtils.createRangeFromValue('1..100ish', DynamicFacetRangeValueFormat.number);
        expect(range).toBeNull();
      });
    });
  });
}
