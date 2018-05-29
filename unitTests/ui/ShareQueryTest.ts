import { SettingsEvents } from '../../src/events/SettingsEvents';
import { IQuery } from '../../src/rest/Query';
import { l } from '../../src/strings/Strings';
import { ShareQuery } from '../../src/ui/ShareQuery/ShareQuery';
import { $$ } from '../../src/utils/Dom';
import { Mock } from '../../testsFramework/TestsFramework';

export function ShareQueryTest() {
  describe('ShareQuery', () => {
    let test: Mock.IBasicComponentSetupWithModalBox<ShareQuery>;

    beforeEach(() => {
      test = Mock.basicComponentSetupWithModalBox<ShareQuery>(ShareQuery);
    });

    it('should open', () => {
      test.cmp.open();
      expect(test.modalBox.open).toHaveBeenCalledWith(test.cmp.dialogBoxContent, {
        title: l('Share Query'),
        className: 'coveo-share-query-opened'
      });
    });

    it('should populate setting menu', () => {
      const menus = { menuData: [] };
      $$(test.env.root).trigger(SettingsEvents.settingsPopulateMenu, menus);
      expect(menus.menuData[0].className).toEqual('coveo-share-query');
    });

    it('should close', () => {
      test.cmp.open();
      test.cmp.close();
      expect(test.modalBox.close).toHaveBeenCalled();
    });

    it('should update according to result', () => {
      test.env.queryController.getLastQuery = () => {
        return <IQuery>{
          firstResult: 0,
          q: 'query',
          aq: 'advanced query',
          cq: 'constant query'
        };
      };
      expect(test.cmp.getCompleteQuery()).toBe('(query) (advanced query) (constant query)');
    });

    it('should allow to get/set complete query', () => {
      test.cmp.setCompleteQuery('foo bar');
      expect(test.cmp.getCompleteQuery()).toEqual('foo bar');
    });

    it('should allow to get/set link to this query', () => {
      test.cmp.setLinkToThisQuery('foo bar');
      expect(test.cmp.getLinkToThisQuery()).toEqual('foo bar');
    });
  });
}
