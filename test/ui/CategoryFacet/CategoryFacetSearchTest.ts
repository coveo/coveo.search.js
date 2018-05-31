import { CategoryFacet } from '../../../src/ui/CategoryFacet/CategoryFacet';
import { mock, basicComponentSetup } from '../../MockEnvironment';
import { FakeResults } from '../../Fake';
import { CategoryFacetSearch } from '../../../src/ui/CategoryFacet/CategoryFacetSearch';
import { CategoryFacetQueryController } from '../../../src/controllers/CategoryFacetQueryController';
import _ = require('underscore');
import { IGroupByValue } from '../../../src/rest/GroupByValue';
import { $$ } from '../../../src/Core';
import { KEYBOARD } from '../../../src/utils/KeyboardUtils';

export function CategoryFacetSearchTest() {
  describe('CategoryFacetSearch', () => {
    let categoryFacetMock: CategoryFacet;
    let categoryFacetSearch: CategoryFacetSearch;
    let realDebounce;
    let fakeGroupByValues: IGroupByValue[];
    beforeEach(() => {
      realDebounce = _.debounce;
      spyOn(_, 'debounce').and.callFake(function(func) {
        return function() {
          func.apply(this, arguments);
        };
      });
      categoryFacetMock = basicComponentSetup<CategoryFacet>(CategoryFacet).cmp;
      fakeGroupByValues = FakeResults.createFakeGroupByResult('@field', 'value', 10).values;
      categoryFacetMock.categoryFacetQueryController = mock(CategoryFacetQueryController);
      categoryFacetMock.categoryFacetQueryController.searchFacetValues = () => new Promise(resolve => resolve(fakeGroupByValues));
      categoryFacetSearch = new CategoryFacetSearch(categoryFacetMock);
    });

    afterEach(() => {
      _.debounce = realDebounce;
    });

    it('when building returns a container', () => {
      const container = categoryFacetSearch.build();
      expect(container.hasClass('coveo-category-facet-search-container')).toBe(true);
    });

    it('focus moves the focus to the input element', () => {
      categoryFacetSearch.facetSearchElement = { input: jasmine.createSpyObj('input', ['focus']) } as any;
      spyOn(categoryFacetSearch.facetSearchElement, 'input');

      categoryFacetSearch.focus();

      expect(categoryFacetSearch.facetSearchElement.input.focus).toHaveBeenCalled();
    });

    it('renders values on focus', done => {
      categoryFacetSearch.build();
      categoryFacetSearch.focus();
      setTimeout(() => {
        expect(categoryFacetSearch.facetSearchElement.searchResults.innerHTML).not.toEqual('');
        done();
      });
    });

    it('renders values correctly', done => {
      categoryFacetSearch.build();

      categoryFacetSearch.displayNewValues();

      setTimeout(() => {
        const searchResults = categoryFacetSearch.facetSearchElement.searchResults;
        const valueCaptions = $$(searchResults).findAll('.coveo-category-facet-search-value-caption');
        const pathValues = $$(searchResults).findAll('.coveo-category-facet-search-path');
        const valueCounts = $$(searchResults).findAll('.coveo-category-facet-search-value-number');
        for (const i of _.range(fakeGroupByValues.length)) {
          expect($$(valueCaptions[i]).text()).toEqual(`value${i}`);
          expect($$(pathValues[i]).text()).toEqual('');
          expect($$(valueCounts[i]).text()).toEqual((i + 1).toString());
        }
        done();
      });
    });

    it('renders the path correctly', done => {
      fakeGroupByValues = FakeResults.createFakeGroupByResult('@field', 'a|b|c', 10).values;
      categoryFacetMock.categoryFacetQueryController.searchFacetValues = () => new Promise(resolve => resolve(fakeGroupByValues));
      categoryFacetSearch.build();

      categoryFacetSearch.displayNewValues();

      setTimeout(() => {
        const pathCaption = $$(categoryFacetSearch.facetSearchElement.searchResults).find('.coveo-category-facet-search-path');
        expect($$(pathCaption).text()).toEqual('a/b/c0');
        done();
      });
    });

    it('sets the correct classes when there is no results', done => {
      categoryFacetMock.categoryFacetQueryController.searchFacetValues = () => new Promise(resolve => resolve([]));
      categoryFacetSearch.build();

      categoryFacetSearch.displayNewValues();

      setTimeout(() => {
        expect($$(categoryFacetMock.element).hasClass('coveo-no-results')).toBe(true);
        expect($$(categoryFacetSearch.facetSearchElement.search).hasClass('coveo-facet-search-no-results')).toBe(true);
        done();
      });
    });

    it('removes no results classes when there are results', done => {
      categoryFacetSearch.build();
      $$(categoryFacetMock.element).addClass('coveo-no-results');
      $$(categoryFacetSearch.facetSearchElement.search).addClass('coveo-facet-search-no-results');

      categoryFacetSearch.displayNewValues();

      setTimeout(() => {
        expect($$(categoryFacetMock.element).hasClass('coveo-no-results')).toBe(false);
        expect($$(categoryFacetSearch.facetSearchElement.search).hasClass('coveo-facet-search-no-results')).toBe(false);
        done();
      });
    });

    it('selects the first results when displaying new values', done => {
      categoryFacetSearch.build();
      categoryFacetSearch.displayNewValues();

      setTimeout(() => {
        const facetSearchValues = $$(categoryFacetSearch.facetSearchElement.searchResults).findAll('.coveo-category-facet-search-value');
        expect($$(facetSearchValues[0]).hasClass('coveo-category-facet-search-current-value')).toBe(true);
        done();
      });
    });
    it('pressing enter selects the current result', done => {
      const keyboardEvent = { which: KEYBOARD.ENTER } as KeyboardEvent;
      spyOn(categoryFacetMock, 'changeActivePath');
      categoryFacetSearch.build();
      categoryFacetSearch.displayNewValues();

      setTimeout(() => {
        categoryFacetSearch.handleKeyboardEvent(keyboardEvent);
        expect(categoryFacetMock.changeActivePath).toHaveBeenCalledWith(['value0']);
        done();
      });
    });

    it('pressing down arrow moves current result down', done => {
      const keyboardEvent = { which: KEYBOARD.DOWN_ARROW } as KeyboardEvent;
      categoryFacetSearch.build();
      categoryFacetSearch.displayNewValues();

      setTimeout(() => {
        categoryFacetSearch.handleKeyboardEvent(keyboardEvent);
        const facetSearchValues = $$(categoryFacetSearch.facetSearchElement.searchResults).findAll('.coveo-category-facet-search-value');
        expect($$(facetSearchValues[1]).hasClass('coveo-category-facet-search-current-value')).toBe(true);
        done();
      });
    });

    it('pressing up arrow moves current result up', done => {
      const keyboardEvent = { which: KEYBOARD.UP_ARROW } as KeyboardEvent;
      categoryFacetSearch.build();
      categoryFacetSearch.displayNewValues();

      setTimeout(() => {
        categoryFacetSearch.handleKeyboardEvent(keyboardEvent);
        const facetSearchValues = $$(categoryFacetSearch.facetSearchElement.searchResults).findAll('.coveo-category-facet-search-value');
        expect($$(facetSearchValues.slice(-1)[0]).hasClass('coveo-category-facet-search-current-value')).toBe(true);
        done();
      });
    });

    it('pressing escape closes the search input', done => {
      const keyboardEvent = { which: KEYBOARD.ESCAPE } as KeyboardEvent;
      spyOn(categoryFacetSearch.facetSearchElement, 'clearSearchInput');
      categoryFacetSearch.build();
      categoryFacetSearch.displayNewValues();

      setTimeout(() => {
        categoryFacetSearch.handleKeyboardEvent(keyboardEvent);
        expect(categoryFacetSearch.facetSearchElement.clearSearchInput).toHaveBeenCalled();
        done();
      });
    });

    it('pressing any other key displays new values', done => {
      const keyboardEvent = { which: 1337 } as KeyboardEvent;
      categoryFacetSearch.build();

      setTimeout(() => {
        categoryFacetSearch.handleKeyboardEvent(keyboardEvent);
        expect(categoryFacetSearch.facetSearchElement.searchResults.innerHTML).not.toEqual('');
        done();
      });
    });
  });
}
