import { AvailableFieldsSampleValue } from '../../../src/ui/RelevanceInspector/AvailableFieldsTable';
import { MockEnvironmentBuilder, IMockEnvironment } from '../../MockEnvironment';
import { $$, Dom } from '../../Test';
import { IFieldDescription } from '../../../src/rest/FieldDescription';
import { FakeResults } from '../../Fake';

export function AvailableFieldsSampleValueTest() {
  describe('AvailableFieldsSampleValue', () => {
    let container: Dom;
    let bindings: IMockEnvironment;
    let description: IFieldDescription;
    let spyListFields: jasmine.Spy;

    beforeEach(() => {
      container = $$('div');
      bindings = new MockEnvironmentBuilder().build();
      spyListFields = jasmine.createSpy('listFields');
      spyListFields.and.returnValue([{ value: '1' }, { value: '2' }]);
      bindings.searchEndpoint.listFieldValues = spyListFields;
      description = FakeResults.createFieldDescription();
    });

    it('should build a button', () => {
      const sampleValues = new AvailableFieldsSampleValue();

      sampleValues.init({
        value: {
          content: {
            description,
            bindings,
            container
          }
        }
      });

      expect(sampleValues.getGui().tagName.toLowerCase()).toBe('button');
    });

    it('should call on list fields on button mouse hover if the field is group by', () => {
      const sampleValues = new AvailableFieldsSampleValue();
      description.groupByField = true;
      sampleValues.init({
        value: {
          content: {
            description,
            bindings,
            container
          }
        }
      });

      const btn = sampleValues.getGui();
      $$(btn).trigger('mouseover');
      expect(spyListFields).toHaveBeenCalledWith({ field: FakeResults.createFieldDescription().name });
    });

    it('should call on search on button mouse hover if the field is not group by', () => {
      const sampleValues = new AvailableFieldsSampleValue();
      description.groupByField = false;
      let spySearch = jasmine.createSpy('search');
      spySearch.and.returnValue(FakeResults.createFakeResult);
      bindings.searchEndpoint.search = spySearch;
      sampleValues.init({
        value: {
          content: {
            description,
            bindings,
            container
          }
        }
      });

      const btn = sampleValues.getGui();
      $$(btn).trigger('mouseover');
      expect(bindings.searchEndpoint.search).toHaveBeenCalled();
    });
  });
}
