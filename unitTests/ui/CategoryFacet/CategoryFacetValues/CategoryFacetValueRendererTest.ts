import { CategoryFacetValue, ICategoryFacetValue } from '../../../../src/ui/CategoryFacet/CategoryFacetValues/CategoryFacetValue';
import { CategoryFacetValueRenderer } from '../../../../src/ui/CategoryFacet/CategoryFacetValues/CategoryFacetValueRenderer';
import { CategoryFacet } from '../../../../src/ui/CategoryFacet/CategoryFacet';
import { CategoryFacetTestUtils } from '../CategoryFacetTestUtils';
import { $$ } from '../../../../src/Core';
import { FacetValueState } from '../../../../src/rest/Facet/FacetValueState';

export function CategoryFacetValueRendererTest() {
  describe('CategoryFacetValueRendererTest', () => {
    let facetValue: CategoryFacetValue;
    let facetValueRenderer: CategoryFacetValueRenderer;
    let facet: CategoryFacet;
    let element: HTMLElement;

    beforeEach(() => {
      initializeComponentWithValue(CategoryFacetTestUtils.createFakeFacetValue());
    });

    function initializeComponentWithValue(value: ICategoryFacetValue) {
      facet = CategoryFacetTestUtils.createFakeFacet();
      facetValue = new CategoryFacetValue(value, facet);
      facetValueRenderer = new CategoryFacetValueRenderer(facetValue, facet);
      element = facetValueRenderer.render();
    }

    function getLabel() {
      return $$(element).find('.coveo-dynamic-category-facet-value-label')
    }

    function getButton() {
      return $$(element).find('button')
    }

    function getCount() {
      return $$(element).find('.coveo-dynamic-category-facet-value-count')
    }

    function getArrow() {
      return $$(element).find('.coveo-dynamic-category-facet-value-arrow')
    }

    it('should render without errors', () => {
      expect(() => facetValueRenderer.render()).not.toThrow();
    });

    it('should not render XSS in the displayValue', () => {
      const fakeFacetValueWithXSS = CategoryFacetTestUtils.createFakeFacetValue();
      fakeFacetValueWithXSS.displayValue = '<script>alert("Hehe goodbye")</script>';
      initializeComponentWithValue(fakeFacetValueWithXSS);
      expect(getLabel().textContent).toBe(fakeFacetValueWithXSS.displayValue);
    });

    it('should assign the value to data-value', () => {
      expect(element.getAttribute('data-value')).toBe(facetValue.value);
    });

    it('should assign the value to data-value', () => {
      expect(element.getAttribute('data-value')).toBe(facetValue.value);
    });

    it('should append the correct formatted count', () => {
      expect(getCount().textContent).toBe(`(${facetValue.formattedCount})`);
    });

    it('button should have an aria-label', () => {
      expect(getButton().getAttribute('aria-label')).toBe(facetValue.selectAriaLabel);
    });

    it('button should not have the class "coveo-selected"', () => {
      expect($$(getButton()).hasClass('coveo-selected')).toBe(false);
    });

    it('button should not be disabled', () => {
      expect(getButton().getAttribute('disabled')).toBeFalsy();
    });

    it('button should not have the class "coveo-with-space"', () => {
      expect($$(getButton()).hasClass('coveo-with-space')).toBe(false);
    });

    it('should not prepend an arrow', () => {
      expect(getArrow()).toBeFalsy();
    });

    it(`when clicking on the button
    should trigger the right actions`, () => {
      $$(getButton()).trigger('click');
      expect(facet.selectPath).toHaveBeenCalledWith(facetValue.path);
      expect(facet.enableFreezeFacetOrderFlag).toHaveBeenCalled();
      expect(facet.scrollToTop).toHaveBeenCalled();
      expect(facet.triggerNewQuery).toHaveBeenCalled();
    });

    describe('when value is selected', () => {
      beforeEach(() => {
        const selectedValue = CategoryFacetTestUtils.createFakeFacetValue();
        selectedValue.state = FacetValueState.selected;
        initializeComponentWithValue(selectedValue);
      });
      it('button should have the class "coveo-selected"', () => {
        expect($$(getButton()).hasClass('coveo-selected')).toBe(true);
      });
  
      it('button should be disabled', () => {
        expect(getButton().getAttribute('disabled')).toBeTruthy();
      });

      it('should not prepend an arrow', () => {
        expect(getArrow()).toBeFalsy();
      });
    });

    it(`when value is not at the first level and has no children
      button should have the class "coveo-with-space"`, () => {
      const childValue = CategoryFacetTestUtils.createFakeFacetValue();
      childValue.path = ['a', 'path'];
      initializeComponentWithValue(childValue);

      expect($$(getButton()).hasClass('coveo-with-space')).toBe(true);
    });

    it(`when value is not at the first level but has children
      button should not have the class "coveo-with-space"`, () => {
      const childValueWithChildren = CategoryFacetTestUtils.createFakeFacetValue();
      childValueWithChildren.path = ['a', 'path'];
      childValueWithChildren.children = [new CategoryFacetValue(CategoryFacetTestUtils.createFakeFacetValue(), facet)]
      initializeComponentWithValue(childValueWithChildren);

      expect($$(getButton()).hasClass('coveo-with-space')).toBe(false);
    });
    
    it(`when value is not selected, is not at the first level and has children
      should prepend an arrow"`, () => {
      const valueWithChildren = CategoryFacetTestUtils.createFakeFacetValue();
      valueWithChildren.children = [new CategoryFacetValue(CategoryFacetTestUtils.createFakeFacetValue(), facet)]
      initializeComponentWithValue(valueWithChildren);

      expect(getArrow()).toBeTruthy();
    });
  });
}
