import { ComponentOptions } from '../Base/ComponentOptions';
import { IQueryResult } from '../../rest/QueryResult';
import { HighlightUtils, StringAndHoles } from '../../utils/HighlightUtils';
import { Initialization } from '../Base/Initialization';
import { analyticsActionCauseList } from '../Analytics/AnalyticsActionListMeta';
import { Utils } from '../../utils/Utils';
import { $$ } from '../../utils/Dom';
import { exportGlobally } from '../../GlobalExports';
import 'styling/_PrintableUri';
import {ResultLink} from '../ResultLink/ResultLink';
import { IResultLinkOptions } from '../ResultLink/ResultLinkOptions';
import {IResultsComponentBindings} from '../Base/ResultsComponentBindings';
import { StreamHighlightUtils } from '../../utils/StreamHighlightUtils';
import * as _ from 'underscore';


export interface IPrintableUriOptions extends IResultLinkOptions {
}

/**
 * The PrintableUri component displays the URI, or path, to access a result.
 *
 * This component is a result template component (see [Result Templates](https://developers.coveo.com/x/aIGfAQ)).
 */
export class PrintableUri extends ResultLink {
  static ID = 'PrintableUri';
  static options: IPrintableUriOptions = {};
  static doExport = () => {
    exportGlobally({
      'PrintableUri': PrintableUri
    });
  }
  private shortenedUri: string;
  private uri: string;
  /**
   * Creates a new PrintableUri.
   * @param element The HTMLElement on which to instantiate the component.
   * @param options The options for the PrintableUri component.
   * @param bindings The bindings that the component requires to function normally. If not set, these will be
   * automatically resolved (with a slower execution time).
   * @param result The result to associate the component with.
   */
  constructor(public element: HTMLElement, public options: IPrintableUriOptions, bindings?: IResultsComponentBindings, public result?: IQueryResult) {
    super(element, ComponentOptions.initComponentOptions(element, PrintableUri, options), bindings, result);


    let parentsXml = Utils.getFieldValue(result, 'parents');
    if (parentsXml) {
      this.renderParentsXml(element, parentsXml);
    }
  }

  public renderParentsXml(element: HTMLElement, parentsXml: string) {
    let xmlDoc: XMLDocument = Utils.parseXml(parentsXml);
    let parents = xmlDoc.getElementsByTagName('parent');

    let tokens: HTMLElement[] = [];
    let seperators: HTMLElement[] = [];

    for (let i = 0; i < parents.length; i++) {
      if (i > 0) {
        let seperator = this.buildSeperator();
        seperators.push(seperator);
        element.appendChild(seperator);
      }

      let parent = <Element>parents.item(i);
      let token = this.buildHtmlToken(parent.getAttribute('name'), parent.getAttribute('uri'));
      tokens.push(token);
      element.appendChild(token);
    }

    if (tokens.length > 1) {
      let ellipsis: HTMLElement = this.buildEllipsis();
      element.insertBefore(ellipsis, seperators[0]);
      let ellipsisSeperator: HTMLElement = this.buildSeperator();
      element.insertBefore(ellipsisSeperator, ellipsis);

      let contentWidth = 0;
      let tokensWidth: number[] = [];
      for (let i = 0; i < tokens.length; i++) {
        tokensWidth[i] = tokens[i].offsetWidth;
        contentWidth += tokensWidth[i];
      }
      let seperatorWidth = seperators[0].offsetWidth;
      let ellipsisWidth = ellipsis.offsetWidth;
      let availableWidth = element.offsetWidth;

      if (availableWidth <= contentWidth) {
        contentWidth += ellipsisWidth + seperatorWidth;
        let hidden: HTMLElement[] = [];
        let i = 1;
        while (i < tokens.length && availableWidth <= contentWidth) {
          element.removeChild(tokens[i]);
          element.removeChild(seperators[i - 1]);
          if (i > 1) {
            hidden.push(seperators[i - 1]);
          }
          hidden.push(tokens[i]);
          contentWidth -= tokensWidth[i] + seperatorWidth;
          i++;
        }
        ellipsis.onclick = () => {
          for (let i = 0; i < hidden.length; i++) {
            element.insertBefore(hidden[i], ellipsis);
          }
          element.removeChild(ellipsis);
        };
      } else {
        element.removeChild(ellipsis);
        element.removeChild(ellipsisSeperator);
      }
    }
  }

  public renderUri(element: HTMLElement, result?: IQueryResult) {
      if(!this.options.titleTemplate) {
          this.uri = result.clickUri;
          let stringAndHoles: StringAndHoles;
          if (result.printableUri.indexOf('\\') == -1) {
              stringAndHoles = StringAndHoles.shortenUri(result.printableUri, $$(element).width() / 7);
          } else {
              stringAndHoles = StringAndHoles.shortenPath(result.printableUri, $$(element).width() / 7);
          }
          this.shortenedUri = HighlightUtils.highlightString(stringAndHoles.value, result.printableUriHighlights, stringAndHoles.holes, 'coveo-highlight');
          let link = $$('a');
          link.setAttribute('title', result.printableUri);
          link.addClass('coveo-printable-uri');
          link.setHtml(this.shortenedUri);
          link.setAttribute('href', result.clickUri);
          element.appendChild(link.el);
      }
      else if(this.options.titleTemplate){
          let newTitle = this.parseStringTemplate(this.options.titleTemplate);
          this.element.innerHTML = newTitle ? StreamHighlightUtils.highlightStreamText(newTitle, this.result.termsToHighlight, this.result.phrasesToHighlight) : this.result.clickUri;
      }
  }

  public buildSeperator() {
    let seperator = document.createElement('span');
    seperator.innerText = '>';
    seperator.className = 'coveo-printable-uri-separator';
    return seperator;
  }

  public buildEllipsis() {
    let ellipsis = document.createElement('span');
    ellipsis.innerText = '...';
    ellipsis.className = 'coveo-printable-uri';
    return ellipsis;
  }

  public buildHtmlToken(name: string, uri: string) {
    let modifiedName = name.charAt(0).toUpperCase() + name.slice(1);
    let link = document.createElement('a');
    link.href = uri;
    this.uri = uri;
    link.className = 'coveo-printable-uri';
    link.appendChild(document.createTextNode(modifiedName));
    return link;
  }



}
PrintableUri.options = _.extend({}, PrintableUri.options, ResultLink.options);
Initialization.registerAutoCreateComponent(PrintableUri);
