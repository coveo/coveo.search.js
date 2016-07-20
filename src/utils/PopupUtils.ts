import {$$} from './Dom'

export interface IPosition {
  vertical: VerticalAlignment;
  horizontal: HorizontalAlignment;
  verticalOffset?: number;
  horizontalOffset?: number;
  horizontalClip?: boolean;
}

export enum VerticalAlignment {
  TOP,
  MIDDLE,
  BOTTOM,
  INNERTOP,
  INNERBOTTOM
}

export enum HorizontalAlignment {
  LEFT,
  CENTER,
  RIGHT,
  INNERLEFT,
  INNERRIGHT
}

interface IOffset {
  left: number;
  top: number;
}

interface IElementBoundary {
  top: number;
  left: number;
  right: number;
  bottom: number;
}

export class PopupUtils {
  static positionPopup(popUp: HTMLElement, nextTo: HTMLElement, appendTo: HTMLElement, boundary: HTMLElement, desiredPosition: IPosition, checkForBoundary = 0) {
    $$(appendTo).prepend(popUp);
    desiredPosition.verticalOffset = desiredPosition.verticalOffset ? desiredPosition.verticalOffset : 0;
    desiredPosition.horizontalOffset = desiredPosition.horizontalOffset ? desiredPosition.horizontalOffset : 0;

    let popUpPosition = this.getOffset(nextTo);
    PopupUtils.basicVerticalAlignment(popUpPosition, popUp, nextTo, desiredPosition);
    PopupUtils.basicHorizontalAlignment(popUpPosition, popUp, nextTo, desiredPosition);
    PopupUtils.finalAdjustement(this.getOffset(popUp), popUpPosition, popUp, desiredPosition);

    let popUpBoundary = PopupUtils.getBoundary(popUp);
    let boundaryPosition = PopupUtils.getBoundary(boundary);
    if (checkForBoundary < 2) {
      let checkBoundary = PopupUtils.checkForOutOfBoundary(popUpBoundary, boundaryPosition);
      if (checkBoundary.horizontal != 'ok' && desiredPosition.horizontalClip === true) {
        let width = popUp.offsetWidth;
        if (popUpBoundary.left < boundaryPosition.left) {
          width -= boundaryPosition.left - popUpBoundary.left;
        }
        if (popUpBoundary.right > boundaryPosition.right) {
          width -= popUpBoundary.right - boundaryPosition.right;
        }
        popUp.style.width = width + 'px';
        checkBoundary.horizontal = 'ok';
      }
      if (checkBoundary.vertical != 'ok' || checkBoundary.horizontal != 'ok') {
        let newDesiredPosition = PopupUtils.alignInsideBoundary(desiredPosition, checkBoundary);
        PopupUtils.positionPopup(popUp, nextTo, boundary, appendTo, newDesiredPosition, checkForBoundary + 1);
      }
    }
  }

  private static finalAdjustement(popUpOffSet: IOffset, popUpPosition: IOffset, popUp: HTMLElement, desiredPosition: IPosition) {
    let position = this.getPosition(popUp);
    popUp.style.position = 'absolute';
    popUp.style.top = (position.top + desiredPosition.verticalOffset) - (popUpOffSet.top - popUpPosition.top) + 'px';
    popUp.style.left = (position.left + desiredPosition.horizontalOffset) - (popUpOffSet.left - popUpPosition.left) + 'px'
  }

  private static basicVerticalAlignment(popUpPosition: IOffset, popUp: HTMLElement, nextTo: HTMLElement, desiredPosition: IPosition) {
    switch (desiredPosition.vertical) {
      case VerticalAlignment.TOP:
        popUpPosition.top -= popUp.offsetHeight;
        break;
      case VerticalAlignment.BOTTOM:
        popUpPosition.top += nextTo.offsetHeight;
        break;
      case VerticalAlignment.MIDDLE:
        popUpPosition.top -= popUp.offsetHeight / 3;
      case VerticalAlignment.INNERTOP:
        break; // Nothing to do, it's the default alignment normally
      case VerticalAlignment.INNERBOTTOM:
        popUpPosition.top -= popUp.offsetHeight - nextTo.offsetHeight;
        break;
      default:
        break;
    }
  }

  private static basicHorizontalAlignment(popUpPosition: IOffset, popUp: HTMLElement, nextTo: HTMLElement, desiredPosition: IPosition) {
    switch (desiredPosition.horizontal) {
      case HorizontalAlignment.LEFT:
        popUpPosition.left -= popUp.offsetWidth;
        break;
      case HorizontalAlignment.RIGHT:
        popUpPosition.left += nextTo.offsetWidth;
        break;
      case HorizontalAlignment.CENTER:
        popUpPosition.left += PopupUtils.offSetToAlignCenter(popUp, nextTo);
        break;
      case HorizontalAlignment.INNERLEFT:
        break; // Nothing to do, it's the default alignment normally
      case HorizontalAlignment.INNERRIGHT:
        popUpPosition.left -= popUp.offsetWidth - nextTo.offsetWidth;
        break;
      default:
        break;
    }
  }

  private static alignInsideBoundary(oldPosition: IPosition, checkBoundary) {
    let newDesiredPosition = oldPosition;
    if (checkBoundary.horizontal == 'left') {
      newDesiredPosition.horizontal = HorizontalAlignment.RIGHT;
    }
    if (checkBoundary.horizontal == 'right') {
      newDesiredPosition.horizontal = HorizontalAlignment.LEFT;
    }
    if (checkBoundary.vertical == 'top') {
      newDesiredPosition.vertical = VerticalAlignment.BOTTOM;
    }
    if (checkBoundary.vertical == 'bottom') {
      newDesiredPosition.vertical = VerticalAlignment.TOP;
    }
    return newDesiredPosition;
  }

  private static offSetToAlignCenter(popUp: HTMLElement, nextTo: HTMLElement) {
    return (nextTo.offsetWidth - popUp.offsetWidth) / 2;
  }

  private static getBoundary(element: HTMLElement) {
    let boundaryOffset = this.getOffset(element);
    let toAddVertically;
    if (element.tagName.toLowerCase() == 'body') {
      toAddVertically = Math.max(element.scrollHeight, element.offsetHeight);
    } else if (element.tagName.toLowerCase() == 'html') {
      toAddVertically = Math.max(element.clientHeight, element.scrollHeight, element.offsetHeight);
    } else {
      toAddVertically = element.offsetHeight;
    }
    return {
      top: boundaryOffset.top,
      left: boundaryOffset.left,
      right: boundaryOffset.left + element.offsetWidth,
      bottom: boundaryOffset.top + toAddVertically
    }
  }

  private static checkForOutOfBoundary(popUpBoundary: IElementBoundary, boundary: IElementBoundary) {
    let ret = {
      vertical: 'ok',
      horizontal: 'ok'
    }
    if (popUpBoundary.top < boundary.top) {
      ret.vertical = 'top';
    }
    if (popUpBoundary.bottom > boundary.bottom) {
      ret.vertical = 'bottom';
    }
    if (popUpBoundary.left < boundary.left) {
      ret.horizontal = 'left';
    }
    if (popUpBoundary.right > boundary.right) {
      ret.horizontal = 'right';
    }
    return ret;
  }

  private static getOffset(el: HTMLElement) {
    // In <=IE11, calling getBoundingClientRect on a disconnected node throws an error
    if (!el.getClientRects().length) {
      return { top: 0, left: 0 };
    }


    let rect = el.getBoundingClientRect();

    if (rect.width || rect.height) {
      let doc = el.ownerDocument;
      let docElem = doc.documentElement;

      return {
        top: rect.top + window.pageYOffset - docElem.clientTop,
        left: rect.left + window.pageXOffset - docElem.clientLeft
      };
    }
    return rect;
  }

  private static getPosition(el: HTMLElement) {
    let wrappedElement = $$(el);
    let offsetParent = this.getOffsetParent(el);
    let parentOffset = { top: 0, left: 0 };

    let offset = this.getOffset(el);
    if (!$$(offsetParent).is('html')) {
      parentOffset = this.getOffset(offsetParent);
    }

    let borderTopWidth = parseInt($$(offsetParent).css('borderTopWidth'));
    let borderLeftWidth = parseInt($$(offsetParent).css('borderLeftWidth'));
    borderTopWidth = isNaN(borderTopWidth) ? 0 : borderTopWidth;
    borderLeftWidth = isNaN(borderLeftWidth) ? 0 : borderLeftWidth;

    parentOffset = {
      top: parentOffset.top + borderTopWidth,
      left: parentOffset.left + borderLeftWidth
    };

    let marginTop = parseInt(wrappedElement.css('marginTop'));
    let marginLeft = parseInt(wrappedElement.css('marginLeft'));
    marginTop = isNaN(marginTop) ? 0 : marginTop;
    marginLeft = isNaN(marginLeft) ? 0 : marginLeft;

    return {
      top: offset.top - parentOffset.top - marginTop,
      left: offset.left - parentOffset.left - marginLeft
    };
  }

  private static getOffsetParent(el: HTMLElement): HTMLElement {
    let offsetParent = el.offsetParent;

    while (offsetParent instanceof HTMLElement && $$(offsetParent).css('position') === 'static') {
      // Will break out if it stumbles upon an non-HTMLElement and return documentElement
      offsetParent = (<HTMLElement>offsetParent).offsetParent;
    }

    if (!(offsetParent instanceof HTMLElement)) {
      return document.documentElement;
    }
    return <HTMLElement>offsetParent;
  }
}
