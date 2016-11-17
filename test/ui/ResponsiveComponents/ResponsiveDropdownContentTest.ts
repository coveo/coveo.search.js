import {ResponsiveDropdownContent} from '../../../src/ui/ResponsiveComponents/ResponsiveDropdown/ResponsiveDropdownContent';
import {ResponsiveComponentsManager} from '../../../src/ui/ResponsiveComponents/ResponsiveComponentsManager';
import {$$, Dom} from '../../../src/utils/Dom';

export function ResponsiveDropdownContentTest() {

  describe('ResponsiveDropdownContent', () => {

    let minWidth = 50;
    let widthRatio = 0.5;
    let componentName = 'name';
    let responsiveDropdownContent: ResponsiveDropdownContent;
    let element: Dom;
    let root: Dom;

    beforeEach(() => {
      element = $$('div');
      root = $$('div');
      root.append(element.el);
      root.append($$('div', { className: ResponsiveComponentsManager.DROPDOWN_HEADER_WRAPPER_CSS_CLASS }).el);
      responsiveDropdownContent = new ResponsiveDropdownContent(componentName, element, root, minWidth, widthRatio);
    });

    it('displays the dropdown when position dropdown is called', () => {
      responsiveDropdownContent.positionDropdown();
      expect($$(responsiveDropdownContent.element).css('display')).not.toBe('none');
    });

    it('hides the dropdown when hideDropdown is called', () => {
      responsiveDropdownContent.hideDropdown();
      expect($$(responsiveDropdownContent.element).css('display')).toBe('none');
    });

    it('has a minimal width', () => {
      spyOn(root, 'width').and.returnValue(1);
      responsiveDropdownContent.positionDropdown();
      expect($$(responsiveDropdownContent.element).css('width')).toBe(minWidth.toString() + 'px');
    });

    it('uses a width ratio if it respect the minimal width', () => {
      let rootWidth = minWidth * 2;
      let expectedWidth = rootWidth * widthRatio;
      spyOn(root, 'width').and.returnValue(rootWidth);

      responsiveDropdownContent.positionDropdown();

      expect($$(responsiveDropdownContent.element).css('width')).toBe(expectedWidth.toString() + 'px');
    });

    it('restores the content\'s position when clean up is called', () => {

    });
  });
}
